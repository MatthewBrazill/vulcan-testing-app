"use strict"

// Require the extensions
const tracer = require("dd-trace")
tracer.init({
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
    appsec: true
})
tracer.use("kafkajs", { service: "notes-queue" })
tracer.use("pg", { dbmPropagationMode: 'full', service: "user-database" })
tracer.use("mongodb-core", { service: "god-database" })

const fs = require("fs")
const kafka = require("kafkajs")
const logger = require("./logger.js")
const handlers = require("./handlers.js")

async function start() {
    // Create log file if it doesn't exist
    if (!fs.existsSync("/logs")) { fs.mkdirSync("/logs") }
    fs.closeSync(fs.openSync("/logs/scribe.log", 'w'))

    // Setting up Kafka Client
    const client = new kafka.Kafka({
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

    // Create topics if they don't already exist
    const admin = client.admin()
    await admin.connect()
    if (await admin.createTopics({
        topics: [
            { topic: "user-notes" },
            { topic: "god-notes" }
        ]
    })) logger.debug("created kafka topics")
    else logger.debug("kafka topics already exist")
    await admin.disconnect()

    // Kafka Consumer Configurations
    const consumer = client.consumer({ groupId: "scribe-group" })

    // Create function to connect, subscribe and run the consumer
    const connectToKafka = async () => {
        logger.info("connecting to kafka broker")
        await consumer.connect()
        await consumer.subscribe({ topics: ["user-notes", "god-notes"] })
        await consumer.run({
            eachMessage: async (payload) => {
                logger.info({
                    topic: payload.topic,
                    message: `scribe received message for topic ${payload.topic}`
                })
                switch (payload.topic) {
                    case "user-notes":
                        handlers.userNotesHandler(payload)
                        break
                    case "god-notes":
                        handlers.godNotesHandler(payload)
                        break
                }
            }
        })
    }
    connectToKafka()

    consumer.on(consumer.events.CRASH, async (error, groupId, _) => {
        try {
            logger.warn(`kafka group '${groupId}' encountered error '${error.name}'`, error)
            await consumer.disconnect()
        } catch (err) {
            logger.error(`kafka couldn't recover from error because of '${err.name}'`, err)
        }
    })

    consumer.on(consumer.events.STOP, async () => {
        try {
            logger.warn(`kafka consumer stopped, trying to restart`)
            await consumer.disconnect()
        } catch (err) {
            logger.error(`kafka couldn't recover from stopped consumer because of '${err.name}'`, err)
        }
    })

    consumer.on(consumer.events.DISCONNECT, async (error, groupId) => {
        try {
            logger.debug(`kafka consumer disconnected, trying to restart`)
            connectToKafka()
        } catch (err) {
            logger.error(`kafka couldn't recover from disconnection because of '${err.name}'`, err)
        }
    })
}

start().catch((err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        message: `fatal error when starting scribe: ${err.name}`
    })
    console.log(`fatal error when starting scribe: ${err}`)
})