'use strict'

// Imports
import logger from "./logger.js"
import helpers from "./helpers.js"
import db from "./mongodb.js"

const users = {
    async loginPage(req, res) {
        res.status(200).render("login", {
            title: "Login Page"
        })
    },

    async loginAPI(req, res) {
        // Validate request body
        if (!helpers.validate(req, req.body, [{ username: "[a-zA-Z]{1,32}" }, { password: ".{1,64}" }])) {
            res.status(400).json({
                message: "There was an issue with your request.",
            })
            return
        }

        // Destroy old session
        req.session.destroy()

        // Get user form DB
        var col = db.collection("users")
        var result = await col.findOne({ "username": req.body.username })

        // Validate user
        if (result != null) if (req.body.password == result.password) {
            req.session.userId = result.userId
            res.status(200).json({
                "message": "Successfully logged in.",
                "userId": result.userId,
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

export default users