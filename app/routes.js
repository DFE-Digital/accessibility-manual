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
router.get("/knowledge-hub/wcag/criteria", wcagController.g_wcagCriteria);

router.post("/app/check-page", appsController.p_checkpage);
router.post("/app/check-statement", appsController.p_checkstatement);

router.post("/support/form/support", formsController.p_support);  
router.post("/forms/training", formsController.p_training);  

router.get("/app/how-many-people/:number", appsController.g_howmanypeople);
router.post("/app/how-many-people", appsController.p_howmanypeople);


// Training question handlers

router.get('/training/accessibility-inclusion', trainingController.startPage);

router.get('/training/basic/question', trainingController.startTraining);
router.post('/training/basic/question', trainingController.handleAnswer);
router.get('/training/basic/results', trainingController.getResults);

//Intermediate training routes

router.get('/training/intermediate', trainingController.g_intermediateStart);
router.get('/training/intermediate/auth', trainingController.g_intermediateAuth);  
router.get('/training/intermediate/questions-list', trainingController.g_questionsList);     
router.get('/training/intermediate/question-:questionNumber', trainingController.g_intermediateQuestion);
router.get('/training/intermediate/complete', trainingController.g_intermediateComplete);

router.post('/training/intermediate/auth', trainingController.p_intermediateAuth);
router.post('/training/intermediate/question-:questionNumber', trainingController.p_intermediateQuestion);
router.post('/training/intermediate/questions-list', trainingController.p_sendCodeEmail);

module.exports = router