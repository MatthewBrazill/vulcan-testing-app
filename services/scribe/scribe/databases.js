"use strict"

// Imports
const postgresql = require("pg")
const mongodb = require("mongodb")
const logger = require("./logger")

const databases = {
    async userDatabase() {
        try {
            const pgdb = new postgresql.Client({
                user: "vulcan",
                password: "yKCstvg4hrB9pmDP",
                host: "pupgres.database",
                port: "5432",
                database: "vulcan_users"
            })
            pgdb.connect()

            pgdb.on("error", (err) => {
                logger.error("postgres connection failed with error: ", err)
            })

            return pgdb
        } catch(err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                message: `postgres connection failed with error: ", ${err.message}`
            })
        }
    },

    async notesDatabase() {
        try {
            const mngdb = new mongodb.MongoClient("mongodb://vulcan-notes:96758wg54tbravp7@mac-mongo.database:27017", {
                authMechanism: "SCRAM-SHA-256",
                directConnection: true,
                authSource: "admin"
            })

            mngdb.on("error", (err) => {
                logger.error("mongodb connection failed with error: ", err)
            })

            return mngdb
        } catch (err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                message: `mongodb connection failed with error: ", ${err.message}`
            })
        }
    }
}

module.exports = databases