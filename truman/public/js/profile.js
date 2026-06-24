$(window).on('load', function () {
    const $button = $('button[type="submit"]');

    function setButtonSuccess() {
      $button
        .removeClass('ready disabled')
        .addClass('green')
        .html('<i class="check icon"></i> Updated')
    }

    function setButtonEnabled() {
      $button
        .removeClass('green disabled')
        .addClass('ready')
        .html('Update Profile')
        .prop('disabled', false);
    }

    // Photo selection
    $('.images .image').on('click', function () {
      $('.images .image').removeClass('selected');
      $(this).addClass('selected');
      const selectedImage = $(this).find('img').attr('src');
      $('input[name="profile_picture"]').val(selectedImage);
      setButtonEnabled();
    });

    // Text field change detection
    $('#name, #location, #bio').on('input change', function () {
        setButtonEnabled();
    });

    // Handle form submission via AJAX
    $('#profile').on('submit', function (e) {
        e.preventDefault();

        $.post({
            url: '/account/profile',
            data: new FormData(this),
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    // Update header name
                    if (response.name) {
                      $('.ui.borderless.fixed.menu span, .ui.fluid.top.fixed.item.menu span')
                          .text(response.name);
                    }
                    // Update header profile picture
                    if (response.picture) {
                        $('.ui.borderless.fixed.menu img.ui.mini.spaced.circular.image, .ui.fluid.top.fixed.item.menu img.ui.mini.spaced.circular.image').attr('src', response.picture);
                    }
                    setButtonSuccess();
                }
            },
            error: function (xhr) {
                const response = xhr.responseJSON;
                if (response && !response.success) {
                    console.error(response.msg);
                }
            }
        });
    });
});