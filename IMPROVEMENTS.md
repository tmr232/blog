# Blog improvements

Recommendations from the 2026-05-28 design/functionality review.
Items 1–7 are queued for immediate implementation, one commit per item.
Items 8+ are recorded for later.

## Performance & loading

### 1. Self-host JetBrains Mono
`layouts/partials/extend_head.html` currently pulls JetBrains Mono from
`fonts.googleapis.com`, which is render-blocking and adds a third-party
connection. Use Hugo's resource pipeline to fingerprint a local `woff2`
and drop the `preconnect` lines.

### 2. Combine the chroma sheets
`assets/css/chroma-light.css` and `assets/css/chroma-dark.css` are both
render-blocking but only one applies at a time. Concatenate them in one
Hugo pipe and scope each ruleset with `body:not(.dark)` / `body.dark` —
one request, one parse.

### 3. Tame the scroll handler
`assets/js/post-enhancements.js` runs `applyScrollSpy` + `updateToc`
synchronously on every scroll event, and `applyScrollSpy` reads
`offsetTop` / `getBoundingClientRect` for every heading and every link
per event — layout thrash. Wrap in `requestAnimationFrame` and use an
`IntersectionObserver` for the active heading.

### 4. Replace fixed+JS with `position: sticky` for the floating ToC
The "ease from 40% down to 90px on first scroll" effect in
`assets/css/custom.css` + `post-enhancements.js` is clever but expensive
and fragile across resize/zoom. A sticky aside achieves ~95% of the
perceived effect with zero JS for the position.

## Accessibility

### 5. Lightbox keyboard accessibility
`assets/js/lightbox.js` wires `click` on `<img>` but images aren't
focusable and don't respond to Enter/Space. Wrap each image in a
`<button>` (or apply `role="button"` + `tabindex="0"` + keydown handler)
and add a focus trap once open. Bonus: arrow-key navigation between
images on the same post.

### 6. Footnote popup keyboard accessibility
`assets/js/post-enhancements.js` opens footnote popups on `mouseenter`
and pins on click — keyboard users get nothing. Open on `focus`, close
on `blur` / `Escape`, expose with `role="tooltip"` + `aria-describedby`.

### 7. Code-copy affordance on `:focus-visible`
The "copy" prefix only appears via `:hover` in `custom.css`. Add the
same rule for `:focus-visible` so keyboard users can see (and use) it.

## Accessibility — deferred

### 8. Heading "copy link" affordance
The hidden `.anchor` `#` removed the ability to grab a section URL
visually. Re-expose a subtle `#` (opacity 0 → ~0.5 on heading hover),
or replace with a small "copy link" button on hover / focus.

## Content structure — deferred

### 9. Group archives by year
`layouts/_default/archives.html` is one flat `<ul>` that will grow
forever. Use `range .Pages.GroupByDate "2006"` for cheap year buckets.

### 10. Date format inconsistency
Archives render `2006-01-02` ISO; the site otherwise uses
`Jan 2, 2006`. Pick one — likely ISO everywhere now that the typography
is mono.

### 11. Hide empty tag list
`layouts/_default/single.html` always renders `<ul class="post-tags">`
even for posts with no tags. Wrap in `{{- with ($.GetTerms $tags) }}`.

### 12. Drop one of profileMode / homeInfoParams
Both are set in `config.yml`; only `profileMode` is active.

## Smaller wins — deferred

### 13. Replace empty `author.html` with an explicit `post_meta.html` override
The 0-byte `layouts/partials/author.html` exists only to delete a
string. Overriding `post_meta.html` to omit the author makes the intent
obvious.

### 14. Turn off line numbers for tiny snippets
`lineNos: true` is global, so even one-liners get a gutter. Either
switch to per-fence `{linenos=true}` or hide the gutter via JS class
when the block has ≤2 lines.

### 15. Open Graph image
`cover.hidden: true` is great visually, but social previews still
benefit. Add an explicit `images:` per post.

### 16. Enable `ShowPostNavLinks`
Currently commented out in `config.yml`. Adjacent-post links are cheap
discoverability for a blog without categories.

### 17. Webmentions display
Endpoint is configured in `config.yml` but no display partial is
visible. Confirm received mentions render in-page.
