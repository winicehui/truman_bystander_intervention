// Opens the co-pilot chat
async function openChat(e) {
    const post = $(e.target).closest('.ui.fluid.card');
    const chatId = post.attr("postid");

    const currentChatId = $("#copilot-chat").attr("chatId");
    const isChatVisible = $('#copilot-chat .chat').is(":visible");

    // Do nothing if chat is already showing for this exact post
    if (isChatVisible && currentChatId === chatId) return;

    // If chat is open for a different post, unhighlight the old post
    if (isChatVisible && currentChatId !== chatId) {
        $('.ui.fluid.card[postid="' + currentChatId + '"]').removeClass("chat-highlight");
    }

    post.addClass("chat-highlight");

    // Update chat header with given actor metadata
    $("#copilot-chat").attr("chatId", chatId);

    const chat = $('#copilot-chat.container.clearfix').data('chatInstance');
    const profilePicture = $(".menu .ui.mini.spaced.circular.image").attr("src");

    chat.chatId = chatId;
    chat.mostRecentMessenger = null;
    chat.typingTimeout = null;
    chat.profilePicture = profilePicture;
    chat.resetChat();
    // If chat is hidden, show chat
    if (!$('#copilot-chat .chat').is(":visible")) {
        $('#copilot-chat .chat').transition('fade up');
    }
    // If chat history is hidden, toggle chat history up
    if (!$('#copilot-chat .chat .chat-history').is(":visible")) {
        $('#copilot-chat .chat .chat-history').slideToggle(300, 'swing');
    }

    // Load previous messages
    let existingMessages = [];
    try {
        existingMessages = await $.getJSON("/chat", { "chat_id": chatId });
        for (const msg of existingMessages) {
            chat.addMessageExternal(msg.body, msg.absTime, msg.name, msg.isAgent);
        }
    } catch(err) {
        console.error('Failed to load chat history:', err);
    }

    // Only trigger AI greeting if there are no prior messages
    if (existingMessages.length === 0) {
        const postContext = post.find('.description').first().text().trim();
        const postCondition = post.attr('postcondition') || '';

        chat.addTypingAnimationExternal("Comment Coach");

        try {
            const response = await fetch('/chat/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': $('meta[name="csrf-token"]').attr('content')
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    postCondition: postCondition,
                    messages: [],
                    postContext: postContext
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('Greeting failed:', response.status, errText);
                chat.addMessageExternal('Sorry, could not connect to Comment Coach. Please try again.', chat.getCurrentTime(), 'Comment Coach', true);
                return;
            }

            const data = await response.json();
            chat.addMessageExternal(data.message.content, chat.getCurrentTime(), 'Comment Coach', true);
        } catch(err) {
            console.error('Greeting error:', err);
            chat.addMessageExternal('Sorry, something went wrong. Please try again.', chat.getCurrentTime(), 'Comment Coach', true);
        }
    }
}

$(window).on("load", function() {
    // Define and initiate chats
    $('.container.clearfix').each(function() {
        const chatId = this.id;
        const chat = {
            mostRecentMessenger: null,
            chatId: chatId,
            typingTimeout: null,
            profilePicture: null,
            init: function() {
                this.cacheDOM();
                this.bindEvents();
                $(this.$chatHistory).closest('.container.clearfix').data('chatInstance', this); // Store instance
            },
            cacheDOM: function() {
                this.$chatHistory = $('#copilot-chat .chat-history');
                this.$button = $('#copilot-chat button');
                this.$textarea = $('#copilot-chat #message-to-send');
                this.$chatHistoryList = this.$chatHistory.find('ul');
            },
            bindEvents: function() {
                this.$button.on('click', this.sendMessage.bind(this));
                this.$textarea.on('keydown', this.handleKeydown.bind(this));
            },

            // Renders a message bubble
            render: function(body, absTime, name, isAgent, isExternalMessage, isTypingAnimation) {
                if (this.typingTimeout != null) {
                    clearTimeout(this.typingTimeout);
                    this.typingTimeout = null;
                    this.removeTypingAnimationExternal();
                }
                if (isTypingAnimation || (body && body.trim() !== '')) {
                    const template = Handlebars.compile(
                        isAgent ? $("#other-message-template").html() : $("#my-message-template").html()
                    );
                    const context = {
                        name: name,
                        messageOutput: body,
                        time: absTime,
                        addProfilePhoto: this.mostRecentMessenger !== name,
                        isTypingAnimation: isTypingAnimation,
                        avatar: this.profilePicture
                    };
                    if (!isTypingAnimation) {
                        this.mostRecentMessenger = name;
                    }
                    this.$chatHistoryList.append(template(context));
                    this.scrollToBottom();
                    if (!isExternalMessage) {
                        this.$textarea.val('');
                    }
                } else {
                    this.scrollToBottom();
                    if (!isExternalMessage) {
                        this.$textarea.val('');
                    }
                }
                if (!this.$chatHistory.is(":visible")) {
                    this.$chatHistory.slideToggle(300, 'swing');
                }
            },

            // Called by button click or Enter key — sends user message and gets AI reply
            sendMessage: async function() {
                const name = "Me";
                const message = this.$textarea.val().trim();
                if (!message) return;

                this.render(message, this.getCurrentTime(), name, false, false, false);

                await $.post("/chat", {
                    chat_id: this.chatId,
                    body: message,
                    absTime: Date.now(),
                    name: name,
                    isAgent: false,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                });

                this.addTypingAnimationExternal("Comment Coach");

                const messages = [];
                this.$chatHistoryList.find('li').each(function() {
                    const isAgent = $(this).find('.other-message').length > 0;
                    const body = $(this).find('.other-message, .my-message').text().trim();
                    if (body) {
                        messages.push({ role: isAgent ? 'assistant' : 'user', content: body });
                    }
                });

                const post = $('[postid="' + this.chatId + '"]');
                const postContext = post.find('.description').first().text().trim();
                const csrfToken = $('meta[name="csrf-token"]').attr('content');

                try {
                    const response = await fetch('/chat/ai', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-csrf-token': csrfToken
                        },
                        body: JSON.stringify({
                            chat_id: this.chatId,
                            postCondition: post.attr('postcondition') || '',
                            messages: messages,
                            postContext: postContext
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error('AI reply failed:', response.status, errText);
                        this.addMessageExternal('Sorry, something went wrong. Please try again.', this.getCurrentTime(), 'Comment Coach', true);
                        return;
                    }

                    const data = await response.json();
                    const replyText = data.message.content;
                    this.addMessageExternal(replyText, this.getCurrentTime(), 'Comment Coach', true);

                    const match = replyText.match(/FINAL_COMMENT:\s*(.+?)(?=\n✅|\n\n|✅|$)/s);
                    if (match) {
                        const finalComment = match[1].trim();
                        post.find('textarea.replytoPost').val(finalComment);
                        post.find('textarea.replytoPost').focus();
                        setTimeout(function() {
                            $('#copilot-chat .chat').transition('fade down');
                        }, 2000);
                    }
                } catch (err) {
                    console.error('FETCH ERROR:', err);
                    this.addMessageExternal('Sorry, something went wrong. Please try again.', this.getCurrentTime(), 'Comment Coach', true);
                }
            },

            // Handles the addition of an incoming message (agent or replayed history)
            addMessageExternal: function(body, absTime, name, isAgent) {
                this.render(body, absTime, name, isAgent, true, false);
            },

            // Handles Enter key in textarea
            handleKeydown: function(event) {
                if (event.keyCode == 13 && !event.ctrlKey) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.sendMessage();
                } else {
                    event.stopImmediatePropagation();
                }
            },

            addTypingAnimationExternal: function(name) {
                if (this.typingTimeout == null) {
                    this.render(undefined, undefined, name, true, true, true);
                } else {
                    clearTimeout(this.typingTimeout);
                }
                this.typingTimeout = setTimeout(() => {
                    this.typingTimeout = null;
                    this.removeTypingAnimationExternal();
                }, 5000);
            },

            removeTypingAnimationExternal: function() {
                this.$chatHistoryList.find(".ui.grid.centered:last").remove();
            },

            scrollToBottom: function() {
                if (this.$chatHistory[0]) {
                    this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
                }
            },

            getCurrentTime: function() {
                return new Date().toLocaleTimeString()
                    .replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
            },

            resetChat: function() {
                this.$chatHistoryList.empty();
            }
        };
        chat.init();
    });

    // Minimize chat box
    $('.chat-minimize, .chat-header').click(function(e) {
        e.stopImmediatePropagation();
        let chat = $(this).closest('.chat').children('.chat-history');
        chat.slideToggle(300, 'swing');
    });

    // Close chat box
    $('.chat-close').click(function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        $('#copilot-chat .chat').transition('fade down');

        // if any element has chat-highlight class, remove it
        const highlightedPost = $(".chat-highlight");
        if (highlightedPost.length) {
            highlightedPost.removeClass("chat-highlight");
        }
    });
});