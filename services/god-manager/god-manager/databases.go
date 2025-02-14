package main

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//dd:span resource_name:Databases.GodDatabase operation:god-manager.database
func GodDatabase(ctx context.Context) (*mongo.Client, error) {
	var client *mongo.Client

	// Connect to database
	Log(ctx).Debug("connecting to god-database")
	options := options.Client().ApplyURI("mongodb://god-database:27017/?connect=direct")
	client, err := mongo.Connect(ctx, options)
	if err != nil {
		return nil, err
	}

	// Return new database
	return client, nil
}

//dd:span resource_name:Databases.NoteDatabase operation:god-manager.database
func NoteDatabase(ctx context.Context) (*mongo.Client, error) {
	var client *mongo.Client

	// Connect to database
	Log(ctx).Debug("connecting to note-database")
	options := options.Client().ApplyURI("mongodb://notes:96758wg54tbravp7@notes-database:27017/?connect=direct&authSource=admin")
	client, err := mongo.Connect(ctx, options)
	if err != nil {
		return nil, err
	}

	// Return new database
	return client, nil
}