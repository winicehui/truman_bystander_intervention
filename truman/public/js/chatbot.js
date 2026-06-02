/** Rules/ functionality of chatbot: 
 * 1. If chat for a post has not been opened since post has entered viewport, and user interacts with 
 * cyberbullying content on the post or any cyberbullying content on the post has been in the viewport for >3 seconds, 
 * then open chat (which also highlights corresponding post) and unhide #continue-chat-button for that post.
 * 2. If chat was previously opened and user minimized/closed it, and content hasn't left viewport left, 
 * do nothing (unless forced by clicking #continue-chat-button next to a post).
 * 3. Minimizing the chatbot: minimizes chat history, keeps post highlighted.
 * 4. Closing the chatbot: closes chat into a tag, unhighlights post. Clicking the tag reopens chat.
 * 5. When content has left viewport, all chatbot elements are hidden. Only #continue-chat-button remains for the post.
 * Chat is reset.
 * **/
function getCommentContext(post) {
    const comments = [];

    post.find('.ui.comments .comment .content').each(function() {
        const author = $(this).children('.author').first().text().trim();
        const body = $(this).children('.text').first().text().trim();

        if (body) {
            comments.push(author ? `${author}: ${body}` : body);
        }
    });

    return comments.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// postChatState: shared chat state — must be accessible by postFunctionalities.js too
// ─────────────────────────────────────────────────────────────────
// Tracks per-post state. Key: postID, value:
//   'pending'   — 3s timer is running
//   'open'      — chat is open
//   'minimized' — chat is minimized
//   'closed'    — chat was closed by user (continue-chat-button shown)
const postChatState = new Map();

const chatUIState = {
    currentChatId: null,
    highlightedElement: null,
};
const chatMinimizeTimers = new Map();


const activeChatObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            const postID = $(entry.target).attr('postID');
            resetPostChatState(postID);
            activeChatObserver.unobserve(entry.target); // stop observing once reset
        }
        });
    }, {
        threshold: 0,
        rootMargin: '-50px'
});

// ─────────────────────────────────────────────────────────────────
// openChat(element)
// Called by any trigger. element is always a jQuery .comment or .ui.fluid.card
// ─────────────────────────────────────────────────────────────────
async function logChatActivation(chatId, activationFactor) {
    try {
        await $.post('/chat/activation', {
            chat_id: chatId,
            activationFactor: activationFactor,
            _csrf: $('meta[name="csrf-token"]').attr('content')
            
        });
    } catch (err) {
        console.error('logChatActivation error:', err);
    }
}
async function logChatTiming(chatId, event, minimizedDuration) {
    try {
        const payload = {
            chat_id: chatId,
            event: event,
            absTime: Date.now(),
            _csrf: $('meta[name="csrf-token"]').attr('content')
        };
        if (minimizedDuration !== undefined) {
            payload.minimizedDuration = minimizedDuration;
        }
        await $.post('/chat/timing', payload);
    } catch (err) {
        console.error('logChatTiming error:', err);
    }
}
async function openChat(element, force = false, activationFactor = 1) {
    if (!element || !element.jquery || !element.length) return;
 
    const isCard = element.hasClass('card');
    const post = isCard ? element : element.closest('.ui.fluid.card');
    if (!post.length) return;
 
    const chatId = post.attr('postID') || post.attr('postid');
    if (!chatId) return;
 
    const state = postChatState.get(chatId);
 
    // Rule 2: If chat was previously opened and user minimized/closed it,
    // and content hasn't left viewport since — do nothing (unless forced)
    if (!force && (state === 'open' || state === 'minimized' || state === 'closed')) return;
 
    // Cancel any pending 3s timer if a manual interaction fires first
    if (state && state !== 'pending') clearTimeout(state);
 
    // ── Mark as open ──────────────────────────────────────────────
    postChatState.set(chatId, 'open');
    chatUIState.currentChatId = chatId;
 
    // ── Log activation factor (server enforces first-call-wins) ───
    await logChatActivation(chatId, activationFactor);
 
    // ── If chat was previously minimized/closed, record that gap ──
    if (chatMinimizeTimers.has(chatId)) {
        const hiddenMs = Date.now() - chatMinimizeTimers.get(chatId);
        chatMinimizeTimers.delete(chatId);
        await logChatTiming(chatId, 'reopened', hiddenMs);
    }
 
    // Reveal the continue-chat-button on this specific post
    post.find('.continue-chat-button').removeClass('hidden');

    // Hide the #copilot-chat-toggle since we're now showing the chat for this post
    $('#copilot-chat-toggle').addClass('hidden');
 
    // Start watching the post for when it leaves the viewport
    activeChatObserver.observe(post[0]);
 
    // ── Highlight ─────────────────────────────────────────────────
    if (chatUIState.highlightedElement) {
        chatUIState.highlightedElement.removeClass('chat-highlight');
    }
    post.addClass('chat-highlight');
    chatUIState.highlightedElement = post;
 
    // ── Wire up chat instance ─────────────────────────────────────
    const chat = $('#copilot-chat.container.clearfix').data('chatInstance');
    if (!chat) { console.error('openChat: no chatInstance'); return; }
 
    chat.chatId = chatId;
    chat.mostRecentMessenger = null;
    chat.profilePicture = $('.menu .ui.mini.spaced.circular.image').attr('src');
    chat.resetChat();
 
    // ── Show chat ─────────────────────────────────────────────────
    const $chat = $('#copilot-chat .chat');
    const $history = $chat.find('.chat-history');
 
    $chat.removeClass('hidden').css('display', 'none').slideDown(250, function () {
        if (!$history.is(':visible')) {
            $history.slideDown(300, 'swing');
        }
    });
 
    // ── Load history ──────────────────────────────────────────────
    let existingMessages = [];
    try {
        existingMessages = await $.getJSON('/chat', { chat_id: chatId });
        for (const msg of existingMessages) {
            chat.addMessageExternal(msg.body, msg.absTime, msg.name, msg.isAgent);
        }
    } catch (err) {
        console.error('Failed to load chat history:', err);
    }
 
    // ── AI greeting (only if no history) ─────────────────────────
    if (existingMessages.length === 0) {
        const postContext = post.find('.description').first().text().trim();
        const commentContext = getCommentContext(post);
 
        chat.addTypingAnimationExternal('Comment Coach');
        try {
            const response = await fetch('/chat/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': $('meta[name="csrf-token"]').attr('content')
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    messages: [],
                    postContext: postContext,
                    commentContext: commentContext
                })
            });
            if (!response.ok) throw new Error(response.status);
            const data = await response.json();
            chat.addMessageExternal(data.message.content, chat.getCurrentTime(), 'Comment Coach', true);
        } catch (err) {
            console.error('Greeting error:', err);
            chat.addMessageExternal('Sorry, something went wrong. Please try again.', chat.getCurrentTime(), 'Comment Coach', true);
        }
    }
}
// ─────────────────────────────────────────────────────────────────
// resetPostChatState(postId)
// Called when cyberbullying content leaves the viewport.
// Fully resets everything for that post.
// ─────────────────────────────────────────────────────────────────
function resetPostChatState(postId) {
    const state = postChatState.get(postId);

    // Cancel pending timer if it exists
    if (state && state !== 'open' && state !== 'minimized' && state !== 'closed' && state !== 'pending') {
        clearTimeout(state);
    }
    postChatState.delete(postId);

    // Only touch the UI if this post is the currently active one
    if (chatUIState.currentChatId !== postId) return;

    // Clear highlight
    if (chatUIState.highlightedElement) {
        chatUIState.highlightedElement.removeClass('chat-highlight');
        chatUIState.highlightedElement = null;
    }
    chatUIState.currentChatId = null;

    // Hide chat and continue button
    const $chat = $('#copilot-chat .chat');
    $chat.slideUp(200, function () {
        $(this).addClass('hidden');
    });

    // Hide the toggle button
    $('#copilot-chat-toggle').addClass('hidden');

    // Stop observing the post
    const postEl = $(`[postid="${postId}"]`)[0];
    if (postEl) activeChatObserver.unobserve(postEl);
}

// ─────────────────────────────────────────────────────────────────
// Chat instance + UI event bindings
// ─────────────────────────────────────────────────────────────────
$(window).on('load', function () {
    $('.container.clearfix').each(function () {
        const chat = {
            chatId: null,
            mostRecentMessenger: null,
            typingTimeout: null,
            profilePicture: null,

            init() {
                this.cacheDOM();
                this.bindEvents();
                $(this.$chatHistory).closest('.container.clearfix').data('chatInstance', this);
            },

            cacheDOM() {
                this.$chatHistory     = $('#copilot-chat .chat-history');
                this.$button          = $('#copilot-chat button');
                this.$textarea        = $('#copilot-chat #message-to-send');
                this.$chatHistoryList = this.$chatHistory.find('ul');
            },

            bindEvents() {
                this.$button.on('click', this.sendMessage.bind(this));
                this.$textarea.on('keydown', this.handleKeydown.bind(this));
            },

            render(body, absTime, name, isAgent, isExternalMessage, isTypingAnimation) {
                if (this.typingTimeout != null) {
                    clearTimeout(this.typingTimeout);
                    this.typingTimeout = null;
                    this.removeTypingAnimationExternal();
                }
                if (isTypingAnimation || (body && body.trim() !== '')) {
                    const template = Handlebars.compile(
                        isAgent
                            ? $('#other-message-template').html()
                            : $('#my-message-template').html()
                    );
                    const context = {
                        name,
                        messageOutput: body,
                        time: absTime,
                        addProfilePhoto: this.mostRecentMessenger !== name,
                        isTypingAnimation,
                        isAgent: !!isAgent,
                        avatar: this.profilePicture
                    };
                    if (!isTypingAnimation) this.mostRecentMessenger = name;
                    this.$chatHistoryList.append(template(context));
                    this.scrollToBottom();
                    if (!isExternalMessage) this.$textarea.val('');
                } else {
                    this.scrollToBottom();
                    if (!isExternalMessage) this.$textarea.val('');
                }
            },

            async sendMessage() {
                const name = 'Me';
                const message = this.$textarea.val().trim();
                if (!message) return;
            
                // If minimized, expand history first
                if (!this.$chatHistory.is(':visible')) {
                    this.$chatHistory.slideDown(300, 'swing', () => {
                        if (chatUIState.currentChatId) {
                            postChatState.set(chatUIState.currentChatId, 'open');
                        }
                    });
                }
            
                try {
                    await $.post('/chat', {
                        chat_id: this.chatId,
                        body: message,
                        absTime: Date.now(),
                        name,
                        isAgent: false,
                        _csrf: $('meta[name="csrf-token"]').attr('content')
                    });
                } catch (err) {
                    const errorMessage = err?.responseJSON?.message || 'You have reached the chat limit.';
                    this.addMessageExternal(errorMessage, this.getCurrentTime(), 'Comment Coach', true);
                    return;
                }

                this.render(message, this.getCurrentTime(), name, false, false, false);
            
                // ── NEW: record message timestamp for net-interaction-time calc ──
                await logChatTiming(this.chatId, 'message_sent');
                // ─────────────────────────────────────────────────────────────────
            
                this.addTypingAnimationExternal('Comment Coach');
            
                const messages = [];
                this.$chatHistoryList.find('li').each(function () {
                    const isAgent = $(this).find('.other-message').length > 0;
                    const body = $(this).find('.other-message, .my-message').text().trim();
                    if (body) messages.push({ role: isAgent ? 'assistant' : 'user', content: body });
                });
            
                const post = $(`[postid="${this.chatId}"]`);
                const postContext = post.find('.description').first().text().trim();
                const commentContext = getCommentContext(post);
                try {
                    const response = await fetch('/chat/ai', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-csrf-token': $('meta[name="csrf-token"]').attr('content')
                        },
                        body: JSON.stringify({
                            chat_id: this.chatId,
                            postCondition: post.attr('postcondition') || '',
                            messages,
                            postContext: postContext,
                            commentContext: commentContext
                        })
                    });
                    if (!response.ok) throw new Error(response.status);
                    const data = await response.json();
                    const replyText = data.message.content;
                    this.addMessageExternal(replyText, this.getCurrentTime(), 'Comment Coach', true);
            
                    const match = replyText.match(/FINAL_COMMENT:\s*(.+?)(?=\n✅|\n\n|✅|$)/s);
                    if (match) {
                        post.find('textarea.replyToPost').val(match[1].trim()).focus();
                        setTimeout(() => $('#copilot-chat .chat').slideUp(200), 2000);
                    }
                } catch (err) {
                    console.error('sendMessage error:', err);
                    this.addMessageExternal('Sorry, something went wrong. Please try again.', this.getCurrentTime(), 'Comment Coach', true);
                }
            },
 

            addMessageExternal(body, absTime, name, isAgent) {
                this.render(body, absTime, name, isAgent, true, false);
            },

            handleKeydown(event) {
                if (event.keyCode === 13 && !event.ctrlKey) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.sendMessage();
                } else {
                    event.stopImmediatePropagation();
                }
            },

            addTypingAnimationExternal(name) {
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

            removeTypingAnimationExternal() {
                this.$chatHistoryList.find('.ui.grid.centered:last').remove();
            },

            scrollToBottom() {
                if (this.$chatHistory[0]) {
                    this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
                }
            },

            getCurrentTime() {
                return new Date().toLocaleTimeString()
                    .replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, '$1$3');
            },

            resetChat() {
                this.$chatHistoryList.empty();
                this.mostRecentMessenger = null;
            }
        };
        chat.init();
    });

    // ── Minimize button ───────────────────────────────────────────
    $('.chat-minimize').on('click', function (e) {
        e.stopImmediatePropagation();
        const $history = $('#copilot-chat .chat-history');
        $history.slideToggle(300, 'swing', function () {
            if (chatUIState.currentChatId) {
                const isNowMinimized = !$history.is(':visible');
                if (isNowMinimized) {
                    // ── NEW: start the hidden-time clock ──
                    chatMinimizeTimers.set(chatUIState.currentChatId, Date.now());
                    postChatState.set(chatUIState.currentChatId, 'minimized');
                } else {
                    // User expanded via minimize button (toggle back open)
                    if (chatMinimizeTimers.has(chatUIState.currentChatId)) {
                        const hiddenMs = Date.now() - chatMinimizeTimers.get(chatUIState.currentChatId);
                        chatMinimizeTimers.delete(chatUIState.currentChatId);
                        logChatTiming(chatUIState.currentChatId, 'reopened', hiddenMs);
                    }
                    postChatState.set(chatUIState.currentChatId, 'open');
                }
            }
        });
        // Rule 4: highlight stays when minimized
    });

    // ── Close button ──────────────────────────────────────────────
    $('.chat-close').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    
        if (chatUIState.highlightedElement) {
            chatUIState.highlightedElement.removeClass('chat-highlight');
        }
        if (chatUIState.currentChatId) {
            // ── NEW: start the hidden-time clock ──
            chatMinimizeTimers.set(chatUIState.currentChatId, Date.now());
            postChatState.set(chatUIState.currentChatId, 'closed');
        }
    
        $('#copilot-chat .chat').addClass('hidden');
        $('#copilot-chat-toggle').removeClass('hidden');
    });

    // ── Continue chat button (re-open after close) ────────────────
    $('.continue-chat-button').on('click', function () {
        const post = $(this).closest('.ui.fluid.card');
        openChat(post, true);
    });

    // ── Toggle chat button (re-open when clicked) ────────────────
    $('#copilot-chat-toggle').on('click', function () {
        if (!chatUIState.currentChatId) return;
        $(this).addClass('hidden');
    
        // ── NEW: accumulate hidden time ──
        if (chatMinimizeTimers.has(chatUIState.currentChatId)) {
            const hiddenMs = Date.now() - chatMinimizeTimers.get(chatUIState.currentChatId);
            chatMinimizeTimers.delete(chatUIState.currentChatId);
            logChatTiming(chatUIState.currentChatId, 'reopened', hiddenMs);
        }
    
        if (chatUIState.highlightedElement) {
            chatUIState.highlightedElement.addClass('chat-highlight');
        }
        postChatState.set(chatUIState.currentChatId, 'open');
    
        const $chat = $('#copilot-chat .chat');
        const $history = $chat.find('.chat-history');
        $chat.removeClass('hidden').css('display', 'none').slideDown(250, function () {
            if (!$history.is(':visible')) {
                $history.slideDown(300, 'swing');
            }
        });
    });


    const cyberbullyingContent = $('.cyberbullying');

    const cyberbullyingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const element = entry.target;
            const post = $(element).closest('.ui.fluid.card');
            const postID = post.attr('postID');

            if (entry.isIntersecting) {
                // Only start timer if this post has no active state
                if (!postChatState.has(postID)) {
                    // const timeout = setTimeout(() => {
                    //     openChat(post); // highlight the whole card for viewport trigger
                    //     // openChat itself sets postChatState to 'open'
                    // }, 3000);
                    const timeout = setTimeout(() => {
                        openChat(post, false, 1); // activationFactor 1 = viewport dwell
                    }, 3000);
                    postChatState.set(postID, timeout); // store timer ref as value
                }
            } else {
                // Cyberbullying content left viewport before 3s timer fired
                const state = postChatState.get(postID);
                if (state && state !== 'open' && state !== 'minimized' && state !== 'closed' && state !== 'pending') {
                    clearTimeout(state); // cancel the pending 3s timer
                    postChatState.delete(postID); // reset so timer can restart next time content enters viewport
                }
            }
        });
    }, {
        threshold: 1,
        rootMargin: '-50px'
    });

    cyberbullyingContent.each(function(index, element) {
        cyberbullyingObserver.observe(element);
    });
});
