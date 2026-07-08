/* ==========================================================================
   XPLOROO · Influencer Profile module
   influencer-profile.js — Shared by every influencer page (first-influencer.html,
   palak.html, payal.html, etc. — one script, reused unchanged by all of them).
   Before a "Book Now" link navigates to booking.html?service=<slug>&influencer=<slug>,
   stash both slugs in sessionStorage so the selection survives hosts whose
   clean-URL redirect strips the query string (same pattern as
   js/package-details.js for `?package=`). booking.js reads these as a
   fallback only — the query string is always tried first.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  document.querySelectorAll('a[href*="booking.html?"]').forEach((link) => {
    link.addEventListener("click", () => {
      try {
        const url = new URL(link.href, window.location.href);
        const service = url.searchParams.get("service");
        const influencer = url.searchParams.get("influencer");
        if (service) sessionStorage.setItem("xploroo-selected-service", service);
        if (influencer) sessionStorage.setItem("xploroo-selected-influencer", influencer);
        // Clear any leftover travel-package selection from an earlier visit —
        // otherwise a stale `xploroo-selected-package` can linger alongside
        // this service selection (harmless today since `service` always wins,
        // but keeping only one flow's state in sessionStorage at a time keeps
        // the two flows from ever being able to cross-contaminate).
        sessionStorage.removeItem("xploroo-selected-package");
      } catch (_) {
        /* URL/sessionStorage unavailable — query param path still works */
      }
    });
  });
})();
