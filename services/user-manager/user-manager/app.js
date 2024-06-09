"use strict"

// Require the extentions
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
tracer.use("redis", { service: "session-store" })
tracer.use("pg", { dbmPropagationMode: 'full', service: "user-database" })
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
    // Create log file if it doesn't exist
    if (!fs.existsSync("/logs")) {
        fs.mkdirSync("/logs");
    }
    fs.closeSync(fs.openSync("/logs/user-manager.log", 'w'))

    // Create the app
    const app = express()

    // Set up redis client
    var redisClient = redis.createClient({ url: "redis://database-proxy:6379" })
    await redisClient.connect()

    // Set up sessions
    app.use(session({
        secret: "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*",
        saveUninitialized: true,
        resave: false,
        name: "etna",
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
            path: req.path,
            method: req.method,
            status: res.statusCode,
            message: `user-manager accessed ${req.path}`
        })
    })

    // Register templates
    app.engine("html", hbs.engine({
        extname: ".html",
        layoutsDir: "./../frontend/pages",
        partialsDir: "./../frontend/partials",
        defaultLayout: false
    }))
    app.set("view engine", "html")
    app.set("views", "./../frontend/pages")

    // Remaining WebApp settings
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(express.static("./../frontend/statics"))
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
    app.route("/create").post(users.createUser)
    app.route("/get").post(users.getUser)
    app.route("/update").post(users.updateUser)
    app.route("/delete").post(users.deleteUser)

    https.createServer({
        key: fs.readFileSync(`${process.env.VLCN_CERT_FOLDER}/key.pem`),
        cert: fs.readFileSync(`${process.env.VLCN_CERT_FOLDER}/cert.pem`)
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