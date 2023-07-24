'use strict'

// Imports
const helpers = require("./helpers.js")
const logger = require("./logger.js")
const mongodb = require("./mongodb.js")

const storage = {
    async editGodPage(req, res) {
        var perms = await helpers.authorize(req)
        switch (perms) {
            case "user", "admin":
                res.status(200).render("edit_god", {
                    title: "Edit God"
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

    async addGodPage(req, res) {
        var perms = await helpers.authorize(req)
        switch (perms) {
            case "user", "admin":
                res.status(200).render("add_god", {
                    title: "Add God"
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

    async storagePage(req, res) {
        var perms = await helpers.authorize(req)
        switch (perms) {
            case "user", "admin":
                res.status(200).render("storage", {
                    title: "God Storage"
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

    async storageSearchAPI(req, res) {
        var perms = await helpers.authorize(req)
        switch (perms) {
            case "user", "admin":
                if (!await helpers.validate(req.body, [["filter", "[a-zA-Z]{0,32}"]])) {
                    res.status(400).json({
                        message: "There was an issue with your request.",
                    })
                    return
                }

                var result = await mongodb.collection("gods").find({ name: new RegExp(req.body.filter) }).toArray()
                res.status(200).json({
                    message: "Successfully filtered gods.",
                    result:  result,
                })
                break

            case "no_auth":
                res.status(401).json({
                    message: "Your credentials are invalid."
                })
                break

            default:
                res.status(500).render({
                    message: "There was an issue with the Server, please try again later."
                })
        }
    }
}

module.exports = storage