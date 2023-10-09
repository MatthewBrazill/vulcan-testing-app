"use strict"

// Require the extentions
const tracer = require("dd-trace")
tracer.init({
    hostname: 'datadog-agent',
    port: 8126,
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
    appsec: true,
    tags: {
        "git.commit.sha": process.env.VULCAN_COMMIT_SHA,
        "git.repository_url": "https://github.com/MatthewBrazill/vulcan-testing-app"
    }
})
tracer.use("redis", { service: "session-store" })
tracer.use("pg", { service: "user-database" })
tracer.use("mongodb-core", { service: "god-database" })

const express = require("express")
const session = require("express-session")
const cookie = require("cookie-parser")
const redisStore = require("connect-redis")
const redis = require("redis")
const https = require("https")
const fs = require("fs")
const hbs = require("express-handlebars")
const logger = require("./logger.js")
const gods = require("./gods.js")
const storage = require("./storage.js")
const users = require("./users.js")

async function start() {
    // Create the app
    const app = express()

    // Set up redis client
    var redisClient = redis.createClient({ url: "redis://session-store:6379" })
    await redisClient.connect()

    // Set up sessions
    app.use(session({
        secret: process.env.VULCAN_SESSION_KEY,
        saveUninitialized: true,
        resave: false,
        name: "vulcan-js",
        cookie: {
            maxAge: 86400000,
            secure: true,
            httpOnly: true,
        },
        store: new redisStore.default({ client: redisClient, prefix: "js:sess:" })
    }))

    // Set up middleware logging
    app.use(function requestLogging(req, res, next) {
        next()
        logger.info({
            client_ip: req.ip.split(":").pop(),
            path: req.path,
            method: req.method,
            status: res.statusCode,
            user_id: req.session.userId,
            message: `IP ${req.ip.split(":").pop()} accessed: ${req.path}`
        })
    })

    // Register templates
    app.engine("html", hbs.engine({
        extname: ".html",
        layoutsDir: "./services/frontend/pages",
        partialsDir: "./services/frontend/partials",
        defaultLayout: false
    }))
    app.set("view engine", "html")
    app.set("views", "./services/frontend/pages")

    // Remaining WebApp settings
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use("/js", express.static("./js"))
    app.use(express.static("./statics"))
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

    // Users
    app.route("/user/:username").get(users.userPage)

    // Error endpoint
    app.route("/error").get(function errorAPI(req, res) {
        var err = new Error("deliberate error: error testing enpoint")
        const span = tracer.scope().active()
        span.setTag('error', err)
        logger.error({
            error: err.message,
            stack: err.stack,
            message: "Error from the error testing enpoint."
        })
        setTimeout(() => {
            res.status(500).json({ message: "This is a error testing endpoint. It will always return a 500 error.", })
        }, 500)
    })

    // 404 page
    app.use(function notFoundPage(req, res) {
        res.status(404).render("error", {
            title: "Not Found",
            language: "JS",
            httpCode: "404",
            message: "There was an issue with the Server, please try again later."
        })
    })

    https.createServer({
        key: fs.readFileSync("./cert/key.pem"),
        cert: fs.readFileSync("./cert/cert.pem")
    }, app).listen(443, () => {
        console.log("Server started")
    })
}

start().catch((err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        message: `fatal error when starting server: ${err.name}`
    })
    console.log(`fatal error when starting server: ${err}`)
})