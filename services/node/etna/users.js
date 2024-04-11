'use strict'

// Imports
const helpers = require("./helpers.js")
const logger = require("./logger.js")
const pgdb = require("./postgres.js")

const users = {
    async loginPage(req, res) {
        try {
            // Destroy old session
            req.session.destroy()

            res.status(200).render("login", {
                title: "Login Page",
                language: "JS"
            })
        } catch (err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).render("error", {
                title: "Error",
                language: "JS",
                httpCode: "500",
                message: "There was an issue with the Server, please try again later."
            })
        }
    },

    async userPage(req, res) {
        try {
            var permissions = await helpers.authorize(req)
            switch (permissions) {
                case "user":
                case "admin":
                    var result = await pgdb.query("SELECT * FROM users WHERE username = $1::text", [req.params.username])

                    result = result.rows[0]
                    delete result.password

                    res.status(200).render("user", {
                        title: "User",
                        language: "JS",
                        user: result
                    })
                    break

                case "none":
                    res.status(302).redirect("/login")
                    break

                default:
                    throw new Error(`VulcanError: unsupported permission ${permissions}`)
            }
        } catch (err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).render("error", {
                title: "Error",
                language: "JS",
                httpCode: "500",
                message: "There was an issue with the Server, please try again later."
            })
        }
    },

    async loginAPI(req, res) {
        try {
            // Validate request body
            if (!await helpers.validate(req.body, [["username", "^[a-zA-Z]{1,32}$"], ["password", "^.{1,64}$"]])) {
                res.status(400).json({
                    message: "There was an issue with your request.",
                })
                return
            }

            // Get user form DB
            var result = await pgdb.query("SELECT * FROM users WHERE username = $1::text", [req.body.username])
            var user = result.rows[0]

            // Validate user
            if (result.rowCount > 0) if (req.body.password == user.password) {
                req.session.permissions = user.permissions
                req.session.authorized = true
                req.session.username = user.username
                res.status(200).json({
                    "message": "Successfully logged in."
                })
                return
            }
            res.status(403).json({
                "message": "Your login details are incorrect."
            })
        } catch (err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json({ message: "There was an issue with the Server, please try again later." })
        }
    },

    async logoutAPI(req, res) {
        try {
            req.session.destroy()
            res.status(200).json({
                message: "Successfully logged out."
            })
        } catch (err) {
            logger.error({
                error: err.message,
                stack: err.stack,
                endpoint: req.path,
                message: `error with '${req.path}' endpoint`
            })
            res.status(500).json({ message: "There was an issue with the Server, please try again later." })
        }
    }
}

module.exports = users