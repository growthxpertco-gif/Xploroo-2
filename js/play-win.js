/* ==========================================================================
   XPLOROO · Play & Win arena
   play-win.js — Landing-page behavior only (no game/quiz logic lives here):
     1. Injects the floating background particles.
     2. Scroll-reveal for each section.
     3. Animated coin counters (placeholder — counts to 0 today; call
        pwAnimateCounter(el, target) with a real value once games launch).
     4. Drag-to-scroll for the "Coming Games" carousel.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-pw-page]");
  if (!page) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* 1. Background particles — a couple dozen glowing dots drifting up.   */
  /*    Pure CSS animation per particle; JS only randomizes placement.    */
  /* ------------------------------------------------------------------ */
  const bg = page.querySelector("[data-pw-bg]");
  if (bg && !reduceMotion) {
    const COLORS = [
      "rgba(139, 92, 246, 0.7)",  // violet
      "rgba(34, 211, 238, 0.7)",  // cyan
      "rgba(236, 72, 153, 0.6)",  // pink
      "rgba(251, 191, 36, 0.6)",  // gold
      "rgba(255, 255, 255, 0.5)", // white sparkle
    ];
    const COUNT = 26;

    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("span");
      const size = 2 + Math.random() * 3.5;
      p.className = "pw-particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.setProperty("--pw-particle-color", COLORS[i % COLORS.length]);
      p.style.setProperty("--pw-sway", (Math.random() * 8 - 4).toFixed(1) + "vw");
      p.style.animationDuration = (14 + Math.random() * 16).toFixed(1) + "s";
      p.style.animationDelay = (-Math.random() * 30).toFixed(1) + "s";
      bg.appendChild(p);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 2. Scroll reveal                                                     */
  /* ------------------------------------------------------------------ */
  const revealEls = page.querySelectorAll("[data-pw-reveal]");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------------ */
  /* 3. Futuristic counters — eases up to `data-pw-count` (0 for now).    */
  /*    Reusable: set data-pw-count="12500" later and it just works.      */
  /* ------------------------------------------------------------------ */
  function pwAnimateCounter(el, target) {
    const suffix = el.dataset.pwSuffix || "";
    if (reduceMotion || target === 0) {
      el.textContent = target.toLocaleString("en-IN") + suffix;
      return;
    }
    const DURATION = 1400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(target * eased).toLocaleString("en-IN") + suffix;
      if (t < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  page.querySelectorAll("[data-pw-count]").forEach((el) => {
    pwAnimateCounter(el, Number(el.dataset.pwCount) || 0);
  });

  /* ------------------------------------------------------------------ */
  /* 4. Coming Games carousel — mouse drag-to-scroll (touch keeps native  */
  /*    swipe + snap via CSS overflow scrolling).                         */
  /* ------------------------------------------------------------------ */
  const track = page.querySelector("[data-pw-games]");
  if (track) {
    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      dragging = true;
      startX = e.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
    });
    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      track.scrollLeft = startScrollLeft - (e.clientX - startX);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
      track.addEventListener(evt, () => {
        dragging = false;
        track.classList.remove("is-dragging");
      });
    });
  }
})();
