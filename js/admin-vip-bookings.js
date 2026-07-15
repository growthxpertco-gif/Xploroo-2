/* ==========================================================================
   XPLOROO · Admin — VIP Bookings (Phase 32)
   admin-vip-bookings.js — Renders every VIP booking request
   (public.vip_booking_requests, Supabase-backed, read server-side via the
   admin-api Edge Function's "get-all-vip-bookings" action — the same
   service_role pattern already used for travel_bookings/withdrawals) into
   the "VIP Bookings" tab of admin-influencer-applications.html. Monitor
   only, mirrors js/admin-travel-bookings.js's exact pattern. Completely
   independent of every other admin tab on this page.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js and
   admin-auth.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-vip-bookings-root]");
  if (!root || !window.XploroAdminAuth) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

  const esc = window.XploroSecurity.escapeHtml;

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_INBOX}</span>
        <p>No VIP bookings yet.</p>
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

  function statusPill(status) {
    const cls = status === "Confirmed" ? "approved" : status === "Cancelled" ? "rejected" : "pending";
    return `<span class="status-pill status-pill--${cls}">${esc(status || "Pending Review")}</span>`;
  }

  function cardTemplate(b) {
    return `
      <article class="admin-card" data-admin-vip-booking-card="${esc(b.id)}">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(b.vip_personality)}</h2>
            ${statusPill(b.status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Booking ID</dt><dd>${esc(String(b.id).slice(0, 8))}</dd></div>
            <div><dt>Customer Name</dt><dd>${esc(b.full_name) || "&mdash;"}</dd></div>
            <div><dt>Phone</dt><dd>${esc(b.mobile_number) || "&mdash;"}</dd></div>
            <div><dt>Email</dt><dd>${esc(b.email_address) || "&mdash;"}</dd></div>
            <div><dt>VIP Personality</dt><dd>${esc(b.vip_personality) || "&mdash;"}</dd></div>
            <div><dt>Travellers</dt><dd>${esc(b.travellers)}</dd></div>
            <div><dt>Occasion</dt><dd>${esc(b.occasion) || "&mdash;"}</dd></div>
            <div><dt>Date</dt><dd>${formatDate(b.preferred_date)}</dd></div>
            <div><dt>Created Date</dt><dd>${formatDate(b.created_at)}</dd></div>
          </dl>

          ${b.special_requirements ? `<p class="admin-card__note">${esc(b.special_requirements)}</p>` : ""}
        </div>
      </article>`;
  }

  async function render() {
    // Phase 20 pattern — vip_booking_requests (customer name/email/phone)
    // is only readable by its own owner via RLS; admin reads go through
    // admin-api (service role).
    const { ok, data: body } = await window.XploroAdminAuth.callAdminApi("get-all-vip-bookings", {});
    const bookings = (ok && body && body.data) || [];
    if (!bookings.length) {
      renderEmpty();
      return;
    }
    root.innerHTML = `<div class="admin-list">${bookings.map(cardTemplate).join("")}</div>`;
  }

  render();
})();
