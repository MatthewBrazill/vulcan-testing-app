'use strict'

// Imports
import logger from './logger.js'
import pgdb from './postgres.js'

const helpers = {
    async authorize(req) {
        var username = req.session.username

        if (username == null || username == "") {
            return "no_auth"
        }

        var result = await (pgdb`SELECT * FROM users WHERE username = ${username}`)
        var user = result[0]

        if (result.length > 0) return user.permissions
        else return "no_auth"
    },

    async validate(params, tests) {
        for (var test of tests) {
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

export default helpers