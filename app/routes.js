const express = require('express');
const router = express.Router();

const appsController = require('./controllers/appsController.js');
const trainingController = require('./controllers/trainingController.js');

router.get('/app/how-many-people/:number', appsController.g_howmanypeople);
router.post('/app/how-many-people', appsController.p_howmanypeople);
router.post('/tools-testing', appsController.p_howmanypeople);

router.get('/training/basic/question', trainingController.startTraining);
router.post('/training/basic/question', trainingController.handleAnswer);
router.get('/training/basic/results', trainingController.getResults);

router.get('/training/intermediate', trainingController.g_intermediateStart);

router.get('/training/intermediate/auth',
    trainingController.g_intermediateAuth
);

router.get('/training/intermediate/questions-list',
    trainingController.g_questionsList
);



router.get('/training/intermediate/complete',
    trainingController.g_intermediateComplete
);

router.post('/training/intermediate/auth',
    trainingController.p_intermediateAuth
);


router.get(
    "/training/intermediate/question-:questionNumber",
    trainingController.g_intermediateQuestion
);

router.post('/training/intermediate/question-:questionNumber',
    trainingController.p_intermediateQuestion
);

router.post('/training/intermediate/questions-list',
    trainingController.p_sendCodeEmail
);



module.exports = router;