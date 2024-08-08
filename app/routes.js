const express = require('express')
const router = express.Router()

// CONTROLLERS //
const homeController = require('./controllers/homeController.js');
const wcagController = require('./controllers/wcagController.js');
const appsController = require('./controllers/appsController.js');
const formsController = require('./controllers/formsController.js');
const trainingController = require('./controllers/trainingController.js');

router.get("/", homeController.g_home);

router.get("/wcag", wcagController.g_wcag);

router.post("/app/check-page", appsController.p_checkpage);
router.post("/app/check-statement", appsController.p_checkstatement);

router.post("/support/form/support", formsController.p_support);  
router.post("/forms/training", formsController.p_training);  

router.get("/app/how-many-people/:number", appsController.g_howmanypeople);
router.post("/app/how-many-people", appsController.p_howmanypeople);


// Training question handlers

router.get('/training/basic/question', trainingController.startTraining);
router.post('/training/basic/question', trainingController.handleAnswer);
router.get('/training/basic/results', trainingController.getResults);
module.exports = router