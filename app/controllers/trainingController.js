const pool = require('../../middleware/pool');

const questions = require('../data/questions.json');
const NotifyClient = require('notifications-node-client').NotifyClient;
const notify = new NotifyClient(process.env.notify_accessibilitymanual_key);


/**
 * 
 * Function to generate a random code 
 * Allowed characters exclude I, O, S and digits 0,1,5
 * 
 * @returns  {string} - A randomly generated code
 */
function generateCode() {
    const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
        part1 += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length));
        part2 += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length));
    }
    return `${part1}-${part2}`;
}

/**
 * 
 * @param {*} maxAttempts 
 * @returns The created row
 * 
 */
async function createTrainingSessionWithUniqueCode(maxAttempts = 10) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        const code = generateCode();
        const result = await pool.query(
            `
        INSERT INTO accessibility_manual.training_sessions (start_date, unique_code)
        VALUES (CURRENT_DATE, $1)
        ON CONFLICT DO NOTHING
        RETURNING id, unique_code;
      `,
            [code]
        );

        // If rowCount is 1, we inserted successfully (i.e., code was unique)
        if (result.rowCount === 1) {
            return result.rows[0]; // { id: ..., unique_code: ... }
        }

        attempts++;
    }

    throw new Error(`Unable to generate a unique code after ${maxAttempts} attempts`);
}




exports.startPage = (req, res) => {

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


    res.render('training/basic/results', { results, score });
};



// Intermediate training routes

exports.g_intermediateStart = (req, res) => {

    return res.render('training/intermediate/index');
};


exports.g_intermediateAuth = (req, res) => {
    // If they already have a session in memory, skip direct to questions? 
    if (req.session.intermediateDbSessionId) {
        return res.redirect('/training/intermediate/questions-list');
    }

    // Otherwise render the form
    res.render('training/intermediate/auth', {
        error: null,
        existingCode: ''
    });
};




exports.g_questionsList = (req, res) => {

    // If they don't have a session code in memory, redirect to auth
    if (!req.session.intermediateDbSessionCode) {
        return res.redirect('/training/intermediate/auth');
    }

    const { intermediateDbSessionCode } = req.session;

    res.render('training/intermediate/questions-list', { code: intermediateDbSessionCode });
};


exports.g_intermediateQuestion = (req, res) => {
    const questionNumber = req.params.questionNumber;

    res.render('training/intermediate/question-' + questionNumber);
};

exports.g_intermediateComplete = (req, res) => {

    res.render('training/intermediate/complete');
};

exports.p_intermediateAuth = async (req, res) => {
    const { action, existingCode } = req.body;

    if (action === 'useExistingCode') {
        // Validate user input
        if (!existingCode) {
            return res.render('training/intermediate/auth', {
                error: "Please enter a code or choose to generate a new one.",
                existingCode: existingCode
            });
        }

        // Look up this code in the DB
        try {
            const { rows } = await pool.query(`
        SELECT id, unique_code
        FROM accessibility_manual.training_sessions
        WHERE unique_code = $1
          AND training_type = 'intermediate'
        LIMIT 1
      `, [existingCode]);

            if (rows.length === 0) {
                return res.render('training/intermediate/auth', {
                    error: "That code was not found. Please check it and try again, or generate a new code.",
                    existingCode: existingCode
                });
            }

            // Found a matching session
            const { id, unique_code } = rows[0];
            req.session.intermediateDbSessionId = id;
            req.session.intermediateDbSessionCode = unique_code;
            req.session.intermediateAnswers = [];  // optional
            return res.redirect('/training/intermediate/questions-list');

        } catch (err) {
            console.error('Error finding existing code:', err);
            return res.render('training/intermediate/auth', {
                error: "Sorry, something went wrong looking up your code. Try again?",
                existingCode: existingCode
            });
        }

    } else if (action === 'generateNewCode') {
        // Create a new code by inserting a new intermediate training session
        try {
            const { id, unique_code } = await createTrainingSessionWithUniqueCode();
            req.session.intermediateDbSessionId = id;
            req.session.intermediateDbSessionCode = unique_code;
            req.session.intermediateAnswers = []; // optional
            return res.redirect('/training/intermediate/questions-list');

        } catch (err) {
            console.error('Error creating new intermediate session:', err);
            return res.render('training/intermediate/auth', {
                error: "Sorry, we couldn't generate a new code. Please try again.",
                existingCode: ''
            });
        }

    } else {
        // If no valid action or user tampered with the form...
        return res.render('training/intermediate/auth', {
            error: "Please choose to enter an existing code or generate a new one.",
            existingCode: existingCode
        });
    }
};



exports.p_intermediateQuestion = (req, res) => {
    const questionNumber = req.params.questionNumber;

    // Next question, unless next question is 21 and instead go to questions-list

    // Next question
    const nextQuestion = parseInt(questionNumber) + 1;

    if (nextQuestion === 21) {
        return res.redirect('/training/intermediate/questions-list');
    }

    return res.redirect('/training/intermediate/question-' + nextQuestion);
}