/* ==========================================================================
   XPLOROO · Influencer dashboard — Upcoming VIP Events tab
   dash-vip.js — Renders every VIP booking assigned to this influencer
   (public.vip_bookings, via window.XploroVip, see js/vip.js) into the
   "Upcoming VIP Events" panel (Phase 22). Read-only here — the influencer
   doesn't approve/reject VIP bookings (that's an admin action, see
   js/admin-vip-bookings.js); this just shows what's coming up.
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js and vip.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroVip) return;

  const mount = page.querySelector('[data-dash-section="vip"]');
  if (!mount) return;

  const esc = window.XploroSecurity.escapeHtml;
  const PACKAGE_LABEL = { meet_greet: "Meet & Greet", vlog: "Vlog Experience" };

  const ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 2Z"/></svg>';

  function emptyState() {
    return `<div class="dash-empty"><span class="dash-empty__icon" aria-hidden="true">${ICON_STAR}</span><p>No VIP bookings assigned to you yet.</p></div>`;
  }

  function formatDate(iso) {
    if (!iso) return "&mdash;";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "&mdash;";
    }
  }

  // See js/admin-vip-bookings.js for the full two-track status model.
  function statusLabel(status) {
    return status === "Pending" ? "Pending Admin Approval" : status;
  }

  function statusPill(status) {
    if (status === "Approved" || status === "Completed") return `<span class="status-pill status-pill--approved">${esc(status)}</span>`;
    if (status === "Rejected" || status === "Cancelled") return `<span class="status-pill status-pill--rejected">${esc(status)}</span>`;
    return `<span class="status-pill status-pill--pending">${esc(statusLabel(status))}</span>`;
  }

  function cardTemplate(b) {
    return `
      <article class="dash-invite-card" data-vip-card="${b.booking_id}">
        <div class="dash-invite-card__head">
          <div>
            <h3 class="dash-invite-card__name">${esc(b.customer_name)}</h3>
            <p class="dash-invite-card__destination">${esc(PACKAGE_LABEL[b.vip_package] || b.vip_package)} &middot; ${esc(b.booking_type)}</p>
          </div>
          ${statusPill(b.booking_status)}
        </div>
        <dl class="dash-invite-card__meta">
          <div><dt>Date</dt><dd>${formatDate(b.travel_date)}</dd></div>
          <div><dt>Destination</dt><dd>${esc(b.destination) || "&mdash;"}</dd></div>
          <div><dt>Guests</dt><dd>${Number(b.guests) || 1}</dd></div>
        </dl>
      </article>`;
  }

  async function render() {
    const bookings = await window.XploroVip.getBookingsForInfluencer();
    // Upcoming = not yet finished/cancelled — matches every other
    // "upcoming" list on the site (only forward-looking states).
    const upcoming = bookings.filter((b) => b.booking_status === "Pending" || b.booking_status === "Approved");

    mount.innerHTML = !upcoming.length ? emptyState() : `<div class="dash-cards">${upcoming.map(cardTemplate).join("")}</div>`;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();

    const tabBtn = page.querySelector('[data-dash-tab="vip"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
