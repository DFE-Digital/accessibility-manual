require('dotenv').config();


exports.g_wcag = async function (req, res) {



    return res.render('wcag/index')
}


exports.g_wcagCriteria = async function (req, res) {

    // Get the criterion from the wcag file
    const wcag = require('../data/wcag.json')
    const groupedCriteria = groupCriteriaByPrinciple(wcag);


    return res.render('knowledge-hub/wcag/criteria/index', { wcag: groupedCriteria })
}



const groupCriteriaByPrinciple = (criteriaArray) => {
    return criteriaArray.reduce((accumulator, current) => {
        const principle = current.principle;
        if (!accumulator[principle]) {
            accumulator[principle] = [];
        }
        accumulator[principle].push(current);
        return accumulator;
    }, {});
};