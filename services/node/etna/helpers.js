'use strict'

// Imports
const tracer = require("dd-trace").tracer
const fetch = require("node-fetch")
const logger = require("./logger.js")

const helpers = {
    async authorize(req) {
        return await tracer.trace("etna.helper", { resource: "authorize" }, async () => {
            const span = tracer.scope().active()
            try {
                if (!req.session.authorized) {
                    logger.debug("session not authorized - authorising")

                    var authReq = await fetch("http://authenticator:2884/authorize", {
                        method: "POST",
                        body: JSON.stringify(req.headers["api-key"] ? {
                            apiKey: req.headers["api-key"]
                        } : {
                            username: req.body.username
                        })
                    })

                    if (authReq.status == 200) {
                        var authRes = await authReq.json()
                        logger.debug("session authorized")
                        span.setTag("authorized", true)
                        return authRes.permissions
                    } else {
                        logger.debug("session failed to authorize")
                        span.setTag("authorized", false)
                        return "none"
                    }
                } else {
                    logger.debug("session authorized")
                    span.setTag("authorized", true)
                    return req.session.permissions
                }
            } catch (err) {
                span.setTag("error", err)
                span.setTag("authorized", false)
                return "none"
            }
        })
    },

    async validate(params, tests) {
        return await tracer.trace("etna.helper", { resource: "validate" }, async () => {
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
    },

    // Do some useless work just to show off async features in Datadog
    async asyncExample(number) {
        return await tracer.trace("etna.helper", { resource: "asyncExample" }, async () => {
            number = Math.floor(number * 4) + 1
            await new Promise(r => setTimeout(r, number))
        })
    }
}

module.exports = helpers