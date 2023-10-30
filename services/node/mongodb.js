"use strict"

// Imports
const logger = require("./logger.js")
const mongo = require("mongodb")

var mongoURL
if (process.env.DD_ENV == "kubernetes") {
    mongoURL = "mongodb://10.10.10.100:27017"
} else {
    mongoURL = "mongodb://god-database:27017"
}

const client = new mongo.MongoClient(mongoURL)
client.connect()
const mongodb = client.db("vulcan")

module.exports = mongodb