/* ==========================================================================
   XPLOROO · Content reveal module
   content-reveal.js — Generic scroll-reveal (fade + rise) for any element
   marked `data-reveal`, shared by how-it-works.html, our-team.html,
   privacy-policy.html, terms-conditions.html and refund-policy.html so each
   page doesn't need its own copy of the same IntersectionObserver logic
   (same pattern as js/play-win.js's [data-pw-reveal]). Respects
   prefers-reduced-motion: elements are made visible immediately instead of
   observed.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const revealEls = document.querySelectorAll("[data-reveal]");
  if (!revealEls.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if ("IntersectionObserver" in window && !reduceMotion) {
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
