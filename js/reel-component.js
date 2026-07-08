/* ==========================================================================
   XPLOROO · Reel component (standalone, reusable)
   reel-component.js — Drives ONE reel's spin cycle. Vanilla JS, no
   dependencies. Designed to be instantiated once per `[data-reel]` element,
   so duplicating the reel's HTML twice and calling `initReel()` on each is
   all that's needed to build the full 3-reel machine later — nothing here
   assumes there's only one reel on the page.

   SEAMLESS LOOPING (no HTML/CSS changes — cloning happens here, at runtime)
   ---------------------------------------------------------------------
   A spin can travel up to 4 loops + a 5-card offset from any starting card,
   i.e. up to ~34 "card heights" in one direction. If we only had the 6
   authored cards to scroll through, the window would run out of real
   content well before the animation finishes and show blank space right at
   the loop seam. So at init we clone the 6 cards several times and append
   the clones after the originals (same images, same markup — just DOM
   duplicates), giving enough real, continuously-scrollable content to cover
   any single spin's full travel distance. The instant a spin lands, we
   silently snap the track back to the equivalent position among the first
   6 (real) cards — invisible, because a clone and its original render the
   exact same pixels — so the DOM never grows and the next spin has the
   same full range of clone content to travel through again.
   ========================================================================== */
(function () {
  "use strict";

  const CARDS_PER_REEL = 6;
  const EXTRA_LOOPS = 5;      // clone depth: covers the worst-case 34-card travel
  const MIN_LOOPS = 2;        // "2-4 full revolutions" per spin
  const MAX_LOOPS = 4;
  const SPIN_DURATION_MS = 2800;
  const BOUNCE_DURATION_MS = 320;
  const BOUNCE_PX = 4;        // subtle 2-5px settle bounce
  const PAUSE_AFTER_LANDING_MS = 3000; // "wait about 3 seconds" per spec

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
    const track = reelEl.querySelector("[data-reel-track]");
    const originalCards = Array.from(reelEl.querySelectorAll(".reel__card"));
    if (!track || originalCards.length !== CARDS_PER_REEL) return;

    // Clone the 6 cards EXTRA_LOOPS more times so the track has continuous
    // real content for the full length of any spin (see module comment).
    for (let i = 0; i < EXTRA_LOOPS; i++) {
      originalCards.forEach((card) => track.appendChild(card.cloneNode(true)));
    }
    const allCards = Array.from(track.children); // 6 * (1 + EXTRA_LOOPS) total

    let cardHeight = 0;
    let currentIndex = 0; // 0-5 — which real destination is currently resting/centered
    let spinRafId = null;
    let bounceRafId = null;
    let spinTimer = null;

    /* Recompute geometry from the live DOM — keeps the reel correct across
       resizes/orientation changes without hardcoding any pixel values. */
    function measure() {
      cardHeight = reelEl.querySelector(".reel__window").getBoundingClientRect().height;
    }

    function setTransform(px) {
      track.style.transform = `translateY(${px}px)`;
    }

    function markLanded(index) {
      // `index` is always 0-5 here (the resting position always lives among
      // the first, real 6 cards — see the silent snap at the end of spin()).
      allCards.forEach((c, i) => c.classList.toggle("is-landed", i === index));
    }

    /* One full spin: 3-phase acceleration/cruise/deceleration through 2-4
       full revolutions, landing on a uniformly random destination (repeats
       allowed — no artificial "never the same twice" bias). */
    function spin() {
      measure();

      const loops = MIN_LOOPS + Math.floor(Math.random() * (MAX_LOOPS - MIN_LOOPS + 1));
      const target = Math.floor(Math.random() * CARDS_PER_REEL); // uniform over all 6
      const offset = (target - currentIndex + CARDS_PER_REEL) % CARDS_PER_REEL;
      const cardsToTravel = loops * CARDS_PER_REEL + offset; // always >= 2*6 cards

      const startPx = -(currentIndex * cardHeight);
      const totalDistance = cardsToTravel * cardHeight;
      const startTime = performance.now();

      allCards.forEach((c) => c.classList.remove("is-landed"));

      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / SPIN_DURATION_MS, 1);

        setTransform(startPx - totalDistance * trapezoidProgress(t));

        if (t < 1) {
          spinRafId = requestAnimationFrame(tick);
        } else {
          spinRafId = null;
          currentIndex = target;
          // Silent snap back into the real (non-cloned) 6-card range — the
          // clone we just scrolled to and this real card are pixel-identical,
          // so nothing visibly changes.
          setTransform(-(currentIndex * cardHeight));
          markLanded(currentIndex);
          bounce();
        }
      }

      spinRafId = requestAnimationFrame(tick);
    }

    /* Small premium settle bounce (2-5px) after the reel stops. */
    function bounce() {
      const restPx = -(currentIndex * cardHeight);
      const startTime = performance.now();

      function tick(now) {
        const t = Math.min((now - startTime) / BOUNCE_DURATION_MS, 1);
        const wave = Math.sin(t * Math.PI) * (1 - t); // rises then eases back to 0
        setTransform(restPx + wave * BOUNCE_PX);

        if (t < 1) {
          bounceRafId = requestAnimationFrame(tick);
        } else {
          setTransform(restPx);
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
      setTransform(-(currentIndex * cardHeight));
    }

    measure();
    setTransform(0);
    markLanded(0);
    window.addEventListener("resize", handleResize);

    // First spin starts after one full pause, so the reel visibly "rests"
    // on card 1 before the first spin — matches "animation starts
    // automatically" while still feeling like a deliberate machine, not a
    // marquee that never stops.
    scheduleNextSpin();
  }

  /* Auto-init every reel present on the page. */
  document.querySelectorAll("[data-reel]").forEach(initReel);

  // Exposed for manual re-init if a reel is added to the DOM later
  // (e.g. when the 2nd/3rd reel are duplicated in).
  window.initReel = initReel;
})();
