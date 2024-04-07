const express = require('express')
const router = express.Router()

// CONTROLLERS //
const homeController = require('./controllers/homeController.js');


router.get("/", homeController.g_home);


module.exports = router