/* ==========================================================================
   XPLOROO · Referral & Discount System — link capture
   referral-capture.js — Runs on the homepage only (the referral link format
   is https://…/?ref=CODE, i.e. the site root — see js/referral.js's
   referralLink()). Validates the ?ref= code against Supabase and, if valid,
   stores it in sessionStorage — NOT localStorage — so it "stays active
   throughout the browsing session" and survives navigation to other pages
   (booking.html reads it back, see js/booking.js), but is naturally gone
   once the tab/session ends, matching the spec's "until booking is
   completed or the referral expires".
   Vanilla JS, no dependencies. Loaded with `defer`, after js/referral.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.XploroReferrals) return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (!ref) return;

  window.XploroReferrals.resolveReferral(ref).then((resolved) => {
    if (!resolved) return; // fake/unknown code — silently ignored, nothing stored
    try {
      sessionStorage.setItem("xploroo-referral", JSON.stringify({ code: resolved.code, capturedAt: Date.now() }));
    } catch (_) {
      /* sessionStorage unavailable (e.g. private browsing) — booking.html's
         manual Referral Code field still works */
    }
  });
})();
