/* ==========================================================================
   XPLOROO · Admin — Support Tickets
   admin-support-tickets.js — Renders every support ticket
   (public.support_tickets, via window.XploroSupportTickets, see
   js/support-tickets.js) into the "Support Tickets" tab of
   admin-influencer-applications.html. Admin can reply and move a ticket
   between Open / In Progress / Resolved. Reuses the same .admin-list/
   .admin-card classes as the other admin tabs for a consistent look.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js and
   support-tickets.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-tickets-root]");
  if (!root || !window.XploroSupportTickets) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

  const esc = window.XploroSecurity.escapeHtml;

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_INBOX}</span>
        <p>No support tickets yet.</p>
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
    if (status === "Resolved") return '<span class="status-pill status-pill--approved">Resolved</span>';
    if (status === "In Progress") return '<span class="status-pill status-pill--info">In Progress</span>';
    return '<span class="status-pill status-pill--pending">Open</span>';
  }

  function cardTemplate(t) {
    return `
      <article class="admin-card" data-admin-ticket-card="${t.id}">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(t.subject)}</h2>
            ${statusPill(t.status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Ticket ID</dt><dd>${esc(t.id.slice(0, 8))}</dd></div>
            <div><dt>Influencer</dt><dd>${esc(t.full_name) || "&mdash;"}</dd></div>
            <div><dt>Email</dt><dd>${esc(t.email) || "&mdash;"}</dd></div>
            <div><dt>Phone</dt><dd>${esc(t.phone) || "&mdash;"}</dd></div>
            <div><dt>Priority</dt><dd>${esc(t.priority)}</dd></div>
            <div><dt>Date</dt><dd>${formatDate(t.created_at)}</dd></div>
          </dl>

          <p style="margin-top:var(--space-4);font-size:var(--fs-sm);color:var(--color-text-muted)">${esc(t.description) || ""}</p>

          <label class="field" style="margin-top:var(--space-4)">
            <span class="field__label">Reply</span>
            <textarea class="input" rows="2" data-ticket-reply-input="${t.id}" placeholder="Write a reply&hellip;">${esc(t.admin_reply) || ""}</textarea>
          </label>

          <div class="admin-card__actions">
            <button class="btn btn--glass btn--pill" type="button" data-ticket-reply="${t.id}">Save Reply</button>
            <button class="btn btn--outline btn--sm" type="button" data-ticket-status="${t.id}" data-status="Open">Open</button>
            <button class="btn btn--outline btn--sm" type="button" data-ticket-status="${t.id}" data-status="In Progress">Mark In Progress</button>
            <button class="btn btn--primary btn--pill" type="button" data-ticket-status="${t.id}" data-status="Resolved">Resolve</button>
          </div>
        </div>
      </article>`;
  }

  async function render() {
    // Phase 20 — security: support_tickets (name/email/phone/description)
    // is no longer publicly readable via RLS — reads now go through
    // admin-api (service role).
    const { ok, data: body } = await window.XploroAdminAuth.callAdminApi("get-all-tickets", {});
    const tickets = (ok && body && body.data) || [];
    if (!tickets.length) {
      renderEmpty();
      return;
    }

    root.innerHTML = `<div class="admin-list">${tickets.map(cardTemplate).join("")}</div>`;

    root.querySelectorAll("[data-ticket-reply]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const input = root.querySelector(`[data-ticket-reply-input="${btn.dataset.ticketReply}"]`);
        await window.XploroAdminAuth.callAdminApi("update-ticket", { ticketId: btn.dataset.ticketReply, adminReply: input.value.trim() });
        render();
      });
    });
    root.querySelectorAll("[data-ticket-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await window.XploroAdminAuth.callAdminApi("update-ticket", { ticketId: btn.dataset.ticketStatus, status: btn.dataset.status });
        render();
      });
    });
  }

  render();
})();
