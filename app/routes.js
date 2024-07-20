const express = require('express')
const router = express.Router()

// CONTROLLERS //
const homeController = require('./controllers/homeController.js');
const wcagController = require('./controllers/wcagController.js');
const appsController = require('./controllers/appsController.js');

router.get("/", homeController.g_home);

router.get("/wcag", wcagController.g_wcag);

router.post("/app/check-page", appsController.p_checkpage);
router.post("/app/check-statement", appsController.p_checkstatement);


module.exports = router