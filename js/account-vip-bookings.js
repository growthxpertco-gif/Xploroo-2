/* ==========================================================================
   XPLOROO · Account — My VIP Bookings
   account-vip-bookings.js — Renders every VIP Meet & Greet / Vlog booking
   the signed-in customer has made (public.vip_bookings, Supabase-backed,
   via window.XploroVip, see js/vip.js) into the "My VIP Bookings" section
   added to account.html in Phase 22. Entirely independent of js/account.js
   and js/account-bookings.js — only fills its own
   [data-account-vip-bookings]/[data-account-vip-bookings-list] mount
   points. Real-time data only — always re-fetches on page load, so a
   status change made by admin elsewhere is picked up automatically.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/account.js and
   js/vip.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroAuth || !window.XploroVip) return;

  const section = page.querySelector("[data-account-vip-bookings]");
  const list = page.querySelector("[data-account-vip-bookings-list]");
  if (!section || !list) return;

  const esc = window.XploroSecurity.escapeHtml;
  const PACKAGE_LABEL = { meet_greet: "Meet & Greet", vlog: "Vlog Experience" };

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "—";
    }
  }

  // "Pending" booking_status is shown as "Pending Admin Approval" — see
  // js/admin-vip-bookings.js for the full two-track status model comment
  // (payment_status / booking_status run independently until a real
  // payment gateway exists).
  function statusLabel(status) {
    return status === "Pending" ? "Pending Admin Approval" : status;
  }

  function statusPill(status) {
    if (status === "Approved") return `<span class="status-pill status-pill--approved">${esc(status)}</span>`;
    if (status === "Completed") return `<span class="status-pill status-pill--approved">${esc(status)}</span>`;
    if (status === "Rejected" || status === "Cancelled") return `<span class="status-pill status-pill--rejected">${esc(status)}</span>`;
    return `<span class="status-pill status-pill--pending">${esc(statusLabel(status))}</span>`;
  }

  function rowTemplate(b) {
    return `
      <div class="account-profile__row">
        <div>
          <dt>${esc(PACKAGE_LABEL[b.vip_package] || b.vip_package)} &mdash; ${esc(b.booking_type)}</dt>
          <dd>
            ${formatDate(b.travel_date)}
            ${b.destination ? "&middot; " + esc(b.destination) : ""}
            ${b.influencer_name ? "&middot; with " + esc(b.influencer_name) : ""}
            &middot; ${statusPill(b.booking_status)}
            &middot; ${esc(b.payment_status)}
          </dd>
        </div>
      </div>`;
  }

  async function render() {
    const bookings = await window.XploroVip.getMyBookings();
    if (!bookings.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = `<dl class="account-profile__rows">${bookings.map(rowTemplate).join("")}</dl>`;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    render();
  })();
})();
