/* ==========================================================================
   XPLOROO · Influencers module
   influencers.js — Finite (non-looping) swipe/scroll-snap carousel with
   dot pagination and mouse drag-to-scroll. Scoped entirely to
   [data-inf-carousel] / [data-inf-track] / [data-inf-dots] so it never
   touches the Recent Winners carousel (data-rw-*), which is left completely
   unmodified. No slide cloning, no wrap-around — the first card is the
   starting point and native scroll-snap stops firmly at the last card in
   either direction. Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-inf-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-inf-track]");
  const dotsWrap = document.querySelector("[data-inf-dots]");
  const slides = Array.from(track.querySelectorAll(".inf-slide"));
  const slideCount = slides.length;
  if (slideCount < 2) return;

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
    const clamped = Math.max(0, Math.min(index, slideCount - 1));
    const left = Math.min(clamped * slideStep(), maxScroll());
    track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }

  /* ------------------------------------------------------------------ */
  /* 1. Mouse drag-to-scroll (touch keeps native swipe/snap scrolling,   */
  /*    which already provides momentum)                                 */
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
    track.setPointerCapture(e.pointerId);
    track.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 4) dragMoved = true;
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

  /* ------------------------------------------------------------------ */
  /* 2. Dot pagination                                                   */
  /* ------------------------------------------------------------------ */
  const dots = [];
  if (dotsWrap) {
    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "inf-dot";
      dot.setAttribute("aria-label", "Go to influencer " + (i + 1));
      dot.addEventListener("click", () => goToIndex(i, true));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
  }

  function updateDots() {
    if (!dots.length) return;
    const index = Math.max(0, Math.min(currentIndex(), slideCount - 1));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  let scrollTicking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          updateDots();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", () => goToIndex(currentIndex(), false));

  updateDots();
})();
