// Opens the co-pilot chat
async function openChat(e) {
    const post = $(this).closest('.ui.fluid.card');
    const chatId = post.attr("postid");

    // Update chat header with given actor metadata
    $("#copilot-chat").attr("chatId", chatId);
    // $(".actor-chat .chat .chat-header img.ui.avatar.image").attr("src", picture);
    // $("#copilot-chat .chat .chat-header .chat-about .chat-with").text("Chat with " + chatId);
    // Update chat instance
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
    // Get previous messages in #USERNAME chat and update chat messages
    await $.getJSON("/chat", { "chat_id": chatId }, function(data) {
        for (const msg of data) {
            chat.addMessageExternal(msg.body, msg.absTime, msg.name, msg.isAgent);
        }
    });
}

$(window).on("load", function() {
    $('.practice-chat').click(openChat);

    // Define and initiate chats
    $('.container.clearfix').each(function() {
        const chatId = this.id;
        const chat = {
            mostRecentMessenger: null,
            chatId: chatId,
            typingTimeout: null,
            init: function() {
                this.cacheDOM();
                this.bindEvents();
                $(this.$chatHistory).closest('.container.clearfix').data('chatInstance', this); // Store instance
            },
            cacheDOM: function() {
                    this.$chatHistory = $('#copilot-chat .chat-history');
                    this.$button = $('#copilot-chat button');
                    this.$textarea = $('#copilot-chat #message-to-send');
                    this.$img = $('#copilot-chat img.ui.avatar.image');
                    this.$chatHistoryList = this.$chatHistory.find('ul');
            },
            bindEvents: function() {
                this.$button.on('click', this.addMessage.bind(this));
                this.$textarea.on('keydown', this.addMessageTyping.bind(this));
            },
            // Renders a message
            render: function(body, absTime, name, isAgent, isExternalMessage, isTypingAnimation) {
                if (this.typingTimeout != null) {
                    clearTimeout(this.typingTimeout);
                    this.typingTimeout = null;
                    this.removeTypingAnimationExternal();
                }
                if (isTypingAnimation || body.trim() !== '') {
                    let template;
                    if (isAgent) {
                        template = Handlebars.compile($("#other-message-template").html());
                    } else {
                        template = Handlebars.compile($("#my-message-template").html());
                    }

                    let context = {
                        name: name,
                        messageOutput: body,
                        time: absTime,
                        addProfilePhoto: this.mostRecentMessenger != name,
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

            // Handles the addition of outgoing message (by the user) to chat history
            addMessage: function() {
                const name = "Me";
                const message = this.$textarea.val();
                const time = this.getCurrentTime();

                this.render(message, time, name, false, false, false);

                $.post("/chat", {
                    chat_id: this.chatId,
                    body: message,
                    absTime: Date.now(),
                    name: name,
                    isAgent: false,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                });
                
                this.addTypingAnimationExternal("Trainer", false);
            },

            // Handles the addition of an incoming message to chat history (could be user or copilot)
            addMessageExternal: function(body, absTime, name, isAgent) {
                this.render(body, absTime, name, isAgent, true, false);
            },

            // Handles typing events in the textarea of chats
            addMessageTyping: function(event) {
                if (event.keyCode == 13 && !event.ctrlKey) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.addMessage();
                    this.addTypingAnimationExternal("You");
                } else {
                    event.stopImmediatePropagation();
                }
            },

            // Adds typing animation
            addTypingAnimationExternal: function(name) {
                if (this.typingTimeout == null) {
                    this.render(undefined, undefined, name, true, true, true);
                } else {
                    clearTimeout(this.typingTimeout);
                }
                this.typingTimeout = setTimeout(() => {
                    this.typingTimeout = null;
                    this.removeTypingAnimationExternal();
                }, 3000);
            },

            // Removes typing animation
            removeTypingAnimationExternal: function(name, isAgent) {
                this.$chatHistoryList.find(".ui.grid.centered:last").remove();
            },

            scrollToBottom: function() {
                if (this.$chatHistory[0]) {
                    this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
                }
            },

            getCurrentTime: function() {
                return new Date().toLocaleTimeString().
                replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
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
    });
});