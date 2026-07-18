/* ==========================================================================
   XPLOROO · Founder's Journey module
   founder-journey.js — Scroll-reveal only (fade + rise) for the hero and
   each chapter card, matching the [data-pw-reveal] pattern used on
   play&win.html. Respects prefers-reduced-motion: elements are made
   visible immediately instead of observed.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-fj-page]");
  if (!page) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = page.querySelectorAll("[data-fj-reveal]");

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
})();
