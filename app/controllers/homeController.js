require('dotenv').config();


exports.g_home = async function (req, res) {
    return res.render('index')
}