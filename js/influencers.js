/* ==========================================================================
   XPLOROO · Influencers module
   influencers.js — Structural clone of js/recent-winners.js: infinite-
   looping swipe/scroll-snap carousel with dot pagination. Renamed to
   [data-inf-carousel] / [data-inf-track] / [data-inf-dots] so it never
   touches the Recent Winners carousel (data-rw-*), which is left completely
   unmodified. Vanilla JS, no dependencies.

   Looping technique: the first and last real slides are cloned and placed
   on the opposite ends of the track (a 1-slide buffer either side). Native
   scroll-snap + touch/trackpad scrolling drives the motion — once the user
   settles on a clone, we silently (non-smooth) re-point scrollLeft to the
   matching real slide, so the loop feels continuous with zero fake-frame
   animation and stays on the GPU-accelerated scroll path for 60fps.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-inf-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-inf-track]");
  const dotsWrap = document.querySelector("[data-inf-dots]");
  const realSlides = Array.from(track.querySelectorAll(".inf-slide"));
  const realCount = realSlides.length;
  if (realCount < 2) return;

  /* ------------------------------------------------------------------ */
  /* 1. Clone first/last slide for a seamless infinite loop               */
  /* ------------------------------------------------------------------ */
  function prepareClone(node) {
    const clone = node.cloneNode(true);
    clone.setAttribute("data-inf-clone", "");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
    return clone;
  }

  const leadingClone = prepareClone(realSlides[realCount - 1]); // copy of last, placed at start
  const trailingClone = prepareClone(realSlides[0]);            // copy of first, placed at end
  track.insertBefore(leadingClone, realSlides[0]);
  track.appendChild(trailingClone);

  function getSlides() {
    return Array.from(track.querySelectorAll(".inf-slide"));
  }

  function slideStep() {
    const slide = getSlides()[0];
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    return slide.getBoundingClientRect().width + gap;
  }

  function goToIndex(index, smooth) {
    track.scrollTo({ left: slideStep() * index, behavior: smooth ? "smooth" : "auto" });
  }

  // Land on the first real slide (index 1, since index 0 is the leading clone)
  let ready = false;
  requestAnimationFrame(() => {
    goToIndex(1, false);
    ready = true;
  });

  /* ------------------------------------------------------------------ */
  /* 2. Detect settle point after scroll/swipe, silently wrap at the ends */
  /* ------------------------------------------------------------------ */
  let settleTimer = null;

  function currentIndex() {
    return Math.round(track.scrollLeft / slideStep());
  }

  function onSettle() {
    const total = getSlides().length;
    const index = currentIndex();
    if (index <= 0) {
      goToIndex(total - 2, false); // wrap to last real slide
    } else if (index >= total - 1) {
      goToIndex(1, false); // wrap to first real slide
    }
    updateDots();
  }

  track.addEventListener(
    "scroll",
    () => {
      if (!ready) return;
      updateDots();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(onSettle, 120);
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    if (!ready) return;
    goToIndex(currentIndex(), false);
  });

  /* ------------------------------------------------------------------ */
  /* 3. Dot pagination                                                   */
  /* ------------------------------------------------------------------ */
  const dots = [];
  if (dotsWrap) {
    for (let i = 0; i < realCount; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "inf-dot";
      dot.setAttribute("aria-label", "Go to influencer " + (i + 1));
      dot.addEventListener("click", () => goToIndex(i + 1, true));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
  }

  function updateDots() {
    if (!dots.length) return;
    let index = currentIndex() - 1; // shift for leading clone
    if (index < 0) index = realCount - 1;
    if (index > realCount - 1) index = 0;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  updateDots();
})();
