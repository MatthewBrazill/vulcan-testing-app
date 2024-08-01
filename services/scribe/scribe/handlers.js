"use strict"

// Imports
const logger = require("./logger")

const handlers = {
    async userNotesHandler(payload) {
        logger.info("kafka user-note payload: ", payload)
        // TODO implement handler
    },

    async godNotesHandler(payload) {
        logger.info("kafka god-note payload: ", payload)
        // TODO implement handler
    }
}

module.exports = handlers