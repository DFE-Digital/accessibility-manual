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
        errors.push({ msg: 'Enter your email', field: 'email' });
    }

    // validate email is an email
    if (email) {
        if (!validateEmail(email)) {
            errors.push({ msg: 'Enter a valid email', field: 'email' });
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
    else{
        notify
        .sendEmail(process.env.email_accessibility_support, 'design.ops@education.gov.uk', {
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


function validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}