/* ==========================================================================
   XPLOROO · Admin — Influencer Applications
   admin.js — Renders and reviews Influencer applications for
   admin-influencer-applications.html.

   IMPORTANT — single-browser demo limitation
   -------------------------------------------
   There's no backend yet, so "all applications" here really means "whatever
   this browser's XploroRole state has" (see js/user-role.js) — at most one
   application, since that module tracks a single user. A real integration
   would replace `loadApplications()` with a fetch of every submitted
   application from the backend, and `approve`/`reject` below would POST to
   that application's own record instead of the shared local one. Every
   other page in the role system already reads/writes through
   `window.XploroRole`, so that's the only file that needs to change.

   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-admin-page]");
  if (!page || !window.XploroRole) return;

  const listEl = page.querySelector("[data-admin-list]");

  function formatDate(iso) {
    if (!iso) return "&mdash;";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function statusLabel(status) {
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    return "Pending Approval";
  }

  function linkRow(label, href) {
    if (!href) return "";
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  function render() {
    const state = window.XploroRole.getState();
    const app = state.application;

    if (app.status === "none" || !app.data) {
      listEl.innerHTML = '<p class="admin-empty">No Influencer applications yet.</p>';
      return;
    }

    const d = app.data;
    const actionsHtml =
      app.status === "pending"
        ? `<div class="admin-card__actions">
             <button class="btn btn--primary btn--pill" type="button" data-admin-approve>Approve</button>
             <button class="btn btn--danger btn--pill" type="button" data-admin-reject>Reject</button>
           </div>`
        : `<p class="admin-card__reviewed">Reviewed ${formatDate(app.reviewedAt)}</p>`;

    listEl.innerHTML = `
      <article class="admin-card">
        <img class="admin-card__photo" src="https://picsum.photos/seed/xploroo-applicant-${encodeURIComponent(d.fullName || "applicant")}/200/200" alt="" />
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${d.fullName || "Unnamed Applicant"}</h2>
            <span class="status-pill status-pill--${app.status}">${statusLabel(app.status)}</span>
          </div>

          <dl class="admin-card__meta">
            <div><dt>Followers</dt><dd>${d.followers || "&mdash;"}</dd></div>
            <div><dt>Niche</dt><dd>${d.niche || "&mdash;"}</dd></div>
            <div><dt>Location</dt><dd>${[d.city, d.country].filter(Boolean).join(", ") || "&mdash;"}</dd></div>
            <div><dt>Applied</dt><dd>${formatDate(app.submittedAt)}</dd></div>
          </dl>

          <div class="admin-card__links">
            ${linkRow("Instagram", d.instagram)}
            ${linkRow("YouTube", d.youtube)}
            ${d.otherLinks ? `<span>${d.otherLinks}</span>` : ""}
          </div>

          ${actionsHtml}
        </div>
      </article>`;

    const approveBtn = listEl.querySelector("[data-admin-approve]");
    const rejectBtn = listEl.querySelector("[data-admin-reject]");
    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        window.XploroRole.approveApplication();
        render();
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        window.XploroRole.rejectApplication();
        render();
      });
    }
  }

  render();
})();
