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
  // Placeholder thumbnails — swap these picsum seed URLs for real package
  // photography later. Seeds match the hero images already used on each
  // destination's package page (js/booking.js PACKAGES catalog) for
  // visual consistency between search results and the package itself.
  const DATA = {
    packages: [
      { name: "Goa Beach Escape", location: "Goa, India", duration: "3 Days 2 Nights", price: "14,999", image: "https://ik.imagekit.io/mg0v9kccj/pexels-landsmann-803094805-19209541.jpg?updatedAt=1783329374375" },
      { name: "Bali Island Retreat", location: "Bali, Indonesia", duration: "6 Days 5 Nights", price: "42,499", image: "https://ik.imagekit.io/mg0v9kccj/mcjo-sy-iNMzQKfb8SQ-unsplash.jpg?updatedAt=1783332532357" },
      { name: "Manali Getaway", location: "Manali, HP", duration: "4 Days 3 Nights", price: "18,999", image: "https://ik.imagekit.io/mg0v9kccj/pexels-aviskar-dahal-2159431712-38417936.jpg?updatedAt=1783328776039" },
      { name: "Vietnam Discovery", location: "Vietnam", duration: "5 Days 4 Nights", price: "36,999", image: "https://ik.imagekit.io/mg0v9kccj/ricardo-gomez-angel-J82dSkOxvY8-unsplash.jpg?updatedAt=1782740324016" },
      { name: "Singapore Explorer", location: "Singapore", duration: "4 Days 3 Nights", price: "39,999", image: "https://ik.imagekit.io/mg0v9kccj/jef-galas-KR0bmEk7UxM-unsplash.jpg?updatedAt=1783327970405" },
      { name: "Jaipur Heritage Trail", location: "Jaipur, Rajasthan", duration: "5 Days 4 Nights", price: "21,999", image: "https://ik.imagekit.io/mg0v9kccj/xploroo/pexels-karan-singh-1747561753-28054399.jpg?updatedAt=1783333619691" },
      { name: "Kasol & Parvati Valley", location: "Kasol, HP", duration: "4 Days 3 Nights", price: "16,999", image: "https://ik.imagekit.io/mg0v9kccj/xploroo/pexels-strangr-5166305.jpg?updatedAt=1783090284993" },
      { name: "Phuket Island Escape", location: "Phuket, Thailand", duration: "4 Days 3 Nights", price: "31,999", image: "https://ik.imagekit.io/mg0v9kccj/xploroo/pexels-1415852104-26561115.jpg?updatedAt=1783090286083" },
      { name: "Iceland Northern Lights Escape", location: "Iceland", duration: "6 Nights 7 Days", price: "7,25,000", image: "https://ik.imagekit.io/mg0v9kccj/xploroo/pexels-sheikh-muzamil-132620374-28805621.jpg?updatedAt=1783333441469" },
      { name: "Japan Cherry Blossom Trail", location: "Japan", duration: "6 Days 5 Nights", price: "99,999", image: "https://ik.imagekit.io/mg0v9kccj/jezael-melgoza-Iv7Jzk6gNIw-unsplash.jpg?updatedAt=1783332531391" },
      { name: "Italy Classic Escape", location: "Italy", duration: "6 Days 5 Nights", price: "89,999", image: "https://ik.imagekit.io/mg0v9kccj/marc-guc520jc0lk-unsplash.jpg?updatedAt=1783332532476" },
    ],
    influencers: [
      { name: "Anurag Sharma", location: "320 Followers", image: "https://ik.imagekit.io/mg0v9kccj/xploroo/IMG_20260704_121932.jpg.jpeg?updatedAt=1783147862135" },
      { name: "Vanshika Dharu", location: "36.8k Followers", image: "https://ik.imagekit.io/mg0v9kccj/IMG_20260703_125532.jpg.jpeg?updatedAt=1783064185950" },
      { name: "Palak Thakur", location: "114K Followers", image: "https://ik.imagekit.io/mg0v9kccj/IMG_20260703_131131.jpg.jpeg?updatedAt=1783064570925" },
      { name: "The Triplets", location: "258M Followers", image: "https://ik.imagekit.io/mg0v9kccj/IMG_20260707_231943.jpg.jpeg?updatedAt=1783446707944" },
      { name: "Diwakar Pratap", location: "111K Followers", image: "https://ik.imagekit.io/mg0v9kccj/IMG_20260703_170627.jpg.jpeg?updatedAt=1783078706628" },
    ],
    meetgreet: [
      { name: "Iceland", location: "Mumbai, India", duration: "12 Dec 2026", image: "https://ik.imagekit.io/mg0v9kccj/IMG-20260704-WA0019.jpg.jpeg?updatedAt=1783347238975" },
      { name: "Singapore", location: "Ahmedabad, India", duration: "18 Jan 2027", image: "https://ik.imagekit.io/mg0v9kccj/file_00000000e94471fab9ac9f8acff218c0.png?updatedAt=1783417163302" },
      { name: "Italy", location: "Delhi, India", duration: "22 Nov 2026", image: "https://ik.imagekit.io/mg0v9kccj/IMG-20260704-WA0018.jpg.jpeg?updatedAt=1783347238995" },
      { name: "Japan", location: "Chennai, India", duration: "05 Feb 2027", image: "https://ik.imagekit.io/mg0v9kccj/IMG-20260706-WA0001.jpg.jpeg?updatedAt=1783347238979" },
    ],
  };

  function cardMarkup(tab, item) {
    if (tab === "packages") {
      return `
        <a class="search-result" href="packages.html" data-search-text="${item.name} ${item.location}">
          <img class="search-result__image" src="${item.image}" alt="" />
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
          <img class="search-result__image" src="${item.image}" alt="" />
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
        <img class="search-result__image" src="${item.image}" alt="" />
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
