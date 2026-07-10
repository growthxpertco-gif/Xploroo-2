/* ==========================================================================
   XPLOROO · Admin — Influencer Applications
   admin.js — Renders and reviews every PENDING Influencer application
   (across all users) inside the "Influencer Applications" tab of
   admin-influencer-applications.html, reading directly from Supabase
   (window.XploroApplications, see js/influencer-applications.js).
   Approved/rejected applications drop out of this list as soon as they're
   reviewed. Admin auth itself stays the separate, temporary prototype in
   js/admin-auth.js — this only reads/writes application rows.
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-admin-page]");
  if (!page || !window.XploroApplications) return;

  const listEl = page.querySelector("[data-admin-list]");

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
    return value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function cardTemplate(app) {
    const initial = (app.full_name || "?").trim().charAt(0).toUpperCase();
    const photoHtml = app.profile_picture
      ? `<img class="admin-card__photo" src="${app.profile_picture}" alt="" />`
      : `<span class="admin-card__photo" aria-hidden="true">${initial}</span>`;

    return `
      <article class="admin-card" data-admin-card="${app.id}">
        ${photoHtml}
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${app.full_name || "Unnamed Applicant"}</h2>
            <span class="status-pill status-pill--pending">Pending Approval</span>
          </div>

          <dl class="admin-card__meta">
            <div><dt>Instagram Followers</dt><dd>${app.instagram_followers != null ? app.instagram_followers : "&mdash;"}</dd></div>
            <div><dt>Niche</dt><dd>${nicheLabel(app.niche)}</dd></div>
          </dl>

          <div class="admin-card__links">
            ${app.instagram_profile_link ? `<a href="${app.instagram_profile_link}" target="_blank" rel="noopener noreferrer">Instagram Profile</a>` : ""}
          </div>

          <div class="admin-card__actions">
            <button class="btn btn--primary btn--pill" type="button" data-admin-approve="${app.id}">Approve</button>
            <button class="btn btn--danger btn--pill" type="button" data-admin-reject="${app.id}">Reject</button>
          </div>
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

    listEl.querySelectorAll("[data-admin-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const app = applications.find((a) => a.id === btn.dataset.adminApprove);
        await window.XploroApplications.approve(app);
        render();
      });
    });
    listEl.querySelectorAll("[data-admin-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const app = applications.find((a) => a.id === btn.dataset.adminReject);
        await window.XploroApplications.reject(app);
        render();
      });
    });
  }

  render();
})();
