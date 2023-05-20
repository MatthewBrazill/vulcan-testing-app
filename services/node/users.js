'use strict'

// Imports
const logger = require("./logger.js")
const helpers = require("./helpers.js")
const mongo = require("mongodb")


const users = {
    async loginPage(req, res) {
        res.status(200).render("login", {
            title: "Login Page"
        })
    },

    async loginAPI(req, res) {
        if (helpers.validate(req, req.body, [{ username: "[a-zA-Z]{1,32}" }, { password: ".{1,64}" }])) {
            res.status(500).json({
                message: "There was an issue with your request.",
            })
            return
        }

        //var coll = new mongo.MongoClient("").
    },

    async logoutAPI(req, res) {
        req.session.destroy()
        res.status(200).json({
            message: "Successfully logged out."
        })
    }
}

module.exports = users