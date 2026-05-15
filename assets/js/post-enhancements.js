/* Footnote popup (hover-show + click-pin) and code-block "language label
   becomes copy" button. Locked behavior from post-mockups-v7.html. */

(function () {
    'use strict';

    /* ─── Footnote popup ─────────────────────────────────── */

    let activePopup = null;
    let activeTrigger = null;
    let popupHideTimer = null;
    let pinned = false;

    function closeAllPopups() {
        if (activePopup) {
            activePopup.remove();
            activePopup = null;
            activeTrigger = null;
        }
        if (popupHideTimer) {
            clearTimeout(popupHideTimer);
            popupHideTimer = null;
        }
        pinned = false;
    }

    function buildPopup(fnref) {
        const href = fnref.getAttribute('href') || '';
        // href looks like "#fn:1". querySelector("#fn:1") would treat ":1"
        // as a (nonexistent) pseudo-class and throw, so look up by id.
        const id = href.startsWith('#') ? href.slice(1) : href;
        const target = id ? document.getElementById(id) : null;
        if (!target) return null;
        // Goldmark IDs are like "fn:1" / "fnref:1" — extract the number.
        const num = (id.split(':')[1] || '').trim();
        const popup = document.createElement('div');
        popup.className = 'fn-popup';
        popup.innerHTML = (num ? '<span class="num">[' + num + ']</span>' : '') +
            target.innerHTML;
        return popup;
    }

    function showPopup(fnref) {
        closeAllPopups();
        const popup = buildPopup(fnref);
        if (!popup) return;
        document.body.appendChild(popup);
        const r = fnref.getBoundingClientRect();
        popup.style.left = (window.scrollX + r.left) + 'px';
        popup.style.top = (window.scrollY + r.bottom + 6) + 'px';
        const pr = popup.getBoundingClientRect();
        if (pr.right > window.innerWidth - 12) {
            popup.style.left =
                (window.innerWidth - pr.width - 12 + window.scrollX) + 'px';
        }
        activePopup = popup;
        activeTrigger = fnref;
    }

    function pinCurrent() {
        if (!activePopup) return;
        pinned = true;
        activePopup.classList.add('pinned');
        if (!activePopup.querySelector('.pin-close')) {
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'pin-close';
            close.textContent = '×';
            close.title = 'close';
            close.addEventListener('click', e => {
                e.stopPropagation();
                closeAllPopups();
            });
            activePopup.appendChild(close);
        }
        if (popupHideTimer) {
            clearTimeout(popupHideTimer);
            popupHideTimer = null;
        }
    }

    function unpinCurrent() {
        if (!activePopup) return;
        pinned = false;
        activePopup.classList.remove('pinned');
        const close = activePopup.querySelector('.pin-close');
        if (close) close.remove();
    }

    // PaperMod's footer.html registers a smooth-scroll click listener on
    // every a[href^="#"], which would jump the page to the footnote when
    // clicking the popup-pinning link. cloneNode strips addEventListener-
    // registered handlers, so we replace each ref with a clone and bind
    // our own listeners to the clone.
    Array.from(document.querySelectorAll('.post-content a.footnote-ref')).forEach(orig => {
        const ref = orig.cloneNode(true);
        orig.parentNode.replaceChild(ref, orig);
        ref.addEventListener('mouseenter', () => {
            if (popupHideTimer) {
                clearTimeout(popupHideTimer);
                popupHideTimer = null;
            }
            if (activeTrigger === ref) return;
            if (pinned) return;
            showPopup(ref);
        });
        ref.addEventListener('mouseleave', () => {
            if (pinned) return;
            popupHideTimer = setTimeout(closeAllPopups, 220);
        });
        ref.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (pinned && activeTrigger === ref) {
                unpinCurrent();
                return;
            }
            if (activeTrigger !== ref) showPopup(ref);
            pinCurrent();
        });
    });

    document.body.addEventListener('mouseover', e => {
        if (!activePopup || pinned) return;
        if (activePopup.contains(e.target)) {
            if (popupHideTimer) {
                clearTimeout(popupHideTimer);
                popupHideTimer = null;
            }
        }
    });
    document.body.addEventListener('mouseout', e => {
        if (!activePopup || pinned) return;
        if (activePopup.contains(e.target)) {
            popupHideTimer = setTimeout(closeAllPopups, 220);
        }
    });

    document.addEventListener('click', e => {
        if (!pinned || !activePopup) return;
        if (activePopup.contains(e.target)) return;
        if (e.target.closest('a.footnote-ref')) return;
        closeAllPopups();
    });

    /* ─── Code block: language label as copy button ───────────
       Replaces PaperMod's own copy-code button (disabled in config).
       For each .highlight, find the data-lang on the inner code element
       and add a <button class="lang-copy"> in the top-right corner. */

    function langOf(highlight) {
        const codeWithLang = highlight.querySelector('code[data-lang]');
        if (codeWithLang && codeWithLang.dataset.lang) {
            return codeWithLang.dataset.lang;
        }
        // Fallback: look for "language-foo" on any code child
        const codeWithClass = highlight.querySelector('code[class*="language-"]');
        if (codeWithClass) {
            const m = codeWithClass.className.match(/language-(\S+)/);
            if (m) return m[1];
        }
        return '';
    }

    function codeTextOf(highlight) {
        // The actual source code lives inside the <code> element that
        // carries data-lang; the line-number <code> doesn't have it.
        // (Hugo's chroma here doesn't emit the .lntd class, so we can't
        // pick by class — we identify by data-lang instead.)
        const codeWithLang = highlight.querySelector('code[data-lang]');
        if (codeWithLang) return codeWithLang.innerText;

        // Fallback for code blocks without a language: when the chroma
        // table layout is used (line numbers), the source code is in the
        // SECOND <td>; otherwise just take the inner <code>.
        const tds = highlight.querySelectorAll('table td');
        if (tds.length >= 2) {
            const c = tds[1].querySelector('code');
            return (c || tds[1]).innerText;
        }
        const code = highlight.querySelector('pre > code') ||
                     highlight.querySelector('code');
        return code ? code.innerText : '';
    }

    document.querySelectorAll('.post-content div.highlight').forEach(hl => {
        if (hl.querySelector(':scope > .lang-copy')) return;
        const lang = langOf(hl) || 'code';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-copy';
        btn.innerHTML =
            '<span class="prefix"></span><span class="lang-text"></span>';
        btn.querySelector('.lang-text').textContent = lang;
        btn.addEventListener('click', async () => {
            const text = codeTextOf(hl);
            try {
                await navigator.clipboard.writeText(text);
            } catch (_) {
                // Fallback: select + execCommand
                try {
                    const range = document.createRange();
                    range.selectNodeContents(hl);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    document.execCommand('copy');
                    sel.removeRange(range);
                } catch (_) {}
            }
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
        });
        hl.appendChild(btn);
    });
})();
