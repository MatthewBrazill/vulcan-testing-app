package main

import (
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//dd:span resource_name:Databases.GodDatabase operation:god-manager.database
func GodDatabase(ctx *gin.Context) (*mongo.Client, error) {
	var client *mongo.Client

	// Connect to database
	Log(ctx).Debug("connecting to vulcan-gods")
	options := options.Client().ApplyURI("mongodb://vulcan-gods:96758wg54tbravp7@mac-mongo.database:27017/?connect=direct&authSource=admin")
	client, err := mongo.Connect(ctx.Request.Context(), options)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		return nil, err
	}

	// Return new database
	return client, nil
}

//dd:span resource_name:Databases.NoteDatabase operation:god-manager.database
func NoteDatabase(ctx *gin.Context) (*mongo.Client, error) {
	var client *mongo.Client

	// Connect to database
	Log(ctx).Debug("connecting to note-database")
	options := options.Client().ApplyURI("mongodb://vulcan-notes:96758wg54tbravp7@mac-mongo.database:27017/?connect=direct&authSource=admin")
	client, err := mongo.Connect(ctx.Request.Context(), options)
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		return nil, err
	}

	// Return new database
	return client, nil
}