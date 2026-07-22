/* ==========================================================================
   XPLOROO · Influencers module
   influencers.js — Premium continuous auto-scroll marquee (right → left)
   for the six-card Influencers carousel on index.html. Seamless infinite
   loop, drag/swipe (mouse + touch), hover-to-pause, dot pagination.
   Scoped entirely to [data-inf-carousel] / [data-inf-track] / [data-inf-dots]
   so it never touches the Recent Winners carousel (data-rw-*) or
   influencers.html, which are left completely unmodified.

   ARCHITECTURE (read this before touching the CSS):
   `.inf-carousel` is the VIEWPORT — fixed size, `overflow: hidden`, and it
   is NEVER transformed. `.inf-track` is the TRACK — the flex row holding
   every card, and it is the ONLY element this script ever applies
   `transform: translateX()` to. These must stay two separate elements:
   clipping and transforming the same element moves the clip boundary
   together with the content as one rigid unit, so whichever cards
   happen to fit inside it stay "visible" wherever that box drifts to,
   while the actual on-screen carousel area goes blank — that was the
   root cause of the previous bug.

   ONE movement owner: a single requestAnimationFrame loop drives both the
   continuous auto-scroll and the seamless wrap-around; drag/swipe writes
   to the same `offset` variable. Nothing else (no slider library, no
   scroll-snap, no second interval/animation) ever moves this track.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-inf-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-inf-track]");
  const dotsWrap = document.querySelector("[data-inf-dots]");
  if (!track) return;

  const SPEED_PX_PER_SEC = 34; // slow, premium pace — do not increase
  const RESUME_DELAY_MS = 1400; // pause-after-interaction grace period
  const MIN_CARDS = 2;

  let originalSlides = [];
  let slideCount = 0;
  let setWidth = 0; // px width of exactly one original 6-card set incl. gaps
  let offset = 0; // current translateX, always <= 0
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
  /* 0. Wait for the real cards, then start. This carousel's six cards   */
  /*    are static markup (no async fetch), so in practice they exist    */
  /*    the moment this deferred script runs — but we verify the count   */
  /*    explicitly rather than assume it, and fall back to a             */
  /*    MutationObserver instead of a guessed setTimeout delay in the    */
  /*    (currently theoretical) case a future change makes this render   */
  /*    asynchronously.                                                  */
  /* ------------------------------------------------------------------ */
  function tryStart() {
    if (started) return;
    const found = Array.from(
      track.querySelectorAll(".inf-slide:not([data-inf-clone])")
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
    /* 1. Clone the full six-card set exactly once — visual-only          */
    /*    duplicates appended after the originals, so the DOM sequence    */
    /*    is: [1,2,3,4,5,6, 1c,2c,3c,4c,5c,6c]. No influencer data is     */
    /*    duplicated anywhere except this throwaway DOM clone; original   */
    /*    cards, links and IDs are untouched.                             */
    /* ------------------------------------------------------------------ */
    originalSlides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute("data-inf-clone", "");
      clone.setAttribute("aria-hidden", "true");
      // Strip any id attributes so clones can never collide with the
      // originals (or each other) if this runs more than once.
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone
        .querySelectorAll("a, button, [tabindex]")
        .forEach((el) => el.setAttribute("tabindex", "-1"));
      // Make sure every image in the clone (and the original) loads
      // eagerly — off-screen cards must be fully painted before they
      // scroll into view, not deferred by lazy-loading heuristics.
      clone
        .querySelectorAll("img")
        .forEach((img) => img.setAttribute("loading", "eager"));
      track.appendChild(clone);
    });
    originalSlides.forEach((slide) => {
      slide
        .querySelectorAll("img")
        .forEach((img) => img.setAttribute("loading", "eager"));
    });

    buildDots();
    measure();
    applyTransform();
    updateDots();
    window.requestAnimationFrame(frame);

    // Keep `setWidth` correct for the entire session. Observe the actual
    // CARD elements (not the track) — the track's own box is 100% of a
    // fixed-width parent and, once the viewport stops changing, never
    // resizes again on its own; but the very first synchronous measurement
    // can still catch the cards mid-layout (before flex-basis/percentage
    // sizing has settled) and read a too-small width that then never gets
    // corrected. Watching the cards directly means ResizeObserver's
    // spec-guaranteed initial report — and every later one — reflects
    // their real settled size, for viewport/orientation changes too.
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => measure());
      originalSlides.forEach((slide) => ro.observe(slide));
    } else {
      let resizeTimer = null;
      window.addEventListener("resize", () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(measure, 150);
      });
    }
    window.addEventListener("load", measure, { once: true });

    // Belt-and-suspenders: also re-verify on the first several animation
    // frames. measure() itself is cheap (a handful of getBoundingClientRect
    // reads) and a no-op once the width has genuinely stabilized, so this
    // costs nothing after the first few ticks.
    let earlyChecks = 20;
    const earlyCheckId = window.setInterval(() => {
      measure();
      if (--earlyChecks <= 0) window.clearInterval(earlyCheckId);
    }, 50);
  }

  /* ------------------------------------------------------------------ */
  /* Measurement — the exact rendered width of ONE complete original      */
  /* card set (six card widths + the gaps between/after them), read       */
  /* straight from the live DOM. Never based on viewport width, screen    */
  /* width, a single card's width alone, or any hardcoded/percentage      */
  /* guess.                                                                */
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
    applyTransform();
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
    if (dragMoved) scheduleResume();
  }

  // Swallow the click that follows a drag so a card link (if any) doesn't
  // navigate when the user was just panning the carousel.
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
  /* 3. Dot pagination — jumps to a card's offset, briefly pausing        */
  /*    auto-scroll, then resumes automatically.                          */
  /* ------------------------------------------------------------------ */
  function buildDots() {
    if (!dotsWrap) return;
    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "inf-dot";
      dot.setAttribute("aria-label", "Go to influencer " + (i + 1));
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
  /*    ONLY thing that ever moves `.inf-track`.                          */
  /* ------------------------------------------------------------------ */
  function frame(time) {
    if (lastTime === null) lastTime = time;
    const dt = Math.min(time - lastTime, 100); // clamp big gaps (tab switch)
    lastTime = time;

    const shouldAutoScroll =
      !prefersReducedMotion && !isDragging && !isHovering && !resumeTimer;

    if (shouldAutoScroll && setWidth > 0) {
      offset -= (SPEED_PX_PER_SEC * dt) / 1000;
      if (offset <= -setWidth) offset += setWidth;
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
