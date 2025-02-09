'use strict'

// Imports
const https = require("https")
const tracer = require("dd-trace")
const logger = require("./logger.js")
const databases = require("./databases.js")

const users = {
    async createUser(req, res) {
        try {
            logger.debug("creating user: " + req.body.username)
            const db = await databases.userDatabase()
            await db.query("INSERT INTO users (username, pwhash, permissions) VALUES ($1, $2, $3)", [
                req.body.username,
                req.body.pwhash,
                req.body.permissions
            ])
            db.end()

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
    },

    async getUser(req, res) {
        try {
            logger.debug("getting user: " + req.body.username)
            const db = await databases.userDatabase()
            var result = await db.query("SELECT username, hasnotes, permissions FROM users WHERE username = $1", [req.body.username])
            db.end()

            result = result.rows[0]

            if (result === undefined) {
                logger.info("user '" + req.body.username + "' not found")
                res.sendStatus(404)
                return
            }
            
            if (result.hasnotes) {
                var notes = await fetch("https://scribe.vulcan-application.svc.cluster.local/user/notes/get", {
                    method: "POST",
                    body: JSON.stringify({ username: req.body.username }),
                    headers: { "Content-Type": "application/json" },
                    agent: new https.Agent({
                        requestCert: true,
                        rejectUnauthorized: false
                    })
                })
                switch (notes.status) {
                    case 200:
                        notes = await notes.json()
                        result.notes = notes.notes
                        break
                    case 404:
                        logger.error("no notes found for user '" + req.body.username + "', but they should exists")
                        break
                    default:
                        throw "VulcanError: unexpected response from scribe"
                }
            }

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

    async getAllUsers(req, res) {
        try {
            logger.debug("getting all users")
            const db = await databases.userDatabase()
            var result = await db.query("SELECT username FROM users")
            db.end()

            result = result.rows

            if (result === undefined) {
                logger.info("no users found")
                res.sendStatus(404)
            } else {
                res.status(200).json(result)
            }
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

            var result = await db.query("SELECT username, hasnotes, permissions FROM users WHERE username = $1", [req.body.username])
            result = result.rows[0]

            var deleted = db.query("DELETE FROM users WHERE username = $1", [req.body.username])

            if (result === undefined) {
                logger.info("user '" + req.body.username + "' not found")
                res.sendStatus(404)
                return
            }

            if (result.hasnotes) {
                fetch("https://scribe.vulcan-application.svc.cluster.local/user/notes/delete", {
                    method: "POST",
                    body: JSON.stringify({ username: req.body.username }),
                    headers: { "Content-Type": "application/json" },
                    agent: new https.Agent({
                        requestCert: true,
                        rejectUnauthorized: false
                    })
                })
            }

            await deleted
            db.end()

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