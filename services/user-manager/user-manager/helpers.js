'use strict'

// Imports
const logger = require("./logger.js")

const helpers = {
    async validate(params, tests) {
        try {
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
            logger.debug("validated request body")
            return true
        } catch (err) {
            return false
        }
    }
}

module.exports = helpers