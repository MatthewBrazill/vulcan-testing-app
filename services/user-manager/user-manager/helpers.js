'use strict'

// Imports
const tracer = require("dd-trace").tracer
const logger = require("./logger.js")

const helpers = {
    async validate(params, tests) {
        return await tracer.trace("user-manager.helper", { resource: "validate" }, async () => {
            const span = tracer.scope().active()
            try {
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
                span.setTag("error", err)
                span.setTag("valid", false)
                return false
            }
        })
    }
}

module.exports = helpers