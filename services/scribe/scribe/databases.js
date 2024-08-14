"use strict"

// Imports
const postgresql = require("pg")
const mongodb = require("mongodb")
const logger = require("./logger")

const databases = {
    async userDatabase() {
        const pgdb = new postgresql.Client({
            user: "vulcan",
            password: "yKCstvg4hrB9pmDP",
            host: "database-proxy",
            port: "5432",
            database: "vulcan_users"
        })
        pgdb.connect()

        pgdb.on("error", (err) => {
            logger.error("postgres connection failed with error: ", err)
        })

        return pgdb
    },

    async notesDatabase() {
        const mngdb = new mongodb.MongoClient("mongodb://database-proxy:27018/?connect=direct")
        const notesDb = mngdb.db("notes")

        return notesDb
    }
}

module.exports = databases