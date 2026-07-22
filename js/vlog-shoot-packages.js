/* ==========================================================================
   XPLOROO · Vlog Shoot Packages module
   vlog-shoot-packages.js — Premium continuous auto-scroll marquee (right →
   left) for the Vlog Shoot Packages carousel on index.html. Same proven
   architecture as js/influencers.js (single requestAnimationFrame loop,
   viewport/track split, one-time card cloning, drag/swipe, hover-to-pause,
   dot pagination), retargeted to this section's own `data-vsp-*` hooks and
   `.vsp-*` classes so it never touches the Influencers or Recent Winners
   carousels.

   ARCHITECTURE (read this before touching the CSS):
   `.vsp-carousel` is the VIEWPORT — fixed size, `overflow: hidden`, and it
   is NEVER transformed. `.vsp-track` is the TRACK — the flex row holding
   every card, and it is the ONLY element this script ever applies
   `transform: translateX()` to. These must stay two separate elements:
   clipping and transforming the same element moves the clip boundary
   together with the content as one rigid unit, so whichever cards happen
   to fit inside it stay "visible" wherever that box drifts to, while the
   actual on-screen carousel area goes blank.

   FUTURE-PROOF CARD COUNT — the one deliberate addition over the base
   Influencers pattern: the Influencers carousel always has 6 cards, wide
   enough on its own (once doubled) to cover any viewport. This section
   currently has only 3 cards, which is NOT guaranteed to be wide enough to
   cover a large desktop viewport after a single duplication — that would
   leave a visible gap of blank track once the original+clone pair scrolls
   past. Nothing here is hardcoded to "3 cards": `slideCount`/`setWidth`
   are always derived from whatever `.vsp-slide` elements actually exist in
   the DOM (see `tryStart()`), and `ensureCoverage()` below appends however
   many additional full clone-sets are needed — recalculated on resize — so
   the track is always wider than the viewport, however many real cards
   there are. Adding a 4th/5th/8th card to the markup requires zero changes
   here: the loop, the clone count and the dot pagination all adapt
   automatically from the live DOM.

   ONE movement owner: a single requestAnimationFrame loop drives both the
   continuous auto-scroll and the seamless wrap-around; drag/swipe writes
   to the same `offset` variable. Nothing else (no slider library, no
   scroll-snap, no second interval/animation) ever moves this track.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-vsp-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-vsp-track]");
  const dotsWrap = document.querySelector("[data-vsp-dots]");
  if (!track) return;

  const SPEED_PX_PER_SEC = 34; // slow, premium pace — do not increase
  const RESUME_DELAY_MS = 1400; // pause-after-interaction grace period
  const MIN_CARDS = 2;
  const COVERAGE_BUFFER_SETS = 1; // extra full set beyond exact viewport coverage

  let originalSlides = [];
  let slideCount = 0;
  let setWidth = 0; // px width of exactly one original card set incl. gaps
  let renderedSets = 0; // how many full sets (original + clone-sets) currently exist in the DOM
  let offset = 0; // current translateX, always kept inside (-setWidth, 0]
  let started = false;

  // Declared up front (not just hoisted as a function) because `tryStart()`
  // below can synchronously reach `buildDots()`, which reads/writes these —
  // a `const`/`let` declared later in the file would still be in its
  // temporal dead zone at that point and throw.
  const dots = [];
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startOffset = 0;
  let resumeTimer = null;
  let isHovering = false;
  let lastTime = null;
  let dotTicking = false;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

  /* ------------------------------------------------------------------ */
  /* 0. Wait for the real cards, then start. This carousel's cards are   */
  /*    static markup (no async fetch), so in practice they exist the    */
  /*    moment this deferred script runs — but we verify the count       */
  /*    explicitly rather than assume it, and fall back to a             */
  /*    MutationObserver instead of a guessed setTimeout delay in the    */
  /*    (currently theoretical) case a future change makes this render   */
  /*    asynchronously. Whatever count is found — 3 today, 8+ later —    */
  /*    becomes `slideCount`; nothing below assumes a specific number.   */
  /* ------------------------------------------------------------------ */
  function tryStart() {
    if (started) return;
    const found = Array.from(
      track.querySelectorAll(".vsp-slide:not([data-vsp-clone])")
    );
    if (found.length < MIN_CARDS) return; // not rendered yet — keep waiting
    started = true;
    originalSlides = found;
    slideCount = found.length;
    init();
  }

  tryStart();
  if (!started) {
    const mo = new MutationObserver(() => tryStart());
    mo.observe(track, { childList: true });
    // Safety net: stop waiting after 10s so a genuinely empty carousel
    // doesn't leave a dangling observer forever.
    window.setTimeout(() => mo.disconnect(), 10000);
  }

  function init() {
    /* ------------------------------------------------------------------ */
    /* 1. Clone the full original card set once — visual-only duplicates   */
    /*    appended after the originals, so the DOM sequence for N cards    */
    /*    is: [1..N, 1c..Nc]. No package data is duplicated anywhere       */
    /*    except this throwaway DOM clone; original cards, links and IDs   */
    /*    are untouched.                                                   */
    /* ------------------------------------------------------------------ */
    appendClone();
    originalSlides.forEach((slide) => {
      slide
        .querySelectorAll("img")
        .forEach((img) => img.setAttribute("loading", "eager"));
    });

    buildDots();
    measure();
    ensureCoverage();
    applyTransform();
    updateDots();
    window.requestAnimationFrame(frame);

    // Keep `setWidth` correct for the entire session, and re-check coverage
    // every time it changes (a viewport resize or orientation change can
    // both shrink/grow one card set's width AND change how many sets are
    // needed to span the viewport). Observe the actual CARD elements (not
    // the track) — the track's own box is 100% of a fixed-width parent and,
    // once the viewport stops changing, never resizes again on its own;
    // but the very first synchronous measurement can still catch the cards
    // mid-layout (before flex-basis/percentage sizing has settled) and
    // read a too-small width that then never gets corrected. Watching the
    // cards directly means ResizeObserver's spec-guaranteed initial report
    // — and every later one — reflects their real settled size.
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => {
        measure();
        ensureCoverage();
      });
      originalSlides.forEach((slide) => ro.observe(slide));
      ro.observe(carousel);
    } else {
      let resizeTimer = null;
      window.addEventListener("resize", () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          measure();
          ensureCoverage();
        }, 150);
      });
    }
    window.addEventListener(
      "load",
      () => {
        measure();
        ensureCoverage();
      },
      { once: true }
    );

    // Belt-and-suspenders: also re-verify on the first several animation
    // frames. measure()/ensureCoverage() are cheap (a handful of
    // getBoundingClientRect reads, plus a DOM append only when genuinely
    // needed) and a no-op once stable, so this costs nothing after the
    // first few ticks.
    let earlyChecks = 20;
    const earlyCheckId = window.setInterval(() => {
      measure();
      ensureCoverage();
      if (--earlyChecks <= 0) window.clearInterval(earlyCheckId);
    }, 50);
  }

  /* ------------------------------------------------------------------ */
  /* Append one more full clone-set (every original card, in order) to    */
  /* the end of the track. Purely visual: aria-hidden, untabbable, no      */
  /* ids, images forced eager so they're already painted before they      */
  /* scroll into view.                                                    */
  /* ------------------------------------------------------------------ */
  function appendClone() {
    originalSlides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute("data-vsp-clone", "");
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone
        .querySelectorAll("a, button, [tabindex]")
        .forEach((el) => el.setAttribute("tabindex", "-1"));
      clone
        .querySelectorAll("img")
        .forEach((img) => img.setAttribute("loading", "eager"));
      track.appendChild(clone);
    });
    renderedSets += 1;
  }

  /* ------------------------------------------------------------------ */
  /* Guarantee the track is always wider than the visible viewport, no    */
  /* matter how few real cards exist. With only 3 cards (today) a single  */
  /* clone-set may not be wide enough to cover a large desktop screen —   */
  /* this appends as many additional clone-sets as needed so the moving   */
  /* track never runs out of rendered cards before the loop wraps.        */
  /* Growth-only: never removes a set that's no longer strictly needed,   */
  /* since extra offscreen clones are harmless and removing mid-animation */
  /* risks a visible jump.                                                 */
  /* ------------------------------------------------------------------ */
  function ensureCoverage() {
    if (!setWidth || renderedSets < 1) return;
    const viewportWidth = carousel.getBoundingClientRect().width;
    const requiredSets = Math.max(
      2,
      Math.ceil(viewportWidth / setWidth) + COVERAGE_BUFFER_SETS
    );
    while (renderedSets < requiredSets) {
      appendClone();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Measurement — the exact rendered width of ONE complete original      */
  /* card set (every real card's width + the gaps between/after them),    */
  /* read straight from the live DOM. Never based on viewport width,      */
  /* screen width, a single card's width alone, or any hardcoded/         */
  /* percentage/card-count guess.                                         */
  /* ------------------------------------------------------------------ */
  function measure() {
    if (!slideCount) return;
    const trackStyle = getComputedStyle(track);
    const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || "0") || 0;
    let total = 0;
    originalSlides.forEach((slide) => {
      total += slide.getBoundingClientRect().width + gap;
    });
    if (!total || Math.abs(total - setWidth) < 0.5) return;
    // Preserve how far through the loop we were (as a fraction), so a
    // correction to the measurement never produces a visible jump.
    const progress = setWidth > 0 ? ((-offset) % setWidth) / setWidth : 0;
    setWidth = total;
    offset = -(progress * setWidth);
    applyTransform();
  }

  function applyTransform() {
    track.style.transform = "translate3d(" + offset.toFixed(2) + "px, 0, 0)";
  }

  // Keeps `offset` inside (-setWidth, 0] regardless of how it was changed
  // — a single small auto-scroll step, or a large drag flick. This is the
  // one thing that guarantees "no blank space, no visible jump" holds even
  // for a short track (few cards): the visible window can never drift past
  // the range covered by `ensureCoverage()`'s rendered clone-sets.
  function normalizeOffset() {
    if (setWidth <= 0) return;
    while (offset <= -setWidth) offset += setWidth;
    while (offset > 0) offset -= setWidth;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Drag / swipe — unified for mouse and touch. Pauses auto-scroll    */
  /*    while active and for a short grace period afterwards.             */
  /* ------------------------------------------------------------------ */
  function pauseForInteraction() {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  }

  function scheduleResume() {
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      resumeTimer = null;
    }, RESUME_DELAY_MS);
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    dragMoved = false;
    startX = e.clientX;
    startOffset = offset;
    pauseForInteraction();
    track.setPointerCapture(e.pointerId);
    track.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 4) dragMoved = true;
    offset = startOffset + delta;
    normalizeOffset();
    applyTransform();
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
    if (dragMoved) scheduleResume();
  }

  // Swallow the click that follows a drag so a card link doesn't navigate
  // when the user was just panning the carousel.
  function onTrackClickCapture(e) {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved = false;
    }
  }

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointerleave", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("click", onTrackClickCapture, true);

  if (canHover) {
    carousel.addEventListener("mouseenter", () => {
      isHovering = true;
    });
    carousel.addEventListener("mouseleave", () => {
      isHovering = false;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Dot pagination — one dot per REAL card (never per clone), jumps   */
  /*    to that card's offset, briefly pausing auto-scroll, then resumes  */
  /*    automatically. Scales to however many cards exist.                */
  /* ------------------------------------------------------------------ */
  function buildDots() {
    if (!dotsWrap) return;
    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "vsp-dot";
      dot.setAttribute("aria-label", "Go to package " + (i + 1));
      dot.addEventListener("click", () => goToIndex(i));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
  }

  function slideStep() {
    return slideCount ? setWidth / slideCount : 0;
  }

  function goToIndex(index) {
    pauseForInteraction();
    offset = -((index % slideCount) * slideStep());
    normalizeOffset();
    applyTransform();
    scheduleResume();
  }

  function updateDots() {
    if (!dots.length || !setWidth) return;
    const step = slideStep();
    const normalized = ((-offset % setWidth) + setWidth) % setWidth;
    const index = Math.round(normalized / step) % slideCount;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  /* ------------------------------------------------------------------ */
  /* 4. Main loop — single requestAnimationFrame driving both the         */
  /*    continuous auto-scroll and the seamless wrap-around. This is the  */
  /*    ONLY thing that ever moves `.vsp-track`.                          */
  /* ------------------------------------------------------------------ */
  function frame(time) {
    if (lastTime === null) lastTime = time;
    const dt = Math.min(time - lastTime, 100); // clamp big gaps (tab switch)
    lastTime = time;

    const shouldAutoScroll =
      !prefersReducedMotion && !isDragging && !isHovering && !resumeTimer;

    if (shouldAutoScroll && setWidth > 0) {
      offset -= (SPEED_PX_PER_SEC * dt) / 1000;
      normalizeOffset();
      applyTransform();
    }

    if (!dotTicking) {
      dotTicking = true;
      window.requestAnimationFrame(() => {
        updateDots();
        dotTicking = false;
      });
    }

    window.requestAnimationFrame(frame);
  }
})();
