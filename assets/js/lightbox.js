(function () {
    "use strict";

    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    var img = document.getElementById("lightbox-img");
    var caption = document.getElementById("lightbox-caption");
    var lastFocused = null;

    function open(src, alt) {
        lastFocused = document.activeElement;
        img.src = src;
        img.alt = alt || "";
        caption.textContent = alt || "";
        lightbox.classList.add("is-open");
        document.documentElement.classList.add("lightbox-open");
        document.body.classList.add("lightbox-open");
        lightbox.focus();
    }

    function close() {
        lightbox.classList.remove("is-open");
        document.documentElement.classList.remove("lightbox-open");
        document.body.classList.remove("lightbox-open");
        img.src = "";
        img.alt = "";
        caption.textContent = "";
        if (lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus();
        }
    }

    // Wire up post images. Skip images already wrapped in a link.
    var images = document.querySelectorAll(".post-content img");
    images.forEach(function (el) {
        if (el.closest("a")) return;
        el.addEventListener("click", function () {
            open(el.currentSrc || el.src, el.getAttribute("alt"));
        });
    });

    // Close on click anywhere on the overlay (including the image).
    lightbox.addEventListener("click", function () {
        close();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
            close();
        }
    });
})();
