"use strict"

// Imports
const postgresql = require("pg")

const pgdb = new postgresql.Client({ connectionString: "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@user-database:5432/vulcan_users" })
pgdb.connect()

module.exports = pgdb