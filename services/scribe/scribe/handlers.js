"use strict"

// Imports
const tracer = require("dd-trace")
const logger = require("./logger").express()
const databases = require("./databases")

const handlers = {
    async userNotesHandler(payload) {
        return await tracer.trace("scribe.handler", { resource: "userNotesHandler" }, async () => {
            // Extract JSON message to object
            var message = JSON.parse(payload.message.value.toString())

            // Update/create user notes
            const client = await databases.notesDatabase()
            const col = client.db("notes").collection("userNotes")
            var result = await col.updateOne({
                username: message.username
            }, {
                $addToSet: {
                    notes: message.note
                }
            }, {
                upsert: true
            })
            client.close()

            // Handle mongo result
            if (result.acknowledged) {
                // Update user as having notes once acknowledged
                var userDb = await databases.userDatabase()
                userDb.query("SELECT hasnotes FROM users WHERE username = $1", [message.username]).then((result) => {
                    if (!result.rows[0].hasnotes) {
                        logger.debug(`updating user '${message.username}' as having notes`)
                        userDb.query("UPDATE users SET hasnotes = 'true' WHERE username = $1", [message.username])
                    } else {
                        logger.debug(`user '${message.username}' already has notes`)
                    }
                    userDb.end()
                }).catch((err) => { throw err })

                // Log note creation
                if (result.modifiedCount > 0) logger.info(`updated notes for user '${message.username}'`)
                if (result.upsertedCount > 0) logger.info(`created notes for user '${message.username}'`)
            } else {
                logger.error("notes-database failed to acknowledge or didn't perform any notes update", message)
            }
        })
    },

    async godNotesHandler(payload) {
        return await tracer.trace("scribe.handler", { resource: "godNotesHandler" }, async () => {
            // Extract JSON message to object
            var message = JSON.parse(payload.message.value.toString())

            // Update/create god note
            const client = await databases.notesDatabase()
            const col = client.db("notes").collection("userNotes")
            var result = await col.insertOne({
                godId: message.godId,
                description: message.description
            })
            client.close()

            // Handle mongo result
            if (result.acknowledged) {
                logger.info(`created note for god '${message.godId}'`, message.godId)
            } else {
                logger.error("notes-database failed to acknowledge or didn't create note", message)
            }
        })
    }
}

module.exports = handlers