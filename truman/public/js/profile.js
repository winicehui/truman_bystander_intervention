$(window).on("load", function () {
  let selectedImage = null;

  // Photo selection
  $('.images .image').on('click', function () {
    // Deselect all
    $('.images .image').removeClass('selected');

    // Select clicked
    $(this).addClass('selected');

    // Track selected image
    selectedImage = $(this).find('img').attr('src');

    // Add or update hidden input for form submission
    if ($('input[name="profile_picture"]').length === 0) {
      $('<input>').attr({ type: 'hidden', name: 'profile_picture' }).appendTo('#signup-form');
    }
    $('input[name="profile_picture"]').val(selectedImage);

    checkReady();
  });

  // Check fields on username input and checkbox change
  $('#username').on('input', checkReady);
  $('#tos').on('change', checkReady);

  function checkReady() {
    const hasUsername = $('#username').val().trim().length > 3;
    const hasPhoto = selectedImage !== null;
    const hasTos = $('#tos').is(':checked');

    if (hasUsername) {
      $('#username').addClass('selected');
    } else {
      $('#username').removeClass('selected');
    }
    if (hasUsername && hasPhoto && hasTos) {
      $('button[type="submit"]').addClass('ready').removeClass('disabled');
    } else {
      $('button[type="submit"]').removeClass('ready').addClass('disabled');
    }
  }

  // Initialize button state
  checkReady();
});