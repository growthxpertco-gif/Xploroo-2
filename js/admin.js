/* ==========================================================================
   XPLOROO · Admin — Influencer Applications
   admin.js — Renders and reviews every in-progress Influencer application
   (application_status = "pending", across all users) inside the
   "Influencer Applications" tab of admin-influencer-applications.html,
   reading directly from Supabase (window.XploroApplications, see
   js/influencer-applications.js). Approved/rejected applications drop out
   of this list as soon as they're reviewed, same as before. Admin auth
   itself stays the separate, temporary prototype in js/admin-auth.js —
   this only reads/writes application rows.

   Phase 10 — Instagram Ownership Verification: each card now also carries
   the applicant's `verification_status` ("Verification Required" ->
   "Verification Submitted" -> "Verified") and its actions change with it:
     - Verification Required   -> no action yet, just an "Open Instagram"
                                   link (waiting on the applicant).
     - Verification Submitted  -> "Open Instagram" + "Verify Ownership"
                                   (admin manually checks the bio for the
                                   verification code, then confirms).
     - Verified                -> Approve / Reject (only reachable here —
                                   window.XploroApplications.approve()
                                   itself also refuses to run otherwise).
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-admin-page]");
  if (!page || !window.XploroApplications) return;

  const listEl = page.querySelector("[data-admin-list]");
  const esc = window.XploroSecurity.escapeHtml;

  function renderEmpty() {
    listEl.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </span>
        <p>No pending influencer applications.</p>
      </div>`;
  }

  function nicheLabel(value) {
    if (!value) return "&mdash;";
    return esc(
      value
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }

  function verificationPill(status) {
    if (status === "Verified") return '<span class="status-pill status-pill--approved">Verified</span>';
    if (status === "Verification Submitted") return '<span class="status-pill status-pill--info">Verification Submitted</span>';
    return '<span class="status-pill status-pill--pending">Verification Required</span>';
  }

  function actionsHtml(app) {
    const openInstagramHtml = app.instagram_profile_link
      ? `<a class="btn btn--glass btn--pill" href="${window.XploroSecurity.sanitizeUrl(app.instagram_profile_link)}" target="_blank" rel="noopener noreferrer">Open Instagram</a>`
      : "";

    if (app.verification_status === "Verified") {
      return `
        <div class="admin-card__actions">
          ${openInstagramHtml}
          <button class="btn btn--success btn--pill" type="button" data-admin-approve="${app.id}">Approve</button>
          <button class="btn btn--danger btn--pill" type="button" data-admin-reject="${app.id}">Reject</button>
        </div>`;
    }

    if (app.verification_status === "Verification Submitted") {
      return `
        <div class="admin-card__actions">
          ${openInstagramHtml}
          <button class="btn btn--primary btn--pill" type="button" data-admin-verify="${app.id}">&#9989; Verify Ownership</button>
          <button class="btn btn--danger btn--pill" type="button" data-admin-reject="${app.id}">Reject</button>
        </div>`;
    }

    // "Verification Required" — still waiting on the applicant to add the
    // code to their bio. Nothing to verify yet, but admin can still reject
    // outright (e.g. an obviously fake application).
    return `
      <div class="admin-card__actions">
        ${openInstagramHtml}
        <button class="btn btn--danger btn--pill" type="button" data-admin-reject="${app.id}">Reject</button>
      </div>`;
  }

  function cardTemplate(app) {
    const initial = esc((app.full_name || "?").trim().charAt(0).toUpperCase());
    const photoHtml = app.avatar_url
      ? `<img class="admin-card__photo" src="${window.XploroSecurity.sanitizeUrl(app.avatar_url, { allowData: true })}" alt="" />`
      : `<span class="admin-card__photo" aria-hidden="true">${initial}</span>`;

    return `
      <article class="admin-card" data-admin-card="${app.id}">
        ${photoHtml}
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(app.full_name) || "Unnamed Applicant"}</h2>
            ${verificationPill(app.verification_status)}
          </div>

          <dl class="admin-card__meta">
            <div><dt>Instagram Followers</dt><dd>${app.instagram_followers != null ? app.instagram_followers : "&mdash;"}</dd></div>
            <div><dt>Niche</dt><dd>${nicheLabel(app.niche)}</dd></div>
            <div><dt>Verification Code</dt><dd>${esc(app.verification_code) || "&mdash;"}</dd></div>
          </dl>

          <div class="admin-card__links">
            ${
              app.instagram_profile_link
                ? `<a href="${window.XploroSecurity.sanitizeUrl(app.instagram_profile_link)}" target="_blank" rel="noopener noreferrer">Instagram Profile</a>`
                : ""
            }
          </div>

          ${actionsHtml(app)}
        </div>
      </article>`;
  }

  async function render() {
    const applications = await window.XploroApplications.getPendingApplications();

    if (!applications.length) {
      renderEmpty();
      return;
    }

    listEl.innerHTML = applications.map(cardTemplate).join("");

    listEl.querySelectorAll("[data-admin-verify]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const app = applications.find((a) => a.id === btn.dataset.adminVerify);
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("verify-ownership", { applicationId: app.id });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to verify this application.");
          return;
        }
        render();
      });
    });

    listEl.querySelectorAll("[data-admin-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const app = applications.find((a) => a.id === btn.dataset.adminApprove);
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("approve-application", { applicationId: app.id });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "This Instagram account has not been verified.");
          return;
        }
        render();
      });
    });
    listEl.querySelectorAll("[data-admin-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const app = applications.find((a) => a.id === btn.dataset.adminReject);
        await window.XploroAdminAuth.callAdminApi("reject-application", { applicationId: app.id });
        render();
      });
    });
  }

  render();
})();
