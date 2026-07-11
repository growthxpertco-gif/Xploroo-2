/* ==========================================================================
   XPLOROO · Influencer dashboard — Notifications tab
   dash-notifications.js — Renders real notifications (public.notifications,
   via window.XploroNotifications, see js/notifications.js) into the
   "Notifications" panel, newest first, with an unread badge on the sidebar
   link and click-to-mark-read. Every notification already comes from a real
   event (booking created/accepted/declined — see
   js/influencer-bookings.js) — nothing here is seeded or hardcoded.
   Vanilla JS, no dependencies. Loaded with `defer`, after notifications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroNotifications) return;

  const mount = page.querySelector('[data-dash-section="notifications"]');
  const badge = page.querySelector("[data-notif-badge]");
  if (!mount) return;

  const ICON_BELL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

  function emptyState() {
    return `<div class="dash-empty"><span class="dash-empty__icon" aria-hidden="true">${ICON_BELL}</span><p>No notifications yet.</p></div>`;
  }

  const TYPE_LABEL = {
    booking_created: "New Booking Received",
    booking_accepted: "Booking Accepted",
    booking_declined: "Booking Declined",
    withdrawal_submitted: "Withdrawal Submitted",
    withdrawal_approved: "Withdrawal Approved",
    withdrawal_rejected: "Withdrawal Rejected",
    kyc_approved: "KYC Approved",
    kyc_rejected: "KYC Rejected",
  };

  async function render() {
    const items = await window.XploroNotifications.getMyNotifications();

    const unreadCount = items.filter((n) => !n.is_read).length;
    if (badge) {
      badge.hidden = unreadCount === 0;
      badge.textContent = String(unreadCount);
    }

    if (!items.length) {
      mount.innerHTML = emptyState();
      return;
    }

    mount.innerHTML = `
      ${unreadCount ? `<span class="status-pill status-pill--info" style="margin-bottom:var(--space-4);display:inline-flex">${unreadCount} Unread</span>` : ""}
      <div class="dash-cards">
        ${items
          .map(
            (n) => `
          <article class="dash-notif-card ${n.is_read ? "" : "dash-notif-card--unread"}" data-notif-card="${n.id}">
            <div class="dash-notif-card__body">
              <h3 class="dash-notif-card__title">${!n.is_read ? '<span class="dash-notif-card__dot" aria-hidden="true"></span>' : ""}${TYPE_LABEL[n.type] || n.title}</h3>
              <p class="dash-notif-card__message">${n.message || ""}</p>
              <p class="dash-notif-card__date">${new Date(n.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </article>`
          )
          .join("")}
      </div>`;

    mount.querySelectorAll("[data-notif-card]").forEach((card) => {
      card.addEventListener("click", async () => {
        const item = items.find((n) => n.id === card.dataset.notifCard);
        if (!item || item.is_read) return;
        await window.XploroNotifications.markRead(item.id);
        render();
      });
    });
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();

    const tabBtn = page.querySelector('[data-dash-tab="notifications"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
