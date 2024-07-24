"use strict"

// Imports
const postgresql = require("pg")
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
    }
}

module.exports = databases