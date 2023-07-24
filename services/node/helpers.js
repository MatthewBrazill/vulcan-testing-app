'use strict'

// Imports
const logger = require("./logger.js")
const pgdb = require("./postgres.js")

const helpers = {
    async authorize(req) {
        var username = req.session.username

        if (username == null || username == "") {
            var result = await pgdb.query("SELECT * FROM apikeys WHERE apikey = $1::text", [req.headers["api-key"]])
        } else {
            var result = await pgdb.query("SELECT * FROM users WHERE username = $1::text", [username])
        }

        if (result.rowCount > 0) return result.rows[0].permissions
        else return "no_auth"
    },

    async validate(params, tests) {
        for (var test of tests) {
            if (typeof params[test[0]] === "undefined") {
                logger.debug({
                    message: `Parameter unavailable for ${params[test[0]]}`,
                    key: test[0],
                    pattern: test[1],
                    value: params[test[0]]
                })
                return false
            }

            if (!params[test[0]].match(test[1])) {
                logger.debug({
                    message: `Validation failed for ${params[test[0]]}`,
                    key: test[0],
                    pattern: test[1],
                    value: params[test[0]]
                })
                return false
            }
        }
        return true
    }
}

module.exports = helpers