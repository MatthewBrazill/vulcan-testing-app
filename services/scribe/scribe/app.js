"use strict"

// Require the extensions
const tracer = require("dd-trace")
tracer.init({
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
    appsec: true,
    tags: {
        "git.commit.sha": process.env.VLCN_COMMIT_SHA,
        "git.repository_url": "https://github.com/MatthewBrazill/vulcan-testing-app"
    }
})
tracer.use("dns", { enabled: false })
tracer.use("net", { enabled: false })
tracer.use("pg", { dbmPropagationMode: 'full', service: "user-database" })
tracer.use("mongodb-core", { service: "god-database" })

const fs = require("fs")
const kafka = require("kafkajs")
const logger = require("./logger.js")
const handlers = require("./handlers.js")

async function start() {
    // Create log file if it doesn't exist
    if (!fs.existsSync("/logs")) {
        fs.mkdirSync("/logs");
    }
    fs.closeSync(fs.openSync("/logs/scribe.log", 'w'))

    // Setting up Kafka Queues
    const queue = new kafka.Kafka({
        clientId: "docker-scribe",
        brokers: ["notes-queue:9092"],
        logCreator: (level) => {
            // Define the custom logger to use Winston
            return (log) => {
                switch (level) {
                    case kafka.logLevel.ERROR:
                    case kafka.logLevel.NOTHING:
                        return logger.error(log.log)
                    case kafka.logLevel.WARN:
                        return logger.warn(log.log)
                    case kafka.logLevel.INFO:
                        return logger.info(log.log)
                    case kafka.logLevel.DEBUG:
                        return logger.debug(log.log)
                }
            }
        }
    })

    // Kafka Queue Configurations
    const consumer = queue.consumer({ groupId: "scribe-group" })

    await consumer.connect()
    await consumer.subscribe({ topics: ["user-notes", "god-notes"] })
    await consumer.run({ eachMessage: async (payload) => {
        switch (payload.topic) {
            case "user-notes":
                handlers.userNotesHandler(payload)
                break
            
            case "god-notes":
                handlers.godNotesHandler(payload)
                break

            default:
        }
    }})
}

start().catch((err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        message: `fatal error when starting scribe: ${err.name}`
    })
    console.log(`fatal error when starting scribe: ${err}`)
})