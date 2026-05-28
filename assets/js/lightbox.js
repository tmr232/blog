(function () {
    "use strict";

    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    var img = document.getElementById("lightbox-img");
    var caption = document.getElementById("lightbox-caption");
    var lastFocused = null;

    // Wrap each lightboxable post image in a real <button> so keyboard
    // users can focus it and activate with Enter/Space. We keep the
    // original <img> as the button's only child (no visual change), and
    // collect the wrapped pairs in document order so arrow keys can
    // walk between them once the lightbox is open.
    var triggers = [];
    Array.prototype.forEach.call(
        document.querySelectorAll(".post-content img"),
        function (el) {
            if (el.closest("a")) return;
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "lightbox-trigger";
            var alt = el.getAttribute("alt") || "";
            btn.setAttribute(
                "aria-label",
                alt ? "View image: " + alt : "View image");
            el.parentNode.insertBefore(btn, el);
            btn.appendChild(el);
            triggers.push({ btn: btn, img: el });
        });

    var currentIndex = -1;

    function open(index) {
        if (index < 0 || index >= triggers.length) return;
        currentIndex = index;
        var el = triggers[index].img;
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

    triggers.forEach(function (t, i) {
        t.btn.addEventListener("click", function () { open(i); });
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
