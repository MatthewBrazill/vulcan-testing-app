package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

func EditGodPage(ctx *gin.Context) {
	perms := Authorize(ctx)
	switch perms {
	case "user", "admin":
		gintrace.HTML(ctx, http.StatusOK, "edit_god", gin.H{
			"Title": "Edit God",
		})

	case "no_auth":
		ctx.Redirect(http.StatusFound, "/login")

	default:
		gintrace.HTML(ctx, http.StatusFound, "error", gin.H{
			"Title": "Error",
			"HttpCode": "500",
			"Message":  "There was an issue with the Server, please try again later.",
		})
	}
}

func AddGodPage(ctx *gin.Context) {
	perms := Authorize(ctx)
	switch perms {
	case "user", "admin":
		gintrace.HTML(ctx, http.StatusOK, "add_god", gin.H{
			"Title": "Add God",
		})

	case "no_auth":
		ctx.Redirect(http.StatusFound, "/login")

	default:
		gintrace.HTML(ctx, http.StatusFound, "error", gin.H{
			"Title": "Error",
			"HttpCode": "500",
			"Message":  "There was an issue with the Server, please try again later.",
		})
	}
}

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
			"Title": "Error",
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