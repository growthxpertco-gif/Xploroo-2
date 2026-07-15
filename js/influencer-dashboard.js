/* ==========================================================================
   XPLOROO · Influencer dashboard
   influencer-dashboard.js — Gates influencer-dashboard.html behind a
   Supabase-backed application_status === "approved" (window.XploroAuth +
   window.XploroApplications, see js/supabase.js and
   js/influencer-applications.js); shows the existing "not approved yet"
   gate instead of the dashboard for everyone else (including signed-out
   visitors). For approved influencers, drives the sidebar → panel
   switching (identical pattern to the search overlay's tabs: one
   `.is-active` panel at a time, no page reload). Every panel's real
   content is rendered separately by js/dash-sections.js, which runs its
   own independent approval check.
   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications) return;

  const gate = page.querySelector("[data-dash-gate]");
  const content = page.querySelector("[data-dash-content]");

  (async function init() {
    const user = await window.XploroAuth.getUser();

    // Always fetch fresh application data from Supabase, never use cached data.
    // This ensures the dashboard shows the current status after submissions,
    // admin actions, or page navigation. Invalidate the cache before each fetch.
    if (window.XploroApplications && window.XploroApplications.invalidateMyApplicationCache) {
      window.XploroApplications.invalidateMyApplicationCache();
    }

    const application = user ? await window.XploroApplications.getMyApplication() : null;
    const status = application ? application.application_status : "none";

    if (status === "approved") {
      gate.hidden = true;
      content.hidden = false;
    } else {
      gate.hidden = false;
      content.hidden = true;

      // Display status-specific gate message for pending/rejected/none states
      const gateContent = gate.querySelector(".dash-gate");
      if (gateContent && status === "pending") {
        gateContent.innerHTML = `
          <h1 class="dash-gate__title">🎉 One Final Step Before Review</h1>
          <p class="dash-gate__desc">Your application has been received successfully. To verify that you are the real owner of your Instagram account, please add the verification code below to your Instagram bio.</p>
          <div class="dash-gate__code-section" style="margin: var(--space-5) 0; padding: var(--space-4); border-radius: var(--radius-xl); background: var(--glass-bg); border: 1px solid var(--color-border-brand);">
            <code style="font-family: var(--font-mono); font-size: var(--fs-lg); font-weight: var(--fw-bold); letter-spacing: 0.15em;">${window.XploroSecurity.escapeHtml(application.verification_code || "")}</code>
            <button class="btn btn--glass btn--pill btn--sm" type="button" style="margin-left: var(--space-3);" onclick="navigator.clipboard.writeText('${window.XploroSecurity.escapeHtml((application.verification_code || "").replace(/'/g, "\\'"))}').then(() => { this.textContent = '✓ Copied!'; setTimeout(() => { this.textContent = '📋 Copy Code'; }, 1800); })">📋 Copy Code</button>
          </div>
          <p class="dash-gate__desc" style="font-size: var(--fs-sm); color: var(--color-text-muted); margin-top: var(--space-5);">Once you've updated your Instagram bio with this code, our team will verify your profile. After successful verification, you can remove the code from your bio.</p>
          <p class="dash-gate__desc" style="font-size: var(--fs-sm); color: var(--color-text-muted); margin-top: var(--space-3);">Your application will remain under review until verification is completed.</p>
          <span class="status-pill status-pill--pending dash-gate__pill" style="margin-top: var(--space-4);">🟡 Verification Pending</span>
          <a class="btn btn--glass btn--pill dash-gate__action" href="account.html">Back to My Account</a>
        `;
      } else if (gateContent && status === "rejected") {
        gateContent.innerHTML = `
          <h1 class="dash-gate__title">Application Rejected</h1>
          <p class="dash-gate__desc">This application wasn't approved, but you're welcome to apply again any time.</p>
          <span class="status-pill status-pill--rejected dash-gate__pill">Not Approved</span>
          <a class="btn btn--gradient btn--pill dash-gate__action" href="account.html">Back to My Account</a>
        `;
      }
      return;
    }

    /* ---- Sidebar tab switching (mirrors search-overlay.js's tab pattern) --- */
    const links = Array.from(page.querySelectorAll("[data-dash-tab]"));
    const panels = Array.from(page.querySelectorAll("[data-dash-panel]"));

    function selectTab(key) {
      links.forEach((l) => l.setAttribute("aria-selected", String(l.dataset.dashTab === key)));
      panels.forEach((p) => p.classList.toggle("is-active", p.dataset.dashPanel === key));
    }

    links.forEach((link) => {
      link.addEventListener("click", () => selectTab(link.dataset.dashTab));
    });

    if (links.length) selectTab(links[0].dataset.dashTab);
  })();
})();
