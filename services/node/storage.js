'use strict'

// Imports
import helpers from './helpers.js'
import logger from './logger.js'

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
                    title:    "Error",
                    httpCode: "500",
                    message:  "There was an issue with the Server, please try again later."
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
                    title:    "Error",
                    httpCode: "500",
                    message:  "There was an issue with the Server, please try again later."
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
                    title:    "Error",
                    httpCode: "500",
                    message:  "There was an issue with the Server, please try again later."
                })
        }
    },

    async storageSearchAPI(req, res) {
        res.status(501).json({ "message": "This endpoint hasn't been implemented yet." })
    }
}

export default storage