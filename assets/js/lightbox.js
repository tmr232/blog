(function () {
    "use strict";

    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    var img = document.getElementById("lightbox-img");
    var caption = document.getElementById("lightbox-caption");
    var lastFocused = null;

    // Make each lightboxable post image focusable in-place via ARIA
    // instead of wrapping it in a <button>. Wrapping breaks readability
    // extractors (Pocket, Instapaper, Readwise) that expect <img> to
    // sit directly inside <p>/<figure>/etc., so we keep the original
    // markup and bolt keyboard semantics onto the <img> itself.
    var triggers = [];
    Array.prototype.forEach.call(
        document.querySelectorAll(".post-content img"),
        function (el) {
            if (el.closest("a")) return;
            var alt = el.getAttribute("alt") || "";
            el.classList.add("lightbox-trigger");
            el.setAttribute("role", "button");
            el.setAttribute("tabindex", "0");
            el.setAttribute(
                "aria-label",
                alt ? "View image: " + alt : "View image");
            triggers.push(el);
        });

    var currentIndex = -1;

    function open(index) {
        if (index < 0 || index >= triggers.length) return;
        currentIndex = index;
        var el = triggers[index];
        lastFocused = document.activeElement;
        img.src = el.currentSrc || el.src;
        img.alt = el.getAttribute("alt") || "";
        caption.textContent = el.getAttribute("alt") || "";
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
        currentIndex = -1;
    }

    function next() {
        if (triggers.length <= 1) return;
        open((currentIndex + 1) % triggers.length);
    }

    function prev() {
        if (triggers.length <= 1) return;
        open((currentIndex - 1 + triggers.length) % triggers.length);
    }

    triggers.forEach(function (el, i) {
        el.addEventListener("click", function () { open(i); });
        // Enter / Space activate the button-roled image; preventDefault
        // on Space stops the page from scrolling.
        el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                open(i);
            }
        });
    });

    // Click anywhere on the overlay (including the image) closes.
    lightbox.addEventListener("click", function () { close(); });

    document.addEventListener("keydown", function (e) {
        if (!lightbox.classList.contains("is-open")) return;
        if (e.key === "Escape") { close(); e.preventDefault(); return; }
        if (e.key === "ArrowRight") { next(); e.preventDefault(); return; }
        if (e.key === "ArrowLeft") { prev(); e.preventDefault(); return; }
        // Focus trap: the lightbox holds no other focusable elements,
        // so just keep focus on it while open.
        if (e.key === "Tab") {
            e.preventDefault();
            lightbox.focus();
        }
    });
})();
