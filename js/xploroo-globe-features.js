/* ==========================================================================
   XPLOROO · Xploroo Globe — Core Features Section (Phase 37)
   xploroo-globe-features.js — Two small, independent behaviours scoped
   entirely to [data-xgf-section]:
     1. Scroll-reveal: fades/rises/un-blurs the heading and each card in
        via IntersectionObserver, staggered by a small per-index delay.
     2. Cursor-follow 3D tilt on each card (same technique as
        js/vip-luxury-cards.js) — mouse/pointer only, no-op on touch.
   Never touches the hero, header, or globe above this section.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const section = document.querySelector("[data-xgf-section]");
  if (!section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Defer decorative animations (bg glow + card comet borders) until    */
  /* the section is actually near the viewport, so they never run       */
  /* while off-screen on initial load.                                  */
  /* ------------------------------------------------------------------ */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) markSectionInView();
        });
      },
      { rootMargin: "200px 0px" }
    );
    sectionObserver.observe(section);

    // Failsafe: some embedded preview/host environments report the page as
    // `document.hidden === true` even while actively shown, which freezes
    // IntersectionObserver callbacks and would leave the decorative
    // animations permanently paused. Same class of issue as checkStuck()
    // below and ensureHeroVisible() in xploroo-globe-stars.js.
    function markSectionInView() {
      if (section.classList.contains("xgf-in-view")) return;
      sectionObserver.disconnect();
      section.classList.add("xgf-in-view");
      window.removeEventListener("scroll", checkSectionStuck);
      document.removeEventListener("visibilitychange", checkSectionStuck);
    }
    function checkSectionStuck() {
      if (section.classList.contains("xgf-in-view")) return;
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (document.hidden || inView) {
        window.setTimeout(markSectionInView, 900);
      }
    }
    checkSectionStuck();
    window.addEventListener("scroll", checkSectionStuck, { passive: true });
    document.addEventListener("visibilitychange", checkSectionStuck);
  } else {
    section.classList.add("xgf-in-view");
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                       */
  /* ------------------------------------------------------------------ */
  const revealEls = Array.from(section.querySelectorAll(".xgf-reveal"));
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      revealEls.forEach((el, i) => {
        el.style.setProperty("--xgf-delay", `${Math.min(i, 6) * 90}ms`);
      });

      let revealed = false;
      function revealAll() {
        if (revealed) return;
        revealed = true;
        revealEls.forEach((el) => el.classList.add("is-visible"));
        window.removeEventListener("scroll", checkStuck);
        document.removeEventListener("visibilitychange", checkStuck);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
          if (revealEls.every((el) => el.classList.contains("is-visible"))) {
            revealAll();
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach((el) => observer.observe(el));

      // Failsafe: some embedded preview/host environments report the page
      // as `document.hidden === true` even while actively shown, and
      // browsers can suspend frame-driven observation work (this is the
      // same class of issue as requestAnimationFrame/CSS-animation
      // freezing on a "hidden" page) — leaving IntersectionObserver
      // callbacks stuck and cards permanently invisible. If nothing has
      // revealed itself once the section is actually scrolled into view,
      // force everything visible directly.
      function checkStuck() {
        if (revealed) return;
        const rect = section.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (document.hidden || inView) {
          window.setTimeout(() => {
            if (!revealed && revealEls.some((el) => !el.classList.contains("is-visible"))) {
              observer.disconnect();
              revealAll();
            }
          }, 900);
        }
      }
      checkStuck();
      window.addEventListener("scroll", checkStuck, { passive: true });
      document.addEventListener("visibilitychange", checkStuck);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cursor-follow 3D tilt — pointer/mouse only                          */
  /* ------------------------------------------------------------------ */
  if (reduceMotion) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const MAX_TILT_DEG = 5;
  const cards = section.querySelectorAll("[data-xgf-card]");

  cards.forEach((card) => {
    let pending = null;

    function applyTilt(clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;

      const ry = (px - 0.5) * (MAX_TILT_DEG * 2);
      const rx = (0.5 - py) * (MAX_TILT_DEG * 2);

      card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      pending = null;
    }

    card.addEventListener("mousemove", (e) => {
      // requestAnimationFrame never fires on a page some embedded preview/
      // host environments report as `document.hidden === true` (even while
      // actively shown) — apply immediately there instead of throttling
      // through a callback that would silently never run.
      if (document.hidden) {
        applyTilt(e.clientX, e.clientY);
        return;
      }
      if (pending) return;
      pending = requestAnimationFrame(() => applyTilt(e.clientX, e.clientY));
    });

    card.addEventListener("mouseleave", () => {
      if (pending) {
        cancelAnimationFrame(pending);
        pending = null;
      }
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });
  });
})();
