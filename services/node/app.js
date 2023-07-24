"use strict"

// Initialize Datadog Traces
//import "./tracer.js"

/* Import the extensions
import express from "express"
import session from "express-session"
import cookie from "cookie-parser"
import redisStore from "connect-redis"
import redis from "redis"
import https from "https"
import fs from "fs"
import hbs from "express-handlebars"
import logger from "./logger.js"
import gods from "./gods.js"
import storage from "./storage.js"
import users from "./users.js"
//*/

//* Require the extentions
const tracer = require("dd-trace")
tracer.init({
    hostname: 'datadog-agent',
    port: 8126,
    logInjection: true,
    runtimeMetrics: true,
    profiling: true
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
//*/

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
            maxAge: 86400,
            secure: true,
            httpOnly: true,
        },
        store: new redisStore.default({
            client: redisClient,
            ttl: 86400
        })
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

    // Error endpoint
    app.route("/error").get((req, res) => {
        var err = new Error("deliberate error: error testing enpoint")
        logger.error({
            error: err.message,
            stack: err.stack,
            message: "Error from the error testing enpoint."
        })
        setTimeout(() => {
            res.status(500).json({
                message: "This is a error testing endpoint. It will always return a 500 error.",
            })
        }, 500)
    })

    // 404 page
    app.use((req, res) => {
        res.status(404).render("error", {
            title: "Not Found",
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
        message: "Fatal error when starting server"
    })
    console.log(`Fatal error when starting server: ${err}`)
})