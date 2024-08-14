'use strict'

// Imports
const logger = require("./logger.js")
const databases = require("./databases.js")

const notes = {
    async get(req, res) {
        try {
            const db = (await databases.notesDatabase()).collection("userNotes")
            var user = await db.findOne({ username: req.body.username })

            if (user.notes === undefined) {
                res.sendStatus(404)
            }
            res.status(200).json({ notes: user.notes })
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

module.exports = notes