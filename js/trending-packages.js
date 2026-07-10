/* ==========================================================================
   XPLOROO · Trending Packages module
   trending-packages.js — Drag-to-scroll + arrow navigation for the desktop
   carousel, and the wishlist toggle micro-interaction.
   Vanilla JS, no dependencies, scoped entirely to [data-tp-carousel].
   On mobile the CSS switches the track to a static 2-col grid, so none of
   the carousel logic below applies there — only the wishlist toggle does.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-tp-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-tp-track]");
  const prevBtn = carousel.querySelector("[data-tp-prev]");
  const nextBtn = carousel.querySelector("[data-tp-next]");

  /* ------------------------------------------------------------------ */
  /* 1. Mouse drag-to-scroll                                             */
  /*    (touch devices already get native swipe via `overflow-x: auto`   */
  /*    + `scroll-snap-type`, so we only handle mouse/pen pointers here) */
  /* ------------------------------------------------------------------ */
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;

  function onPointerDown(e) {
    if (e.pointerType === "touch") return; // native touch scrolling handles this
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

  // Swallow the click that follows a drag so links/buttons under the
  // pointer don't fire (e.g. "Book Now") when the user was just panning.
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
  /* 2. Arrow navigation                                                 */
  /* ------------------------------------------------------------------ */
  function getStep() {
    const slide = track.querySelector(".tp-slide");
    if (!slide) return track.clientWidth * 0.9;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    return slide.getBoundingClientRect().width + gap;
  }

  function updateArrowState() {
    const maxScroll = track.scrollWidth - track.clientWidth - 1;
    if (prevBtn) prevBtn.disabled = track.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getStep(), behavior: "smooth" });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: getStep(), behavior: "smooth" });
    });
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
  /* 3. Wishlist (heart) toggle                                          */
  /* ------------------------------------------------------------------ */
  carousel.querySelectorAll("[data-tp-wishlist]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation(); // don't let this bubble into the drag/click guard above

      const isSaved = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", isSaved ? "false" : "true");

      // Restart the pop animation on every toggle.
      button.classList.remove("tp-pulse");
      void button.offsetWidth; // force reflow so the animation replays
      button.classList.add("tp-pulse");
    });
  });

  /* ------------------------------------------------------------------ */
  /* 4. Card navigation — opt-in via `data-tp-href` (e.g. the Iceland card */
  /*    links to iceland-package.html). Cards without this attribute are  */
  /*    completely unaffected, so nothing changes for the rest of the     */
  /*    carousel until each destination gets its own dedicated page.      */
  /* ------------------------------------------------------------------ */
  carousel.querySelectorAll("[data-tp-href]").forEach((card) => {
    const destination = card.dataset.tpHref;
    const wishlistBtn = card.querySelector("[data-tp-wishlist]");

    function goToDestination() {
      window.location.href = destination;
    }

    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", (e) => {
      if (wishlistBtn && wishlistBtn.contains(e.target)) return;
      goToDestination();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (wishlistBtn && wishlistBtn.contains(e.target)) return;
      e.preventDefault();
      goToDestination();
    });
  });
})();
