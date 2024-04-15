package main

import (
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	mongotrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/go.mongodb.org/mongo-driver/mongo"
)

// Variables
var client *mongo.Client

func GodDatabase(ctx *gin.Context) (*mongo.Database, error) {
	// Check if client exists
	exists := false
	if client != nil {
		err := client.Ping(ctx, nil)
		if err == nil {
			exists = true
		}
	}

	// If client doesn't exists, connect
	if !exists {
		tracer := mongotrace.NewMonitor(mongotrace.WithServiceName("god-database"))
		options := options.Client().SetMonitor(tracer).ApplyURI("mongodb://god-database:27017/?connect=direct")
		client, err := mongo.Connect(ctx.Request.Context(), options)
		if err != nil {
			return nil, err
		}

		// Return new database
		return client.Database("vulcan"), nil
	}

	// Return existing database
	return client.Database("vulcan"), nil
}
