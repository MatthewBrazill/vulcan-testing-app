"use strict"

// Require the extensions
const tracer = require("dd-trace")
tracer.init({
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
    appsec: true
})
tracer.use("dns", { enabled: false })
tracer.use("net", { enabled: false })
tracer.use("kafkajs", { service: "notes-queue" })
tracer.use("pg", { dbmPropagationMode: 'full', service: "user-database" })
tracer.use("mongodb-core", { service: "notes-database" })

const express = require("express")
const https = require("https")
const fs = require("fs")
const kafka = require("kafkajs")
const logger = require("./logger.js")
const handlers = require("./handlers.js")
const notes = require("./notes.js")

async function start() {
    // Create log file if it doesn't exist
    if (!fs.existsSync("/logs")) { fs.mkdirSync("/logs") }
    fs.closeSync(fs.openSync("/logs/scribe.log", 'w'))
}



/*
Split the kafka and express sections into separate threads
and add some additional failure and restart detection to avoid 
crashing the service when kafka disconnects.
*/

async function startKafka() {
    // Setting up Kafka Client and connect
    const client = new kafka.Kafka({
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: [process.env.KAFKA_BROKER],
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

    // Kafka Listeners
    consumer.on(consumer.events.CRASH, async (e) => {
        try {
            logger.warn(`kafka group '${e.payload.groupId}' encountered error '${e.payload.error}'`, { "event": e.payload, "event.type": e.type })
            await consumer.disconnect()
        } catch (err) {
            logger.error(`kafka couldn't recover from error because of '${err.name}'`, { "error": err })
        }
    })

    consumer.on(consumer.events.STOP, async (e) => {
        try {
            logger.warn(`kafka consumer stopped, trying to restart`, { "event": e.payload, "event.type": e.type })
            await consumer.disconnect()
        } catch (err) {
            logger.error(`kafka couldn't recover from stopped consumer because of '${err.name}'`, { "error": err })
        }
    })

    consumer.on(consumer.events.DISCONNECT, async (e) => {
        try {
            logger.debug(`kafka consumer disconnected, trying to restart`, { "event": e.payload, "event.type": e.type })
            connectToKafkaConsumer(consumer)
        } catch (err) {
            logger.error(`kafka couldn't recover from disconnection because of '${err.name}'`, { "error": err })
        }
    })

    // Connect to kafka broker
    logger.info("connecting to kafka broker")
    await consumer.connect()
    await consumer.subscribe({ topics: ["user-notes", "god-notes"] })
    await consumer.run({
        eachMessage: async (payload) => {
            return await tracer.trace("scribe.route", async function routeKafkaQueue() {
                logger.info({
                    payload: payload,
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
            })
        }
    })
    return consumer
}

async function startExpress() {
    // Create express app
    const app = express()

    // Set up middleware logging
    app.use(function requestLogging(req, res, next) {
        next()
        logger.info({
            path: req.path,
            method: req.method,
            status: res.statusCode,
            message: `scribe accessed ${req.path}`
        })
    })

    // Remaining WebApp settings
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Users
    app.route("/user/notes/get").post(notes.get)

    https.createServer({
        key: fs.readFileSync(`${process.env.CERT_FOLDER}/key.pem`),
        cert: fs.readFileSync(`${process.env.CERT_FOLDER}/cert.pem`)
    }, app).listen(443, () => {
        logger.info("starting scribe")
    })
}

start().then(async () => {
    while (true) {
        try {
            logger.info("starting kafka consumer")
            await startKafka()
        }
        catch (err) {
            logger.warn({
                error: err,
                message: `error starting scribe kafka consumer: ${err.message}`
            })
            logger.warn("restarting scribe kafka consumer")
        }
    }
}).then(async () => {
    while (true) {
        try {
            logger.info("starting express server")
            await startExpress()
        }
        catch (err) {
            logger.warn({
                error: err,
                message: `scribe express server ran into an issue: ${err.message}`
            })
            logger.warn("restarting scribe express server")
        }
    }
}).catch((err) => {
    logger.error({
        error: err,
        note: "Uhh, this shouldn't ever happen. Like, this should be impossible. Congrats for reading this!",
        message: `fatal error when starting scribe: ${err.name}`
    })
    console.log(`fatal error when starting scribe: ${err}`)
})