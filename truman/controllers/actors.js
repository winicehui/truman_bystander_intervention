const Actor = require('../models/Actor.js');
const Script = require('../models/Script.js');
const User = require('../models/User');
const helpers = require('./helpers');
const _ = require('lodash');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' }); // See the file .env.example for the structure of .env

/**
 * GET /actors
 * If the current user is an admin, retrieve all the actors from the database and render them to the page '../views/actors'.
 * If the current user is not an admin, redirect the user to the home page. 
 */
exports.getActors = async(req, res) => {
    if (!req.user.isAdmin) {
        res.redirect('/');
    } else {
        try {
            const actors = await Actor.find().exec();
            res.render('actors', { actors: actors });
        } catch (err) {
            next(err);
        }
    }
};

/**
 * POST /user
 * Handle post requests to block, unblock, report, follow, and unfollow an actor.
 */
exports.postBlockReportOrFollow = async(req, res, next) => {
    const currDate = Date.now();
    try {
        const user = await User.findById(req.user.id).exec();
        // Block an actor
        if (req.body.blocked) {
            if (!(user.blocked.includes(req.body.blocked))) {
                user.blocked.push(req.body.blocked)
            };
            const log = {
                time: currDate,
                action: "block",
                actorName: req.body.blocked,
            };
            user.blockReportAndFollowLog.push(log);
        }
        // Unblock a user
        else if (req.body.unblocked) {
            if (user.blocked.includes(req.body.unblocked)) {
                const index = user.blocked.indexOf(req.body.unblocked);
                user.blocked.splice(index, 1);
            }
            const log = {
                time: currDate,
                action: "unblock",
                actorName: req.body.unblocked,
            };
            user.blockReportAndFollowLog.push(log);
        }
        // Report an actor
        else if (req.body.reported) {
            if (!(user.reported.includes(req.body.reported))) {
                user.reported.push(req.body.reported);
            }
            const log = {
                time: currDate,
                action: "report",
                actorName: req.body.reported,
                report_issue: req.body.report_issue
            };
            user.blockReportAndFollowLog.push(log);
        }
        // Follow an actor
        else if (req.body.followed) {
            if (!(user.followed.includes(req.body.followed))) {
                user.followed.push(req.body.followed)
            };
            const log = {
                time: currDate,
                action: "follow",
                actorName: req.body.followed,
            };
            user.blockReportAndFollowLog.push(log);
        } // Unfollow an actor
        else if (req.body.unfollowed) {
            if (user.followed.includes(req.body.unfollowed)) {
                const index = user.followed.indexOf(req.body.unfollowed);
                user.followed.splice(index, 1);
            }
            const log = {
                time: currDate,
                action: "unfollow",
                actorName: req.body.unfollowed,
            };
            user.blockReportAndFollowLog.push(log);
        }
        await user.save();
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
}