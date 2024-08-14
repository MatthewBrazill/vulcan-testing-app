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
tracer.use("pg", { dbmPropagationMode: 'full', service: "user-database" })

const express = require("express")
const https = require("https")
const fs = require("fs")
const logger = require("./logger.js")
const users = require("./users.js")

async function start() {
    // Create log file if it doesn't exist
    if (!fs.existsSync("/logs")) {
        fs.mkdirSync("/logs");
    }
    fs.closeSync(fs.openSync("/logs/user-manager.log", 'w'))

    // Create the app
    const app = express()

    // Set up middleware logging
    app.use(function requestLogging(req, res, next) {
        next()
        logger.info({
            path: req.path,
            method: req.method,
            status: res.statusCode,
            message: `user-manager accessed ${req.path}`
        })
    })

    // Remaining WebApp settings
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Users
    app.route("/create").post(users.createUser)
    app.route("/get").post(users.getUser)
    app.route("/all").get(users.getAllUsers)
    app.route("/delete").post(users.deleteUser)

    // Allow insecure connections
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

    https.createServer({
        key: fs.readFileSync(`${process.env.CERT_FOLDER}/key.pem`),
        cert: fs.readFileSync(`${process.env.CERT_FOLDER}/cert.pem`)
    }, app).listen(910, () => {
        logger.info("starting user-manager")
    })
}

start().catch((err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        message: `fatal error when starting user-manager: ${err.name}`
    })
    console.log(`fatal error when starting user-manager: ${err}`)
})