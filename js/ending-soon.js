/* ==========================================================================
   XPLOROO · Ending Soon module
   ending-soon.js — Drag-to-scroll + arrow navigation (mirrors the Trending
   Packages carousel behavior 1:1 for a consistent feel), the wishlist
   toggle, and a live countdown ticker.
   Vanilla JS, no dependencies. Scoped entirely to [data-es-carousel], so it
   never touches the Trending Packages carousel (which uses the separate
   [data-tp-carousel] attribute) — trending-packages.js is not shared or
   modified.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-es-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-es-track]");
  const prevBtn = carousel.querySelector("[data-es-prev]");
  const nextBtn = carousel.querySelector("[data-es-next]");

  /* ------------------------------------------------------------------ */
  /* 1. Mouse drag-to-scroll (touch keeps native swipe/snap scrolling)    */
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
      e.stopPropagation();

      const isSaved = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", isSaved ? "false" : "true");

      button.classList.remove("tp-pulse");
      void button.offsetWidth;
      button.classList.add("tp-pulse");
    });
  });

  /* ------------------------------------------------------------------ */
  /* 4. Live countdown ("Ends in X Days Y Hours")                        */
  /*    Each element declares `data-hours` (deal length from page load). */
  /*    We fix an absolute deadline on first run so the countdown is     */
  /*    stable and keeps ticking correctly for as long as the tab stays  */
  /*    open, then refresh the display once a minute.                    */
  /* ------------------------------------------------------------------ */
  const countdownEls = carousel.querySelectorAll("[data-es-countdown]");

  function formatRemaining(ms) {
    if (ms <= 0) return "Offer Ended";
    const totalHours = Math.floor(ms / 3_600_000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0 && hours > 0) {
      return `Ends in ${days} Day${days > 1 ? "s" : ""} ${hours} Hour${hours !== 1 ? "s" : ""}`;
    }
    if (days > 0) {
      return `Ends in ${days} Day${days > 1 ? "s" : ""}`;
    }
    return `Ends in ${hours} Hour${hours !== 1 ? "s" : ""}`;
  }

  function tickCountdowns() {
    const now = Date.now();
    countdownEls.forEach((el) => {
      let deadline = Number(el.dataset.deadline);
      if (!deadline) {
        const hours = Number(el.dataset.hours) || 0;
        deadline = now + hours * 3_600_000;
        el.dataset.deadline = String(deadline);
      }

      const remaining = deadline - now;
      const textEl = el.querySelector("[data-es-countdown-text]");
      if (textEl) textEl.textContent = formatRemaining(remaining);

      const card = el.closest("[data-tp-card]");
      if (card) card.classList.toggle("is-ended", remaining <= 0);
    });
  }

  tickCountdowns();
  window.setInterval(tickCountdowns, 60_000); // refresh once a minute

  /* ------------------------------------------------------------------ */
  /* 5. Card navigation — opt-in via `data-tp-href` (mirrors the exact    */
  /*    same pattern already working in trending-packages.js). Clicking  */
  /*    anywhere on the card navigates to its package page; clicks on     */
  /*    the wishlist button or the "Book Now" link are excluded so they    */
  /*    aren't double-handled (the link already navigates natively, and   */
  /*    the wishlist button must never trigger navigation).               */
  /* ------------------------------------------------------------------ */
  carousel.querySelectorAll("[data-tp-href]").forEach((card) => {
    const destination = card.dataset.tpHref;
    const wishlistBtn = card.querySelector("[data-tp-wishlist]");
    const ctaLink = card.querySelector(".tp-card__cta");

    function isExcluded(target) {
      return (wishlistBtn && wishlistBtn.contains(target)) || (ctaLink && ctaLink.contains(target));
    }

    function goToDestination() {
      window.location.href = destination;
    }

    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", (e) => {
      if (isExcluded(e.target)) return;
      goToDestination();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (isExcluded(e.target)) return;
      e.preventDefault();
      goToDestination();
    });
  });
})();
