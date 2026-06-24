// Before Page load:
$('#content').hide();
$('#loading').show();
let isActive = false;
let activeStartTime;

// Called when user is inactive for about 1 minute, when user logs out of the website, when user changes the page (beforeunload).
// Logs the active time duration to the database and resets active timer.
// If loggingOut is true, redirects user to logout route after logging active time.
// If fromIdle is true, subtracts 1 minute from active duration to account for idle time.
async function sendActiveTime(activeDuration, pathname) {
    const data = {
        time: activeDuration,
        pathname: pathname,
        _csrf: $('meta[name="csrf-token"]').attr('content')
    };

    const body = $.param(data);

    if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/x-www-form-urlencoded;charset=UTF-8' });
        return navigator.sendBeacon('/pageTimes', blob);
    }

    let success = false;
    await $.ajax({
        type: 'POST',
        url: '/pageTimes',
        data: body,
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        async: false,
        success: function() {
            success = true;
        },
        error: function() {
            success = false;
        }
    });
    return success;
}

function resetActiveTimer(loggingOut, fromIdle) {
    // Compute active duration only if user was active; allow logging out even when not active.
    const activeDuration = isActive ? Date.now() - activeStartTime - (fromIdle ? 30000 : 0) : 0;
    isActive = false;
    
    // if (window.isLoggedIn && activeDuration > 0) {
    if (window.isLoggedIn) {
        sendActiveTime(activeDuration, window.location.pathname);
    }

    if (loggingOut) {
        // Mark that we're logging out so unload handlers don't double-run logout logic.
        window.loggingOut = true;
        window.location.href = '/logout';
    }
}

$(window).on("load", function() {
    /**
     * Recording user's active time on website:
     */
    let idleTime = 0;

    $('#pagegrid').on('mousemove keypress scroll mousewheel', function() {
        if (!isActive) {
            activeStartTime = Date.now();
            isActive = true;
        }
        idleTime = 0;
    });

    // Every 15 seconds, check if user has been idle for about 30 seconds
    setInterval(function() {
        idleTime += 1;
        if (idleTime > 2 && isActive) { // 15 seconds * 2 = 30 seconds
            resetActiveTimer(false, true);
        }
    }, 15000);

    $('a.item.logoutLink').on('click', function() {
        window.loggingOut = true; // Set the flag to indicate that the user is logging out
        resetActiveTimer(true, false);
    });

    if (window.isLoggedIn) {
        $.post("/pageLog", {
            path: window.location.pathname,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
    }

    /**
     * Other site functionalities:
     */

    // Close loading dimmer on content load.
    $('#loading').hide();
    $('#content').fadeIn('slow');

    // Fomantic UI: Enable closing messages
    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });

    // Fomantic UI: Enable checkboxes
    $('.checkbox').checkbox();

    // Check if user has any notifications every 5 seconds.
    // List of authenticated pages to skip checking for notifications on.
    const skipNotifications = [
        '/tos',
        '/com',
        '/training_intro',
        '/beta_intro',
        '/training_module',
        '/training_complete',
        '/notifications',
        '/account',
        '/account/signup_info'
    ];

    if (window.isLoggedIn && !skipNotifications.includes(window.location.pathname)) {
        setInterval(function() {
            $.getJSON("/notifications", { bell: true }, function(json) {
                if (json.count != 0) {
                    $("i.big.alarm.icon").replaceWith('<i class="big icons"><i class="red alarm icon"></i><i class="corner yellow lightning icon"></i></i>');
                }
            });
        }, 5000);
    }

    // Picture preview on image selection (used for: uploading new post, updating profile)
    $("#picinput").change(function() {
        if (!this.files || !this.files[0]) return;
        let reader = new FileReader();
        reader.onload = function(e) {
            $('#imgInp').attr('src', e.target.result);
        };
        reader.readAsDataURL(this.files[0]);
    });

    // Lazy load images on website
    function loadLazyImage(img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy');
    }

    function observeLazyImages() {
        const images = $('img.lazy[data-src]');
        if (!images.length) return;

        if (!('IntersectionObserver' in window)) {
            images.each(function(index, img) {
                loadLazyImage(img);
            });
            return;
        }

        if (!window.imageObserver) {
            window.imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (!entry.isIntersecting) return;
                    loadLazyImage(entry.target);
                    window.imageObserver.unobserve(entry.target);
                });
            }, { rootMargin: '200px 0px', threshold: 0.01 });
        }

        images.each(function(index, img) {
            window.imageObserver.observe(img);
        });
    }

    window.lazyLoadImages = observeLazyImages;
    observeLazyImages();
});

window.addEventListener('pageshow', function(event) {
    // Only reload if page was loaded from back/forward cache (persisted = true).
    // This prevents running twice since the reload sets persisted = false on the next fire.
    if (event.persisted) {
        document.documentElement.style.visibility = 'hidden';
        window.location.replace(window.location.href);
    }
});

$(window).on("pagehide", function(event) {
    if (!event.persisted && !window.loggingOut) {
        resetActiveTimer(false, false);
    }
});