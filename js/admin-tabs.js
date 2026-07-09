/* ==========================================================================
   XPLOROO · Admin — tab switching
   admin-tabs.js — Drives the "Influencer Applications" / "Package
   Management" tab bar on admin-influencer-applications.html. Mirrors the
   existing search-overlay tab pattern (js/search-overlay.js): one
   `aria-selected` tab at a time, a sliding underline indicator, and a
   matching `.is-active` panel. Purely a UI switcher — knows nothing about
   applications or packages, so either panel's own module can change
   independently.
   Vanilla JS, no dependencies. Loaded with `defer`, before admin.js and
   admin-packages.js.
   ========================================================================== */
(function () {
  "use strict";

  const tabsEl = document.querySelector("[data-admin-tabs]");
  if (!tabsEl) return;

  const tabs = Array.from(tabsEl.querySelectorAll("[data-admin-tab]"));
  const indicator = tabsEl.querySelector("[data-admin-tab-indicator]");
  const panels = Array.from(document.querySelectorAll("[data-admin-panel]"));

  function moveIndicator(tabEl) {
    if (!indicator || !tabEl) return;
    indicator.style.width = `${tabEl.offsetWidth}px`;
    indicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
  }

  function selectTab(tabEl) {
    const key = tabEl.dataset.adminTab;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tabEl)));
    panels.forEach((p) => p.classList.toggle("is-active", p.dataset.adminPanel === key));
    moveIndicator(tabEl);
  }

  tabs.forEach((tabEl) => {
    tabEl.addEventListener("click", () => selectTab(tabEl));
  });

  /* Keep the underline aligned on resize (font/layout reflow). */
  window.addEventListener("resize", () => {
    const current = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (current) moveIndicator(current);
  });

  if (tabs.length) {
    // Defer measuring one frame so the indicator lands correctly on first paint.
    requestAnimationFrame(() => selectTab(tabs[0]));
  }
})();
