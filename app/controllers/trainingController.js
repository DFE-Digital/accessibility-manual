

exports.p_basic_q1 = async function (req, res) {

    const { q1 } = req.body

    const answer = 'b'

    let errors = []

    if(q1 != answer) {
        errors.push({msg: 'Your answer is incorrect. Try again.'})
        
        return res.render('training/accessibility-inclusion/question-1', {
            errors,
            q1
        })
    }

    return res.redirect('/training/accessibility-inclusion/question-2')
}