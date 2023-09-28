'use strict'

// Imports
const tracer = require("dd-trace").tracer
const logger = require("./logger.js")
const pgdb = require("./postgres.js")

const helpers = {
    async authorize(req) {
        return await tracer.trace("vulcan.helper", { resource: "authorize" }, async () => {
            try {
                const span = tracer.scope().active()
                var username = req.session.username

                if (username == null || username == "") {
                    logger.debug("authorize using api key")
                    span.setTag("auth_method", "api_key")
                    var result = await pgdb.query("SELECT * FROM apikeys WHERE apikey = $1::text", [req.headers["api-key"]])
                } else {
                    logger.debug("authorize using username")
                    span.setTag("auth_method", "api_key")
                    var result = await pgdb.query("SELECT * FROM users WHERE username = $1::text", [username])
                }

                logger.debug({ message: `authorize returned permissions: ${result.rows[0].permissions}`, permissions: result.rows[0].permissions })
                if (result.rowCount > 0) {
                    span.setTag("auth", true)
                    return result.rows[0].permissions
                } else {
                    span.setTag("auth", false)
                    return "no_auth"
                }
            } catch (err) {
                span.setTag("auth", false)
                return "error"
            }
        })
    },

    async validate(params, tests) {
        return await tracer.trace("vulcan.helper", { resource: "validate" }, async () => {
            try {
                const span = tracer.scope().active()
                for (var test of tests) {
                    if (typeof params[test[0]] === "undefined") {
                        logger.debug({
                            message: `Parameter unavailable for ${params[test[0]]}`,
                            key: test[0],
                            pattern: test[1],
                            value: params[test[0]]
                        })
                        span.setTag("valid", false)
                        return false
                    }

                    if (!params[test[0]].match(test[1])) {
                        logger.debug({
                            message: `Validation failed for ${params[test[0]]}`,
                            key: test[0],
                            pattern: test[1],
                            value: params[test[0]]
                        })
                        span.setTag("valid", false)
                        return false
                    }
                }
                logger.debug("validated request body")
                span.setTag("valid", true)
                return true
            } catch (err) {
                return false
            }
        })
    }
}

module.exports = helpers