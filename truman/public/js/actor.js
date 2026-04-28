let openingReportTwo = false;

$(window).on("load", function () {

    // Navigation
    $('.ui.home.inverted.button').on('click', () => window.location.href = '/');

    // Report Modal #1
    $('.ui.small.report.modal').modal({
        onVisible() {
            $('input:radio[name="report_issue"]').change(function () {
                $('input.ui.green.button.disabled').removeClass('disabled');
            });
        },
        onHidden() {
            $(".ui.small.report.modal input[type=radio]").prop('checked', false);
            $("input.ui.green.button").addClass('disabled');

            if (isBlocked && !openingReportTwo) {
                $('.ui.small.basic.blocked.modal').modal('show');
            }
            openingReportTwo = false;
        }
    });

    // Report Modal #2
    $('.second.modal').modal({
        closable: false,
        onVisible() { $('.second.modal').modal('hide others'); },
        onHidden() {
            if (isBlocked) $('.ui.small.basic.blocked.modal').modal('show');
        }
    });

    // Block Modal
    $('.ui.small.basic.blocked.modal').modal({
        allowMultiple: false,
        closable: false,
        onDeny() { /* report user */ },
        onApprove() {
            const username = $('button.ui.button.block').attr("username");
            $.post("/user", { unblocked: username, _csrf: $('meta[name="csrf-token"]').attr('content') })
                .then(() => isBlocked = false);
        }
    });

    // Modal chaining
    $('.second.modal').modal('attach events', '.report.modal .button', 'show');
    $('.report.modal .button').on('click', function () {
        openingReportTwo = true;
    });
    $('.report.modal').modal('attach events', '.blocked.modal .red.button', 'show');

    // Report button & form
    $('.ui.button.report').on('click', () => $('.ui.small.report.modal').modal('show'));
    $('form#reportform').submit(function (e) {
        e.preventDefault();
        isReported = true;
        $.post($(this).attr('action'), $(this).serialize(), () => $('.ui.small.basic.blocked.modal').modal('hide'));
    });

    // Block button
    $('button.ui.button.block').on('click', function () {
        isBlocked = true;
        $.post("/user", { blocked: $(this).attr("username"), _csrf: $('meta[name="csrf-token"]').attr('content') });
        $('.ui.small.basic.blocked.modal').modal('show');
    });

    // Show block modal on load if already blocked
    if (isBlocked) $('.ui.small.basic.blocked.modal').modal('show');
});