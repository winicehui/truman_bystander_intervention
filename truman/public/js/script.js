$(window).on("load", function() {
    $('.ui.tiny.post.modal').modal({
        observeChanges: true
    });

    // Add new post Modal functionality
    $("#newpost, a.item.newpost").click(function() {
        $('.ui.tiny.post.modal').modal('show');
    });

    // new post validator (text is required; photo is optional)
    $('#postform').form({
        on: 'blur',
        fields: {
            body: {
                identifier: 'body',
                rules: [{
                    type: 'empty',
                    prompt: 'Please add some text about your meal.'
                }]
            }
        },
        onSuccess: function(event, fields) {
            $("#postform")[0].submit();
            $('.actions .ui.button').addClass('disabled');
            $('.actions .ui.button').val('Posting...');
        }
    });

    $("#proceed-btn").on('click', async function() {
        try {
            if (window.location.pathname == "/") {
                // Flush current active time before checking so a continuously active user's time is counted
                if (isActive && window.isLoggedIn) {
                    const now = Date.now();
                    await $.post('/pageTimes', {
                        time: now - activeStartTime,
                        pathname: window.location.pathname,
                        _csrf: $('meta[name="csrf-token"]').attr('content')
                    });
                    activeStartTime = now; // avoid double-counting when resetActiveTimer runs after
                }
                const response = await fetch('/feed_status');
                const data = await response.json();
                const canProceed = data.numUserActions >= 3 && data.feedTimeMs >= 180000;

                if (canProceed) {
                    window.loggingOut = true; // Set the flag to indicate that the user is logging out
                    resetActiveTimer(true, false);
                } else {
                    if (!$('#error-msg').is(':visible')) {
                        $('#error-msg').transition('slide down');
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching feed status:', err);
            if (!$('#error-msg').is(':visible')) {
                $('#error-msg').transition('slide down');
            }
        }
    });
});
