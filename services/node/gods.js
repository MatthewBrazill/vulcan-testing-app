'use strict'

// Imports
const helpers = require("./helpers.js")
const logger = require("./logger.js")
const mongodb = require("./mongodb.js")

const gods = {
    async godCreateAPI(req, res) {
        try {
            // Validate request body
            if (!await helpers.validate(req.body, [["pantheon", "^[a-zA-Z]{1,32}$"], ["name", "^[a-zA-Z]{1,32}$"], ["domain", "^[0-9a-zA-Z ]{1,32}$"]])) {
                res.status(400).json({ message: "There was an issue with your request." })
                return
            }

            var godId = ""
            for (var i = 5; i > 0; --i) godId += "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 62)];

            var result = await mongodb.collection("gods").insertOne({
                godId: godId,
                pantheon: req.body.pantheon,
                name: req.body.name,
                domain: req.body.domain
            })

            if (result.acknowledged == true) res.status(200).json({
                message: "Successfully created god.",
                godId: godId
            })
            else throw new Error("VulcanError: failed to create god")
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

    async godGetAPI(req, res) {
        try {
            // Validate request body
            if (!await helpers.validate(req.body, [["godId", "^[a-zA-Z0-9]{5}$"]])) {
                res.status(400).json({ message: "There was an issue with your request." })
                return
            }

            var god = await mongodb.collection("gods").findOne({ godId: req.body.godId })

            if (god != null) res.status(200).json({
                message: "Successfully retreived god.",
                god: god
            })
            else res.status(404).json({ message: "Couldn't find a god with that ID." })
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

    async godUpdateAPI(req, res) {
        try {
            // Validate request body
            if (!await helpers.validate(req.body, [["godId", "^[a-zA-Z0-9]{5}$"], ["pantheon", "^[a-zA-Z]{1,32}$"], ["name", "^[a-zA-Z]{1,32}$"], ["domain", "^[0-9a-zA-Z ]{1,32}$"]])) {
                res.status(400).json({ message: "There was an issue with your request." })
                return
            }

            var result = await mongodb.collection("gods").updateOne({ godId: req.body.godId }, {
                $set: {
                    pantheon: req.body.pantheon,
                    name: req.body.name,
                    domain: req.body.domain
                }
            })

            if (result.modifiedCount > 0) res.status(200).json({ message: "Successfully updated god." })
            else res.status(404).json({ message: "Couldn't find a god with that ID." })
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

    async godDeleteAPI(req, res) {
        try {
            // Validate request body
            if (!await helpers.validate(req.body, [["godId", "^[a-zA-Z0-9]{5}$"]])) {
                res.status(400).json({ message: "There was an issue with your request." })
                return
            }

            var result = await mongodb.collection("gods").deleteOne({ godId: req.body.godId })

            if (result.deletedCount > 0) res.status(200).json({ message: "Successfully deleted god." })
            else res.status(404).json({ message: "Couldn't find a god with that ID." })
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
}

module.exports = gods