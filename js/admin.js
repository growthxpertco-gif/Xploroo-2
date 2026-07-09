/* ==========================================================================
   XPLOROO · Admin — Influencer Applications
   admin.js — Renders and reviews PENDING Influencer applications inside the
   "Influencer Applications" tab of admin-influencer-applications.html.
   Approved/rejected applications are not shown here — once reviewed they
   drop out of this list.

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

   The applicant's email isn't part of the application record itself (the
   form never collects one — see influencer-application.html), so this
   reads it from the current Supabase session (window.XploroAuth, see
   js/supabase.js) as a best-effort, falling back to a placeholder when
   unavailable.

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

  function linkRow(label, href) {
    if (!href) return "";
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  async function getApplicantEmail() {
    if (!window.XploroAuth) return "";
    const user = await window.XploroAuth.getUser();
    return (user && user.email) || "";
  }

  function renderEmpty() {
    listEl.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </span>
        <p>No pending influencer applications.</p>
      </div>`;
  }

  async function render() {
    const state = window.XploroRole.getState();
    const app = state.application;

    if (app.status !== "pending" || !app.data) {
      renderEmpty();
      return;
    }

    const d = app.data;
    const initial = (d.fullName || "?").trim().charAt(0).toUpperCase();
    const email = await getApplicantEmail();

    listEl.innerHTML = `
      <article class="admin-card">
        <span class="admin-card__photo" aria-hidden="true">${initial}</span>
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${d.fullName || "Unnamed Applicant"}</h2>
            <span class="status-pill status-pill--pending">Pending Approval</span>
          </div>

          <dl class="admin-card__meta">
            <div><dt>Email</dt><dd>${email || "&mdash;"}</dd></div>
            <div><dt>Followers</dt><dd>${d.followers || "&mdash;"}</dd></div>
            <div><dt>Niche</dt><dd>${d.niche || "&mdash;"}</dd></div>
            <div><dt>Applied</dt><dd>${formatDate(app.submittedAt)}</dd></div>
          </dl>

          <div class="admin-card__links">
            ${linkRow("Instagram", d.instagram)}
            ${linkRow("YouTube", d.youtube)}
            ${d.otherLinks ? `<span>${d.otherLinks}</span>` : ""}
          </div>

          <div class="admin-card__actions">
            <button class="btn btn--primary btn--pill" type="button" data-admin-approve>Approve</button>
            <button class="btn btn--danger btn--pill" type="button" data-admin-reject>Reject</button>
          </div>
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
