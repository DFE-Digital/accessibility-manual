require('dotenv').config();
const NotifyClient = require('notifications-node-client').NotifyClient;
const notify = new NotifyClient(process.env.notify_accessibilitymanual_key);




exports.p_support = async function (req, res) {

    // Check the form fields are completed
    const { name, email, contact, query, steps } = req.body;

    let errors = [];

    if (!name) {
        errors.push({ msg: 'Enter your name', field: 'name' });
    }

    if (!email) {
        errors.push({ msg: 'Enter your email address', field: 'email' });
    }

    // validate email is an email
    if (email) {
        if (!validateEmail(email)) {
            errors.push({ msg: 'Enter an email address in the correct format, like name@example.com', field: 'email' });
        }
    }

    if (!contact) {
        errors.push({ msg: 'Select a contact method', field: 'contact' });
    }

    if (!query) {
        errors.push({ msg: 'Enter your question', field: 'query' });
    }

    if (errors.length > 0) {
        return res.render('support/form/support', {
            errors, data: req.body
        });
    }
    else {
        notify
            .sendEmail(process.env.email_accessibility_support, process.env.designopsemail, {
                personalisation: {
                    name: name,
                    email: email,
                    contact: contact,
                    query: query,
                    steps: steps
                },
            })
            .then((response) => { })
            .catch((err) => console.log(err));

        return res.render('support/form/success');

    }
}

exports.p_training = async function (req, res) {

    // Check the form fields are completed
    let { name, email, moreDetail } = req.body;

    let errors = [];

    const fetch = await import('node-fetch').then(module => module.default);


    const recaptchaResponse = req.body['g-recaptcha-response'];
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;

    const recaptchaVerify = await fetch(recaptchaUrl, { method: 'POST' });
    const recaptchaJson = await recaptchaVerify.json();


    if (!recaptchaJson.success || recaptchaJson.score < 0.5) {
        return res.render('forms/training', {
            errors: [{ msg: 'We cannot submit your form at this time.' }], data: req.body
        });
    }

    if (!moreDetail) {
        errors.push({ msg: 'Enter some details of your suggestion', field: 'moreDetail' });
    }

   
    if (errors.length > 0) {
        return res.render('forms/training', {
            errors, data: req.body
        });
    }
    else {

        if (!name) {
            name = "Not provided";
        }

        if (!email) {
            email = "Not provided";
        }

        notify
            .sendEmail(process.env.email_accessibility_training, process.env.designopsemail, {
                personalisation: {
                    name: name,
                    email: email,
                    moreDetail: moreDetail
                },
            })
            .then((response) => { })
            .catch((err) => console.log(err));

        return res.render('forms/training-complete');

    }
}



function validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}