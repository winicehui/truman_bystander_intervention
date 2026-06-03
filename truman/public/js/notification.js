$(window).on("load", function() { //notifications popup on click, show the corresponding post
    $('.ui.raised.segment').on('click', function(event) {
        const relevantPostNumber = $(this).attr('correspondingPost');
        //show the relevant post in a popup modal
        $(`.ui.small.long.modal[correspondingPost=${relevantPostNumber}]`).modal('show');
        if (window.lazyLoadImages) window.lazyLoadImages();
    })

    $("a, a.ui.avatar.image").on('click', function(event) {
        event.stopPropagation(); // prevent the click from propagating to the segment
    });
});