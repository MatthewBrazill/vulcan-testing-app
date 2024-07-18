'use strict'

// Imports
const fetch = require("node-fetch")
const helpers = require("./helpers.js")
const tracer = require("dd-trace").tracer
const logger = require("./logger.js")
const databases = require("./databases.js")

const users = {
    async createUser(req, res) {
        try {
            res.sendStatus(501)
        } catch (err) {
            const span = tracer.scope().active()
            span.setTag('error', err)
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json(err)
        }
    },

    async getUser(req, res) {
        try {
            var result = await databases.userDatabase().query("SELECT * FROM users WHERE username = $1::text", [req.params.username])

            result = result.rows[0]
            delete result.password

            res.status(200).json(result)
        } catch (err) {
            const span = tracer.scope().active()
            span.setTag('error', err)
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json(err)
        }
    },

    async deleteUser(req, res) {
        try {
            logger.debug("deleting user: " + req.body.username)
            const db = await databases.userDatabase()
            await db.query("DELETE FROM users WHERE username = $1", [req.body.username])

            res.sendStatus(200)
        } catch (err) {
            const span = tracer.scope().active()
            span.setTag('error', err)
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json(err)
        }
    }
}

module.exports = users