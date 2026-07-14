/* ==========================================================================
   XPLOROO · Admin — VIP Bookings
   admin-vip-bookings.js — Renders every VIP Meet & Greet / Vlog booking
   (public.vip_bookings) into the "⭐ VIP Bookings" tab of
   admin-influencer-applications.html. Reads and every status action
   (Approve / Reject / Completed / Cancelled) go through the admin-api
   Edge Function (service role) — vip_bookings has no public SELECT/UPDATE
   policy at all, matching every other sensitive table since the Phase 20
   security audit.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-auth.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-vip-bookings-root]");
  if (!root || !window.XploroAdminAuth) return;

  const esc = window.XploroSecurity.escapeHtml;
  const PACKAGE_LABEL = { meet_greet: "Meet & Greet", vlog: "Vlog Experience" };

  const ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 2Z"/></svg>';

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_STAR}</span>
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

  // Two-track status model: payment_status (frozen at "Pending Payment"
  // until a real gateway is wired up) and booking_status (this pill) —
  // "Pending" here is the display label "Pending Admin Approval" per the
  // intended full sequence: Pending Payment -> Payment Successful ->
  // Pending Admin Approval -> Approved -> Completed. Once payment exists,
  // reaching this state will require Payment Successful first; today it's
  // the starting state so admin approval can still be tested/used.
  function statusLabel(status) {
    return status === "Pending" ? "Pending Admin Approval" : status;
  }

  function statusPill(status) {
    const cls =
      status === "Approved" || status === "Completed"
        ? "approved"
        : status === "Rejected" || status === "Cancelled"
        ? "rejected"
        : "pending";
    return `<span class="status-pill status-pill--${cls}">${esc(statusLabel(status))}</span>`;
  }

  function actionsHtml(b) {
    if (b.booking_status === "Pending") {
      return `
        <div class="admin-card__actions">
          <button class="btn btn--primary btn--pill" type="button" data-vip-approve="${b.booking_id}">Approve</button>
          <button class="btn btn--danger btn--pill" type="button" data-vip-reject="${b.booking_id}">Reject</button>
          <button class="btn btn--outline btn--sm" type="button" data-vip-cancel="${b.booking_id}">Cancel</button>
        </div>`;
    }
    if (b.booking_status === "Approved") {
      return `
        <div class="admin-card__actions">
          <button class="btn btn--primary btn--pill" type="button" data-vip-complete="${b.booking_id}">Mark Completed</button>
          <button class="btn btn--outline btn--sm" type="button" data-vip-cancel="${b.booking_id}">Cancel</button>
        </div>`;
    }
    return "";
  }

  function cardTemplate(b) {
    return `
      <article class="admin-card" data-admin-vip-card="${b.booking_id}">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(b.customer_name)} &mdash; ${esc(PACKAGE_LABEL[b.vip_package] || b.vip_package)}</h2>
            ${statusPill(b.booking_status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Booking ID</dt><dd>${esc(String(b.booking_id).slice(0, 8))}</dd></div>
            <div><dt>Customer</dt><dd>${esc(b.customer_name)} &middot; ${esc(b.customer_email)}</dd></div>
            <div><dt>Influencer</dt><dd>${esc(b.influencer_name) || "&mdash;"}</dd></div>
            <div><dt>VIP Package</dt><dd>${esc(PACKAGE_LABEL[b.vip_package] || b.vip_package)}</dd></div>
            <div><dt>Booking Type</dt><dd>${esc(b.booking_type)}</dd></div>
            <div><dt>Travel Date</dt><dd>${formatDate(b.travel_date)}</dd></div>
            <div><dt>Guests</dt><dd>${Number(b.guests) || 1}</dd></div>
            <div><dt>Destination</dt><dd>${esc(b.destination) || "&mdash;"}</dd></div>
            <div><dt>Payment Status</dt><dd>${esc(b.payment_status)}</dd></div>
            <div><dt>Created</dt><dd>${formatDate(b.created_at)}</dd></div>
          </dl>

          ${b.special_request ? `<p style="margin-top:var(--space-4);font-size:var(--fs-sm);color:var(--color-text-muted)">${esc(b.special_request)}</p>` : ""}

          ${actionsHtml(b)}
        </div>
      </article>`;
  }

  async function render() {
    const { ok, data: body } = await window.XploroAdminAuth.callAdminApi("get-all-vip-bookings", {});
    const bookings = (ok && body && body.data) || [];
    if (!bookings.length) {
      renderEmpty();
      return;
    }

    root.innerHTML = `<div class="admin-list">${bookings.map(cardTemplate).join("")}</div>`;

    root.querySelectorAll("[data-vip-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("approve-vip-booking", { bookingId: btn.dataset.vipApprove });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to approve this booking.");
          return;
        }
        render();
      });
    });

    root.querySelectorAll("[data-vip-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const reason = window.prompt("Reason for rejection (optional):") || "";
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("reject-vip-booking", { bookingId: btn.dataset.vipReject, reason });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to reject this booking.");
          return;
        }
        render();
      });
    });

    root.querySelectorAll("[data-vip-complete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("complete-vip-booking", { bookingId: btn.dataset.vipComplete });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to mark this booking completed.");
          return;
        }
        render();
      });
    });

    root.querySelectorAll("[data-vip-cancel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const reason = window.prompt("Reason for cancellation (optional):") || "";
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("cancel-vip-booking", { bookingId: btn.dataset.vipCancel, reason });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to cancel this booking.");
          return;
        }
        render();
      });
    });
  }

  render();

  const tabBtn = document.querySelector('[data-admin-tab="vip-bookings"]');
  if (tabBtn) tabBtn.addEventListener("click", render);
})();
