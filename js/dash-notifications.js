/* ==========================================================================
   XPLOROO · Influencer dashboard — Notifications tab
   dash-notifications.js — Renders a unified feed into the "Notifications"
   panel, newest first, merging two real Supabase sources:
     1. Personal event notifications (public.notifications, via
        window.XploroNotifications — booking created/accepted/declined, KYC,
        withdrawals; see js/influencer-bookings.js).
     2. Admin broadcast announcements (public.admin_announcements +
        public.announcement_reads, via window.XploroAnnouncements — see
        js/announcements.js and the Admin Panel's "📢 Announcements" tab).
   Unread badge on the sidebar link, click-to-mark-read, and a dismiss (×)
   button on announcement cards only — dismissing hides an announcement from
   this influencer's own feed (announcement_reads.is_deleted) without
   touching the original broadcast or any other influencer's copy of it.
   Nothing here is seeded or hardcoded — everything comes from Supabase.
   Vanilla JS, no dependencies. Loaded with `defer`, after notifications.js
   and announcements.js.
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
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

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

  // Normalizes a personal notification row into the same shape as an
  // announcement, so both render through one card template.
  function fromPersonal(n) {
    return {
      id: n.id,
      source: "personal",
      title: TYPE_LABEL[n.type] || n.title,
      message: n.message || "",
      typeLabel: null,
      created_at: n.created_at,
      is_read: !!n.is_read,
    };
  }

  async function loadFeed() {
    const announcementsApi = window.XploroAnnouncements;
    const [personal, announcements] = await Promise.all([
      window.XploroNotifications.getMyNotifications(),
      announcementsApi ? announcementsApi.getMyAnnouncements() : Promise.resolve([]),
    ]);
    const merged = [...personal.map(fromPersonal), ...announcements];
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return merged;
  }

  function cardTemplate(item) {
    const badgeHtml = item.is_read
      ? '<span class="status-pill status-pill--approved">Read</span>'
      : '<span class="status-pill status-pill--pending">Unread</span>';
    const typeHtml = item.typeLabel ? `<span class="status-pill status-pill--info">${item.typeLabel}</span>` : "";
    const dismissHtml =
      item.source === "announcement"
        ? `<button class="dash-notif-card__dismiss" type="button" data-notif-dismiss="${item.id}" aria-label="Dismiss announcement">${ICON_CLOSE}</button>`
        : "";

    return `
      <article class="dash-notif-card ${item.is_read ? "" : "dash-notif-card--unread"}" data-notif-card="${item.id}" data-notif-source="${item.source}">
        <div class="dash-notif-card__body">
          <h3 class="dash-notif-card__title">${!item.is_read ? '<span class="dash-notif-card__dot" aria-hidden="true"></span>' : ""}${item.title}</h3>
          <p class="dash-notif-card__message">${item.message}</p>
          <p class="dash-notif-card__date">
            ${new Date(item.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            ${typeHtml} ${badgeHtml}
          </p>
        </div>
        ${dismissHtml}
      </article>`;
  }

  async function render() {
    const items = await loadFeed();

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
        ${items.map((item) => cardTemplate(item)).join("")}
      </div>`;

    mount.querySelectorAll("[data-notif-card]").forEach((card) => {
      card.addEventListener("click", async (e) => {
        if (e.target.closest("[data-notif-dismiss]")) return; // handled separately below
        const item = items.find((n) => n.id === card.dataset.notifCard && n.source === card.dataset.notifSource);
        if (!item || item.is_read) return;
        if (item.source === "announcement") {
          if (window.XploroAnnouncements) await window.XploroAnnouncements.markRead(item.id);
        } else {
          await window.XploroNotifications.markRead(item.id);
        }
        render();
      });
    });

    mount.querySelectorAll("[data-notif-dismiss]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!window.XploroAnnouncements) return;
        btn.disabled = true;
        await window.XploroAnnouncements.dismiss(btn.dataset.notifDismiss);
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
