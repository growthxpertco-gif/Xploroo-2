/* ==========================================================================
   XPLOROO · Influencer dashboard — Support tab
   dash-support.js — Renders the real support ticket form + history
   (public.support_tickets, via window.XploroSupportTickets, see
   js/support-tickets.js) into the "Support" panel. Admin replies
   (admin_reply) show inline once set.
   Vanilla JS, no dependencies. Loaded with `defer`, after support-tickets.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroSupportTickets) return;

  const mount = page.querySelector('[data-dash-section="support"]');
  if (!mount) return;

  const ICON_TICKET =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/></svg>';

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

  async function render() {
    const user = await window.XploroAuth.getUser();
    const profile = user ? await window.XploroAuth.getProfile(user.id) : null;

    const formHtml = `
      <form class="dash-ticket-form" data-ticket-form hidden novalidate>
        <div class="dash-ticket-form__grid">
          <label class="field">
            <span class="field__label">Full Name</span>
            <input class="input" type="text" name="fullName" value="${(profile && profile.full_name) || ""}" required />
          </label>
          <label class="field">
            <span class="field__label">Email</span>
            <input class="input" type="email" name="email" value="${(user && user.email) || ""}" required />
          </label>
          <label class="field">
            <span class="field__label">Phone Number</span>
            <input class="input" type="tel" name="phone" placeholder="+91 98765 43210" required />
          </label>
          <label class="field">
            <span class="field__label">Priority</span>
            <select class="input select" name="priority" required>
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label class="field field--full">
            <span class="field__label">Subject</span>
            <input class="input" type="text" name="subject" placeholder="e.g. Payout delayed for my last trip" required />
          </label>
          <label class="field field--full">
            <span class="field__label">Issue Description</span>
            <textarea class="input" name="description" rows="3" placeholder="Describe your issue." required></textarea>
          </label>
        </div>
        <button class="btn btn--gradient btn--pill" type="submit">Submit Ticket</button>
      </form>`;

    const tickets = await window.XploroSupportTickets.getMyTickets();

    const listHtml = !tickets.length
      ? `<div class="dash-empty"><span class="dash-empty__icon" aria-hidden="true">${ICON_TICKET}</span><p>No support tickets yet.</p></div>`
      : `
      <h3 class="dash-section-title">Ticket History</h3>
      <div class="dash-cards">
        ${tickets
          .map(
            (t) => `
          <article class="dash-ticket-card">
            <div>
              <h4 class="dash-ticket-card__subject">${t.subject}</h4>
              <p class="dash-ticket-card__meta">${t.priority} Priority &middot; ${formatDate(t.created_at)}</p>
              ${t.admin_reply ? `<p class="dash-ticket-card__meta" style="margin-top:var(--space-2);color:var(--color-text-strong)">Reply: ${t.admin_reply}</p>` : ""}
            </div>
            ${statusPill(t.status)}
          </article>`
          )
          .join("")}
      </div>`;

    mount.innerHTML = `
      <div class="dash-support__head">
        <span></span>
        <button class="btn btn--glass btn--pill" type="button" data-ticket-toggle>+ Create Ticket</button>
      </div>
      ${formHtml}
      ${listHtml}`;

    const toggleBtn = mount.querySelector("[data-ticket-toggle]");
    const form = mount.querySelector("[data-ticket-form]");
    toggleBtn.addEventListener("click", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('[name="phone"]').focus();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;

      const data = new FormData(form);
      const { error } = await window.XploroSupportTickets.createTicket({
        fullName: data.get("fullName") || "",
        email: data.get("email") || "",
        phone: data.get("phone") || "",
        subject: data.get("subject") || "",
        description: data.get("description") || "",
        priority: data.get("priority") || "Medium",
      });

      submitBtn.disabled = false;
      if (error) return;
      render();
    });
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();
  })();
})();
