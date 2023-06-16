'use strict'

// Imports
import logger from './logger.js'
import db from './mongodb.js'

const helpers = {
    async authorize(req) {
        var userId = req.session.userId
        mongo.Collection(users)
    },

    async validate(params, tests) {
        for (var test in tests) {
            if (!params[test[0]].matches(test[1])) {
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

export default helpers