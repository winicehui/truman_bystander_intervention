$(window).on('load', function() {
    setTimeout(function() {
        const post = $('.ui.fluid.card');
            if (typeof openChat === 'function') {
                openChat(post);
            }
    }, 1000);

    $("#proceed-btn").on('click', async function() {
        try {
            if (window.location.pathname == '/training_module') {
                const response = await fetch('/training_status');
                const data = await response.json();
                const canProceed = data.userTurns >= 7;

                if (canProceed) {
                    $.post('/account/training', { _csrf: $('meta[name="csrf-token"]').attr('content') })
                        .done(function(json) {
                            if (json["result"] === "success") {
                                window.location.href = '/training_complete';
                            }
                        })
                        .fail(function() {
                            alert('Error setting consent. Please try again.');
                    });
                } else {
                    $('#error-msg').transition('slide down');
                    setTimeout(function() {
                        $('#error-msg').transition('slide up');
                    }, 5000);
                }
            }
        } catch (err) {
            console.error('Error fetching training status:', err);
            $('#error-msg').transition('slide down');
            setTimeout(function() {
                $('#error-msg').transition('slide up');
            }, 5000);
        }
    });
});
