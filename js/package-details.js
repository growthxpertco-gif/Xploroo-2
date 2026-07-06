/* ==========================================================================
   XPLOROO · Package Details module
   package-details.js — Master template behavior for every package page:
     1. Scroll-reveal fade-in for [data-pkg-reveal] sections.
     2. Gallery: thumbnail click swaps the large hero image.
     3. Tabs (Itinerary / Inclusions / Exclusions) with fade switching.
     4. Countdown ("LIVE" deal timer).
     5. Section 8 image carousel (drag-to-scroll + arrows).
     6. Sticky mobile booking bar, shown once the hero has scrolled by.
   Vanilla JS, no dependencies. Scoped entirely to [data-pkg-page] so it can
   be reused unmodified on every future package page. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-pkg-page]");
  if (!page) return;

  /* ------------------------------------------------------------------ */
  /* 1. Scroll-reveal                                                    */
  /* ------------------------------------------------------------------ */
  const revealEls = page.querySelectorAll("[data-pkg-reveal]");
  if (revealEls.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------------ */
  /* 2. Gallery — thumbnail click swaps the large hero image             */
  /* ------------------------------------------------------------------ */
  const heroImg = page.querySelector("[data-pkg-hero-image]");
  const thumbs = page.querySelectorAll("[data-pkg-thumb]");

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const full = thumb.dataset.pkgThumb;
      if (!heroImg || !full || heroImg.src === full) return;

      thumbs.forEach((t) => t.classList.toggle("is-active", t === thumb));

      heroImg.classList.add("is-fading");
      window.setTimeout(() => {
        heroImg.src = full;
        heroImg.classList.remove("is-fading");
      }, 180);
    });
  });

  /* ------------------------------------------------------------------ */
  /* 3. Tabs — Itinerary / Inclusions / Exclusions                       */
  /* ------------------------------------------------------------------ */
  const tabs = Array.from(page.querySelectorAll("[data-pkg-tab]"));
  const panels = Array.from(page.querySelectorAll("[data-pkg-tab-panel]"));

  function selectTab(tabEl) {
    const target = tabEl.dataset.pkgTab;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tabEl)));
    panels.forEach((panel) => {
      const isMatch = panel.dataset.pkgTabPanel === target;
      panel.classList.toggle("is-active", isMatch);
      if (isMatch) {
        panel.classList.remove("is-visible");
        void panel.offsetWidth;
        panel.classList.add("is-visible");
      }
    });
  }

  tabs.forEach((tabEl) => tabEl.addEventListener("click", () => selectTab(tabEl)));
  if (tabs.length) selectTab(tabs[0]);

  /* ------------------------------------------------------------------ */
  /* 4. Countdown — "Ends in X Days Y Hours"                             */
  /* ------------------------------------------------------------------ */
  const countdownEl = page.querySelector("[data-pkg-countdown]");
  if (countdownEl) {
    const textEl = countdownEl.querySelector("[data-pkg-countdown-text]");
    const hours = Number(countdownEl.dataset.hours) || 0;
    const deadline = Date.now() + hours * 3_600_000;

    function formatRemaining(ms) {
      if (ms <= 0) return "Offer Ended";
      const totalHours = Math.floor(ms / 3_600_000);
      const days = Math.floor(totalHours / 24);
      const hrs = totalHours % 24;
      if (days > 0 && hrs > 0) return `Ends in ${days} Day${days > 1 ? "s" : ""} ${hrs} Hour${hrs !== 1 ? "s" : ""}`;
      if (days > 0) return `Ends in ${days} Day${days > 1 ? "s" : ""}`;
      return `Ends in ${hrs} Hour${hrs !== 1 ? "s" : ""}`;
    }

    function tick() {
      if (textEl) textEl.textContent = formatRemaining(deadline - Date.now());
    }
    tick();
    window.setInterval(tick, 60_000);
  }

  /* ------------------------------------------------------------------ */
  /* 5. Section 8 carousel — drag-to-scroll + arrows                     */
  /* ------------------------------------------------------------------ */
  const carousel = page.querySelector("[data-pkg-carousel]");
  if (carousel) {
    const track = carousel.querySelector("[data-pkg-carousel-track]");
    const prevBtn = carousel.querySelector("[data-pkg-carousel-prev]");
    const nextBtn = carousel.querySelector("[data-pkg-carousel-next]");

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      isDragging = true;
      startX = e.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
    });
    track.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      track.scrollLeft = startScrollLeft - (e.clientX - startX);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
      track.addEventListener(evt, () => {
        isDragging = false;
        track.classList.remove("is-dragging");
      });
    });

    function getStep() {
      const slide = track.querySelector(".pkg-carousel__slide");
      if (!slide) return track.clientWidth * 0.9;
      const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      return slide.getBoundingClientRect().width + gap;
    }
    function updateArrows() {
      const maxScroll = track.scrollWidth - track.clientWidth - 1;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 0;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll;
    }
    if (prevBtn) prevBtn.addEventListener("click", () => track.scrollBy({ left: -getStep(), behavior: "smooth" }));
    if (nextBtn) nextBtn.addEventListener("click", () => track.scrollBy({ left: getStep(), behavior: "smooth" }));

    let ticking = false;
    track.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateArrows();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateArrows);
    updateArrows();
  }

  /* ------------------------------------------------------------------ */
  /* 6. Sticky mobile booking bar — appears once the hero scrolls by     */
  /* ------------------------------------------------------------------ */
  /* The sticky bar is a fixed-position overlay living outside `.pkg-page`
     in the markup (same pattern as the mobile menu / search overlay), so
     it's looked up on `document`, not scoped to `page` like everything
     else above. */
  const stickyBar = document.querySelector("[data-pkg-sticky-bar]");
  const hero = page.querySelector("[data-pkg-hero]");
  if (stickyBar && hero && "IntersectionObserver" in window) {
    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          stickyBar.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    barObserver.observe(hero);
  }

  /* ------------------------------------------------------------------ */
  /* 7. "You May Also Like" related-packages carousel — drag/swipe scroll */
  /*    + arrow nav (mirrors the homepage Trending Packages carousel      */
  /*    without touching trending-packages.js) + wishlist heart toggle.   */
  /* ------------------------------------------------------------------ */
  const related = page.querySelector("[data-pkg-related]");
  if (related) {
    const relTrack = related.querySelector("[data-pkg-related-track]");
    const relPrev = related.querySelector("[data-pkg-related-prev]");
    const relNext = related.querySelector("[data-pkg-related-next]");

    let relDragging = false;
    let relStartX = 0;
    let relStartScrollLeft = 0;

    relTrack.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return; // native touch scrolling handles this
      relDragging = true;
      relStartX = e.clientX;
      relStartScrollLeft = relTrack.scrollLeft;
      relTrack.setPointerCapture(e.pointerId);
      relTrack.classList.add("is-dragging");
    });
    relTrack.addEventListener("pointermove", (e) => {
      if (!relDragging) return;
      relTrack.scrollLeft = relStartScrollLeft - (e.clientX - relStartX);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
      relTrack.addEventListener(evt, () => {
        relDragging = false;
        relTrack.classList.remove("is-dragging");
      });
    });

    function relStep() {
      const slide = relTrack.querySelector(".pkg-related__slide");
      if (!slide) return relTrack.clientWidth * 0.9;
      const gap = parseFloat(getComputedStyle(relTrack).columnGap || "0") || 0;
      return slide.getBoundingClientRect().width + gap;
    }
    function updateRelArrows() {
      const maxScroll = relTrack.scrollWidth - relTrack.clientWidth - 1;
      if (relPrev) relPrev.disabled = relTrack.scrollLeft <= 0;
      if (relNext) relNext.disabled = relTrack.scrollLeft >= maxScroll;
    }
    if (relPrev) relPrev.addEventListener("click", () => relTrack.scrollBy({ left: -relStep(), behavior: "smooth" }));
    if (relNext) relNext.addEventListener("click", () => relTrack.scrollBy({ left: relStep(), behavior: "smooth" }));

    let relTicking = false;
    relTrack.addEventListener(
      "scroll",
      () => {
        if (!relTicking) {
          window.requestAnimationFrame(() => {
            updateRelArrows();
            relTicking = false;
          });
          relTicking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateRelArrows);
    updateRelArrows();

    related.querySelectorAll("[data-pkg-related-wishlist]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isSaved = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", isSaved ? "false" : "true");

        button.classList.remove("is-pulsing");
        void button.offsetWidth; // force reflow so the animation replays
        button.classList.add("is-pulsing");
      });
    });
  }
})();
