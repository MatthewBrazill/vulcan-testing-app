package main

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

//dd:span resource_name:Gods.CreateGod operation:god-manager.handler
func CreateGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Build god object
	Log(ctx).WithField("god", body).Debug("building god object")
	god := bson.M{
		"godId":    body["godId"],
		"pantheon": body["pantheon"],
		"name":     body["name"],
		"domain":   body["domain"],
	}

	// Make request to create god description
	descriptionRequest := fmt.Sprintf("{\"god\":\"%s\",\"godId\":\"%s\"}", god["name"], god["godId"])
	req, err := http.NewRequestWithContext(ctx.Request.Context(), http.MethodPost, "https://delphi.vulcan-application.svc.cluster.local/describe", strings.NewReader(descriptionRequest))
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}
	client := http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
	client.Do(req)
	Log(ctx).WithField("request", descriptionRequest).Debug("sent description request")

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Insert god
	_, err = db.Database("vulcan").Collection("gods").InsertOne(ctx.Request.Context(), god)
	db.Disconnect(ctx)
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

//dd:span resource_name:Gods.GetGod operation:god-manager.handler
func GetGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Get god database
	godDb, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Try to find god in database
	var god bson.M
	err = godDb.Database("vulcan").Collection("gods").FindOne(ctx.Request.Context(), bson.M{"godId": body["godId"]}).Decode(&god)
	godDb.Disconnect(ctx)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			Log(ctx).Debug(fmt.Sprintf("no god found for %s", body["godId"]))
			ctx.Status(http.StatusNotFound)
			return
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	// Get note database
	noteDb, err := NoteDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Collect description for god
	var description bson.M
	err = noteDb.Database("notes").Collection("godNotes").FindOne(ctx.Request.Context(), bson.M{"godId": god["godId"]}).Decode(&description)
	noteDb.Disconnect(ctx)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			Log(ctx).Debug(fmt.Sprintf("no description found for god %s", god["godId"]))
			god["description"] = "No Description Found"
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, err)
			return
		}
	} else {
		god["description"] = description["description"]
	}

	// Return result
	ctx.JSON(http.StatusOK, god)
}

//dd:span resource_name:Gods.SearchGod operation:god-manager.handler
func SearchGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Try to search for gods in database
	var result []bson.M
	cursor, err := db.Database("vulcan").Collection("gods").Find(ctx.Request.Context(), bson.M{"name": bson.M{"$regex": primitive.Regex{Pattern: body["query"], Options: "i"}}})
	db.Disconnect(ctx)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			Log(ctx).Debug(fmt.Sprintf("no gods found for %s", body["query"]))
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

//dd:span resource_name:Gods.UpdateGod operation:god-manager.handler
func UpdateGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Prep update object
	Log(ctx).WithField("god", body).Debug("preparing god for update")
	update := make(bson.M)
	for key, val := range body {
		if (key == "pantheon" || key == "name" || key == "domain") && val != "" {
			update[key] = val
		}
	}

	// Make request to create god description
	descriptionRequest := fmt.Sprintf("{\"god\":\"%s\",\"godId\":\"%s\"}", body["name"], body["godId"])
	req, err := http.NewRequestWithContext(ctx.Request.Context(), http.MethodPost, "https://delphi.vulcan-application.svc.cluster.local/describe", strings.NewReader(descriptionRequest))
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}
	client := http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
	client.Do(req)
	Log(ctx).WithField("request", descriptionRequest).Debug("sent description request")

	// Update god
	result, err := db.Database("vulcan").Collection("gods").UpdateOne(ctx.Request.Context(), bson.M{"godId": body["godId"]}, bson.M{"$set": update})
	db.Disconnect(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Confirm result and return response
	if result.ModifiedCount == 1 {
		Log(ctx).WithFields(logrus.Fields{
			"god": body["godId"],
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

//dd:span resource_name:Gods.DeleteGod operation:god-manager.handler
func DeleteGod(ctx *gin.Context) {
	// Extract body from request
	body := make(map[string]string)
	ctx.ShouldBind(&body)

	// Get database
	db, err := GodDatabase(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Delete god
	result, err := db.Database("vulcan").Collection("gods").DeleteOne(ctx.Request.Context(), bson.M{"godId": body["godId"]})
	db.Disconnect(ctx)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Confirm result and return response
	if result.DeletedCount == 1 {
		Log(ctx).WithFields(logrus.Fields{
			"god": body["godId"],
		}).Info("god deleted")
		ctx.Status(http.StatusOK)
	} else if result.DeletedCount == 0 {
		Log(ctx).Debug(fmt.Sprintf("no god found for %s", body["godId"]))
		ctx.Status(http.StatusNotFound)
	} else {
		err = errors.New("unexpected update: delete count isn't 0 or 1")
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, err)
	}
}
