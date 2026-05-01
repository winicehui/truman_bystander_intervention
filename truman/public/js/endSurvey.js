$(window).on('load', function() {
    $("#proceed-btn").on('click', function() {
        sessionStorage.setItem('endSurveyScrollY', String(window.scrollY));
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('surveyBlocked') === 'true') {
        const savedScrollY = sessionStorage.getItem('endSurveyScrollY');
        if (savedScrollY !== null) {
            window.scrollTo(0, parseInt(savedScrollY, 10) || 0);
            sessionStorage.removeItem('endSurveyScrollY');
        }

        if (!$('#error-msg').hasClass('visible')) {
            $('#error-msg').transition('slide down');
            setTimeout(function() {
                $('#error-msg').transition('slide up');
            }, 5000);
        }
    } else {
        sessionStorage.removeItem('endSurveyScrollY');
    }
});
