'use strict'

// Imports
const fetch = require("node-fetch")
const helpers = require("./helpers.js")
const logger = require("./logger.js")
const databases = require("./databases.js")

const users = {
    async createUser(req, res) {
        try {
            res.sendStatus(501)
        } catch (err) {
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
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json(err)
        }
    },

    async updateUser(req, res) {
        try {
            res.sendStatus(501)
        } catch (err) {
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
            res.sendStatus(501)
        } catch (err) {
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