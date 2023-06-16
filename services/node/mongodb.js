"use strict"

// Imports
import mongodb from "mongodb"
import logger from "./logger.js"

const client = new mongodb.MongoClient("mongodb://vulcan-database:27017")
const mongo = await client.connect().then((client) => client.db("vulcan-node")).catch((err) => {
    logger.error({
        message: "Failed to connect to database.",
        err: err
    })
})

export default mongo