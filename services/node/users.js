'use strict'

// Imports
const helpers = require("./helpers.js")
const logger = require("./logger.js")
const pgdb = require("./postgres.js")

const users = {
    async loginPage(req, res) {
        // Destroy old session
        req.session.destroy()

        res.status(200).render("login", {
            title: "Login Page"
        })
    },

    async userPage(req, res) {
        var perms = await helpers.authorize(req)
        switch (perms) {
            case "user", "admin":
                var result = await pgdb.query("SELECT * FROM users WHERE username = $1::text", [req.params.username])

                result = result.rows[0]
                delete result.password

                res.status(200).render("user", {
                    title: "User",
                    user: result
                })
                break

            case "no_auth":
                res.status(302).redirect("/login")
                break

            default:
                res.status(500).render("error", {
                    title: "Error",
                    httpCode: "500",
                    message: "There was an issue with the Server, please try again later."
                })
        }
    },

    async loginAPI(req, res) {
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
            req.session.username = user.username
            res.status(200).json({
                "message": "Successfully logged in."
            })
            return
        } else {
            res.status(403).json({
                "message": "Your login details are incorrect."
            })
            return
        }

        res.status(500).json({
            "message": "There was an issue with the Server, please try again later.",
        })
    },

    async logoutAPI(req, res) {
        req.session.destroy()
        res.status(200).json({
            message: "Successfully logged out."
        })
    }
}

module.exports = users