/* ==========================================================================
   XPLOROO · Account — My VIP Bookings (Phase 32)
   account-vip-bookings.js — Renders every VIP booking request the signed-in
   customer has submitted through vip-booking.html
   (public.vip_booking_requests, Supabase-backed, via
   window.XploroVipBookingRequests, see js/vip-booking-requests.js) into the
   "My VIP Bookings" section added to account.html. Entirely independent of
   js/account.js and js/account-bookings.js — only fills its own
   [data-account-vip-bookings]/[data-account-vip-bookings-list] mount
   points, never touches their markup.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/account.js and
   js/vip-booking-requests.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroAuth || !window.XploroVipBookingRequests) return;

  const section = page.querySelector("[data-account-vip-bookings]");
  const list = page.querySelector("[data-account-vip-bookings-list]");
  if (!section || !list) return;

  const esc = window.XploroSecurity.escapeHtml;

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "—";
    }
  }

  function statusPill(status) {
    if (status === "Confirmed") return `<span class="status-pill status-pill--approved">${esc(status)}</span>`;
    if (status === "Cancelled") return `<span class="status-pill status-pill--rejected">${esc(status)}</span>`;
    return `<span class="status-pill status-pill--pending">${esc(status || "Pending Review")}</span>`;
  }

  function rowTemplate(b) {
    return `
      <div class="account-profile__row">
        <div>
          <dt>${esc(b.vip_personality)}</dt>
          <dd>${formatDate(b.preferred_date)} &middot; ${b.travellers} traveller${b.travellers === 1 ? "" : "s"} &middot; ${statusPill(b.status)}</dd>
        </div>
      </div>`;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;

    const bookings = await window.XploroVipBookingRequests.getMyBookingRequests();
    if (!bookings.length) return; // stays hidden — nothing to show yet

    section.hidden = false;
    list.innerHTML = `<dl class="account-profile__rows">${bookings.map(rowTemplate).join("")}</dl>`;
  })();
})();
