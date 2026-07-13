/* ==========================================================================
   XPLOROO · Influencer dashboard — Earnings tab
   dash-earnings.js — Renders real earnings (public.earnings, via
   window.XploroEarnings, see js/earnings.js) into the "Earnings" panel.
   Every number here is computed live from the earnings table — nothing is
   hardcoded or stored separately. Reuses the same dash-stat-grid/dash-table
   classes the old placeholder version used (styles/dash-sections.css).
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js and earnings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroEarnings) return;

  const mount = page.querySelector('[data-dash-section="earnings"]');
  if (!mount) return;

  const esc = window.XploroSecurity.escapeHtml;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>';

  function emptyState(message) {
    return `<div class="dash-empty"><span class="dash-empty__icon" aria-hidden="true">${ICON_INBOX}</span><p>${message}</p></div>`;
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
    return `&#8377;${(Number(n) || 0).toLocaleString("en-IN")}`;
  }

  function statusPill(status) {
    if (status === "Paid") return '<span class="status-pill status-pill--approved">Paid</span>';
    if (status === "Cancelled") return '<span class="status-pill status-pill--rejected">Cancelled</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  async function render() {
    const earnings = await window.XploroEarnings.getMyEarnings();
    const summary = window.XploroEarnings.summarize(earnings);
    const available = window.XploroWithdrawals ? await window.XploroWithdrawals.getAvailableBalance() : summary.paid;

    const summaryHtml = `
      <div class="dash-stat-grid">
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(summary.total)}</p><p class="dash-stat-card__label">Total Earnings</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(summary.pending)}</p><p class="dash-stat-card__label">Pending Earnings</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(summary.paid)}</p><p class="dash-stat-card__label">Paid Earnings</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0-4-4m4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(available)}</p><p class="dash-stat-card__label">Available Balance</p></div>
        </div>
      </div>`;

    const tableHtml = !earnings.length
      ? emptyState("No earnings yet — they&rsquo;ll appear here as soon as a traveler books one of your services.")
      : `
      <h3 class="dash-section-title">Transaction History</h3>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Traveler</th><th>Service</th><th>Booking Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${earnings
              .map(
                (e) => `
              <tr>
                <td>${esc(e.traveler_name) || "&mdash;"}</td>
                <td>${esc(e.service_name)}</td>
                <td>${formatDate(e.booking_date)}</td>
                <td>${formatMoney(e.amount)}</td>
                <td>${statusPill(e.status)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

    mount.innerHTML = summaryHtml + tableHtml;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();

    // Earnings can change from the "Service Bookings" tab (accept/decline)
    // in the same session — re-render with fresh data every time the
    // influencer opens the Earnings tab.
    const tabBtn = page.querySelector('[data-dash-tab="earnings"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
