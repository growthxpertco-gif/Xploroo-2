/* ==========================================================================
   XPLOROO · Luxury VIP Information Sections (Phase 33)
   vip-luxury-cards.js — Cursor-follow 3D tilt + light-reflection for the
   five luxury card sections on vip.html ([data-vip-luxury-card]). Every
   visual effect is CSS (transform + a radial-gradient positioned via
   custom properties, see styles/vip-luxury-sections.css) — this file only
   computes two small numbers per mousemove and writes them as CSS custom
   properties; the browser's own compositor handles the rest.

   rAF-throttled (never more than one update per frame) and skipped
   entirely on touch/coarse-pointer devices, where the tilt effect doesn't
   apply — those keep the same premium *static* card look via CSS alone.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const cards = document.querySelectorAll("[data-vip-luxury-card]");
  if (!cards.length) return;

  // No fine pointer (touch-only device) or the user prefers reduced
  // motion — the CSS-only static luxury look is already in place, so
  // there's nothing for this script to do.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MAX_TILT_DEG = 4; // subtle, per the "luxurious, not aggressive" brief

  cards.forEach((card) => {
    let pending = null;

    function applyTilt(clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width; // 0..1
      const py = (clientY - rect.top) / rect.height; // 0..1

      const ry = (px - 0.5) * (MAX_TILT_DEG * 2);
      const rx = (0.5 - py) * (MAX_TILT_DEG * 2);

      card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      pending = null;
    }

    card.addEventListener("mousemove", (e) => {
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
