const passport = require('passport');
const validator = require('validator');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' }); // See the file .env.example for the structure of .env
const User = require('../models/User');

function normalizeProfilePicture(picture) {
    if (!picture) return null;
    return picture.startsWith('/profile_pictures/') || picture.startsWith('/user_avatar/')
        ? picture
        : `/profile_pictures/${picture.replace(/^.*\//, '')}`;
}

// create random id for guest accounts
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * GET /login
 * Render the login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    const responseID = req.query.ResponseID || req.query.r_id;
    const condition = req.query.Condition || req.query.condition;
    res.render('account/login', {
        title: 'Login',
        site_picture: process.env.SITE_PICTURE,
        r_id: responseID,
        ResponseID: responseID,
        Condition: condition
    });
};

/**
 * POST /login
 * Handles user sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' });

    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/login');
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
    passport.authenticate('local', (err, user, info) => {
        const study_length = 86400000 * process.env.NUM_DAYS; // Milliseconds in NUM_DAYS days
        const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
        if (err) { return next(err); }
        if (!user) {
            req.flash('errors', info);
            return res.redirect('/login');
        }
        if (!(user.active) || ((time_diff >= study_length) && !user.isAdmin)) {
            const endSurveyLink = user.endSurveyLink;
            req.flash('final', { msg: endSurveyLink });
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            const time_now = Date.now();
            const userAgent = req.headers['user-agent'];
            const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            user.logUser(time_now, userAgent, user_ip);
            if (user.consent) {
                res.redirect(req.session.returnTo || '/');
            } else {
                res.redirect('/');
            }
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Handles user log out.
 */
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) console.log('Error : Failed to logout.', err);
        req.session.destroy((err) => {
            if (err) console.log('Error : Failed to destroy the session during logout.', err);
            req.user = null;
            res.redirect('/');
        });
    });
};

/**
 * GET /signup
 * Render the signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    const responseID = req.query.ResponseID || req.query.r_id;
    const condition = req.query.Condition || req.query.condition;
    const fs = require('fs');
    const path = require('path');
    const files = [
        'bear.png', 
        'koala.png',
        'giraffe.png',
        'dog.png',
        'lion.png',
        'deer.png',
        'cow.png',
        'chicken.png', 
        'cat.png',
        'bear1.png'
    ]; // List of available profile pictures. These should be located in the folder truman/profile_pictures. Update this list if you add or remove profile pictures.
    const profilePictures = fs.readdirSync(path.join(__dirname, '../profile_pictures')).filter(file => files.includes(file));
    res.render('account/signup', {
        title: 'Create Account',
        ResponseID: responseID,
        Condition: condition,
        profilePictures
    });
};

/**
 * POST /signup
 * Handles user sign up and creation of a new account.
 */
exports.postSignup = async(req, res, next) => {
    const validationErrors = [];
    // if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    // if (!validator.isLength(req.body.password, { min: 4 })) validationErrors.push({ msg: 'Password must be at least 4 characters long.' });
    // if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match.' });
    // if (!req.body.username || req.body.username.trim().length === 0) validationErrors.push({ msg: 'Username is required.' });
    // if (validationErrors.length) {
    //     req.flash('errors', validationErrors);
    //     return res.redirect('/signup?RespondentID=' + (req.query.RespondentID || '')+'&Condition=' + (req.query.Condition || ''));
    // }
    // req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

    try { 
        /*###############################
        Place Experimental Varibles Here!
        ###############################*/
        const numConditions = process.env.NUM_EXP_CONDITIONS;
        const experimentalConditionNames = process.env.EXP_CONDITIONS_NAMES.split(",");
        const experimentalCondition = experimentalConditionNames[Math.floor(Math.random() * numConditions)];
        const responseID = req.query.ResponseID || req.query.r_id;
        const condition = req.query.Condition || req.query.condition;

        const surveyLink = process.env.POST_SURVEY ?
            process.env.POST_SURVEY +
            (process.env.POST_SURVEY_WITH_QUALTRICS == 'TRUE' && process.env.POST_SURVEY.includes("?r_id=") &&
                responseID != 'null' && responseID && responseID != 'undefined' ? responseID : "") :
            "";
        const currDate = Date.now();
        const ResponseID = (!responseID || responseID == 'undefined') ? makeid(10) : responseID; // If no ResponseID is provided, generate a random one. This allows for guest accounts that are not created through Qualtrics.

        // const existingUser = await User.findOne({ $or: [{ email: req.body.email }, { mturkID: req.body.mturkID }] }).exec();
        const existingUser = await User.findOne({ ResponseID: ResponseID }).exec();
        console.log(existingUser)
        if (existingUser) {
            existingUser.username = req.body.username;
            existingUser.profile.picture = normalizeProfilePicture(req.body.profile_picture);
            existingUser.profile.name = req.body.username;
            if (condition && condition != 'undefined' && experimentalConditionNames.includes(condition)) {
                existingUser.experimentalCondition = condition;
            }
            user = existingUser;
        } else {
            user = new User({
                // email: req.body.email,
                // password: req.body.password,
                // mturkID: req.body.mturkID,
                ResponseID: ResponseID, // If no ResponseID is provided, generate a random one. This allows for guest accounts that are not created through Qualtrics.
                experimentalCondition: (!condition || condition == 'undefined') || !experimentalConditionNames.includes(condition) ? experimentalCondition : condition, // If no condition is provided in the query, randomly assign one. This allows for guest accounts that are not created through Qualtrics.
                username: req.body.username,
                endSurveyLink: surveyLink,
                active: true,
                lastNotifyVisit: currDate,
                createdAt: currDate,
                consent: false,
                profile: {
                    // name: req.body.name.trim() || '',
                    // location: req.body.location.trim() || '',
                    // bio: req.body.bio.trim() || '',
                    picture: normalizeProfilePicture(req.body.profile_picture)
                }
            });
        }

        await user.save();
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            const userAgent = req.headers['user-agent'];
            const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            user.logUser(currDate, userAgent, user_ip);
            res.redirect('/com');
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/profile
 * Update user's profile information during the sign up process.
 */
exports.postSignupInfo = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.profile.name = req.body.name.trim() || '';
        user.profile.location = req.body.location.trim() || '';
        user.profile.bio = req.body.bio.trim() || '';
        if (req.file) {
            user.profile.picture = req.file.filename;
        }

        await user.save();
        req.flash('success', { msg: 'Profile information has been updated.' });
        return res.redirect('/com');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/consent
 * Update user's consent.
 */
exports.postConsent = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.consent = true;
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /account
 * Render user's Update My Profile page.
 */
exports.getAccount = (req, res) => {
    res.render('account/profile', {
        title: 'Account Management'
    });
};

/**
 * GET /me
 * Render user's profile page.
 */
exports.getMe = async(req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('posts.comments.actor').exec();
        const allPosts = user.getPosts();
        res.render('me', { posts: allPosts, title: user.profile.name || user.email || user.id });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/profile
 * Update user's profile information.
 */
exports.postUpdateProfile = async(req, res, next) => {
    const validationErrors = [];
    if (req.body.email && !validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/account');
    }
    if (req.body.email) {
        req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
    }
    try {
        const user = await User.findById(req.user.id).exec();
        user.email = req.body.email || '';
        user.profile.name = req.body.name.trim() || '';
        user.profile.location = req.body.location.trim() || '';
        user.profile.bio = req.body.bio.trim() || '';
        if (req.file) {
            user.profile.picture = req.file.filename;
        }

        await user.save();
        req.flash('success', { msg: 'Profile information has been updated.' });
        res.redirect('/account');
    } catch (err) {
        if (err.code === 11000) {
            req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
            return res.redirect('/account');
        }
        next(err);
    }
};

/**
 * POST /account/password
 * Update user's current password.
 */
exports.postUpdatePassword = async(req, res, next) => {
    const validationErrors = [];
    if (!validator.isLength(req.body.password, { min: 4 })) validationErrors.push({ msg: 'Password must be at least 4 characters long.' });
    if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match.' });

    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/account');
    }
    try {
        const user = await User.findById(req.user.id).exec();
        user.password = req.body.password;
        await user.save();
        req.flash('success', { msg: 'Password has been changed.' });
        res.redirect('/account');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /pageLog
 * Record user's page visit to pageLog.
 */
exports.postPageLog = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.logPage(Date.now(), req.body.path);
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /pageTimes
 * Record user's time on site to pageTimes.
 */
exports.postPageTime = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // What day in the study is the user in? 
        const one_day = 86400000; // number of milliseconds in a day
        const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
        const current_day = Math.floor(time_diff / one_day);
        user.pageTimes[current_day] += parseInt(req.body.time);
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /forgot
 * Render Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password',
        email: process.env.RESEARCHER_EMAIL
    });
};

/**
 * Deactivate accounts who are completed with the study, except for admin accounts. Called 3 times a day. Scheduled via CRON jobs in app.js
 */
exports.stillActive = async() => {
    try {
        const activeUsers = await User.find().where('active').equals(true).exec();
        for (const user of activeUsers) {
            const study_length = 86400000 * process.env.NUM_DAYS; // Milliseconds in NUM_DAYS days
            const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
            if ((time_diff >= study_length) && !user.isAdmin) {
                user.active = false;
                user.logPostStats();
                await user.save();
            }
        }
    } catch (err) {
        next(err);
    }
};

/**
 * GET /completed
 * Render Admin Dashboard: Basic information on users currrently in the study
 */
exports.userTestResults = async(req, res) => {
    if (!req.user.isAdmin) {
        res.redirect('/');
    } else {
        try {
            const users = await User.find().where('isAdmin').equals(false).exec();
            for (const user of users) {
                const study_length = 86400000 * process.env.NUM_DAYS; // Milliseconds in NUM_DAYS days
                const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
                if ((time_diff >= study_length) && !user.isAdmin) {
                    user.active = false;
                    user.logPostStats();
                    await user.save();
                }
            }
            res.render('completed', { users: users });
        } catch (err) {
            next(err);
        }
    }
};

/**
 * GET /userInfo
 * Get user profile and number of user comments
 */
exports.getUserProfile = async(req, res) => {
    try {
        const user = await User.findById(req.user.id).exec();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({
            userProfile: {
                ...user.profile.toObject(),
                pictureSrc: user.profile.picture && user.profile.picture.startsWith('/')
                    ? user.profile.picture
                    : (user.profile.picture ? `/user_avatar/${user.profile.picture}` : null)
            },
            numComments: user.numComments,
            username: user.username
        });
    } catch (err) {
        next(err);
    }
}
