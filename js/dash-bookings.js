/* ==========================================================================
   XPLOROO · Influencer dashboard — Service Bookings tab
   dash-bookings.js — Renders real booking requests (public.influencer_bookings,
   via window.XploroInfluencerBookings, see js/influencer-bookings.js) into
   the "Service Bookings" panel added in Phase 6. Reuses the same card
   markup/classes as the existing Collaboration Invites panel
   (dash-invite-card, dash-cards) for a consistent look — this file only
   fills its own `[data-dash-section="bookings"]` mount point and never
   touches the sidebar/tab-switching mechanics owned by
   js/influencer-dashboard.js, nor the other (demo, localStorage-backed)
   panels owned by js/dash-sections.js.
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js, notifications.js and influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroInfluencerBookings) return;

  const mount = page.querySelector('[data-dash-section="bookings"]');
  if (!mount) return;

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
    if (n == null || n === "") return "&mdash;";
    const num = Number(n) || 0;
    return `&#8377;${num.toLocaleString("en-IN")}`;
  }

  function statusPill(status) {
    if (status === "Accepted") return `<span class="status-pill status-pill--approved">${status}</span>`;
    if (status === "Declined") return `<span class="status-pill status-pill--rejected">${status}</span>`;
    return `<span class="status-pill status-pill--pending">${status}</span>`;
  }

  function cardTemplate(booking) {
    const actionsHtml =
      booking.booking_status === "Pending"
        ? `<div class="dash-invite-card__actions">
             <button class="btn btn--primary btn--pill" type="button" data-booking-accept="${booking.booking_id}">Accept</button>
             <button class="btn btn--danger btn--pill" type="button" data-booking-decline="${booking.booking_id}">Decline</button>
           </div>`
        : "";

    return `
      <article class="dash-invite-card" data-booking-card="${booking.booking_id}">
        <div class="dash-invite-card__head">
          <div>
            <h3 class="dash-invite-card__name">${booking.traveler_name || "Traveler"}</h3>
            <p class="dash-invite-card__destination">${booking.service_name}</p>
          </div>
          ${statusPill(booking.booking_status)}
        </div>
        <dl class="dash-invite-card__meta">
          <div><dt>Date</dt><dd>${formatDate(booking.booking_date)}</dd></div>
          <div><dt>Time</dt><dd>${booking.preferred_time || "&mdash;"}</dd></div>
          <div><dt>Price</dt><dd>${formatMoney(booking.service_price)}</dd></div>
          <div><dt>Duration</dt><dd>${booking.duration || "&mdash;"}</dd></div>
        </dl>
        ${actionsHtml}
      </article>`;
  }

  async function render() {
    const bookings = await window.XploroInfluencerBookings.getBookingsForInfluencer();

    if (!bookings.length) {
      mount.innerHTML = emptyState("No booking requests yet — they&rsquo;ll show up here as travelers book your services.");
      return;
    }

    mount.innerHTML = `<div class="dash-cards">${bookings.map(cardTemplate).join("")}</div>`;

    mount.querySelectorAll("[data-booking-accept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const booking = bookings.find((b) => b.booking_id === btn.dataset.bookingAccept);
        if (booking) await window.XploroInfluencerBookings.accept(booking);
        render();
      });
    });
    mount.querySelectorAll("[data-booking-decline]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const booking = bookings.find((b) => b.booking_id === btn.dataset.bookingDecline);
        if (booking) await window.XploroInfluencerBookings.decline(booking);
        render();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init — independent async approval check (mirrors js/dash-sections.js) */
  /* ------------------------------------------------------------------ */
  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();
  })();
})();
