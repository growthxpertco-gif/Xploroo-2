/* ==========================================================================
   XPLOROO · Account dashboard
   account.js — Renders the profile card's role badge and the one dynamic
   panel below it (Become-an-Influencer CTA / pending / rejected /
   approved-influencer) from XploroRole state (see js/user-role.js). This
   page has no real "logged-in user" yet (login.html doesn't create a
   session — see that page's own placeholder auth.js), so the name/email
   shown are a fixed demo placeholder; only the role/application state is
   real and persists via XploroRole.
   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroRole) return;

  const badgesEl = page.querySelector("[data-account-badges]");
  const panelEl = page.querySelector("[data-account-panel]");

  const INFLUENCER_BADGE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 2Z"/></svg>';

  function render() {
    const state = window.XploroRole.getState();
    const { role, application } = state;

    /* ---- Role badges on the profile card ---- */
    badgesEl.innerHTML = '<span class="role-badge">Traveler</span>';
    if (role === "influencer") {
      badgesEl.innerHTML += `<span class="role-badge">${INFLUENCER_BADGE_SVG}Influencer</span>`;
    }

    /* ---- Dynamic panel ---- */
    if (role === "influencer") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">You&rsquo;re an Xploroo Influencer</h2>
          <p class="account-status__desc">Your application was approved. Collaboration invites, earnings, and everything else live in your Influencer Dashboard.</p>
          <a class="btn btn--gradient btn--pill account-status__action" href="influencer-dashboard.html">Go to Influencer Dashboard</a>
        </section>`;
      return;
    }

    if (application.status === "pending") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Submitted Successfully</h2>
          <p class="account-status__desc">Your application is under review. We&rsquo;ll let you know as soon as it&rsquo;s been looked at.</p>
          <span class="status-pill status-pill--pending account-status__pill">Pending Approval</span>
        </section>`;
      return;
    }

    if (application.status === "rejected") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Rejected</h2>
          <p class="account-status__desc">This application wasn&rsquo;t approved, but you&rsquo;re welcome to apply again any time.</p>
          <span class="status-pill status-pill--rejected account-status__pill">Not Approved</span>
          <div class="account-status__action">
            <button class="btn btn--gradient btn--pill" type="button" data-apply-again>Apply Again</button>
          </div>
        </section>`;
      const applyAgainBtn = panelEl.querySelector("[data-apply-again]");
      if (applyAgainBtn) {
        applyAgainBtn.addEventListener("click", () => {
          window.XploroRole.resetApplication();
          window.location.href = "influencer-application.html";
        });
      }
      return;
    }

    // status === "none" — traveler who has never applied
    panelEl.innerHTML = `
      <section class="account-cta">
        <h2 class="account-cta__title">Become an Influencer</h2>
        <p class="account-cta__desc">Turn your travels into income. Apply to join Xploroo&rsquo;s creator program and unlock collaboration invites, earnings, and more.</p>
        <a class="btn btn--gradient btn--pill account-cta__action" href="influencer-application.html">Become an Influencer</a>
      </section>`;
  }

  render();
})();
