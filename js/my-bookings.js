/* ==========================================================================
   XPLOROO · My Bookings page
   my-bookings.js — Drives my-bookings.html: gates the page behind a
   Supabase session, then renders two tabs of real data —
   public.travel_bookings (window.XploroTravelBookings, see
   js/travel-bookings.js) and public.influencer_bookings
   (window.XploroInfluencerBookings.getBookingsForTraveler(), see
   js/influencer-bookings.js, already built in Phase 6) — both already
   filtered server-side to the signed-in traveler by RLS + the `.eq(
   "traveler_user_id", user.id)` filter each module applies. Every booking
   shown here was created as part of the booking confirmation workflow
   itself (js/payment.js for travel, js/booking.js + js/influencer-
   bookings.js for influencer services), so a paid/confirmed booking can
   never be missing from this page.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/travel-bookings.js and js/influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-mybookings-page]");
  if (!page || !window.XploroAuth) return;

  const gate = page.querySelector("[data-mb-gate]");
  const content = page.querySelector("[data-mb-content]");
  const esc = window.XploroSecurity.escapeHtml;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>';

  function formatDate(value) {
    if (!value) return "&mdash;";
    try {
      return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function formatDateTime(value) {
    if (!value) return "&mdash;";
    try {
      return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function formatMoney(n) {
    return `&#8377;${(Number(n) || 0).toLocaleString("en-IN")}`;
  }

  function statusPill(status, map) {
    const variant = map[status] || "pending";
    return `<span class="status-pill status-pill--${variant}">${status}</span>`;
  }

  const BOOKING_STATUS_MAP = { Pending: "pending", Confirmed: "approved", Completed: "approved", Cancelled: "rejected", Refunded: "info" };
  const PAYMENT_STATUS_MAP = { Pending: "pending", Paid: "approved", Failed: "rejected", Refunded: "info", Accepted: "approved", Declined: "rejected" };

  function emptyState(message) {
    return `<div class="mb-empty"><span class="mb-empty__icon" aria-hidden="true">${ICON_INBOX}</span><p>${message}</p></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Travel Package Bookings                                              */
  /* ------------------------------------------------------------------ */
  function travelCardTemplate(b) {
    const shortId = String(b.booking_id).slice(0, 8).toUpperCase();
    const canReview = b.booking_status === "Completed";
    const mediaHtml = b.package_image
      ? `<img class="mb-card__img" src="${window.XploroSecurity.sanitizeUrl(b.package_image, { allowData: true })}" alt="" />`
      : `<div class="mb-card__img mb-card__img--placeholder" aria-hidden="true">${ICON_INBOX}</div>`;

    return `
      <article class="mb-card" data-mb-card>
        <div class="mb-card__media">${mediaHtml}</div>
        <div class="mb-card__body">
          <div class="mb-card__head">
            <h3 class="mb-card__title">${esc(b.package_name)}</h3>
            <div class="mb-card__pills">
              ${statusPill(b.booking_status, BOOKING_STATUS_MAP)}
              ${statusPill(b.payment_status, PAYMENT_STATUS_MAP)}
            </div>
          </div>
          <dl class="mb-card__meta">
            <div><dt>Travel Date</dt><dd>${formatDate(b.travel_date)}</dd></div>
            <div><dt>Booking ID</dt><dd>${shortId}</dd></div>
            <div><dt>Travelers</dt><dd>${b.travellers}</dd></div>
            <div><dt>Total Amount</dt><dd>${formatMoney(b.total_amount)}</dd></div>
            <div><dt>Booked On</dt><dd>${formatDateTime(b.created_at)}</dd></div>
          </dl>
          <div class="mb-card__actions">
            <button class="btn btn--glass btn--pill" type="button" data-mb-toggle>View Details</button>
            <button class="btn btn--outline btn--sm" type="button" disabled title="Coming soon">Download Invoice</button>
            ${canReview ? '<button class="btn btn--outline btn--sm" type="button" disabled title="Coming soon">Leave Review</button>' : ""}
          </div>
          <div class="mb-card__details" data-mb-details hidden>
            <dl class="mb-card__meta">
              <div><dt>Destination</dt><dd>${esc(b.destination) || "&mdash;"}</dd></div>
              <div><dt>Duration</dt><dd>${esc(b.duration) || "&mdash;"}</dd></div>
              <div><dt>Traveler</dt><dd>${esc(b.traveler_full_name) || "&mdash;"}</dd></div>
              <div><dt>Contact</dt><dd>${esc(b.traveler_email) || "&mdash;"} ${b.traveler_phone ? "&middot; " + esc(b.traveler_phone) : ""}</dd></div>
              ${b.coupon_code ? `<div><dt>Coupon</dt><dd>${esc(b.coupon_code)}</dd></div>` : ""}
              ${b.special_requests ? `<div><dt>Special Requests</dt><dd>${esc(b.special_requests)}</dd></div>` : ""}
            </dl>
          </div>
        </div>
      </article>`;
  }

  async function renderTravelBookings() {
    const mount = page.querySelector("[data-mb-travel-list]");
    if (!mount || !window.XploroTravelBookings) return;

    const bookings = await window.XploroTravelBookings.getMyBookings();
    mount.innerHTML = !bookings.length
      ? emptyState("No travel package bookings yet &mdash; browse our packages to plan your next trip.")
      : `<div class="mb-cards">${bookings.map(travelCardTemplate).join("")}</div>`;

    wireDetailToggles(mount);
  }

  /* ------------------------------------------------------------------ */
  /* Influencer Service Bookings                                          */
  /* ------------------------------------------------------------------ */
  function influencerCardTemplate(b) {
    const avatarHtml = b.influencer_avatar_url
      ? `<img class="mb-card__avatar" src="${window.XploroSecurity.sanitizeUrl(b.influencer_avatar_url, { allowData: true })}" alt="" />`
      : `<div class="mb-card__avatar mb-card__avatar--placeholder" aria-hidden="true">${esc((b.influencer_name || "?").trim().charAt(0).toUpperCase())}</div>`;

    return `
      <article class="mb-card mb-card--influencer" data-mb-card>
        <div class="mb-card__body">
          <div class="mb-card__head">
            <div class="mb-card__influencer">
              ${avatarHtml}
              <div>
                <h3 class="mb-card__title">${esc(b.influencer_name)}</h3>
                <p class="mb-card__subtitle">${esc(b.service_name)}</p>
              </div>
            </div>
            <div class="mb-card__pills">
              ${statusPill(b.booking_status, BOOKING_STATUS_MAP)}
              ${statusPill(b.payment_status, PAYMENT_STATUS_MAP)}
            </div>
          </div>
          <dl class="mb-card__meta">
            <div><dt>Date</dt><dd>${formatDate(b.booking_date)}</dd></div>
            <div><dt>Time</dt><dd>${esc(b.preferred_time) || "&mdash;"}</dd></div>
            <div><dt>Amount</dt><dd>${formatMoney(b.service_price)}</dd></div>
            <div><dt>Duration</dt><dd>${esc(b.duration) || "&mdash;"}</dd></div>
          </dl>
          <div class="mb-card__actions">
            <button class="btn btn--glass btn--pill" type="button" data-mb-toggle>View Details</button>
          </div>
          <div class="mb-card__details" data-mb-details hidden>
            <dl class="mb-card__meta">
              <div><dt>Booked On</dt><dd>${formatDateTime(b.created_at)}</dd></div>
              ${b.notes ? `<div><dt>Notes</dt><dd>${esc(b.notes)}</dd></div>` : ""}
            </dl>
          </div>
        </div>
      </article>`;
  }

  async function renderInfluencerBookings() {
    const mount = page.querySelector("[data-mb-influencer-list]");
    if (!mount || !window.XploroInfluencerBookings) return;

    const bookings = await window.XploroInfluencerBookings.getBookingsForTraveler();
    if (!bookings.length) {
      mount.innerHTML = emptyState("No influencer service bookings yet &mdash; check out our creators to book an experience.");
      return;
    }

    // Single source of truth for avatars: public.profiles.avatar_url (see
    // js/supabase.js) — batch-fetched here rather than duplicated onto
    // influencer_bookings, same pattern used across the whole site.
    const avatars = window.XploroAuth.getAvatarsByUserIds
      ? await window.XploroAuth.getAvatarsByUserIds(bookings.map((b) => b.influencer_user_id))
      : new Map();
    const withAvatars = bookings.map((b) => ({ ...b, influencer_avatar_url: avatars.get(b.influencer_user_id) || null }));

    mount.innerHTML = `<div class="mb-cards">${withAvatars.map(influencerCardTemplate).join("")}</div>`;
    wireDetailToggles(mount);
  }

  function wireDetailToggles(mount) {
    mount.querySelectorAll("[data-mb-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const details = btn.closest("[data-mb-card]").querySelector("[data-mb-details]");
        if (!details) return;
        details.hidden = !details.hidden;
        btn.textContent = details.hidden ? "View Details" : "Hide Details";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tabs                                                                  */
  /* ------------------------------------------------------------------ */
  function initTabs() {
    const tabs = Array.from(page.querySelectorAll("[data-mb-tab]"));
    const panels = Array.from(page.querySelectorAll("[data-mb-panel]"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
        panels.forEach((p) => p.classList.toggle("is-active", p.dataset.mbPanel === tab.dataset.mbTab));
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init — requires a Supabase session; every query below is always      */
  /* re-run fresh on page load, so a status change made anywhere else     */
  /* (accepted/declined by an influencer, admin update, etc.) is picked   */
  /* up automatically the next time this page is opened or refreshed.     */
  /* ------------------------------------------------------------------ */
  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) {
      gate.hidden = false;
      content.hidden = true;
      return;
    }

    gate.hidden = true;
    content.hidden = false;

    initTabs();
    await Promise.all([renderTravelBookings(), renderInfluencerBookings()]);
  })();
})();
