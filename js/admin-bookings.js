/* ==========================================================================
   XPLOROO · Admin — Influencer Bookings
   admin-bookings.js — Renders every influencer service booking
   (public.influencer_bookings, Supabase-backed, via
   window.XploroInfluencerBookings, see js/influencer-bookings.js) into the
   "Influencer Bookings" tab of admin-influencer-applications.html. Monitor
   only — no Accept/Decline or service-detail editing here (that belongs to
   the influencer, see js/dash-bookings.js); this tab only reads.
   Reuses the same .admin-list/.admin-card classes as the existing
   Influencer Applications tab (js/admin.js) for a consistent look.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js and
   influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-bookings-root]");
  if (!root || !window.XploroInfluencerBookings) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_INBOX}</span>
        <p>No influencer bookings yet.</p>
      </div>`;
  }

  function formatDate(iso) {
    if (!iso) return "&mdash;";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function formatMoney(n) {
    if (n == null || n === "") return "&mdash;";
    return `&#8377;${(Number(n) || 0).toLocaleString("en-IN")}`;
  }

  function statusPill(status, kind) {
    const cls =
      status === "Accepted" || status === "Paid" ? "approved" : status === "Declined" || status === "Failed" ? "rejected" : "pending";
    return `<span class="status-pill status-pill--${cls}">${status}</span>`;
  }

  function cardTemplate(b) {
    return `
      <article class="admin-card" data-admin-booking-card="${b.booking_id}">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${b.influencer_name} &mdash; ${b.service_name}</h2>
            ${statusPill(b.booking_status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Booking ID</dt><dd>${b.booking_id.slice(0, 8)}</dd></div>
            <div><dt>Traveler</dt><dd>${b.traveler_name || "&mdash;"}</dd></div>
            <div><dt>Price</dt><dd>${formatMoney(b.service_price)}</dd></div>
            <div><dt>Booking Date</dt><dd>${formatDate(b.booking_date)}</dd></div>
          </dl>
        </div>
      </article>`;
  }

  async function render() {
    const bookings = await window.XploroInfluencerBookings.getAllBookings();
    if (!bookings.length) {
      renderEmpty();
      return;
    }
    root.innerHTML = `<div class="admin-list">${bookings.map(cardTemplate).join("")}</div>`;
  }

  render();
})();
