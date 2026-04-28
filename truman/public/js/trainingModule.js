$(window).on('load', function() {
    setTimeout(function() {
        console.log("1 second later")
        const post = $('.ui.fluid.card');
            openChat(post);
    }, 1000);

    $("#proceed-btn").on('click', async function() {
        try {
            const response = await fetch('/training_status');
            const data = await response.json();
            const canProceed = data.numComments > 0 || data.userTurns >= 5;

            if (canProceed) {
                $.post('/account/training', { _csrf: $('meta[name="csrf-token"]').attr('content') })
                    .done(function(json) {
                            if (json["result"] === "success") {
                                window.location.href = '/';
                            }
                    })
                    .fail(function() {
                        alert('Error setting consent. Please try again.');
                    });
            } else {
                if (!$('#error-msg').hasClass('visible')) {
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
