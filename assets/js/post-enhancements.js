/* Footnote popup (hover-show + click-pin) and code-block language/copy
   button. Locked behavior from post-mockups-v7.html. */

(function () {
    'use strict';

    /* ─── Footnote popup ─────────────────────────────────── */

    let activePopup = null;
    let activeTrigger = null;
    let popupHideTimer = null;
    let pinned = false;

    function closeAllPopups() {
        if (activeTrigger) {
            activeTrigger.removeAttribute('aria-describedby');
        }
        if (activePopup) {
            activePopup.remove();
            activePopup = null;
        }
        activeTrigger = null;
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
        popup.id = 'fn-popup-active';
        popup.setAttribute('role', 'tooltip');
        document.body.appendChild(popup);
        const r = fnref.getBoundingClientRect();
        popup.style.left = (window.scrollX + r.left) + 'px';
        popup.style.top = (window.scrollY + r.bottom + 6) + 'px';
        const pr = popup.getBoundingClientRect();
        if (pr.right > window.innerWidth - 12) {
            popup.style.left =
                (window.innerWidth - pr.width - 12 + window.scrollX) + 'px';
        }
        fnref.setAttribute('aria-describedby', popup.id);
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

        function openOrKeep() {
            if (popupHideTimer) {
                clearTimeout(popupHideTimer);
                popupHideTimer = null;
            }
            if (activeTrigger === ref) return;
            if (pinned) return;
            showPopup(ref);
        }

        function scheduleClose() {
            if (pinned) return;
            popupHideTimer = setTimeout(closeAllPopups, 220);
        }

        ref.addEventListener('mouseenter', openOrKeep);
        ref.addEventListener('mouseleave', scheduleClose);
        // Keyboard parity: focus shows, blur hides (unless pinned).
        ref.addEventListener('focus', openOrKeep);
        ref.addEventListener('blur', scheduleClose);
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

    // Escape closes the popup and returns focus to the footnote ref.
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!activePopup) return;
        const trigger = activeTrigger;
        closeAllPopups();
        if (trigger && typeof trigger.focus === 'function') {
            trigger.focus();
        }
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

    /* ─── Inline ToC: +/− collapse toggle (TI2) ────────────
       The whole .toc-head is the click target. Starts open. */
    const tocInline = document.getElementById('toc-inline');
    const tocToggleBtn = tocInline && tocInline.querySelector('.toc-toggle');
    if (tocInline) {
        const head = tocInline.querySelector('.toc-head');
        if (head) {
            head.addEventListener('click', () => {
                tocInline.classList.toggle('collapsed');
                const collapsed = tocInline.classList.contains('collapsed');
                if (tocToggleBtn) {
                    tocToggleBtn.setAttribute(
                        'aria-expanded', collapsed ? 'false' : 'true');
                    tocToggleBtn.textContent = collapsed ? '+' : '−';
                }
            });
        }
    }

    /* ─── Floating ToC: build, scroll-spy, slider, progress-mapped
           position (TF33 visual + PR10 easing + ST40 start). ────── */
    const tocFloat = document.getElementById('toc-float');
    const tocFloatList = document.getElementById('toc-float-list');
    if (tocFloat && tocFloatList) {
        const headings = Array.from(
            document.querySelectorAll(
                '.post-content h2[id], .post-content h3[id]'));

        // Hugo+PaperMod wraps each heading in <a href="#id"> via
        // anchored_headings.html and appends a <span class="anchor">#</span>
        // — we need to ignore that span when extracting the title.
        function headingText(h) {
            const clone = h.cloneNode(true);
            clone.querySelectorAll('.anchor').forEach(el => el.remove());
            return clone.textContent.trim();
        }

        let currentH2Li = null;
        for (const h of headings) {
            const a = document.createElement('a');
            a.href = '#' + h.id;
            a.textContent = headingText(h);
            a.dataset.target = h.id;
            const li = document.createElement('li');
            li.appendChild(a);
            if (h.tagName === 'H2') {
                const sub = document.createElement('ol');
                li.appendChild(sub);
                tocFloatList.appendChild(li);
                currentH2Li = li;
            } else if (h.tagName === 'H3' && currentH2Li) {
                currentH2Li.querySelector('ol').appendChild(li);
            } else {
                // Orphan h3 (no preceding h2) — just append at top level.
                tocFloatList.appendChild(li);
            }
        }

        if (headings.length === 0) {
            tocFloat.remove();
        } else {
            tocFloat.classList.add('has-headings');

            const tocLinks = Array.from(
                tocFloatList.querySelectorAll('a[data-target]'));

            // Smooth-scroll for every link in the floating ToC (including
            // the "↑ top" link). PaperMod's footer.html attaches its own
            // smooth-scroll handler at page load, but the floating ToC
            // entries are built dynamically here so they miss that pass —
            // wire them up ourselves.
            const reduceMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)').matches;
            tocFloat.querySelectorAll('a[href^="#"]').forEach(a => {
                a.addEventListener('click', e => {
                    const id = (a.getAttribute('href') || '').slice(1);
                    if (!id) return;
                    const target = document.getElementById(id);
                    if (!target) return;
                    e.preventDefault();
                    target.scrollIntoView(
                        reduceMotion ? {} : { behavior: 'smooth' });
                    if (id === 'top') {
                        history.replaceState(null, null, ' ');
                    } else {
                        history.pushState(null, null, '#' + id);
                    }
                });
            });

            // Per-page <style> block that drives the TF33 pink slider.
            let sliderStyleEl = null;
            function ensureSliderStyle() {
                if (!sliderStyleEl) {
                    sliderStyleEl = document.createElement('style');
                    document.head.appendChild(sliderStyleEl);
                }
                return sliderStyleEl;
            }

            // ── Scroll-spy via IntersectionObserver ─────────
            // Each heading reports band membership; the deepest
            // heading currently inside the (130px → 50vh) activation
            // band wins. DOM work (toggle classes, write slider
            // style) only happens when the active heading actually
            // changes, instead of on every scroll event.
            let activeId = null;
            const inBand = new Set();

            function setActiveLink(id) {
                for (const a of tocLinks) {
                    a.classList.toggle(
                        'is-active', a.dataset.target === id);
                }
                const link = tocLinks.find(a => a.dataset.target === id);
                if (!link) return;
                const linkRect = link.getBoundingClientRect();
                const navRect = tocFloat.getBoundingClientRect();
                const offset = linkRect.top - navRect.top + tocFloat.scrollTop;
                ensureSliderStyle().textContent =
                    'aside.toc-float::before { transform: translateY(' +
                    offset + 'px); height: ' +
                    Math.max(linkRect.height - 4, 14) +
                    'px; top: 2px; }';
            }

            const spyIO = new IntersectionObserver(entries => {
                for (const e of entries) {
                    if (e.isIntersecting) inBand.add(e.target);
                    else inBand.delete(e.target);
                }
                // Pick the deepest heading currently in the band; if
                // none, keep the last active (so transitions between
                // sections don't flicker).
                let next = null;
                for (let i = headings.length - 1; i >= 0; i--) {
                    if (inBand.has(headings[i])) { next = headings[i]; break; }
                }
                if (next && next.id !== activeId) {
                    activeId = next.id;
                    setActiveLink(activeId);
                }
            }, { rootMargin: '-130px 0px -50% 0px', threshold: 0 });
            headings.forEach(h => spyIO.observe(h));

            // Position is handled entirely by CSS (position: sticky)
            // — no scroll handler. We still re-run the slider on
            // resize because link rects depend on layout.
            window.addEventListener('resize', () => {
                if (activeId) setActiveLink(activeId);
            });
        }
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
        btn.setAttribute('aria-label', `Copy ${lang}`);
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
