"use strict"

// Imports
const logger = require("./logger")
const databases = require("./databases")

const handlers = {
    async userNotesHandler(payload) {
        // Update/create user notes
        var userNotes = (await databases.notesDatabase()).collection("userNotes")
        var result = await userNotes.updateOne({
            username: payload.username
        }, {
            $push: {
                notes: payload.note
            }
        }, {
            upsert: true
        })
        
        if (result.acknowledged) {
            // Update user as having notes once acknowledged
            var userDb = await databases.userDatabase()
            userDb.query("SELECT hasNotes FROM users WHERE username = $1", payload.username).then((result) => {
                if (!result.rows[0].hasNotes) {
                    logger.debug(`updating user '${payload.username}' as having notes`)
                    userDb.query("UPDATE hasNotes SET hasNotes = 'true' WHERE username = $1", payload.username)
                } else {
                    logger.debug(`user '${payload.username}' already has notes`)
                }
            })

            // Log note creation
            if (result.modifiedCount > 0) logger.info(`updated notes for user '${payload.username}'`)
            if (result.upsertedCount > 0) logger.info(`created notes for user '${payload.username}'`)
        } else logger.error("notes-database failed to acknowledge or didn't perform any notes update", payload)
    },

    async godNotesHandler(payload) {
        logger.info("kafka god-note payload: ", payload)
        // TODO implement handler
    }
}

module.exports = handlers