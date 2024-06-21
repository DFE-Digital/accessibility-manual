const express = require('express')
const router = express.Router()

// CONTROLLERS //
const homeController = require('./controllers/homeController.js');
const wcagController = require('./controllers/wcagController.js');

router.get("/", homeController.g_home);

router.get("/wcag", wcagController.g_wcag);


module.exports = router