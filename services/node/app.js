"use strict"

// Import the extensions
const tracer = require("dd-trace")
const express = require("express")
const session = require("express-session")
const cookie = require("cookie-parser")
const mongo = require("connect-mongo")
const https = require("https")
const fs = require("fs")
const logger = require("./logger.js")
const gods = require("./gods.js")
const storage = require("./storage.js")
const users = require("./users.js")

async function start() {
    // Create the app
    const app = express()

    // Set up sessions
    app.use(session({
        secret: process.env.VULCAN_SESSION_KEY,
        saveUninitialized: false,
        resave: false,
        store: mongo.create({
            mongoUrl: "mongodb://vulcan-database:27017",
            dbName: "vulcan",
            collectionName: "node-sessions",
            ttl: 86400,
            autoRemove: "native"
        })
    }))

    // Set up middleware logging
    app.use(function requestLogging(req, res, next) {
        logger.info({
            client_ip: req.client_ip,
            path: req.path,
            method: req.method,
            status: req.statusCode,
            user_id: req.session.userId,
            message: `IP ${req.client_ip} accessed: ${req.path}`
        })
        next()
    })

    // Register templates
    app.set("view engine", "html")
    app.set("views", "../frontend/pages")

    // Remaining WebApp settings
    app.set(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(express.static("../../statics"))
    app.use(express.static("../../js"))
    app.use(cookie())

    // Define routes
    app.route("/").get((req, res) => { res.status(301).redirect("/storage") })

    // Login, signup, etc
    app.route("/login").get(users.loginPage)
    app.route("/login").post(users.loginAPI)
    app.route("/logout").get(users.logoutAPI)

    // Storage page
    app.route("/storage").get(storage.storagePage)
    app.route("/storage/search").post(storage.storageSearchAPI)

    // Add page
    app.route("/add").get(storage.addGodPage)

    // Edit page
    app.route("/edit").get(storage.editGodPage)

    // Gods
    app.route("/gods/create").post(gods.godCreateAPI)
    app.route("/gods/get").post(gods.godGetAPI)
    app.route("/gods/update").post(gods.godUpdateAPI)
    app.route("/gods/delete").post(gods.godDeleteAPI)

    // Error endpoint
    app.route("/error").get((req, res) => {
        var err = new Error("deliberate error: error testing enpoint")
        logger.error({
            error: err.message,
            stack: err.stack,
            message: "Error from the error testing enpoint."
        })
        res.status(500).json({
            message: "This is a error testing endpoint. It will always return a 500 error.",
        })
    })

    // 404 page
    app.use((req, res) => {
        res.status(404).render("error", {
            Title: "Not Found",
            HttpCode: "404",
            Message: "There was an issue with the Server, please try again later."
        })
    })

    https.createServer({
        key: fs.readFileSync("../../cert/key.pem"),
        cert: fs.readFileSync("../../cert/cert.pem")
    }, app).listen(443, () => {
        console.log("Server started")
    })
}

// Initialize Datadog Traces
tracer.init({
    logInjection: true,
    runtimeMetrics: true,
})

// Create Server
start().catch((err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        message: "Fatal error when starting server"
    })
    console.log(`Fatal error when starting server: ${err}`)
})