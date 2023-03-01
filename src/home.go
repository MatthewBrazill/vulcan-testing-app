package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

func HomePage(ctx *gin.Context) {
	perms := Authorize(ctx)
	switch perms {
	case "user", "admin":
		gintrace.HTML(ctx, http.StatusOK, "home", gin.H{})

	case "no_auth":
		ctx.Redirect(http.StatusFound, "/login")

	default:
		gintrace.HTML(ctx, http.StatusFound, "error", gin.H{
			"HttpCode": "404",
			"Message": "There was an issue with the Server, please try again later.",
		})
	}
}

func GodPage(ctx *gin.Context) {
	// Get the URL path charId parameter
	charId := ctx.Param("charId")

	// Connect to the database
	db, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURL))
	defer db.Disconnect(context.Background())
	if err != nil {
		log.Print(err)
	}

	// Retrieve the data
	characters := db.Database("vulcan").Collection("characters")
	var character bson.M
	err = characters.FindOne(context.Background(), bson.M{"charId": charId}).Decode(&character)
	if err != nil {
		log.Print(err)
	}

	ctx.HTML(http.StatusOK, fmt.Sprintf("%v.hbs", character["type"]), gin.H{"character": character})
}
