/* ==========================================================================
   XPLOROO · VIP Home
   vip-home.js — Drives vip.html. Phase 22: every signed-in user can access
   VIP for now (no membership lock yet), so this only gates on a Supabase
   session — same pattern as js/my-bookings.js. The two cards themselves
   are plain links to vip-meet-greet.html / vip-vlog.html, no rendering
   needed.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-vip-page]");
  if (!page || !window.XploroAuth) return;

  const gate = page.querySelector("[data-vip-gate]");
  const content = page.querySelector("[data-vip-content]");

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) {
      gate.hidden = false;
      content.hidden = true;
      return;
    }
    gate.hidden = true;
    content.hidden = false;
  })();
})();
