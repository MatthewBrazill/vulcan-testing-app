"use strict"

// Imports
import winston from "winston"

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

export default logger