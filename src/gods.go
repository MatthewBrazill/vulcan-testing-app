package main

import (
	"context"
	"net/http"

	"github.com/dchest/uniuri"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GodCreateAPI(ctx *gin.Context) {
	// Connect to the database
	db, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURL))
	defer db.Disconnect(context.Background())
	if err != nil {
		log.Print(err)
		return
	}

	// Prep character data
	god := bson.M{
		"godId":    uniuri.NewLen(5),
		"pantheon": ctx.PostForm("pantheon"),
		"name":     ctx.PostForm("name"),
		"domain":   ctx.PostForm("domain"),
	}

	// Write new character to the db
	_, err = db.Database("vulcan").Collection("gods").InsertOne(context.Background(), god)

	// Respond
	if err != nil {
		log.Print(err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"message": err.Error(),
		})
	} else {
		log.Print("Created God")
		ctx.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "successfully created god",
			"godId":   god["godId"],
		})
	}
}

func GodGetAPI(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{
		"status":  http.StatusNotImplemented,
		"message": "not implemented",
	})
}

func GodUpdateAPI(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{
		"status":  http.StatusNotImplemented,
		"message": "not implemented",
	})
}

func GodDeleteAPI(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{
		"status":  http.StatusNotImplemented,
		"message": "not implemented",
	})
}
