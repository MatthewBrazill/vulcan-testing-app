"use strict"

// Imports
const logger = require("./logger")
const databases = require("./databases")

const handlers = {
    async userNotesHandler(payload) {
        // Extract JSON message to object
        var message = JSON.parse(payload.message.value.toString())

        // Update/create user notes
        var userNotes = (await databases.notesDatabase()).collection("userNotes")
        var result = await userNotes.updateOne({
            username: message.username
        }, {
            $push: {
                notes: message.note
            }
        }, {
            upsert: true
        })
        
        // Handle mongo result
        if (result.acknowledged) {
            // Update user as having notes once acknowledged
            var userDb = await databases.userDatabase()
            userDb.query("SELECT hasnotes FROM users WHERE username = $1", [ message.username ]).then((result) => {
                if (!result.rows[0].hasnotes) {
                    logger.debug(`updating user '${message.username}' as having notes`)
                    userDb.query("UPDATE users SET hasnotes = 'true' WHERE username = $1", [ message.username ])
                } else {
                    logger.debug(`user '${message.username}' already has notes`)
                }
            }).catch((err) => { throw err })

            // Log note creation
            if (result.modifiedCount > 0) logger.info(`updated notes for user '${message.username}'`)
            if (result.upsertedCount > 0) logger.info(`created notes for user '${message.username}'`)
        } else {
            logger.error("notes-database failed to acknowledge or didn't perform any notes update", message)
        }
    },

    async godNotesHandler(payload) {
        logger.info("kafka god-note payload: ", payload)
        // TODO implement handler
    }
}

module.exports = handlers