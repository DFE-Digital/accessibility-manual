require('dotenv').config();


exports.g_wcag = async function (req, res) {

    

    return res.render('wcag/index')
}


exports.g_wcagCriteria = async function (req, res) {

    // Get the criterion from the wcag file
    const wcag = require('../data/wcag.json')   
    
    return res.render('knowledge-hub/wcag/criteria/index', { wcag })
    }