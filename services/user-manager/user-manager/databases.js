"use strict"

// Imports
const postgresql = require("pg")
const logger = require("./logger")

const databases = {
    async userDatabase() {
        const pgdb = new postgresql.Client({ connectionString: "postgresql://vulcan:yKCstvg4hrB9pmDP@database-proxy:5432/vulcan_users" })
        pgdb.connect()

        pgdb.on("error", (err) => {
            logger.error("postgres connection failed with error: ", err)
        })

        return pgdb
    }
}

module.exports = databases