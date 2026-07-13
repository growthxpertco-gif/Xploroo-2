/* ==========================================================================
   XPLOROO · Travel Stories module
   travel-stories.js — Finite (non-looping) carousel: mouse drag-to-scroll,
   native touch swipe, arrow navigation, and scroll-snap. The first card is
   the starting point; scrolling stops firmly at the last card in either
   direction. No slide cloning, no wrap-around.
   Vanilla JS, no dependencies, scoped entirely to [data-ts-carousel] /
   [data-ts-track].
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-ts-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-ts-track]");
  const prevBtn = carousel.querySelector("[data-ts-prev]");
  const nextBtn = carousel.querySelector("[data-ts-next]");
  const slides = Array.from(track.querySelectorAll(".ts-slide"));
  if (slides.length < 2) return;

  // Start at the first card.
  track.scrollLeft = 0;

  function slideStep() {
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    return slides[0].getBoundingClientRect().width + gap;
  }

  function maxScroll() {
    return track.scrollWidth - track.clientWidth;
  }

  function currentIndex() {
    return Math.round(track.scrollLeft / slideStep());
  }

  function goToIndex(index, smooth) {
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    const left = Math.min(clamped * slideStep(), maxScroll());
    track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }

  /* ------------------------------------------------------------------ */
  /* 1. Arrow navigation — one slide per click, disabled at the ends     */
  /* ------------------------------------------------------------------ */
  function updateArrowState() {
    const max = maxScroll() - 1;
    if (prevBtn) prevBtn.disabled = track.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = track.scrollLeft >= max;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => goToIndex(currentIndex() - 1, true));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => goToIndex(currentIndex() + 1, true));
  }

  let scrollTicking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          updateArrowState();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateArrowState);
  updateArrowState();

  /* ------------------------------------------------------------------ */
  /* 2. Mouse drag-to-scroll (touch keeps native swipe/snap scrolling)   */
  /*    Native overflow-x:auto + scroll-snap already stops firmly at the */
  /*    first/last card since there is no extra (cloned) content beyond  */
  /*    them, so no manual clamping is needed here.                      */
  /* ------------------------------------------------------------------ */
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;

  function onPointerDown(e) {
    if (e.pointerType === "touch") return;
    isDragging = true;
    dragMoved = false;
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 4) {
      // Only take pointer capture once an actual drag is confirmed — doing
      // this unconditionally on pointerdown (the previous behavior) made
      // the browser retarget every subsequent click at `track` itself
      // instead of whatever card/link was under the cursor, silently
      // breaking desktop card navigation even for a plain, non-dragging
      // click. Touch is unaffected either way (see the early return above).
      if (!dragMoved) track.setPointerCapture(e.pointerId);
      dragMoved = true;
    }
    track.scrollLeft = startScrollLeft - delta;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
  }

  // Swallow the click that follows a drag so the card link doesn't
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
})();
