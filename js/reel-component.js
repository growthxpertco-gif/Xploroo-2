/* ==========================================================================
   XPLOROO · Reel component (standalone, reusable)
   reel-component.js — Drives ONE reel's spin cycle. Vanilla JS, no
   dependencies. Designed to be instantiated once per `[data-reel]` element,
   so duplicating the reel's HTML twice and calling `initReel()` on each is
   all that's needed to build the full 3-reel machine later — nothing here
   assumes there's only one reel on the page.

   SEAMLESS LOOPING — clone once + continuous modulo wrap
   -------------------------------------------------------
   At init the 6 authored cards are cloned ONCE and appended, so the track
   holds 1 2 3 4 5 6 1 2 3 4 5 6 stacked vertically. A spin's position is
   tracked as an ever-growing "virtual" distance, but the transform actually
   rendered each frame is `virtual % (6 * cardHeight)` — i.e. the moment the
   scroll would reach the cloned set, it is instantly re-expressed as the
   identical position inside the original set. Card 6 flowing into clone-1
   looks exactly like card 6 flowing into card 1, and the wrap lands on
   pixels that are identical by construction, so the reset is invisible.
   The window is therefore ALWAYS showing real card content: the wrapped
   offset stays within the first set, and the clone set below it feeds the
   window whenever two cards are partially visible mid-scroll.
   ========================================================================== */
(function () {
  "use strict";

  const CARDS_PER_REEL = 6;
  const MIN_LOOPS = 2;        // full revolutions per spin: 2-4
  const MAX_LOOPS = 4;
  const SPIN_DURATION_MS = 2800;
  const BOUNCE_DURATION_MS = 320;
  const BOUNCE_PX = 4;        // subtle 2-5px settle bounce
  const PAUSE_AFTER_LANDING_MS = 3000;

  /* ------------------------------------------------------------------ */
  /* Three-phase trapezoidal motion profile: linear acceleration ramp,  */
  /* constant-speed cruise, then a quadratic (ease-out) deceleration    */
  /* ramp back to zero velocity. Returns the fraction of total distance */
  /* covered (0-1) at normalized time t (0-1). Exactly 1 at t=1 — the   */
  /* landing position is always pixel-exact, never drifts.             */
  /* ------------------------------------------------------------------ */
  const PHASE_ACCEL = 0.15;
  const PHASE_CRUISE = 0.45;
  const PHASE_DECEL = 0.40; // ta + tc + td === 1

  function trapezoidProgress(t) {
    const vMax = 1 / (0.5 * PHASE_ACCEL + PHASE_CRUISE + 0.5 * PHASE_DECEL);

    if (t <= PHASE_ACCEL) {
      return (0.5 * vMax * t * t) / PHASE_ACCEL; // fast acceleration
    }
    const distAtAccelEnd = 0.5 * vMax * PHASE_ACCEL;

    if (t <= PHASE_ACCEL + PHASE_CRUISE) {
      return distAtAccelEnd + vMax * (t - PHASE_ACCEL); // constant high-speed spin
    }
    const distAtCruiseEnd = distAtAccelEnd + vMax * PHASE_CRUISE;
    const s = t - (PHASE_ACCEL + PHASE_CRUISE);
    return distAtCruiseEnd + vMax * (s - (s * s) / (2 * PHASE_DECEL)); // ease-out decel
  }

  /**
   * Wires up one reel. Call once per `[data-reel]` element.
   * @param {HTMLElement} reelEl - the `.reel` root element
   */
  function initReel(reelEl) {
    const windowEl = reelEl.querySelector(".reel__window");
    const track = reelEl.querySelector("[data-reel-track]");
    const originalCards = Array.from(reelEl.querySelectorAll(".reel__card"));
    if (!windowEl || !track || originalCards.length !== CARDS_PER_REEL) return;

    // Clone the 6 cards once and append: track becomes 1..6,1..6. The clone
    // set is what the window shows while the wrap point passes through.
    originalCards.forEach((card) => track.appendChild(card.cloneNode(true)));
    const allCards = Array.from(track.children); // 12 total

    let cardHeight = 0;
    let currentIndex = 0;   // 0-5 — destination currently resting in the window
    let spinRafId = null;
    let bounceRafId = null;
    let spinTimer = null;

    /* Geometry: each card must be EXACTLY one window (inner) height tall so
       `translateY(-N * cardHeight)` centers card N perfectly. The height is
       applied inline here because the track is auto-height (it must be as
       tall as all 12 cards combined — that's what keeps the window full). */
    function measure() {
      const padding = parseFloat(getComputedStyle(windowEl).paddingTop) || 0;
      cardHeight = windowEl.getBoundingClientRect().height - padding * 2;
      allCards.forEach((c) => (c.style.height = cardHeight + "px"));
    }

    /* Render a virtual scroll distance (grows without bound during a spin)
       as a transform wrapped into the first card set: the "instant reset
       back to the original set" happens here, every frame, with pixel-
       identical output on both sides of the wrap — so it's never visible. */
    function render(virtualDistance) {
      const loopHeight = cardHeight * CARDS_PER_REEL;
      const wrapped = virtualDistance % loopHeight; // 0 <= wrapped < loopHeight
      track.style.transform = `translateY(${-wrapped}px)`;
    }

    function markLanded(index) {
      allCards.forEach((c, i) => c.classList.toggle("is-landed", i === index));
    }

    /* One full spin: 3-phase acceleration/cruise/deceleration through 2-4
       full revolutions, landing on a uniformly random destination. */
    function spin() {
      measure();

      const loops = MIN_LOOPS + Math.floor(Math.random() * (MAX_LOOPS - MIN_LOOPS + 1));
      const target = Math.floor(Math.random() * CARDS_PER_REEL); // uniform over all 6
      const offset = (target - currentIndex + CARDS_PER_REEL) % CARDS_PER_REEL;
      const cardsToTravel = loops * CARDS_PER_REEL + offset; // >= 12 cards pass by

      const startDistance = currentIndex * cardHeight;
      const totalDistance = cardsToTravel * cardHeight;
      const startTime = performance.now();

      allCards.forEach((c) => c.classList.remove("is-landed"));

      function tick(now) {
        const t = Math.min((now - startTime) / SPIN_DURATION_MS, 1);
        render(startDistance + totalDistance * trapezoidProgress(t));

        if (t < 1) {
          spinRafId = requestAnimationFrame(tick);
        } else {
          spinRafId = null;
          currentIndex = target;
          render(currentIndex * cardHeight); // exact rest position
          markLanded(currentIndex);
          bounce();
        }
      }

      spinRafId = requestAnimationFrame(tick);
    }

    /* Small premium settle bounce (2-5px) after the reel stops. The bounce
       is rendered through the same wrapped pipeline (as a tiny extra
       forward distance) so even at the wrap boundary the window stays full. */
    function bounce() {
      const restDistance = currentIndex * cardHeight;
      const startTime = performance.now();

      function tick(now) {
        const t = Math.min((now - startTime) / BOUNCE_DURATION_MS, 1);
        const wave = Math.sin(t * Math.PI) * (1 - t); // rises then eases back to 0
        render(restDistance + wave * BOUNCE_PX);

        if (t < 1) {
          bounceRafId = requestAnimationFrame(tick);
        } else {
          render(restDistance);
          bounceRafId = null;
          scheduleNextSpin();
        }
      }

      bounceRafId = requestAnimationFrame(tick);
    }

    function scheduleNextSpin() {
      spinTimer = setTimeout(spin, PAUSE_AFTER_LANDING_MS);
    }

    /* Keep the currently-landed card correctly positioned if the viewport
       resizes mid-pause (no animation in flight). */
    function handleResize() {
      if (spinRafId || bounceRafId) return; // mid-motion — next tick re-measures anyway
      measure();
      render(currentIndex * cardHeight);
    }

    measure();
    render(0);
    markLanded(0);
    window.addEventListener("resize", handleResize);

    // First spin starts after one full pause, so the reel visibly "rests"
    // on card 1 before the first spin.
    scheduleNextSpin();
  }

  /* Auto-init every reel present on the page. */
  document.querySelectorAll("[data-reel]").forEach(initReel);

  // Exposed for manual re-init if a reel is added to the DOM later
  // (e.g. when the 2nd/3rd reel are duplicated in).
  window.initReel = initReel;
})();
