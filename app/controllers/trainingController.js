const pool = require('../../middleware/pool');
const fs = require('fs');
const path = require('path');
const { trackEvent } = require('../utils/analytics');

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
        INSERT INTO accessibility_manual.training_sessions (unique_code)
        VALUES ($1)
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


// Helper to load all intermediate questions
function loadIntermediateQuestions() {
    const filePath = path.join(__dirname, '../data/intermediateQuestions.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
}

// Helper for multiple-select array comparison
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => val === arr2[idx]);
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
        // Track the completion in GA4
        trackEvent('basic_training_completion', {
            score: score,
            total_questions: results.length,
            completion_rate: (score / results.length * 100).toFixed(1)
        }).catch(error => {
            console.error('Error tracking basic training completion:', error);
        });
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



exports.g_questionsList = async (req, res) => {
    if (!req.session.intermediateDbSessionCode) {
        return res.redirect('/training/intermediate/auth');
    }

    const code = req.session.intermediateDbSessionCode;

    try {
        // 1) Get the session row for this code (intermediate)
        const sessionResult = await pool.query(`
      SELECT id
      FROM accessibility_manual.training_sessions
      WHERE unique_code = $1
      LIMIT 1
    `, [code]);

        if (sessionResult.rowCount === 0) {
            return res.redirect('/training/intermediate/auth');
        }

        const sessionId = sessionResult.rows[0].id;

        // 2) Fetch existing answers for this session
        const answersResult = await pool.query(`
      SELECT question_number, answer_status
      FROM accessibility_manual.answers
      WHERE training_session_id = $1
      ORDER BY question_number
    `, [sessionId]);

        // Make a map of { questionNumber: status }
        const statusMap = {};
        answersResult.rows.forEach(row => {
            // "Not answered", "Correct", or "Incorrect"
            statusMap[row.question_number] = row.answer_status;
        });

        // 3) Load the JSON file that contains summary and other question data
        const allQuestions = loadIntermediateQuestions();

        // 4) Build an array of 20 questions, merging in the summary from JSON
        const questions = [];
        for (let i = 1; i <= 20; i++) {
            const status = statusMap[i] || 'Not answered';

            // Find the question info from JSON where id === i
            const questionData = allQuestions.find(q => q.id === i) || {};

            questions.push({
                questionNumber: i,
                status: status,
                summary: questionData.summary || '' // fallback if missing
            });
        }

        // 5) Render the view, passing 'questions' with 'summary'
        res.render('training/intermediate/questions-list', {
            code: code,
            questions: questions
        });

    } catch (err) {
        console.error('Error retrieving intermediate question statuses:', err);
        return res.redirect('/training/intermediate/auth');
    }
};


// 2) GET route handler for /training/intermediate/question-:questionNumber
exports.g_intermediateQuestion = async (req, res) => {
    // Make sure the user has a session code
    if (!req.session.intermediateDbSessionCode) {
        return res.redirect('/training/intermediate/auth');
    }

    // Parse questionNumber
    const questionNumber = parseInt(req.params.questionNumber, 10);

    // Load your JSON
    const allQuestions = loadIntermediateQuestions();
    // Find the question object by id
    const question = allQuestions.find(q => q.id === questionNumber);
    if (!question) {
        return res.status(404).send(`Question ${questionNumber} not found in JSON`);
    }

    // Look up trainingSessionId in DB
    let trainingSessionId;
    try {
        const sessionResult = await pool.query(`
      SELECT id
      FROM accessibility_manual.training_sessions
      WHERE unique_code = $1
      LIMIT 1
    `, [req.session.intermediateDbSessionCode]);

        if (sessionResult.rowCount === 0) {
            return res.redirect('/training/intermediate/auth');
        }
        trainingSessionId = sessionResult.rows[0].id;
    } catch (err) {
        console.error('Error fetching session:', err);
        return res.status(500).send('Database error finding session.');
    }

    // Attempt to load any existing answers for this question
    let selectedAnswers = [];
    try {
        const answersResult = await pool.query(`
      SELECT user_answer
      FROM accessibility_manual.answers
      WHERE training_session_id = $1
        AND question_number = $2
      LIMIT 1
    `, [trainingSessionId, questionNumber]);

        if (answersResult.rowCount === 1) {
            const userAnswerStr = answersResult.rows[0].user_answer || '';
            if (userAnswerStr.trim() !== '') {
                // e.g. "0,2" => [0,2]
                selectedAnswers = userAnswerStr.split(',').map(x => parseInt(x, 10));
            }
        }
    } catch (err) {
        console.error('Error fetching existing answer:', err);
        // We'll just keep selectedAnswers as empty if there's a DB error
    }

    // Finally, render the question page
    // Provide selectedAnswers so the template can pre-check radio/checkbox inputs
    res.render('training/intermediate/question', {
        code: req.session.intermediateDbSessionCode,
        question,
        selectedAnswers,
        nextQuestionNumber: questionNumber + 1,
        prevQuestionNumber: questionNumber - 1
    });
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
                error: "Enter a code, or start a new training session.",
                existingCode: existingCode
            });
        }

        // Look up this code in the DB
        try {
            const { rows } = await pool.query(`
        SELECT id, unique_code
        FROM accessibility_manual.training_sessions
        WHERE unique_code = $1
        LIMIT 1
      `, [existingCode]);

            if (rows.length === 0) {
                return res.render('training/intermediate/auth', {
                    error: "The code was not found. Please check it and try again, or start a new training session.",
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
                error: "Sorry, something went wrong looking up your code. Try again.",
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



exports.p_intermediateQuestion = async (req, res) => {
    // 1) Check for session code
    if (!req.session.intermediateDbSessionCode) {
        return res.redirect('/training/intermediate/auth');
    }

    // 2) Which question is this?
    const questionNumber = parseInt(req.params.questionNumber, 10);

    // 3) Load full intermediate questions JSON & find the question object
    const allQuestions = loadIntermediateQuestions();
    const question = allQuestions.find(q => q.id === questionNumber);
    if (!question) {
        return res.status(404).send('Question not found in JSON');
    }

    // 4) Find the user's trainingSessionId
    let trainingSessionId;
    try {
        const sessionResult = await pool.query(`
      SELECT id 
      FROM accessibility_manual.training_sessions
      WHERE unique_code = $1
      LIMIT 1
    `, [req.session.intermediateDbSessionCode]);

        if (sessionResult.rowCount === 0) {
            return res.redirect('/training/intermediate/auth');
        }
        trainingSessionId = sessionResult.rows[0].id;

    } catch (err) {
        console.error('Error finding training session:', err);
        return res.status(500).send('Database error (session lookup).');
    }

    // 5) Parse the user's submitted answer(s)
    let userAnswerArray = [];
    let answerStatus = 'Incorrect';
    const questionType = question.type;

    if (questionType === 'trueFalse' || questionType === 'multipleChoice') {
        const singleAnswer = req.body.answer; // e.g. "0"
        if (!singleAnswer) {
            // No radio selected → re-render with error
            return res.render('training/intermediate/question', {
                question,
                code: req.session.intermediateDbSessionCode,
                error: 'Please select an answer',
                selectedAnswers: [], // no selection
                prevQuestionNumber: questionNumber - 1,
                nextQuestionNumber: questionNumber + 1
            });
        }

        userAnswerArray = [parseInt(singleAnswer, 10)];
        if (question.correctAnswers.includes(userAnswerArray[0])) {
            answerStatus = 'Correct';
        }

    } else if (questionType === 'multipleSelect') {
        let answers = req.body.answer; // could be undefined, string, or array
        if (!answers) {
            answers = [];
        } else if (!Array.isArray(answers)) {
            answers = [answers];
        }
        userAnswerArray = answers.map(a => parseInt(a, 10));

        const sortedUser = [...userAnswerArray].sort((a, b) => a - b);
        const sortedCorrect = [...question.correctAnswers].sort((a, b) => a - b);
        if (arraysEqual(sortedUser, sortedCorrect)) {
            answerStatus = 'Correct';
        }
    }

    const userAnswerString = userAnswerArray.join(',');

    // 6) Insert/update the answer row
    try {
        await pool.query(`
      INSERT INTO accessibility_manual.answers
        (training_session_id, question_number, question_type, user_answer, answer_status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (training_session_id, question_number)
      DO UPDATE SET
        question_type = EXCLUDED.question_type,
        user_answer   = EXCLUDED.user_answer,
        answer_status = EXCLUDED.answer_status
    `, [
            trainingSessionId,
            questionNumber,
            questionType,
            userAnswerString,
            answerStatus
        ]);

        // Track the answer submission in GA4
        await trackEvent('intermediate_training_answer', {
            training_code: req.session.intermediateDbSessionCode,
            question_number: questionNumber,
            answer_status: answerStatus,
            question_type: questionType
        });

    } catch (err) {
        console.error('Error inserting/updating answer:', err);
        return res.status(500).send('Database error (insert/update).');
    }

    // 7) Re-render the same question page showing correct/incorrect message
    //    Also pass `selectedAnswers` so the page can show which choice was selected
    if (answerStatus === 'Correct') {
        return res.render('training/intermediate/question', {
            question,
            code: req.session.intermediateDbSessionCode,
            success: 'Correct!',
            explanation: question.explanation,
            selectedAnswers: userAnswerArray, // so the radio/checkbox stays selected
            prevQuestionNumber: questionNumber - 1,
            nextQuestionNumber: questionNumber + 1
        });
    } else {
        return res.render('training/intermediate/question', {
            question,
            code: req.session.intermediateDbSessionCode,
            incorrect: true,
            selectedAnswers: userAnswerArray,
            prevQuestionNumber: questionNumber - 1,
            nextQuestionNumber: questionNumber + 1
        });
    }
};


exports.p_sendCodeEmail = async (req, res) => {
    // 1) Grab the user's email from the form
    const email = req.body.email;

    // 2) The code can come from either:
    //    - The session: req.session.intermediateDbSessionCode
    //    - Or a hidden input in the form: req.body.code
    // For this example, let's use session:
    const code = req.session.intermediateDbSessionCode;

    // Basic validation
    if (!email) {
        // Re-render the page with an error
        return res.render('training/intermediate/questions-list', {
            errorMessage: 'Please enter an email address',
            code: code,
            questions: [] // or rebuild the list if you want it to show
        });
    }
    if (!code) {
        // The user doesn't have a code in session
        return res.render('training/intermediate/questions-list', {
            errorMessage: 'No code found in session',
            code: '',
            questions: []
        });
    }

    // 3) Send the email with GOV.UK Notify
    try {
        // Use your environment variable for the template ID
        // or any other approach. Example:
        const templateId = process.env.email_intermediate_training;

        // If your template needs personalisation, e.g. "code"
        await notify.sendEmail(templateId, email, {
            personalisation: {
                code: code
            }
        });

        console.log(`Email sent with code "${code}" to ${email}`);

        await pool.query(`
    INSERT INTO accessibility_manual.sent_codes (email, code)
    VALUES ($1, $2)
  `, [email, code]);

        // 4) Rebuild the questions array so your page can show the statuses
        //    or call your existing function that does the same
        const sessionResult = await pool.query(`
      SELECT id
      FROM accessibility_manual.training_sessions
      WHERE unique_code = $1
      LIMIT 1
    `, [code]);

        if (sessionResult.rowCount === 0) {
            // If the session doesn't exist, we can just show the success but no list
            return res.render('training/intermediate/questions-list', {
                successMessage: 'We have sent an email containing your code.',
                code: code,
                questions: []
            });
        }

        const sessionId = sessionResult.rows[0].id;

        // Re-fetch statuses from answers
        const answersResult = await pool.query(`
      SELECT question_number, answer_status
      FROM accessibility_manual.answers
      WHERE training_session_id = $1
      ORDER BY question_number
    `, [sessionId]);

        const statusMap = {};
        answersResult.rows.forEach(row => {
            statusMap[row.question_number] = row.answer_status;
        });

        // Rebuild the questions array from your JSON
        const allQuestions = loadIntermediateQuestions();
        const questions = [];
        for (let i = 1; i <= 20; i++) {
            const qData = allQuestions.find(q => q.id === i) || {};
            questions.push({
                questionNumber: i,
                summary: qData.summary || '',
                status: statusMap[i] || 'Not answered'
            });
        }

        // Render with a success message
        return res.render('training/intermediate/questions-list', {
            code: code,
            questions: questions,
            successMessage: 'Email sent.'
        });

    } catch (err) {
        console.error('Error sending code email via Notify:', err);
        return res.render('training/intermediate/questions-list', {
            errorMessage: 'An error occurred while sending your email. Please try again.',
            code: code,
            questions: []
        });
    }
};
