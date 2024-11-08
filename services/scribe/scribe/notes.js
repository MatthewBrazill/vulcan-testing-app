'use strict'

// Imports
const tracer = require("dd-trace")
const logger = require("./logger.js").kafka()
const databases = require("./databases.js")

const notes = {
    async get(req, res) {
        try {
            const client = await databases.notesDatabase()
            const col = client.db("notes").collection("userNotes")
            var notes = await col.findOne({ username: req.body.username })
            client.close()

            if (notes === null) {
                res.sendStatus(404)
                return
            }
            res.status(200).json({ notes: notes.notes })
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

    async delete(req, res) {
        try {
            const client = await databases.notesDatabase()
            const col = client.db("notes").collection("userNotes")
            var result = await col.deleteOne({ username: req.body.username })
            client.close()

            if (result === null) {
                res.sendStatus(404)
                return
            }
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

module.exports = notes