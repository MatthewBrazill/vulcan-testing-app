"use strict"

// Imports
import postgresql from "postgres"

const pgdb = postgresql("postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@user-database:5432/vulcan_users")

export default pgdb