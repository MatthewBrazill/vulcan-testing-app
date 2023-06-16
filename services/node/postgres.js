"use strict"

// Imports
import postgresql from "postgres"

const postgres = postgresql({
    host: "user-database",
    post: 5432,
    database: "vulcan-users"
})

export default postgres