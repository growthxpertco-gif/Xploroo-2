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
    const application = user ? await window.XploroApplications.getMyApplication() : null;

    if (!application || application.application_status !== "approved") {
      gate.hidden = false;
      content.hidden = true;
      return;
    }

    gate.hidden = true;
    content.hidden = false;

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
