"use strict"

// Require the extensions
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

async function startKafka() {
    // Setting up Kafka Client and connect
    kafkaLogger.info("starting kafka client")
    var kafkaIsRunning = true
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
        },
        retry: {
            restartOnFailure: async (err) => {
                kafkaIsRunning = false
                logger.error({
                    err: err,
                    message: `failed to restart the kafka consumer with error: ${err.message}`
                })
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
    kafkaLogger.info("starting kafka consumer")
    const consumer = client.consumer({ groupId: "scribe-group" })

    // Connect to kafka broker
    kafkaLogger.debug("connecting to kafka broker")
    await consumer.connect()
    kafkaLogger.debug({ message: "subscribing to kafka topics", topics: ["user-notes", "god-notes"] })
    await consumer.subscribe({ topics: ["user-notes", "god-notes"] })
    kafkaLogger.debug("running kafka consumer handler")
    await consumer.run({
        eachMessage: async (payload) => {
            return await async function routeKafkaQueue() {
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
            }
        }
    })

    while (kafkaIsRunning) {
        await new Promise(() => setTimeout(() => { return true }, 1000))
    }

    consumer.disconnect()
    return "start kafka finished"
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
    expressLogger.debug("configured express settings")

    // Users
    app.route("/user/notes/get").post(notes.get)
    app.route("/user/notes/delete").post(notes.delete)
    expressLogger.debug("registered express routes")

    https.createServer({
        key: fs.readFileSync(`${process.env.CERT_FOLDER}/key.pem`),
        cert: fs.readFileSync(`${process.env.CERT_FOLDER}/cert.pem`)
    }, app).listen(443, () => {
        expressLogger.info("express server started")
    })

    return "start express finished"
}

start().then(async () => {
    var kafkaPromise
    var kafkaRunning = false

    var expressPromise
    var expressRunning = false

    while (true) {
        logger.debug("running start loop")
        if (!kafkaRunning) {
            kafkaPromise = startKafka()
            kafkaPromise.catch((err) => {
                kafkaRunning = false
                kafkaLogger.warn({
                    error: err,
                    message: `error running scribe kafka consumer: ${err.message}`
                })
                kafkaLogger.debug("restarting scribe kafka consumer")
            }).then(() => kafkaRunning = false)
            kafkaRunning = true
        }

        if (!expressRunning) {
            expressPromise = startExpress()
            expressPromise.catch((err) => {
                expressRunning = false
                expressLogger.warn({
                    error: err,
                    message: `scribe express server ran into an issue: ${err.message}`
                })
                expressLogger.debug("restarting scribe express server")
            }).then(() => expressRunning = false)
            expressRunning = true
        }

        var waiter = Promise.all([kafkaPromise, expressPromise])
        await waiter

        logger.debug({ message: "promise.all() resolved", promises: [kafkaPromise, expressPromise] })
        await new Promise(() => setTimeout(() => logger.debug("waited 100ms before retry"), 100))
    }
}).catch((err) => {
    logger.error({
        error: err,
        note: "Uhh, this shouldn't ever happen. Like, this should be impossible. Congrats for reading this!",
        message: `fatal error when starting scribe: ${err.name}`
    })
    console.log(`fatal error when starting scribe: ${err}`)
})