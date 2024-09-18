package main

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//dd:span resource_name:Databases.GodDatabase operation:god-manager.database
func GodDatabase(ctx context.Context) (*mongo.Database, error) {
	var client *mongo.Client

	// Connect to database
	Log(ctx).Debug("connecting to god-database")
	options := options.Client().ApplyURI("mongodb://god-database:27017/?connect=direct")
	client, err := mongo.Connect(ctx, options)
	if err != nil {
		return nil, err
	}

	// Return new database
	return client.Database("vulcan"), nil
}
