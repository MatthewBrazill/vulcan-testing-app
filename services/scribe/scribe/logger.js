"use strict"

// Imports
const winston = require("winston")
const fs = require("fs")

// Create log file if it doesn't exist
if (!fs.existsSync("/logs")) {
    fs.mkdirSync("/logs");
}
fs.closeSync(fs.openSync("/logs/scribe.log", 'w'))

// Create the Logger
const logger = {
    default() {
        return winston.createLogger({
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
    },

    kafka() {
        return winston.createLogger({
            defaultMeta: { component: "kafka" },
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
    },

    express() {
        return winston.createLogger({
            defaultMeta: { component: "express" },
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
    },
}

module.exports = logger