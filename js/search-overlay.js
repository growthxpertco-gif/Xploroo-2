/* ==========================================================================
   XPLOROO · Search overlay module
   search-overlay.js — Opens/closes the fullscreen search overlay from the
   header's search icon, drives the three tabs (Packages / Influencers /
   Meet & Greet) with a sliding underline + fade transition, and filters
   each tab's placeholder result list independently as the user types.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const overlay = document.querySelector("[data-search-overlay]");
  if (!overlay) return;

  const openTriggers = document.querySelectorAll("[data-search]");
  const closeBtn = overlay.querySelector("[data-search-close]");
  const input = overlay.querySelector("[data-search-input]");
  const tabs = Array.from(overlay.querySelectorAll("[data-search-tab]"));
  const indicator = overlay.querySelector("[data-search-tab-indicator]");
  const panels = Array.from(overlay.querySelectorAll("[data-search-panel]"));

  let lastFocused = null;
  let activeTab = tabs.length ? tabs[0].dataset.searchTab : null;

  /* ------------------------------------------------------------------ */
  /* Placeholder data — swap for real API results later. Each item's     */
  /* `text` field is what the search input filters against.              */
  /* ------------------------------------------------------------------ */
  const PLACEHOLDER_IMG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23191922'/%3E%3C/svg%3E";

  const DATA = {
    packages: [
      { name: "Goa Beach Escape", location: "Goa, India", duration: "4 Days 3 Nights", price: "18,999" },
      { name: "Bali Island Retreat", location: "Bali, Indonesia", duration: "6 Days 5 Nights", price: "42,499" },
      { name: "Dubai Skyline Tour", location: "Dubai, UAE", duration: "5 Days 4 Nights", price: "39,999" },
      { name: "Manali Snow Trail", location: "Manali, India", duration: "3 Days 2 Nights", price: "12,499" },
      { name: "Vietnam Adventure", location: "Vietnam, Asia", duration: "7 Days 6 Nights", price: "34,999" },
      { name: "Kerala Backwaters", location: "Kerala, India", duration: "4 Days 3 Nights", price: "16,999" },
    ],
    influencers: [
      { name: "Anurrag Sharma", location: "2.4M Followers" },
      { name: "Priya Kapoor", location: "1.8M Followers" },
      { name: "Rohan Mehta", location: "980K Followers" },
      { name: "Sara D'Souza", location: "3.1M Followers" },
      { name: "Kabir Anand", location: "1.2M Followers" },
    ],
    meetgreet: [
      { name: "Metallica Live Meet & Greet", location: "Mumbai, India", duration: "12 Dec 2026" },
      { name: "Coldplay Backstage Pass", location: "Ahmedabad, India", duration: "18 Jan 2027" },
      { name: "Arijit Singh Fan Meet", location: "Delhi, India", duration: "22 Nov 2026" },
      { name: "AR Rahman VIP Session", location: "Chennai, India", duration: "05 Feb 2027" },
    ],
  };

  function cardMarkup(tab, item) {
    if (tab === "packages") {
      return `
        <a class="search-result" href="packages.html" data-search-text="${item.name} ${item.location}">
          <img class="search-result__image" src="${PLACEHOLDER_IMG}" alt="" />
          <div class="search-result__body">
            <span class="search-result__title">${item.name}</span>
            <span class="search-result__meta">
              <span>${item.location}</span>
              <span class="search-result__meta-dot" aria-hidden="true"></span>
              <span>${item.duration}</span>
              <span class="search-result__meta-dot" aria-hidden="true"></span>
              <span class="search-result__price">&#8377;${item.price}</span>
            </span>
          </div>
          <span class="search-result__cta" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </a>`;
    }
    if (tab === "influencers") {
      return `
        <a class="search-result" href="influencers.html" data-search-text="${item.name}">
          <img class="search-result__image" src="${PLACEHOLDER_IMG}" alt="" />
          <div class="search-result__body">
            <span class="search-result__title">${item.name}</span>
            <span class="search-result__meta"><span>${item.location}</span></span>
          </div>
          <span class="search-result__cta">View Profile &rarr;</span>
        </a>`;
    }
    // meetgreet
    return `
      <a class="search-result" href="influencers.html" data-search-text="${item.name} ${item.location}">
        <img class="search-result__image" src="${PLACEHOLDER_IMG}" alt="" />
        <div class="search-result__body">
          <span class="search-result__title">${item.name}</span>
          <span class="search-result__meta">
            <span>${item.location}</span>
            <span class="search-result__meta-dot" aria-hidden="true"></span>
            <span>${item.duration}</span>
          </span>
        </div>
        <span class="search-result__cta">View Experience &rarr;</span>
      </a>`;
  }

  panels.forEach((panel) => {
    const tab = panel.dataset.searchPanel;
    const list = panel.querySelector("[data-search-list]");
    const items = DATA[tab] || [];
    list.innerHTML = items.map((item) => `<li>${cardMarkup(tab, item)}</li>`).join("");
  });

  /* ------------------------------------------------------------------ */
  /* Open / close                                                        */
  /* ------------------------------------------------------------------ */
  function openOverlay() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    void overlay.offsetWidth; // force reflow so the transition runs
    overlay.classList.add("is-open");
    document.documentElement.classList.add("is-menu-open");
    if (input) input.focus();
    document.addEventListener("keydown", onKeydown);

    // Tab widths/offsets are 0 while [hidden] — re-sync the indicator and
    // panel visibility now that the overlay actually has layout.
    const current = tabs.find((t) => t.dataset.searchTab === activeTab);
    if (current) selectTab(current);
  }

  function closeOverlay() {
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("is-menu-open");
    document.removeEventListener("keydown", onKeydown);

    const done = () => {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
      overlay.removeEventListener("transitionend", done);
    };
    overlay.addEventListener("transitionend", done);

    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeOverlay();
  }

  openTriggers.forEach((btn) => btn.addEventListener("click", openOverlay));
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);

  /* ------------------------------------------------------------------ */
  /* Tabs — sliding underline + fade transition                          */
  /* ------------------------------------------------------------------ */
  function moveIndicator(tabEl) {
    if (!indicator || !tabEl) return;
    indicator.style.width = `${tabEl.offsetWidth}px`;
    indicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
  }

  function showPanel(tab) {
    panels.forEach((panel) => {
      const isMatch = panel.dataset.searchPanel === tab;
      panel.classList.toggle("is-active", isMatch);
      if (isMatch) {
        panel.classList.remove("is-visible");
        void panel.offsetWidth;
        panel.classList.add("is-visible");
        applyFilter(panel, input ? input.value : "");
      }
    });
  }

  function selectTab(tabEl) {
    activeTab = tabEl.dataset.searchTab;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tabEl)));
    moveIndicator(tabEl);
    showPanel(activeTab);
  }

  tabs.forEach((tabEl) => {
    tabEl.addEventListener("click", () => selectTab(tabEl));
  });

  /* Keep the underline aligned on resize (font/layout reflow). */
  window.addEventListener("resize", () => {
    const current = tabs.find((t) => t.dataset.searchTab === activeTab);
    if (current) moveIndicator(current);
  });

  /* ------------------------------------------------------------------ */
  /* Filtering — scoped to whichever tab is currently active             */
  /* ------------------------------------------------------------------ */
  function applyFilter(panel, query) {
    const q = query.trim().toLowerCase();
    const items = Array.from(panel.querySelectorAll("[data-search-text]"));
    let visibleCount = 0;

    items.forEach((item) => {
      const haystack = item.dataset.searchText.toLowerCase();
      const match = !q || haystack.includes(q);
      item.parentElement.style.display = match ? "" : "none";
      if (match) visibleCount += 1;
    });

    const empty = panel.querySelector("[data-search-empty]");
    if (empty) empty.classList.toggle("is-visible", visibleCount === 0);
  }

  if (input) {
    input.addEventListener("input", () => {
      const activePanel = panels.find((p) => p.classList.contains("is-active"));
      if (activePanel) applyFilter(activePanel, input.value);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init — select the first tab once markup/data are in place           */
  /* ------------------------------------------------------------------ */
  if (tabs.length) selectTab(tabs[0]);
})();
