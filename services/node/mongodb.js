"use strict"

// Imports
const logger = require("./logger.js")
const mongo = require("mongodb")

const client = new mongo.MongoClient("mongodb://god-database:27017")
client.connect()
const mongodb = client.db("vulcan")

module.exports = mongodb