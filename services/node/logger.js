"use strict"

// Imports
const winston = require("winston")
const fs = require("fs")

// Create log file if it doesn't exist
fs.mkdirSync("./logs")
fs.closeSync(fs.openSync("./logs/node.log", 'w'))

// Create the Logger
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: "./logs/node.log",
            level: "debug",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
})

module.exports = logger