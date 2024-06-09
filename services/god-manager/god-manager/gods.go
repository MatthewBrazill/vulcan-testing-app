package main

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Build god object
	god := bson.M{
		"godId":    body["godId"],
		"pantheon": body["pantheon"],
		"name":     body["name"],
		"domain":   body["domain"],
	}

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Insert god
	_, err = db.Collection("gods").InsertOne(ctx.Request.Context(), god)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Log god creation and return ID
	Log(ctx).WithFields(logrus.Fields{
		"god": logrus.Fields{
			"godId":    god["godId"],
			"pantheon": god["pantheon"],
			"name":     god["name"],
			"domain":   god["domain"],
		},
	}).Info("god created")
	ctx.JSON(http.StatusOK, gin.H{
		"godId": god["godId"],
	})
}

func GetGod(ctx *gin.Context) {
	// Extract body from request
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Try to find god in database
	var result bson.M
	err = db.Collection("gods").FindOne(ctx.Request.Context(), bson.M{"godId": req["godId"]}).Decode(&result)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			ctx.Status(http.StatusNotFound)
			return
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	// Return result
	ctx.JSON(http.StatusOK, result)
}

func SearchGod(ctx *gin.Context) {
	// Extract body from request
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Try to search for gods in database
	var result []bson.M
	cursor, err := db.Collection("gods").Find(ctx.Request.Context(), bson.M{"name": bson.M{"$regex": primitive.Regex{Pattern: req["query"], Options: "i"}}})
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			ctx.Status(http.StatusNotFound)
			return
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	// Try to extract the gods from cursor
	err = cursor.All(ctx.Request.Context(), &result)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Return result
	ctx.JSON(http.StatusOK, result)
}

func UpdateGod(ctx *gin.Context) {
	// Extract body from request
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Prep update object
	update := make(bson.M)
	for key, val := range req {
		if (key == "pantheon" || key == "name" || key == "domain") && val != "" {
			update[key] = val
		}
	}

	// Update god
	result, err := db.Collection("gods").UpdateOne(ctx.Request.Context(), bson.M{"godId": req["godId"]}, bson.M{"$set": update})
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Confirm result and return response
	if result.ModifiedCount == 1 {
		Log(ctx).WithFields(logrus.Fields{
			"god": req["godId"],
		}).Info("god updated")
		ctx.Status(http.StatusOK)
	} else if result.ModifiedCount == 0 {
		ctx.Status(http.StatusNotFound)
	} else {
		err = errors.New("unexpected update: updated count isn't 0 or 1")
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
	}
}

func DeleteGod(ctx *gin.Context) {
	// Extract body from request
	req := make(map[string]string)
	ctx.ShouldBind(&req)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Delete god
	result, err := db.Collection("gods").DeleteOne(ctx.Request.Context(), bson.M{"godId": req["godId"]})
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Confirm result and return response
	if result.DeletedCount == 1 {
		Log(ctx).WithFields(logrus.Fields{
			"god": req["godId"],
		}).Info("god deleted")
		ctx.Status(http.StatusOK)
	} else if result.DeletedCount == 0 {
		ctx.Status(http.StatusNotFound)
	} else {
		err = errors.New("unexpected update: delete count isn't 0 or 1")
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
	}
}
