"use strict"

// Imports
const postgresql = require("pg")

const databases = {
    async userDatabase() {
        const pgdb = new postgresql.Client({ connectionString: "postgresql://vulcan:yKCstvg4hrB9pmDP@database-proxy:5432/vulcan_users" })
        pgdb.connect()

        return pgdb
    }
}

module.exports = databases