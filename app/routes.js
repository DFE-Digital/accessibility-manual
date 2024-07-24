const express = require('express')
const router = express.Router()

// CONTROLLERS //
const homeController = require('./controllers/homeController.js');
const wcagController = require('./controllers/wcagController.js');
const appsController = require('./controllers/appsController.js');
const formsController = require('./controllers/formsController.js');

router.get("/", homeController.g_home);

router.get("/wcag", wcagController.g_wcag);

router.post("/app/check-page", appsController.p_checkpage);
router.post("/app/check-statement", appsController.p_checkstatement);

router.post("/support/form/support", formsController.p_support);  

router.get("/app/how-many-people/:number", appsController.g_howmanypeople);
router.post("/app/how-many-people", appsController.p_howmanypeople);

module.exports = router