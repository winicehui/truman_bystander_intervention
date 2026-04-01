async function getUserInformation() {
    const data = await $.get("/userProfile");
    script.userProfile = data.userProfile;
    script.numComments = data.numComments;
    script.username = data.username;
}

function likePost(e) {
    const target = $(e.target).closest('.ui.like.button');
    const label = target.closest('.ui.like.button').next("a.ui.basic.red.left.pointing.label.count");
    const postID = target.closest(".ui.fluid.card").attr("postID");
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
    if (target.closest(".ui.fluid.card").find(".description.cyberbullying").length > 0) {
        openChat(e);
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
    if (target.closest(".ui.fluid.card").find(".description.cyberbullying").length > 0) {
        openChat(e);
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
    const isUserComment = comment.find("a.author").attr('href') === '/me';
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
    if (comment.hasClass("cyberbullying")) {
        openChat(e);
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

    if (target.closest(".ui.fluid.card").attr("type") == 'userPost'){
        console.log("Should never be here.");
        return; 
    }

    if (target.hasClass("orange")) { // Unflag comment
        target.removeClass("orange");
        icon.removeClass("orange");
        commentElement.removeClass("flagged");
        label.text(" Flag");
        $.post("/feed", {
            postID: postID,
            commentID: commentID,
            unflag: currDate,
            postCondition: postCondition,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
    } else { // Flag comment
        target.addClass("orange");
        icon.addClass("orange");
        commentElement.addClass("flagged");
        label.text(" Flagged");
        $.post("/feed", {
            postID: postID,
            commentID: commentID,
            flag: currDate,
            postCondition: postCondition,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
    }
    if (commentElement.hasClass("cyberbullying")) {
        openChat(e);
    }
}

function addComment(e) {
    const target = $(e.target);
    const form = target.parents(".ui.form");
    const text = form.find("textarea.replyToPost").val().trim();
    const card = target.parents(".ui.fluid.card");
    let comments = card.find(".ui.comments");
    const postCondition = target.closest(".ui.fluid.card").attr("postCondition");
    // no comments area - add it
    if (!comments.length) {
        const buttons = card.find(".ui.bottom.attached.icon.buttons")
        buttons.after('<div class="content"><div class="ui comments"></div>');
        comments = card.find(".ui.comments")
    }
    if (text.trim() !== '') {
        const currDate = Date.now();
        const ava = target.siblings('.ui.label').find('img.ui.avatar.image');
        const ava_img = ava.attr("src");
        const ava_name = ava.attr("name");
        const postID = card.attr("postID");
        const commentID = script.numComments + 1;

        const mess = `
        <div class="comment" commentID=${commentID} index=${commentID}>
            <div class="image" style="background-color:${script.userProfile.color}">
                <a class="avatar"><img src="${script.userProfile.picture}"></a>
            </div>
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
                script.nunComments = json.numComments;
            });
        else
            $.post("/feed", {
                postID: postID,
                new_comment: currDate,
                comment_text: text,
                postCondition: postCondition,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                script.nunComments = json.numComments;
            });
    }
    if (card.find(".cyberbullying").length > 0) {
        openChat(e);
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
    const photo = script.userProfile.picture;
    const color = script.userProfile.color;
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
                    <img class="ui image rounded" src=${script.userProfile.picture ? ('/user_avatar/' + script.userProfile.picture) : null} style="background-color:${color};">
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
        const commentID = script.numComments + 1;
        const reply_to = orig_comment.children(".content").children("a.author").hasClass('/me') ? orig_comment.attr('commentID') : orig_comment.attr('index');
        const parent_comment = form.parents(".comment").last().attr('index');

        const mess =
            `<div class="comment" commentID=${commentID}>
            <div class="image" style="background-color:${script.userProfile.color}">
                <a class="avatar"><img src="${script.userProfile.picture}"></a>
            </div>
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

        $.post("/feed", {
            postID: postID,
            new_comment: date,
            comment_text: text,
            postClass: postClass,
            reply_to: reply_to,
            parent_comment: parent_comment,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        }).then(function(json) {
            script.numComments = json.numComments;
        });
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
    $('.right.floated.time.meta, .date').each(function() {
        const ms = parseInt($(this).text(), 10);
        const time = new Date(ms);
        $(this).text(humanized_time_span(time));
    });

    // ************ Actions on Main Post ***************
    // Focus new comment element if "Reply" button is clicked
    $('.ui.reply.button').on('click', function(event) {
        let parent = $(this).closest(".ui.fluid.card");
        parent.find("textarea.replyToPost").focus();
        if (parent.find(".cyberbullying").length > 0) { 
            openChat(event);
        }
    });

    // Press enter to submit a comment
    window.addEventListener("keydown", function(event) {
        if (!event.shiftKey && event.key === "Enter" && $(event.target).hasClass("replyToPost")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            addComment(event);
            if ($(event.target).closest(".ui.fluid.card").find(".description.cyberbullying").length > 0) {
                openChat(e);
            }
        } else if (!event.shiftKey && event.key === "Enter" && $(event.target).hasClass("replyToComment")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            addCommentToComment(event);
            if ($(event.target).closest(".comment").hasClass("cyberbullying")) {
                openChat(e);    
            }
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

    const cyberbullyingContent = $('.cyberbullying');

    const cyberbullyingState = new Map(); // Map to track each element (key: PostID, value: timeout or true if chat has already been opened)
   
    const cyberbullyingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const element = entry.target;
            const post = $(element).closest(".ui.fluid.card");
            const postID = post.attr("postID");

            // Element is visible in the viewport-50px (defined by rootMargin)
            if (entry.isIntersecting) {
                console.log(`Element with postID ${postID} is visible in the viewport-50px.`);
                // If chat has already been opened for this post or a timer is already running, do nothing.
                if (cyberbullyingState.has(postID)) {
                    return;
                } else {
                    // Start a 3 second countdown to open chat
                    const timeout = setTimeout(() => {
                        openChat(entry);
                        cyberbullyingState.set(postID, true); // Mark that chat has been opened for this post
                    }, 3000);
                    cyberbullyingState.set(postID, timeout);
                }
            } 
            // Element is not visible in the viewport-50px (defined by rootMargin)
            else {
                const state = cyberbullyingState.get(postID);
                if (state && state !== true) {
                    clearTimeout(state); // Clear the timeout if it exists and chat hasn't been opened yet
                    cyberbullyingState.delete(postID); // Remove from map
                } else if (state === true) {
                    cyberbullyingState.delete(postID); // If chat was opened and user scrolls away, allow chat to be opened again if they scroll back
                }
                console.log(`Element with postID ${postID} is no longer visible in the viewport-50px.`);
            }
        });
    }, { 
        threshold: 1,
        rootMargin: '-50px'
     });

    cyberbullyingContent.each(function(index, element) {
        cyberbullyingObserver.observe(element);
    });


    // Track how long a post is on the screen (borders are defined by image)
    // Start time: When the entire photo is visible in the viewport.
    // End time: When the entire photo is no longer visible in the viewport.
    $('.ui.fluid.card .img.post').visibility({
        once: false,
        continuous: false,
        observeChanges: true,
        // throttle:100,
        initialCheck: true,
        offset: 50,

        // Handling scrolling down like normal
        // Called when bottomVisible turns true (bottom of a picture is visible): bottom can enter from top or bottom of viewport
        onBottomVisible: function(element) {
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            // Bottom of picture enters from bottom (scrolling down the feed; as normal)
            if (element.topVisible) { // Scrolling Down AND entire post is visible on the viewport 
                // If this is the first time bottom is visible
                if (startTime == 0) {
                    var startTime = Date.now();
                }
            } else { // Scrolling up and this event does not matter, since entire photo isn't visible anyways.
                var startTime = 0;
            }
            $(this).siblings(".content").children(".myTimer").text(startTime);
        },

        // Element's bottom edge has passed top of the screen (disappearing); happens only when Scrolling Up
        onBottomPassed: function(element) {
            var endTime = Date.now();
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            var totalViewTime = endTime - startTime; // TOTAL TIME HERE

            var parent = $(this).parents(".ui.fluid.card");
            var postID = parent.attr("postID");
            var postCondition = parent.attr("postCondition");
            // If user viewed it for less than 24 hours, but more than 1.5 seconds (just in case)
            if (totalViewTime < 86400000 && totalViewTime > 1500 && startTime > 0) {
                $.post("/feed", {
                    postID: postID,
                    viewed: totalViewTime,
                    postCondition: postCondition,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                });
                // Reset Timer
                $(this).siblings(".content").children(".myTimer").text(0);
            }
        },

        // Handling scrolling up
        // Element's top edge has passed top of the screen (appearing); happens only when Scrolling Up
        onTopPassedReverse: function(element) {
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            if (element.bottomVisible && startTime == 0) { // Scrolling Up AND entire post is visible on the viewport 
                var startTime = Date.now();
                $(this).siblings(".content").children(".myTimer").text(startTime);
            }
        },

        // Called when topVisible turns false (exits from top or bottom)
        onTopVisibleReverse: function(element) {
            if (element.topPassed) { // Scrolling Down, disappears on top; this event doesn't matter (since it is when bottom disappears that time is stopped)
            } else { // False when Scrolling Up (the bottom of photo exits screen.)
                var endTime = Date.now();
                var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
                var totalViewTime = endTime - startTime;

                var parent = $(this).parents(".ui.fluid.card");
                var postID = parent.attr("postID");
                var postCondition = parent.attr("postCondition");
                // If user viewed it for less than 24 hours, but more than 1.5 seconds (just in case)
                if (totalViewTime < 86400000 && totalViewTime > 1500 && startTime > 0) {
                    $.post("/feed", {
                        postID: postID,
                        viewed: totalViewTime,
                        postCondition: postCondition,
                        _csrf: $('meta[name="csrf-token"]').attr('content')
                    });
                    // Reset Timer
                    $(this).siblings(".content").children(".myTimer").text(0);
                }
            }
        }
    });
});