/* ==========================================================================
   XPLOROO · Vlog Shoot Packages module
   vlog-shoot-packages.js — Finite (non-looping) carousel: mouse drag-to-
   scroll, native touch swipe, arrow navigation, and scroll-snap. The first
   card is the starting point; scrolling stops firmly at the last card in
   either direction. No slide cloning, no wrap-around — same proven pattern
   used elsewhere on the site (e.g. the former Travel Stories carousel).
   The Shimla card links to shimlavlogshoot.html; Manali/Goa are still
   inert (no page yet). The drag-vs-click swallow below prevents a card
   link from firing when the user was just panning the carousel.
   Vanilla JS, no dependencies, scoped entirely to [data-vsp-carousel] /
   [data-vsp-track].
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-vsp-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-vsp-track]");
  const prevBtn = carousel.querySelector("[data-vsp-prev]");
  const nextBtn = carousel.querySelector("[data-vsp-next]");
  const slides = Array.from(track.querySelectorAll(".vsp-slide"));
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

  // Swallow the click that follows a drag so the Shimla card's link
  // doesn't navigate when the user was just panning the carousel.
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
