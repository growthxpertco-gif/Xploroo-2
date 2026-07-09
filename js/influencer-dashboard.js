/* ==========================================================================
   XPLOROO · Influencer dashboard
   influencer-dashboard.js — Gates influencer-dashboard.html behind
   XploroRole.getState().role === "influencer" (see js/user-role.js); shows
   a "not approved yet" message instead of the dashboard for everyone else.
   For approved influencers, drives the sidebar → panel switching (identical
   pattern to the search overlay's tabs: one `.is-active` panel at a time,
   no page reload). Every panel is an explicit placeholder — this ships the
   role/approval workflow only, not Earnings/Withdrawals/etc. functionality.
   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroRole) return;

  const gate = page.querySelector("[data-dash-gate]");
  const content = page.querySelector("[data-dash-content]");

  const state = window.XploroRole.getState();

  if (state.role !== "influencer") {
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
