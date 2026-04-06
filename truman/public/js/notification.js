$(window).on("load", function() { //notifications popup on click, show the corresponding post
    $('.ui.raised.segment').on('click', function(event) {
        const relevantPostNumber = $(this).attr('correspondingPost');
        //show the relevant post in a popup modal
        $(`.ui.small.long.modal[correspondingPost=${relevantPostNumber}]`).modal('show');
        // lazy load the images
        $(".ui.small.long.modal .ui.fluid.card img")
            .visibility({
                type: 'image',
                offset: 0,
                onLoad: function(calculations) {
                    $('.ui.small.long.modal .ui.fluid.card img').visibility('refresh');
                }
            });
    })

    $("a, a.ui.avatar.image").on('click', function(event) {
        event.stopPropagation(); // prevent the click from propagating to the segment
    });
});