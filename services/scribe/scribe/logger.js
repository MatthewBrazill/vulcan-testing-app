"use strict"

// Imports
const winston = require("winston")
const fs = require("fs")

// Create log file if it doesn't exist
if (!fs.existsSync("/logs")){
    fs.mkdirSync("/logs");
}
fs.closeSync(fs.openSync("/logs/scribe.log", 'w'))

// Create the Logger
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: "/logs/scribe.log",
            level: "debug",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
})

module.exports = logger