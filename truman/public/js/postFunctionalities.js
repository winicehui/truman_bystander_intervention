const cyberbullyingState = new Map(); // Map to track each element (key: PostID, value: timeout or true if chat has already been opened)

async function getUserInformation() {
    const data = await $.get("/userProfile");
    script.userProfile = data.userProfile;
    script.numComments = data.numComments;
    script.username = data.username;
}

function likePost(e) {
    const target = $(e.target).closest('.ui.like.button');
    const label = target.closest('.ui.like.button').next("a.ui.basic.red.left.pointing.label.count");
    const post = target.closest(".ui.fluid.card");
    const postID = post.attr("postID");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    const currDate = Date.now();

    if (target.hasClass("red")) { // Unlike Post
        // Reset the visible like button text back to 'Like' while preserving the icon
        target.contents().filter(function() { return this.nodeType === 3; }).remove();
        target.find('span.label').text(' Like');
        target.removeClass("red");
        label.html(function(i, val) { return val * 1 - 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                unlike: currDate,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                unlike: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    } else { // Like Post
        // Set the visible like button text to 'Liked' while preserving the icon
        target.find('span.label').text(' Liked');
        target.addClass("red");
        label.html(function(i, val) { return val * 1 + 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                like: currDate,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                like: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    }
    // if (post.find(".description.cyberbullying").length > 0) {
    //     openChat(post);
    // }
    if (post.find(".description.cyberbullying").length > 0) {
        openChat(post, false, 2); // 2 = like
    }
}

function flagPost(e) {
    const target = $(e.target).closest('.ui.flag.button');
    const post = target.closest(".ui.fluid.card");
    const postID = post.attr("postID");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    const currDate = Date.now();

    if (target.hasClass("orange")) { // Unflag Post
        // Reset the visible flag button text back to 'Flag' while preserving the icon
        target.find('span.label').text(' Flag');
        target.removeClass('orange');
        post.removeClass("flagged");
        
        $.post("/feed", {
            postID: postID,
            unflag: currDate,
            postCondition: postCondition,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
        // target.closest(".ui.fluid.card").find(".ui.dimmer.flag").removeClass("active").dimmer({ closable: true }).dimmer('hide');
    } else { // Flag Post}
        // Update button text to 'Unflag' while preserving the icon
        target.find('span.label').text(' Flagged');
        target.addClass('orange');
        post.addClass("flagged");

        $.post("/feed", {
            postID: postID,
            flag: currDate,
            postCondition: postCondition,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
        // post.find(".ui.dimmer.flag").dimmer({ closable: true }).dimmer('show');
    }
    // if (post.find(".description.cyberbullying").length > 0) {
    //     openChat(post);
    // }
    if (post.find(".description.cyberbullying").length > 0) {
        openChat(post, false, 4); // 4 = flag
    }
}

function likeComment(e) {
    const target = $(e.target).closest('a.like');
    const comment = target.closest(".comment");
    const label = target.find("span.num");
    const icon = target.find("i.icon.heart");

    const postID = target.closest(".ui.fluid.card").attr("postID");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    const commentID = comment.attr("commentID");
    const isUserComment = comment.find("a.author").attr("href") == "/me";
    const currDate = Date.now();

    if (target.hasClass("red")) { // Unlike comment
        target.removeClass("red");
        icon.removeClass("red");
        label.html(function(i, val) { return val * 1 - 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost') {
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                unlike: currDate,
                isUserComment: isUserComment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        } else {
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                unlike: currDate,
                isUserComment: isUserComment,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        }
    } else { // Like comment
        target.addClass("red");
        icon.addClass("red");
        label.html(function(i, val) { return val * 1 + 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                like: currDate,
                isUserComment: isUserComment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                like: currDate,
                isUserComment: isUserComment,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    }
    // if (comment.hasClass("cyberbullying")) {
    //     openChat(comment);
    // }
    if (comment.hasClass("cyberbullying")) {
        openChat(comment, false, 2); // 2 = like
    }

}

function flagComment(e) {
    const target = $(e.target).closest('a.flag');
    const commentElement = target.closest(".comment");
    const label = target.find("span.label");
    const icon = target.find("i.icon.flag");
    const postID = target.closest(".ui.fluid.card").attr("postID");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    const commentID = commentElement.attr("commentID");

    const currDate = Date.now();

    if (target.hasClass("orange")) { // Unflag comment
        target.removeClass("orange");
        icon.removeClass("orange");
        commentElement.removeClass("flagged");
        label.text(" Flag");
        if (target.closest(".ui.fluid.card").attr("type") == 'userPost') {
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                unflag: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        } else {
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                unflag: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        }
    } else { // Flag comment
        target.addClass("orange");
        icon.addClass("orange");
        commentElement.addClass("flagged");
        label.text(" Flagged");
        if (target.closest(".ui.fluid.card").attr("type") == 'userPost') {
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                flag: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        } else {
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                flag: currDate,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        }
    }
    // if (commentElement.hasClass("cyberbullying")) {
    //     openChat(commentElement);
    // }
    if (commentElement.hasClass("cyberbullying")) {
        openChat(commentElement, false, 4); // 4 = flag
    }
    
}

function addComment(e) {
    const target = $(e.target);
    const form = target.parents(".ui.form");
    const text = form.find("textarea.replyToPost").val().trim();
    const card = target.parents(".ui.fluid.card");
    let comments = card.find(".ui.comments").not(".icon");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    // no comments area - add it
    if (!comments.length) {
        const buttons = card.find(".ui.bottom.attached.icon.buttons")
        buttons.after('<div class="content"><div class="ui comments"></div>');
        comments = card.find(".ui.comments").not(".icon");
    }
    if (text.trim() !== '') {
        const currDate = Date.now();
        const postID = card.attr("postID");
        const commentID = script.numComments + 1 + 78; // TO DO: Change this to the actual commentID returned from the backend once that is implemented. The +77 is to ensure reply_to/parent_comment functionality don't coincide with actor replies.

        const mess = `
        <div class="comment" commentID=${commentID} index=${commentID}>
            <a class="avatar"><img src="${script.userProfile.picture}"></a>
            <div class="content"> 
                <a class="author" href="/me">${script.userProfile.name || script.username} (me)</a>
                <div class="metadata"> 
                    <span class="date">Just now</span>
                </div> 
                <div class="text">${text}</div>
                <div class="actions"> 
                    <a class="reply" onClick="openCommentReply(event)">Reply</a> 
                    <a class="like" onClick="likeComment(event)">
                        <i class="icon heart"></i>
                        <span class="num">0</span>
                    </a>                                 
                </div> 
            </div>
        </div>`;
        form.find("textarea.replyToPost").val('');
        form.find("textarea.replyToPost").blur();
        comments.append(mess);

        if (card.attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                new_comment: currDate,
                comment_text: text,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                script.numComments = json.numComments;
            });
        else
            $.post("/feed", {
                postID: postID,
                new_comment: currDate,
                comment_text: text,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                script.numComments = json.numComments;
            });
    }
    // if (card.find(".description.cyberbullying").length > 0) {
    //     openChat(card);
    // }
    if (card.find(".description.cyberbullying").length > 0) {
        openChat(card, false, 3); // 3 = comment
    }
}

function changeColor(e, string = "") {
    let target = $(e.target);
    if (target.val().trim() !== string) {
        target.parents(".ui.form").children('.ui.submit.button').addClass("blue");
    } else {
        target.parents(".ui.form").children('.ui.submit.button').removeClass("blue");
    }
}

function openCommentReply(e) {
    const target = $(e.target).parents('.content');
    const reply_to = target.children('a.author').text().replace(" (me)", "");
    const form = target.children('.ui.form');
    if (form.length !== 0) {
        form.hide(function() { $(this).remove(); });
        target[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
        const comment_level = target.parents(".comment").length;
        const comment_area = (
            `<div class="ui form">
                <div class="inline field">
                    <img class="ui image rounded" src=${script.userProfile.picture}>
                    <textarea class="replyToComment" type="text" placeholder="Add a Reply..." rows="1" onInput="changeColor(event${", '@"+reply_to +"'"})">${"@"+reply_to+" "}</textarea>
                </div>
                <div class="ui submit button replyToComment" onClick="addCommentToComment(event)">
                    Reply to ${reply_to}
                </div>
                <div class="ui cancel basic blue button replyToComment" onClick="openCommentReply(event)">
                    Cancel
                </div>
            </div>
            </div>`
        );
        $(comment_area).insertAfter(target.children('.actions')).hide().show(400);
        const comment_area_element = $(target).find('textarea.replyToComment');
        const end = comment_area_element.val().length;
        comment_area_element[0].setSelectionRange(end, end);
        // if (comment_level == 2) {
        comment_area_element.highlightWithinTextarea({
                highlight: [{
                    highlight: "@" + reply_to, // string, regexp, array, function, or custom object
                    className: 'blue'
                }]
            })
            // };
        comment_area_element.focus();
        comment_area_element[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    // if ($(e.target).closest(".comment").hasClass("cyberbullying")) {
    //     openChat($(e.target).closest(".comment"));
    // }
    if ($(e.target).closest(".comment").hasClass("cyberbullying")) {
        openChat($(e.target).closest(".comment"), false, 3); // 3 = comment
    }
}

function addCommentToComment(e) {
    const target = $(e.target);
    const form = target.parents(".ui.form");
    if (!form.children(".ui.submit.button").hasClass("blue")) {
        return;
    }
    let text = form.find("textarea.replyToComment").val();
    const orig_comment = form.closest(".comment");
    const comment_level = form.parents(".comment").length; // = 1 if 1st level, = 2 if 2nd level
    if (comment_level == 1) {
        if (!orig_comment.children('.comments').length) {
            orig_comment.append('<div class="comments subcomments">');
        }
        comments = orig_comment.find(".comments");
    } else {
        comments = orig_comment.closest(".comments");
    }
    if (text.trim() !== "") {
        const words = form.find("mark").map(function() {
            return $(this).html();
        })
        const highlights = [...new Set(words)].sort(function(a, b) {
            return b.length - a.length; // Desc order
        });
        if (highlights.length !== 0) {
            for (word of highlights) {
                var regEx = new RegExp('(?<!<a>)' + word, 'gmi');
                text = text.replace(regEx, '<a>' + word + '</a>')
            }
        }

        const card = target.parents(".ui.fluid.card");
        const date = Date.now();
        const postID = card.attr("postID");
        const postClass = card.attr("postClass");
        const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
        const commentID = script.numComments + 1 + 78; // TO DO: Change this to the actual commentID returned from the backend once that is implemented. The +77 is to ensure reply_to/parent_comment functionality don't coincide with actor replies.
        
        const reply_to = orig_comment.children(".content").children("a.author").hasClass('/me') ? orig_comment.attr('commentID') : orig_comment.attr('index');
        const parent_comment = form.parents(".comment").last().attr('index');

        const mess =
        `<div class="comment" commentID=${commentID} index=${commentID}>
            <a class="avatar"><img src="${script.userProfile.picture}"></a>
            <div class="content"> 
                <a class="author" href="/me">${script.userProfile.name || script.username} (me)</a>
                <div class="metadata">
                    <span class="date">Just now</span>
                </div> 
                <div class="text">${text}</div>
                <div class="actions"> 
                    <a class="reply" onClick="openCommentReply(event)">Reply</a>  
                    <a class="like" onClick="likeComment(event)">
                        <i class="icon heart"></i>
                        <span class="num">0</span>
                    </a>                                     
                </div> 
            </div>
        </div>`;

        form.find("textarea.replyToComment").val("");
        form.remove();

        if (!comments.is(":visible")) {
            comments.transition('fade');
        }
        comments.append(mess);
        $(`.comment[commentID=${commentID}]`).last()[0].scrollIntoView({ block: 'center', behavior: 'smooth' });

         if (card.attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                new_comment: date,
                comment_text: text,
                reply_to: reply_to,
                parent_comment: parent_comment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                script.numComments = json.numComments;
            });
        else
            $.post("/feed", {
                postID: postID,
                new_comment: date,
                comment_text: text,
                postCondition: postCondition,
                reply_to: reply_to,
                parent_comment: parent_comment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                script.numComments = json.numComments;
            });
    }
    // if ($(e.target).closest(".comment").hasClass("cyberbullying")) {
    //     openChat($(e.target).closest(".comment"));
    // }
    if ($(e.target).closest(".comment").hasClass("cyberbullying")) {
        openChat($(e.target).closest(".comment"), false, 3); // 3 = comment
    }
}

function followUser(e) {
    const target = $(e.target);
    const username = target.attr('actor_un');
    if (target.text().trim() == "Follow") { // Follow Actor
        $(`.ui.basic.primary.follow.button[actor_un='${username}']`).each(function(i, element) {
            const button = $(element);
            button.text("Following");
            button.prepend("<i class='check icon'></i>");
        })
        $.post("/user", {
            followed: username,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        })
    } else { // Unfollow Actor
        $(`.ui.basic.primary.follow.button[actor_un='${username}']`).each(function(i, element) {
            const button = $(element);
            button.text("Follow");
            button.find('i').remove();
        })
        $.post("/user", {
            unfollowed: username,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        })
    }
}

$(window).on('load', async () => {
    await getUserInformation();

    // add humanized time to all posts
    $('.time.meta, .date').each(function() {
        const ms = parseInt($(this).text(), 10);
        const time = new Date(ms);
        $(this).text(humanized_time_span(time));
    });

    // ************ Actions on Main Post ***************
    // Focus new comment element if "Reply" button is clicked
    $('.ui.reply.button').on('click', function(event) {
        let parent = $(event.target).closest(".ui.fluid.card");
        parent.find("textarea.replyToPost").focus();
        // if (parent.find(".cyberbullying").length > 0) { 
        //     openChat(   parent);
        // }
        if (parent.find(".cyberbullying").length > 0) {
            openChat(parent, false, 3); // 3 = comment (user clicked Reply button)
        }
    });

    // Press enter to submit a comment
    window.addEventListener("keydown", function(event) {
        // if ($(event.target).hasClass("replyToPost") && 
        //     $(event.target).closest(".ui.fluid.card").find(".description.cyberbullying").length > 0) {
        //     openChat($(event.target).closest(".ui.fluid.card"));
        // }  
        if ($(event.target).hasClass("replyToPost") &&
            $(event.target).closest(".ui.fluid.card").find(".description.cyberbullying").length > 0) {
            openChat($(event.target).closest(".ui.fluid.card"), false, 3); // 3 = comment
        }  
        // if ($(event.target).hasClass("replyToComment") && 
        //     $(event.target).closest(".comment").hasClass("cyberbullying")) {
        //     openChat($(event.target).closest(".comment"));
        // }
        if ($(event.target).hasClass("replyToComment") &&
            $(event.target).closest(".comment").hasClass("cyberbullying")) {
            openChat($(event.target).closest(".comment"), false, 3); // 3 = comment
        }
        if (!event.shiftKey && event.key === "Enter" && $(event.target).hasClass("replyToPost")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            addComment(event);
        } else if (!event.shiftKey && event.key === "Enter" && $(event.target).hasClass("replyToComment")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            addCommentToComment(event);
        }
    }, true);

    // Create a new Comment
    $("i.big.send.link.icon.replyToPost").on('click', addComment);

    // Like/Unlike Post
    $('.like.button').on('click', likePost);

    // Flag Post
    $('.flag.button').on('click', flagPost);

    // ************ Actions on Comments***************
    // Like/Unlike comment
    $('a.like').on('click', likeComment);

    // Flag/Unflag comment
    $('a.flag').on('click', flagComment);

    // Follow button
    $('.ui.basic.primary.follow.button').on('click', followUser);

    //Reply to comment
    $('a.reply').on('click', openCommentReply);

    // Track how long a post is on the screen (50% threshold) 
    const VISIBILITY_THRESHOLD = 0.5;   // 50% of card must be visible to start timer
    const MIN_VIEW_TIME_MS     = 1500;  // ignore accidental flicks
    const MAX_VIEW_TIME_MS     = 86400000;

    // Map from postID -> { startTime, postCondition }
    const viewTimers = new Map();

    const actorPostObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const card      = entry.target;
        const postID    = card.getAttribute('postID');
        const condition = card.getAttribute('postCondition');

        if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
        // Card just became sufficiently visible — start timer if not already running
            if (!viewTimers.has(postID)) {
                viewTimers.set(postID, { startTime: Date.now(), postCondition: condition });
            }

        } else {
            // Card is leaving (or was never sufficiently visible) — stop timer and report
            if (viewTimers.has(postID)) {
                const { startTime, postCondition } = viewTimers.get(postID);
                const totalViewTime = Date.now() - startTime;
                viewTimers.delete(postID);

                if (totalViewTime > MIN_VIEW_TIME_MS && totalViewTime < MAX_VIEW_TIME_MS) {
                $.post('/feed', {
                    postID,
                    viewed: totalViewTime,
                    postCondition,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                });
                }
            }
        }
        });
    }, {
        threshold: VISIBILITY_THRESHOLD  // fires when crossing the 50% boundary
    });

    const actorPosts = $('.ui.fluid.actor.card');
    // Observe every post card on the page
    actorPosts.each(function(index, element) {
        actorPostObserver.observe(element);
    });
});
