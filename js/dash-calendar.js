/* ==========================================================================
   XPLOROO · Influencer dashboard — Calendar tab
   dash-calendar.js — Renders a real monthly calendar into the "Calendar"
   panel, marking every date that has an Accepted booking (public.
   influencer_bookings, via window.XploroInfluencerBookings, see
   js/influencer-bookings.js). Clicking a marked date shows that day's
   Service Name / Traveler Name / Time / Status. No placeholder data —
   month navigation re-renders from the same live booking list already
   fetched once per view.
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroInfluencerBookings) return;

  const mount = page.querySelector('[data-dash-section="calendar"]');
  if (!mount) return;

  const esc = window.XploroSecurity.escapeHtml;

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  let viewDate = new Date();
  let bookingsByDate = new Map();

  function statusPill(status) {
    // Phase 22 — also covers VIP booking statuses (Approved/Rejected/
    // Completed/Cancelled) now merged into this same calendar; same visual
    // treatment as the existing Accepted/Declined/Pending values.
    if (status === "Accepted" || status === "Approved" || status === "Completed") return `<span class="status-pill status-pill--approved">${esc(status)}</span>`;
    if (status === "Declined" || status === "Rejected" || status === "Cancelled") return `<span class="status-pill status-pill--rejected">${esc(status)}</span>`;
    return `<span class="status-pill status-pill--pending">${esc(status)}</span>`;
  }

  function renderDetails(container, dateKey) {
    const items = bookingsByDate.get(dateKey) || [];
    if (!items.length) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }
    container.hidden = false;
    container.innerHTML = `
      <h3 class="dash-section-title">${new Date(dateKey).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3>
      <div class="dash-cards">
        ${items
          .map(
            (b) => `
          <article class="dash-cal-card">
            <div class="dash-cal-card__date">
              <span class="dash-cal-card__date-day">${new Date(dateKey).getDate()}</span>
              <span class="dash-cal-card__date-month">${new Date(dateKey).toLocaleDateString(undefined, { month: "short" })}</span>
            </div>
            <div>
              <h3 class="dash-cal-card__title">${esc(b.service_name)}</h3>
              <p class="dash-cal-card__desc">${esc(b.traveler_name) || "Traveler"} &middot; ${esc(b.preferred_time) || "Time TBD"}</p>
              <span class="dash-cal-card__type">${statusPill(b.booking_status)}</span>
            </div>
          </article>`
          )
          .join("")}
      </div>`;
  }

  function renderMonth() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const todayKey = toDateKey(new Date());

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push("<span class=\"dash-cal__day dash-cal__day--empty\"></span>");
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKey(new Date(year, month, day));
      const hasBooking = bookingsByDate.has(dateKey);
      const isToday = dateKey === todayKey;
      cells.push(`
        <button type="button" class="dash-cal__day${hasBooking ? " dash-cal__day--marked" : ""}${isToday ? " dash-cal__day--today" : ""}" data-cal-date="${dateKey}">
          ${day}${hasBooking ? '<span class="dash-cal__dot" aria-hidden="true"></span>' : ""}
        </button>`);
    }

    mount.innerHTML = `
      <div class="dash-cal">
        <div class="dash-cal__head">
          <button class="btn btn--glass btn--pill" type="button" data-cal-prev aria-label="Previous month">&larr;</button>
          <h3 class="dash-section-title" style="margin:0">${firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
          <button class="btn btn--glass btn--pill" type="button" data-cal-next aria-label="Next month">&rarr;</button>
        </div>
        <div class="dash-cal__weekdays">${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="dash-cal__grid">${cells.join("")}</div>
      </div>
      <div class="dash-cal__details" data-cal-details hidden></div>`;

    const detailsEl = mount.querySelector("[data-cal-details]");
    mount.querySelector("[data-cal-prev]").addEventListener("click", () => {
      viewDate = new Date(year, month - 1, 1);
      renderMonth();
    });
    mount.querySelector("[data-cal-next]").addEventListener("click", () => {
      viewDate = new Date(year, month + 1, 1);
      renderMonth();
    });
    mount.querySelectorAll("[data-cal-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mount.querySelectorAll("[data-cal-date]").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        renderDetails(detailsEl, btn.dataset.calDate);
      });
    });
  }

  async function render() {
    // Phase 22 — the calendar now also marks Approved VIP bookings assigned
    // to this influencer, fetched alongside the existing service bookings
    // (independent queries, run in parallel — no new sequential round trip).
    const [bookings, vipBookings] = await Promise.all([
      window.XploroInfluencerBookings.getBookingsForInfluencer(),
      window.XploroVip ? window.XploroVip.getBookingsForInfluencer() : Promise.resolve([]),
    ]);

    bookingsByDate = new Map();
    bookings
      .filter((b) => b.booking_status === "Accepted" && b.booking_date)
      .forEach((b) => {
        const key = b.booking_date;
        if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
        bookingsByDate.get(key).push(b);
      });

    vipBookings
      .filter((b) => b.booking_status === "Approved" && b.travel_date)
      .forEach((b) => {
        const key = b.travel_date;
        const normalized = {
          service_name: `VIP ${b.vip_package === "vlog" ? "Vlog Experience" : "Meet & Greet"} — ${b.booking_type}`,
          traveler_name: b.customer_name,
          preferred_time: "",
          booking_status: b.booking_status,
        };
        if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
        bookingsByDate.get(key).push(normalized);
      });

    renderMonth();
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();

    // Bookings can be accepted from the "Service Bookings" tab in the same
    // session — re-render with fresh data every time the influencer opens
    // the Calendar tab, rather than only once at page load.
    const tabBtn = page.querySelector('[data-dash-tab="calendar"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
