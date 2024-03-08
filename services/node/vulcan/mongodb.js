"use strict"

// Imports
const logger = require("./logger.js")
const mongo = require("mongodb")

var mongoURL
if (process.env.DD_ENV == "kubernetes") {
    mongoURL = "mongodb://host.minikube.internal:27017"
} else {
    mongoURL = "mongodb://god-database:27017"
}

const client = new mongo.MongoClient(mongoURL)
client.connect()
const mongodb = client.db("vulcan")

module.exports = mongodb