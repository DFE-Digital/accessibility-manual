const questions = require('../data/questions.json');
const NotifyClient = require('notifications-node-client').NotifyClient;
const notify = new NotifyClient(process.env.notify_accessibilitymanual_key);


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

    // Generate CSV data as a string
    const questionNumbers = results.map((result, index) => index + 1).join(',');
    const userAnswersString = results.map(result => result.userAnswer).join(',');
    const isCorrectString = results.map(result => result.isCorrect).join(',');

    const csvData = `${questionNumbers}\n${userAnswersString}\n${isCorrectString}`;


    // Send email with CSV data
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
       
    }).catch(error => {
        console.error('Error sending email:', error);
    });

    res.render('training/basic/results', { results, score });
};