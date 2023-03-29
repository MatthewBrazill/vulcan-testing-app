package main

import (
	"context"
	"errors"
	"net/http"

	"github.com/dchest/uniuri"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

func StoragePage(ctx *gin.Context) {
	perms := Authorize(ctx)
	switch perms {
	case "user", "admin":
		gintrace.HTML(ctx, http.StatusOK, "storage", gin.H{
			"Title": "God Storage",
		})

	case "no_auth":
		ctx.Redirect(http.StatusFound, "/login")

	default:
		gintrace.HTML(ctx, http.StatusFound, "error", gin.H{
			"HttpCode": "500",
			"Message":  "There was an issue with the Server, please try again later.",
		})
	}
}

func StorageSearchAPI(ctx *gin.Context) {
	filter := make(map[string]string)
	ctx.ShouldBind(&filter)

	if !Validate(ctx, filter, [][2]string{{"filter", "[a-zA-Z]{0,32}"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	var result []bson.M
	cursor, err := db.Collection("gods").Find(ctx, bson.M{"name": bson.M{"$regex": primitive.Regex{Pattern: filter["filter"]}}})
	if err != nil {
		if err.Error() != "mongo: no documents in result" {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"message": "There was an issue with the Server, please try again later.",
			})
			return
		}
	}

	err = cursor.All(ctx, &result)
	if err != nil {
		Log(ctx).WithField("result", result).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue with the Server, please try again later.",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Successfully filtered gods.",
		"result":  result,
	})
}

func GodCreateAPI(ctx *gin.Context) {
	god := make(map[string]string)
	ctx.ShouldBind(&god)
	god["godId"] = uniuri.NewLen(5)

	if !Validate(ctx, god, [][2]string{{"pantheon", "^[a-zA-Z]{1,32}$"}, {"name", "^[a-zA-Z]{1,32}$"}, {"domain", "^[0-9a-zA-Z ]{1,32}$"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	_, err := db.Collection("gods").InsertOne(context.Background(), bson.M{
		"godId":    god["godId"],
		"pantheon": god["pantheon"],
		"name":     god["name"],
		"domain":   god["domain"],
	})
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create god. There was an issue with the Server, please try again later.",
		})
		return
	}

	Log(ctx).WithFields(logrus.Fields{
		"god": logrus.Fields{
			"godId":    god["godId"],
			"pantheon": god["pantheon"],
			"name":     god["name"],
			"domain":   god["domain"],
		},
	}).Info("God created.")
	ctx.JSON(http.StatusOK, gin.H{
		"message": "Successfully created god.",
		"godId":   god["godId"],
	})
}

func GodGetAPI(ctx *gin.Context) {
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	if !Validate(ctx, req, [][2]string{{"godId", "^[a-zA-Z0-9]{5}$"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	var result bson.M
	err := db.Collection("gods").FindOne(ctx.Request.Context(), bson.M{"godId": req["godId"]}).Decode(&result)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			ctx.JSON(http.StatusNotFound, gin.H{
				"message": "Couldn't find a god with that ID.",
			})
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"message": "There was an issue with the Server, please try again later.",
			})
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Successfully retreived god.",
		"god":     result,
	})
}

func GodUpdateAPI(ctx *gin.Context) {
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	if !Validate(ctx, req, [][2]string{{"godId", "^[a-zA-Z0-9]{5}$"}, {"pantheon", "^[a-zA-Z]{0,32}$"}, {"name", "^[a-zA-Z]{0,32}$"}, {"domain", "^[0-9a-zA-Z ]{0,32}$"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	update := make(bson.M)
	for key, val := range req {
		if (key == "pantheon" || key == "name" || key == "domain") && val != "" {
			update[key] = val
		}
	}

	result, err := db.Collection("gods").UpdateOne(ctx.Request.Context(), bson.M{"godId": req["godId"]}, bson.M{"$set": update})
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue with the Server, please try again later.",
		})
	}

	if result.ModifiedCount == 1 {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "Successfully updated god.",
		})
	} else if result.ModifiedCount == 0 {
		ctx.JSON(http.StatusNotFound, gin.H{
			"message": "Couldn't find a god with that ID.",
		})
	} else {
		err = errors.New("unexpected update: updated count isn't 0 or 1")
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue updating the specified god, please contact an adminitrator immediately.",
		})
	}
}

func GodDeleteAPI(ctx *gin.Context) {
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	if !Validate(ctx, req, [][2]string{{"godId", "^[a-zA-Z0-9]{5}$"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	result, err := db.Collection("gods").DeleteOne(ctx.Request.Context(), bson.M{"godId": req["godId"]})
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue with the Server, please try again later.",
		})
	}

	if result.DeletedCount == 1 {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "Successfully deleted god.",
		})
	} else if result.DeletedCount == 0 {
		ctx.JSON(http.StatusNotFound, gin.H{
			"message": "Couldn't find a god with that ID.",
		})
	} else {
		err = errors.New("unexpected update: delete count isn't 0 or 1")
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue deleting the specified god, please contact an adminitrator immediately.",
		})
	}
}
