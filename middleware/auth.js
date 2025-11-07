const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.artist) {
        return next();
    }
    res.redirect('/organiser/login');
};

// Prevent accessing login page if already authenticated
const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.artist) {
        return res.redirect('/organiser/home');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isNotAuthenticated
};