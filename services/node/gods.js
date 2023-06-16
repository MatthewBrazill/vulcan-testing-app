'use strict'

// Imports
import logger from './logger.js'

const gods = {
    async godCreateAPI(req, res) {
        res.status(501).json({ "message": "This endpoint hasn't been implemented yet." })
    },

    async godGetAPI(req, res) {
        res.status(501).json({ "message": "This endpoint hasn't been implemented yet." })
    },

    async godUpdateAPI(req, res) {
        res.status(501).json({ "message": "This endpoint hasn't been implemented yet." })
    },

    async godDeleteAPI(req, res) {
        res.status(501).json({ "message": "This endpoint hasn't been implemented yet." })
    },
}

export default gods