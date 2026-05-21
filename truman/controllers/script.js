const Script = require('../models/Script.js');
const User = require('../models/User');
const Notification = require('../models/Notification');
const helpers = require('./helpers');
const _ = require('lodash');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' }); // See the file .env.example for the structure of .env
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TRAINING_POST_CONDITION = ['C1', 'C4'];
const MAIN_FEED_CHATBOT_ENABLED_CONDITIONS = ['C2', 'C4'];
const TRAINING_CHATBOT_ENABLED_CONDITIONS = ['C1', 'C4'];
const OPENAI_PROMPT_ID = 'pmpt_69e1794d22d081938a69e9538dddaebf0a6a2fd6f73bdb7d';
const OPENAI_PROMPT_VERSION = '4';
const CHAT_MESSAGE_CAP = 80; // Max number of user messages allowed in the chat to prevent abuse and manage costs. This does not include messages from the AI.

/**
 * GET /
 * Fetch and render newsfeed.
 */
exports.getScript = async(req, res, next) => {
    try {
        const one_day = 86400000; // Number of milliseconds in a day.
        const time_now = Date.now(); // Current date.
        const time_diff = time_now - req.user.createdAt; // Time difference between now and user account creation, in milliseconds.
        const time_limit = time_diff - one_day; // Date in milliseconds 24 hours ago from now. This is used later to show posts only in the past 24 hours.

        const user = await User.findById(req.user.id)
            .populate('posts.comments.actor')
            .populate('feedAction.post')
            .populate('chatAction.post')
            .exec();

        // If the user is no longer active, sign the user out.
        if (!user.active) {
            req.logout((err) => {
                if (err) console.log('Error : Failed to logout.', err);
                req.session.destroy((err) => {
                    if (err) console.log('Error : Failed to destroy the session during logout.', err);
                    req.user = null;
                    req.flash('errors', { msg: 'Account is no longer active. Study is over.' });
                    res.redirect('/login' + (req.query.r_id ? `?r_id=${req.query.r_id}` : ""));
                });
            });
        }

        // What day in the study is the user in? 
        // Update study_days, which tracks the number of time user views feed.
        const current_day = Math.floor(time_diff / one_day);
        if (current_day < process.env.NUM_DAYS) {
            user.study_days[current_day] += 1;
            user.save();
        }

        // Array of actor posts that are not found in the training set, sorted by descending time. 
            let script_feed = await Script.find({
                condition: { 
                    // $in: ["", user.experimentalCondition],
                    //$ne: TRAINING_POST_CONDITION
                    $nin: TRAINING_POST_CONDITION
                }
            })
            // .where('time').lte(time_diff).gte(time_limit) // Uncomment for only past 24 hours of actor posts to show up in the feed.
            .sort('-time')
            .populate('actor')
            .populate('comments.actor')
            .populate('comments.subcomments.actor')
            .exec();

        // Array of any user-made posts within the past 24 hours, sorted by time they were created.
        let user_posts = user.getPostInPeriod(time_limit, time_diff);
        user_posts.sort(function(a, b) {
            return b.relativeTime - a.relativeTime;
        });

        // Get the newsfeed and render it.
        const finalfeed = helpers.getFeed(user_posts, script_feed, user, process.env.FEED_ORDER, (process.env.REMOVE_FLAGGED_CONTENT == 'TRUE'), false);

        console.log("Script Size is now: " + finalfeed.length);
        res.render('script', {
            script: finalfeed,
            chatbotEnabled: MAIN_FEED_CHATBOT_ENABLED_CONDITIONS.includes(user.experimentalCondition)
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /chat
 * Returns list of messages of chat with chat_id value. Chat absTimes are converted to strings.
 */
exports.getChat = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('chatAction.post')
            .exec();
        
        //const feedIndex = _.findIndex(user.chatAction, function(o) { return o.post.equals(req.query.chat_id); });
        const feedIndex = _.findIndex(user.chatAction, function(o) { return o.post && o.post.equals(req.query.chat_id); });


        if (feedIndex != -1) {
            let messages = user.chatAction[feedIndex].messages;
            messages.sort((a, b) => new Date(a.absTime) - new Date(b.absTime));
            messages = messages.map(messageDoc => {
                let message = messageDoc.toObject(); // Convert to plain JavaScript object
                return {
                    ...message, // Spread the existing properties of the message
                    absTime: message.absTime.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3") // Modify the absTime value
                }
            });
            res.send(messages);
        } else {
            res.send([]);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};


/*
 * Post /post/new
 * Record a new user-made post. Include any actor replies (comments) that go along with it.
 */
exports.newPost = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        if (req.body.body) {
            user.numPosts = user.numPosts + 1; // Count begins at 0
            const currDate = Date.now();

            let post = {
                type: "user_post",
                postID: user.numPosts,
                body: req.body.body,
                picture: req.file ? req.file.filename : null,
                liked: false,
                likes: 0,
                comments: [],
                absTime: currDate,
                relativeTime: currDate - user.createdAt,
            };

            // Find any Actor replies (comments) that go along with this post
            const actor_replies = await Notification.find({
                    condition: { "$in": ["", user.experimentalCondition] }
                })
                .where('userPostID').equals(post.postID)
                .where('notificationType').equals('reply')
                .populate('actor').exec();

            // If there are Actor replies (comments) that go along with this post, add them to the user's post.
            if (actor_replies.length > 0) {
                for (const reply of actor_replies) {
                    user.numActorReplies = user.numActorReplies + 1; // Count begins at 0
                    const tmp_actor_reply = {
                        actor: reply.actor._id,
                        body: reply.replyBody,
                        commentID: user.numActorReplies,
                        relativeTime: post.relativeTime + reply.time,
                        absTime: new Date(user.createdAt.getTime() + post.relativeTime + reply.time),
                        new_comment: false,
                        liked: false,
                        flagged: false,
                        likes: 0, 
                        subcomments: []
                    };
                    post.comments.push(tmp_actor_reply);
                }
            }
            user.posts.unshift(post); // Add most recent user-made post to the beginning of the array
            await user.save();
            res.redirect('/');
        } else {
            req.flash('errors', { msg: 'ERROR: Your post did not get sent. Please include some text with your post.' });
            res.redirect('/');
        }
    } catch (err) {
        next(err);
    }
};

/**
 * POST /feed/
 * Record user's actions on ACTOR posts. 
 */
exports.postUpdateFeedAction = async(req, res, next) => {
    try {
        console.log(req.body);
        const user = await User.findById(req.user.id).exec();
        // Check if user has interacted with the post before.
        //let feedIndex = _.findIndex(user.feedAction, function(o) { return o.post.equals(req.body.postID); });
        let feedIndex = _.findIndex(user.feedAction, function(o) { return o.post && o.post.equals(req.body.postID); });

        // If the user has not interacted with the post before, add the post to user.feedAction.
        if (feedIndex == -1) {
            const cat = {
                post: req.body.postID,
                postCondition: req.body.postCondition,
            };
            feedIndex = user.feedAction.push(cat) - 1;
        }

        // User created a new comment on the post.
        // TO DO: Return the new comment's ID so that the frontend can keep track of it and use it for future interactions with the comment (like, flag, etc.)
        if (req.body.new_comment) {
            user.numComments = user.numComments + 1;
            const cat = {
                new_comment: true,
                new_comment_id: user.numComments + 78,
                body: req.body.comment_text,
                relativeTime: req.body.new_comment - user.createdAt,
                absTime: req.body.new_comment,
                liked: false,
                flagged: false,
                reply_to: req.body.reply_to,
                parent_comment: req.body.parent_comment
            }
            user.feedAction[feedIndex].comments.push(cat);
        }
        // User interacted with a comment on the post.
        else if (req.body.commentID) {
            const isUserComment = (req.body.isUserComment == 'true');
            // Check if user has interacted with the comment before.
            let commentIndex = (isUserComment) ?
                _.findIndex(user.feedAction[feedIndex].comments, function(o) {
                    return o.new_comment_id == req.body.commentID && o.new_comment == isUserComment
                }) :
                _.findIndex(user.feedAction[feedIndex].comments, function(o) {
                    return o.comment == req.body.commentID && o.new_comment == isUserComment
                });

            // If the user has not interacted with the comment before, add the comment to user.feedAction[feedIndex].comments
            if (commentIndex == -1) {
                const cat = {
                    comment: req.body.commentID
                };
                user.feedAction[feedIndex].comments.push(cat);
                commentIndex = user.feedAction[feedIndex].comments.length - 1;
            }

            // User liked the comment.
            if (req.body.like) {
                const like = req.body.like;
                user.feedAction[feedIndex].comments[commentIndex].likeTime.push(like);
                user.feedAction[feedIndex].comments[commentIndex].liked = true;
                if (req.body.isUserComment != 'true') user.numCommentLikes++;
            }

            // User unliked the comment.
            if (req.body.unlike) {
                const unlike = req.body.unlike;
                user.feedAction[feedIndex].comments[commentIndex].unlikeTime.push(unlike);
                user.feedAction[feedIndex].comments[commentIndex].liked = false;
                if (req.body.isUserComment != 'true') user.numCommentLikes--;
            }

            // User flagged the comment.
            else if (req.body.flag) {
                const flag = req.body.flag;
                user.feedAction[feedIndex].comments[commentIndex].flagTime.push(flag);
                user.feedAction[feedIndex].comments[commentIndex].flagged = true;
            }

            // User unflagged the comment.
            else if (req.body.unflag) {
                const unflag = req.body.unflag;
                user.feedAction[feedIndex].comments[commentIndex].unflagTime.push(unflag);
                user.feedAction[feedIndex].comments[commentIndex].flagged = false;
            }
        }
        // User interacted with the post.
        else {
            // User flagged the post.
            if (req.body.flag) {
                const flag = req.body.flag;
                user.feedAction[feedIndex].flagTime.push(flag);
                user.feedAction[feedIndex].flagged = true;
            }

            // User unflagged the post.
            else if (req.body.unflag) {
                const unflag = req.body.unflag;
                user.feedAction[feedIndex].unflagTime.push(unflag);
                user.feedAction[feedIndex].flagged = false;
            }

            // User liked the post.
            else if (req.body.like) {
                const like = req.body.like;
                user.feedAction[feedIndex].likeTime.push(like);
                user.feedAction[feedIndex].liked = true;
                user.numPostLikes++;
            }
            // User unliked the post.
            else if (req.body.unlike) {
                const unlike = req.body.unlike;
                user.feedAction[feedIndex].unlikeTime.push(unlike);
                user.feedAction[feedIndex].liked = false;
                user.numPostLikes--;
            }
            // User read the post.
            else if (req.body.viewed) {
                const view = req.body.viewed;
                user.feedAction[feedIndex].readTime.push(view);
                user.feedAction[feedIndex].rereadTimes++;
                user.feedAction[feedIndex].mostRecentTime = Date.now();
            } else {
                console.log('Something in feedAction went crazy. You should never see this.');
            }
        }
        await user.save();
        res.send({ result: "success", numComments: user.numComments });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /userPost_feed/
 * Record user's actions on USER posts. 
 */
exports.postUpdateUserPostFeedAction = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // Find the index of object in user.posts
        let feedIndex = _.findIndex(user.posts, function(o) { return o.postID == req.body.postID; });

        if (feedIndex == -1) {
            // Should not happen.
        }
        // User created a new comment on the post.
        else if (req.body.new_comment) {
            console.log("New comment on user post.");
            user.numComments = user.numComments + 1;
            let cat = {
                body: req.body.comment_text,
                commentID: user.numComments + 78,
                relativeTime: req.body.new_comment - user.createdAt,
                absTime: req.body.new_comment,
                new_comment: true,
                liked: false,
                flagged: false,
                likes: 0,
            }
            if (req.body.reply_to) {
                const parent_comment_index = _.findIndex(user.posts[feedIndex].comments, function(o) {
                    return o.commentID == req.body.parent_comment;
                });
                console.log(parent_comment_index) ;
                if (parent_comment_index == -1) {
                    console.log("Should not happen.");
                } else {
                    cat.reply_to = req.body.reply_to;
                    cat.parent_comment = req.body.parent_comment;
                    user.posts[feedIndex].comments[parent_comment_index].subcomments.push(cat);
                }
            } else {
                cat.subcomments = [];
                user.posts[feedIndex].comments.push(cat);   
            };
        }
        // User interacted with a comment on the post.
        else if (req.body.commentID) {
            const isUserComment = (req.body.isUserComment == 'true');
            const commentIndex = (isUserComment) ?
                _.findIndex(user.posts[feedIndex].comments, function(o) {
                    return o.commentID == req.body.commentID && o.new_comment == isUserComment;
                }) :
                _.findIndex(user.posts[feedIndex].comments, function(o) {
                    return o._id.equals(req.body.commentID) && o.new_comment == isUserComment;
                });

            if (commentIndex == -1) {
                // It'sa subcomment. 
                const parentcommentIndex = _.findIndex(user.posts[feedIndex].comments, function(o) {
                    return o.subcomments.find(subcomment => (isUserComment) ? (subcomment.commentID == req.body.commentID && subcomment.new_comment == isUserComment) : (subcomment._id.equals(req.body.commentID) && subcomment.new_comment == isUserComment)) !== undefined;
                });
                if (parentcommentIndex == -1) {
                    console.log("Should not happen.");
                }
                const subcommentIndex = _.findIndex(user.posts[feedIndex].comments[parentcommentIndex].subcomments, function(o) {
                    return o.commentID == req.body.commentID && o.new_comment == isUserComment;
                });
                console.log("Subcomment index is: " + subcommentIndex);
                if (subcommentIndex == -1) {
                    console.log("Should not happen.");
                } else {
                    // User liked the subcomment.
                    if (req.body.like) {
                        user.posts[feedIndex].comments[parentcommentIndex].subcomments[subcommentIndex].liked = true;
                    }
                    // User unliked the subcomment.
                    else if (req.body.unlike) {
                        user.posts[feedIndex].comments[parentcommentIndex].subcomments[subcommentIndex].liked = false;
                    }
                    // User flagged the subcomment.
                    else if (req.body.flag) {
                        user.posts[feedIndex].comments[parentcommentIndex].subcomments[subcommentIndex].flagged = true;
                    } else if (req.body.unflag) {
                        user.posts[feedIndex].comments[parentcommentIndex].subcomments[subcommentIndex].flagged = false;
                    }
                }
            }
            // User liked the comment.
            else if (req.body.like) {
                user.posts[feedIndex].comments[commentIndex].liked = true;
            }
            // User unliked the comment. 
            else if (req.body.unlike) {
                user.posts[feedIndex].comments[commentIndex].liked = false;
            }
            // User flagged the comment.
            else if (req.body.flag) {
                user.posts[feedIndex].comments[commentIndex].flagged = true;
            }
            // User unflagged the comment.
            else if (req.body.unflag) {
                user.posts[feedIndex].comments[commentIndex].flagged = false;
            }
        }
        // User interacted with the post. 
        else {
            // User liked the post.
            if (req.body.like) {
                user.posts[feedIndex].liked = true;
            }
            // User unliked the post.
            if (req.body.unlike) {
                user.posts[feedIndex].liked = false;
            }
        }
        await user.save();
        res.send({ result: "success", numComments: user.numComments });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /chat
 * Add actions with chats.
 */
exports.postchatAction = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const totalUserMessages = user.chatAction.reduce((count, chat) => {
            const messages = Array.isArray(chat.messages) ? chat.messages : [];
            return count + messages.filter(message => !message.isAgent).length;
        }, 0);

        if (totalUserMessages >= CHAT_MESSAGE_CAP) {
            return res.status(429).send({
                result: "limit_reached",
                message: `You have reached the chat limit of ${CHAT_MESSAGE_CAP} messages.`
            });
        }

        // Check if user has interacted with the post before.
        //let feedIndex = _.findIndex(user.chatAction, function(o) { return o.post.equals(req.body.chat_id); });
        let feedIndex = _.findIndex(user.chatAction, function(o) { return o.post && o.post.equals(req.body.chat_id); });

        // If the user has not interacted with the post chat before, add the post to user.chatAction.
        if (feedIndex == -1) {
            const cat = {
                post: req.body.chat_id,
                postCondition: req.body.postCondition,
            };
            feedIndex = user.chatAction.push(cat) - 1;
        }

        const cat = {
            body: req.body.body,
            absTime: req.body.absTime,
            name: req.body.name,
            isAgent: req.body.isAgent
        };
        user.chatAction[feedIndex].messages.push(cat);

        await user.save();
        let returningJson = { result: "success" };
        res.send(returningJson);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

/**
 * POST /chat/ai
 * Send a message to the OpenAI chatbot for a specific post.
 * Logs both the user message and AI reply into user.chatAction.
 */
exports.postAIChat = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const { chat_id, postCondition, messages, postContext, commentContext } = req.body;

        // Ensure chatAction entry exists for this post
        // let feedIndex = _.findIndex(user.chatAction, function(o) {
        //     return o.post.equals(chat_id);
        // });
        let feedIndex = _.findIndex(user.chatAction, function(o) {
            return o.post && o.post.equals(chat_id);
        });
        if (feedIndex === -1) {
            feedIndex = user.chatAction.push({ post: chat_id }) - 1;
        }

        const contextParts = [`Post: "${postContext}"`];
        if (commentContext && commentContext.trim()) {
            contextParts.push(`Existing comments:\n${commentContext.trim()}`);
        }

        const contextPrompt = `Context for this conversation:\n${contextParts.join('\n\n')}`;

        const conversationInput = [
            { role: 'user', content: contextPrompt },
            ...(messages.length === 0
                ? [{ role: 'user', content: 'The user opened the chatbot for this post. Begin the conversation.' }]
                : messages)
        ];

        // Call OpenAI using the reusable prompt template configured in the dashboard.
        const response = await openai.responses.create({
            prompt: {
                id: OPENAI_PROMPT_ID,
                version: OPENAI_PROMPT_VERSION
            },
            input: conversationInput,
            max_output_tokens: 300,
            reasoning: {
                summary: "auto"
            }
        });
        const replyText = response.output_text;
        // reasoning summary for each message
        const reasoningItem = response.output.find(item => item.type === "reasoning");
        const reasoningSummary = reasoningItem?.summary?.[0]?.text ?? null;

        // const reply = {
        //     role: 'assistant',
        //     content: 'This is a placeholder response from the AI. Replace this with the actual response from OpenAI.'
        // };

        // Log the AI reply into chatAction
        user.chatAction[feedIndex].messages.push({
            body: replyText,
            absTime: new Date(),
            name: 'Comment Coach',
            isAgent: true,
            reasoning: reasoningSummary ?? null,
        });

        await user.save();
        res.json({
            message: {
                role: 'assistant',
                content: replyText
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /training_module
 * Fetch and render the training module with the training post only.
 */
exports.getTrainingModule = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('posts.comments.actor')
            .populate('feedAction.post')
            .populate('chatAction.post')
            .exec();

        if (!user.active) {
            req.logout((err) => {
                if (err) console.log('Error : Failed to logout.', err);
                req.session.destroy((err) => {
                    if (err) console.log('Error : Failed to destroy the session during logout.', err);
                    req.user = null;
                    req.flash('errors', { msg: 'Account is no longer active. Study is over.' });
                    res.redirect('/login' + (req.query.r_id ? `?r_id=${req.query.r_id}` : ""));
                });
            });
            return;
        }

        // if (user.experimentalCondition !== TRAINING_POST_CONDITION) {
        //     return res.redirect('/');
        // }
        if (!TRAINING_POST_CONDITION.includes(user.experimentalCondition)) {
            return res.redirect('/');
        }

        // const trainingFeed = await Script.find({
        //         condition: TRAINING_POST_CONDITION
        //     })
        //     .sort('-time')
        //     .populate('actor')
        //     .populate('comments.actor')
        //     .populate('comments.subcomments.actor')
        //     .exec();
        
        const trainingFeed = await Script.find({
                condition: { $in: TRAINING_POST_CONDITION }
            })
            .sort('-time')
            .populate('actor')
            .populate('comments.actor')
            .populate('comments.subcomments.actor')
            .exec();



        if (!trainingFeed || trainingFeed.length === 0) {
            req.flash('errors', { msg: 'No training post available yet.' });
            return res.redirect('/');
        }
        const finalfeed = helpers.getFeed([], trainingFeed, user, process.env.FEED_ORDER, (process.env.REMOVE_FLAGGED_CONTENT == 'TRUE'), false);

        res.render('script', {
            script: finalfeed,
            chatbotEnabled: TRAINING_CHATBOT_ENABLED_CONDITIONS.includes(user.experimentalCondition), 
            isTrainingModule: true
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /training_status
 * Return training_module progress for the current user.
 */
exports.getTrainingStatus = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('chatAction.post')
            .exec();
        
        const trainingPostId = await Script.find({
                //condition: TRAINING_POST_CONDITION
                condition: { $in: TRAINING_POST_CONDITION }
            }).exec()._id;

        let userTurns = 0;

        const chatObject = user.chatAction.find(chat => chat.post.equals(trainingPostId));

        if (chatObject) {
            chatObject.messages.forEach((message) => {
                if (!message.isAgent) {
                    userTurns++;
                }
            });
        }

        res.json({
            numComments: user.numComments + 1, // +1 to account for numComments start at -1
            userTurns: userTurns
        });
    } catch (err) {
        next(err);
    }
};
exports.postChatActivation = async (req, res, next) => {
    console.log('postChatActivation called', req.body);
    try {
        const user = await User.findById(req.user.id).exec();
        const { chat_id, activationFactor } = req.body;
 
        // Ensure a chatAction entry exists for this post
        let feedIndex = _.findIndex(user.chatAction, function (o) {
            return o.post && o.post.equals(chat_id);
        });
        if (feedIndex === -1) {
            feedIndex = user.chatAction.push({ post: chat_id }) - 1;
        }
 
        
        user.chatAction[feedIndex].activationEvents.push({
            activationFactor: Number(activationFactor),
            absTime: new Date()
        });
 
        await user.save();
        res.json({ result: 'success' });
    } catch (err) {
        next(err);
    }
};

exports.postChatTiming = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const { chat_id, event, absTime, minimizedDuration } = req.body;
 
        let feedIndex = _.findIndex(user.chatAction, function (o) {
            return o.post && o.post.equals(chat_id);
        });
        if (feedIndex === -1) {
            feedIndex = user.chatAction.push({ post: chat_id }) - 1;
        }
 
        const entry = user.chatAction[feedIndex];
        const ts = new Date(Number(absTime));
 
        if (event === 'message_sent') {
            // Track first and last message timestamps
            if (!entry.firstMessageTime) {
                entry.firstMessageTime = ts;
            }
            entry.lastMessageTime = ts;
        } else if (event === 'minimized' || event === 'closed') {
            entry.hideEvents.push({
                event: event,
                absTime: ts
            });
        } else if (event === 'reopened') {
            const dur = Number(minimizedDuration);
            entry.hideEvents.push({
                event: 'reopened',
                absTime: ts,
                durationMs: (!isNaN(dur) && dur > 0) ? dur : 0
            });
            if (!isNaN(dur) && dur > 0) {
                entry.minimizedDuration = (entry.minimizedDuration || 0) + dur;
            }
        }
 
        await user.save();
        res.json({ result: 'success' });
    } catch (err) {
        next(err);
    }
};
