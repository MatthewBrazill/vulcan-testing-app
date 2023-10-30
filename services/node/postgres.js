"use strict"

// Imports
const postgresql = require("pg")

var postgresURL
if (process.env.DD_ENV == "kubernetes") {
    postgresURL = "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@10.10.10.101:5432/vulcan_users"
} else {
    postgresURL = "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@user-database:5432/vulcan_users"
}

const pgdb = new postgresql.Client({ connectionString: postgresURL })
pgdb.connect()

module.exports = pgdb