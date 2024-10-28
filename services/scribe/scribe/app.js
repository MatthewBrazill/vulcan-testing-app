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
const logger = require("./logger.js").default()
const kafkaLogger = require("./logger.js").kafka()
const expressLogger = require("./logger.js").express()
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

async function createKafkaConsumer() {
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
                        return kafkaLogger.error(log.log)
                    case kafka.logLevel.WARN:
                        return kafkaLogger.warn(log.log)
                    case kafka.logLevel.INFO:
                        return kafkaLogger.info(log.log)
                    case kafka.logLevel.DEBUG:
                        return kafkaLogger.debug(log.log)
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
    })) kafkaLogger.debug("created kafka topics")
    else kafkaLogger.debug("kafka topics already exist")
    await admin.disconnect()

    // Kafka Consumer Configurations
    const consumer = client.consumer({ groupId: "scribe-group" })
    return consumer
}

async function startExpress() {
    // Create express app
    const app = express()

    // Set up middleware logging
    app.use(function requestLogging(req, res, next) {
        next()
        expressLogger.info({
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
        expressLogger.info("express server started")
    })
}

start().then(async () => {
    while (true) {
        var consumer
        try {
            kafkaLogger.info("starting kafka consumer")
            consumer = await createKafkaConsumer()

            // Connect to kafka broker
            kafkaLogger.debug("connecting to kafka broker")
            await consumer.connect()
            kafkaLogger.debug({ message: "subscribing to kafka topics", topics: ["user-notes", "god-notes"] })
            await consumer.subscribe({ topics: ["user-notes", "god-notes"] })
            kafkaLogger.debug("running kafka consumer handler")
            await consumer.run({
                eachMessage: async (payload) => {
                    return await tracer.trace("scribe.route", async function routeKafkaQueue() {
                        kafkaLogger.info({
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
        }
        catch (err) {
            kafkaLogger.warn({
                error: err,
                message: `error running scribe kafka consumer: ${err.message}`
            })
        }
        kafkaLogger.debug("stopping kafka consumer")
        await consumer.stop()
        kafkaLogger.debug("disconnecting from kafka broker")
        await consumer.disconnect()
        kafkaLogger.warn("restarting scribe kafka consumer")
    }
}).then(async () => {
    while (true) {
        try {
            expressLogger.info("starting express server")
            await startExpress()
        }
        catch (err) {
            expressLogger.warn({
                error: err,
                message: `scribe express server ran into an issue: ${err.message}`
            })
            expressLogger.warn("restarting scribe express server")
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