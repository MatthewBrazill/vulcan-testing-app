"use strict"

// Imports
import mongo from "mongodb"
import logger from "./logger.js"

const client = new mongo.MongoClient("mongodb://god-database:27017")
const mongodb = await client.connect().then((client) => client.db("vulcan-node")).catch((err) => {
    logger.error({
        message: "Failed to connect to god-database.",
        err: err
    })
})

export default mongodb