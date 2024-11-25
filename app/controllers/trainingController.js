const questions = require('../data/questions.json');
const NotifyClient = require('notifications-node-client').NotifyClient;
const notify = new NotifyClient(process.env.notify_accessibilitymanual_key);




exports.startPage = (req, res) => {

    // Generate a random string

    let randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);



    let trainingLog = {
        trainingStartTime: new Date(),
        trainingSessionId: req.sessionID,
        uniqueSession: randomString
    };

    req.session.trainingLog = trainingLog;

    console.log(trainingLog)


    res.render('training/accessibility-inclusion/index');
};

exports.startTraining = (req, res) => {
    req.session.answers = [];
    req.session.currentQuestion = 0;

    res.render('training/basic/question', { question: questions[0], questionIndex: 0 });
};

exports.handleAnswer = (req, res) => {
    const answer = req.body.answer;
    const currentQuestion = req.session.currentQuestion;

    if (!answer) {
        return res.render('training/basic/question', {
            question: questions[currentQuestion],
            questionIndex: currentQuestion,
            error: "Please select an answer before proceeding."
        });
    }

    if (!req.session.answers) {
        req.session.answers = [];
    }
    req.session.answers[currentQuestion] = answer;

    if (currentQuestion < questions.length - 1) {
        req.session.currentQuestion += 1;
        res.render('training/basic/question', {
            question: questions[req.session.currentQuestion],
            questionIndex: req.session.currentQuestion
        });
    } else {
        res.redirect('/training/basic/results');
    }
};

exports.getResults = (req, res) => {
    const userAnswers = req.session.answers || [];

    const results = questions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = parseInt(userAnswer) === question.correctAnswer;
        return {
            question: question.question,
            options: question.options,
            userAnswer: parseInt(userAnswer),
            correctAnswer: question.correctAnswer,
            isCorrect
        };
    });

    const score = results.filter(result => result.isCorrect).length;

    // Get the training log and submit to database
    const trainingLog = req.session.trainingLog;
    let trainingEnd = new Date();

    // Ensure trainingLog exists before proceeding
    if (!trainingLog) {
        console.error('Training log not found in session');
    }
    else {

        // Save each answer to Azure SQL database
        const { Connection, Request, TYPES } = require("tedious");

        const config = {
            authentication: {
                options: {
                    userName: process.env.db_username,
                    password: process.env.db_password
                },
                type: "default"
            },
            server: process.env.db_server,
            options: {
                database: process.env.db_name,
                encrypt: true
            }
        };

        const connection = new Connection(config);

        connection.on("connect", err => {
            if (err) {
                console.error(err.message);
            } else {
                let counter = 0;
                const saveResult = () => {
                    if (counter < results.length) {
                        const result = results[counter];
                        const request = new Request(
                            `INSERT INTO BasicTrainingData (SessionID, StartDateTime, CompletedDateTime, QuestionNumber, QuestionAnswer, QuestionCorrect, UniqueSession) VALUES (@SessionID, @StartDateTime, @CompletedDateTime, @QuestionNumber, @QuestionAnswer, @QuestionCorrect, @UniqueSession);`,
                            err => {
                                if (err) {
                                    console.error(err.message);
                                } else {
                                    console.log("Training result for question " + (counter + 1) + " saved successfully");
                                    counter++;
                                    saveResult();
                                }
                            }
                        );

                        request.addParameter('SessionID', TYPES.VarChar, trainingLog.trainingSessionId);
                        request.addParameter('StartDateTime', TYPES.DateTime, trainingLog.trainingStartTime);
                        request.addParameter('CompletedDateTime', TYPES.DateTime, trainingEnd);
                        request.addParameter('QuestionNumber', TYPES.Int, counter + 1);
                        request.addParameter('QuestionAnswer', TYPES.Int, result.userAnswer);
                        request.addParameter('QuestionCorrect', TYPES.Bit, result.isCorrect ? 1 : 0);
                        request.addParameter('UniqueSession', TYPES.VarChar, trainingLog.uniqueSession);

                        connection.execSql(request);
                    } else {
                        connection.close();
                    }
                };
                saveResult();
            }
        });

        connection.connect();

        // Send email with CSV data
        const questionNumbers = results.map((result, index) => index + 1).join(',');
        const userAnswersString = results.map(result => result.userAnswer).join(',');
        const isCorrectString = results.map(result => result.isCorrect).join(',');
        const csvData = `${questionNumbers}\n${userAnswersString}\n${isCorrectString}`;

        notify.sendEmail(
            process.env.email_basic_results,
            process.env.designopsemail,
            {
                personalisation: {
                    csvData: csvData,
                    score: score,
                }
            }
        ).then(response => {
            console.log('Email sent successfully');
        }).catch(error => {
            console.error('Error sending email:', error);
        });
    }

    res.render('training/basic/results', { results, score });
};
