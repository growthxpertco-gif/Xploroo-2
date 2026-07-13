/* ==========================================================================
   XPLOROO · Account — My Influencer Bookings
   account-bookings.js — Renders every influencer service booking the
   signed-in traveler has made (public.influencer_bookings, Supabase-backed,
   via window.XploroInfluencerBookings, see js/influencer-bookings.js) into
   the "My Influencer Bookings" section added to account.html in Phase 6.
   Entirely independent of js/account.js (profile/role rendering) — only
   fills its own [data-account-bookings]/[data-account-bookings-list] mount
   points, never touches account.js's markup.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/account.js and
   js/influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroAuth || !window.XploroInfluencerBookings) return;

  const section = page.querySelector("[data-account-bookings]");
  const list = page.querySelector("[data-account-bookings-list]");
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

  function formatMoney(n) {
    if (n == null || n === "") return "—";
    return `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
  }

  function statusPill(status) {
    if (status === "Accepted") return `<span class="status-pill status-pill--approved">${status}</span>`;
    if (status === "Declined") return `<span class="status-pill status-pill--rejected">${status}</span>`;
    return `<span class="status-pill status-pill--pending">${status}</span>`;
  }

  function rowTemplate(b) {
    return `
      <div class="account-profile__row">
        <div>
          <dt>${esc(b.influencer_name)} &mdash; ${esc(b.service_name)}</dt>
          <dd>${formatDate(b.booking_date)} &middot; ${formatMoney(b.service_price)} &middot; ${statusPill(b.booking_status)}</dd>
        </div>
      </div>`;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;

    const bookings = await window.XploroInfluencerBookings.getBookingsForTraveler();
    if (!bookings.length) return; // stays hidden — nothing to show yet

    section.hidden = false;
    list.innerHTML = `<dl class="account-profile__rows">${bookings.map(rowTemplate).join("")}</dl>`;
  })();
})();
