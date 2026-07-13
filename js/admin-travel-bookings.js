/* ==========================================================================
   XPLOROO · Admin — Travel Bookings
   admin-travel-bookings.js — Renders every travel package booking
   (public.travel_bookings, Supabase-backed, via
   window.XploroTravelBookings, see js/travel-bookings.js) into the
   "Travel Bookings" tab of admin-influencer-applications.html. Monitor
   only, mirrors js/admin-bookings.js's exact pattern for the Influencer
   Bookings tab so both admin booking views look and behave identically.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js and
   travel-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-travel-bookings-root]");
  if (!root || !window.XploroTravelBookings) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

  const esc = window.XploroSecurity.escapeHtml;

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_INBOX}</span>
        <p>No travel bookings yet.</p>
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

  function statusPill(status) {
    const cls =
      status === "Confirmed" || status === "Completed" || status === "Paid"
        ? "approved"
        : status === "Cancelled" || status === "Failed"
        ? "rejected"
        : status === "Refunded"
        ? "info"
        : "pending";
    return `<span class="status-pill status-pill--${cls}">${status}</span>`;
  }

  function cardTemplate(b) {
    const canRefund = b.payment_status === "Paid";
    return `
      <article class="admin-card" data-admin-travel-booking-card="${b.booking_id}">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(b.package_name)}</h2>
            ${statusPill(b.booking_status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Booking ID</dt><dd>${esc(b.booking_id.slice(0, 8))}</dd></div>
            <div><dt>Traveler</dt><dd>${esc(b.traveler_full_name) || "&mdash;"}</dd></div>
            <div><dt>Destination</dt><dd>${esc(b.destination) || "&mdash;"}</dd></div>
            <div><dt>Travel Date</dt><dd>${formatDate(b.travel_date)}</dd></div>
            <div><dt>Travelers</dt><dd>${b.travellers}</dd></div>
            <div><dt>Total Amount</dt><dd>${formatMoney(b.total_amount)}</dd></div>
            <div><dt>Payment Status</dt><dd>${statusPill(b.payment_status)}</dd></div>
          </dl>

          ${
            canRefund
              ? `<div class="admin-card__actions">
                   <button class="btn btn--danger btn--pill" type="button" data-admin-refund="${b.booking_id}">Mark Refunded</button>
                 </div>`
              : ""
          }
        </div>
      </article>`;
  }

  async function render() {
    // Phase 20 — security: travel_bookings (traveler full name/email/phone)
    // is no longer publicly readable via RLS — reads now go through
    // admin-api (service role).
    const { ok, data: body } = await window.XploroAdminAuth.callAdminApi("get-all-travel-bookings", {});
    const bookings = (ok && body && body.data) || [];
    if (!bookings.length) {
      renderEmpty();
      return;
    }
    root.innerHTML = `<div class="admin-list">${bookings.map(cardTemplate).join("")}</div>`;

    // Refunding also reverses any referral commission tied to this booking
    // (see js/travel-bookings.js's markRefunded()) — never leaves a live
    // commission behind on a refunded booking.
    root.querySelectorAll("[data-admin-refund]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await window.XploroAdminAuth.callAdminApi("refund-travel-booking", { bookingId: btn.dataset.adminRefund });
        render();
      });
    });
  }

  render();
})();
