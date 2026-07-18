/* ==========================================================================
   XPLOROO · Search overlay module
   search-overlay.js — Opens/closes the fullscreen search overlay from the
   header's search icon, drives the three tabs (Packages / Influencers /
   Meet & Greet) with a sliding underline + fade transition, and searches
   each tab's real Supabase data as the user types.

   Phase 13 — Production Ready Global Search System. Replaces the old
   hardcoded placeholder DATA object entirely:
     • Packages     -> public.packages (name/destination/country/city/
                       category/tags/description), opens the package's own
                       page (page_url column, e.g. "goa-package.html").
     • Influencers  -> window.XploroApplications.getApprovedApplications()
                       (already scoped to application_status = "approved"
                       AND public_visibility = true — see
                       js/influencer-applications.js), enriched with each
                       influencer's enabled services from
                       public.influencer_services. Opens influencer-profile
                       .html?username=… (falls back to ?id=…).
     • Experiences  -> public.experiences (Play & Win / quizzes / campaigns
                       shown on play&win.html + winners.html), opens
                       each row's page_url.

   This file runs on every page (search is global), but most pages never
   load the Supabase CDN/client — only header.js's account panel does, and
   only lazily on interaction. ensureSupabaseReady() below mirrors that
   exact lazy-load pattern (same script URLs, same idempotent loader) so
   this module works standalone regardless of what else a given page has
   already loaded.

   Each tab's rows are fetched once per overlay session and cached in
   memory for CACHE_TTL — typing filters the cached array client-side
   (no request per keystroke), and the cache is dropped after the TTL so a
   newly-added package/newly-approved influencer shows up on the next
   search without a hard refresh.

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

  const esc = window.XploroSecurity.escapeHtml;

  /* ------------------------------------------------------------------ */
  /* Lazy Supabase loader — same URLs/pattern as js/header.js's           */
  /* ensureSupabaseReady, duplicated here because most pages that render  */
  /* this search overlay never declare the Supabase <script> tags         */
  /* themselves. Idempotent: checks for an existing <script src> first,   */
  /* so it's a no-op if header.js (or the page itself) already loaded it. */
  /* ------------------------------------------------------------------ */
  const SUPABASE_CDN_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  const SUPABASE_CONFIG_SRC = "js/supabase.js";
  const APPLICATIONS_SRC = "js/influencer-applications.js";

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
        } else {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
        }
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.addEventListener("load", () => {
        s.dataset.loaded = "true";
        resolve();
      });
      s.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      document.head.appendChild(s);
    });
  }

  async function ensureSupabaseReady() {
    try {
      if (typeof window.supabase === "undefined") await loadScriptOnce(SUPABASE_CDN_SRC);
      if (!window.XploroAuth) await loadScriptOnce(SUPABASE_CONFIG_SRC);
      if (!window.XploroApplications) await loadScriptOnce(APPLICATIONS_SRC);
      return !!window.supabaseClient;
    } catch (_) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Per-tab cache — one Supabase round-trip per tab per overlay         */
  /* session (not per keystroke); refreshed after CACHE_TTL so newly     */
  /* added/approved/visible content appears without a hard reload.       */
  /* ------------------------------------------------------------------ */
  const CACHE_TTL = 60000;
  const cache = { packages: null, influencers: null, meetgreet: null };
  const cacheTime = { packages: 0, influencers: 0, meetgreet: 0 };
  const inflight = {};

  function isFresh(tab) {
    return cache[tab] && Date.now() - cacheTime[tab] < CACHE_TTL;
  }

  const SERVICE_NAMES = {
    meetGreet: "Meet & Greet",
    podcast: "Podcast",
    eventAppearance: "Event Appearance",
    blogShoot: "Blog Shoot",
    travelCollab: "Travel Collaboration",
    bookAppointment: "Book Appointment",
  };

  function normalize(str) {
    return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  }

  async function fetchPackages() {
    const ready = await ensureSupabaseReady();
    if (!ready) return [];
    const { data, error } = await window.supabaseClient
      .from("packages")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("[Xploroo] Failed to load packages for search:", error.message);
      return [];
    }
    return (data || []).map((p) => ({
      title: p.name,
      image: p.image || "",
      href: p.page_url,
      meta: [p.destination, p.duration, p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : null].filter(Boolean),
      price: p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : null,
      searchText: normalize(
        [p.name, p.destination, p.country, p.city, p.category, (p.tags || []).join(" "), p.description].join(" ")
      ),
    }));
  }

  async function fetchInfluencers() {
    const ready = await ensureSupabaseReady();
    if (!ready || !window.XploroApplications) return [];
    const apps = await window.XploroApplications.getApprovedApplications();
    if (!apps.length) return [];

    // Enrich with each influencer's enabled services so "services" is a
    // searchable field too (public.influencer_services, public SELECT).
    const ids = apps.map((a) => a.user_id).filter(Boolean);
    let servicesByUser = new Map();
    if (ids.length) {
      const { data, error } = await window.supabaseClient
        .from("influencer_services")
        .select("user_id, services")
        .in("user_id", ids);
      if (!error) servicesByUser = new Map((data || []).map((row) => [row.user_id, row.services || {}]));
    }

    return apps.map((a) => {
      const services = servicesByUser.get(a.user_id) || {};
      const serviceNames = Object.keys(services)
        .filter((key) => services[key] && services[key].enabled)
        .map((key) => SERVICE_NAMES[key] || key);
      const igHandle = (a.instagram_profile_link || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/?$/, "");
      const href = a.username
        ? `influencer-profile.html?username=${encodeURIComponent(a.username)}`
        : `influencer-profile.html?id=${encodeURIComponent(a.user_id)}`;
      const followers = a.instagram_followers
        ? `${a.instagram_followers >= 1000 ? `${(a.instagram_followers / 1000).toFixed(1).replace(/\.0$/, "")}K` : a.instagram_followers} Followers`
        : "";
      return {
        title: a.full_name || "Xploroo Influencer",
        image: a.avatar_url || "",
        href,
        meta: [followers, a.niche].filter(Boolean),
        price: null,
        searchText: normalize(
          [a.full_name, a.username, a.niche, a.short_bio, serviceNames.join(" "), igHandle].join(" ")
        ),
      };
    });
  }

  async function fetchExperiences() {
    const ready = await ensureSupabaseReady();
    if (!ready) return [];
    const { data, error } = await window.supabaseClient
      .from("experiences")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[Xploroo] Failed to load experiences for search:", error.message);
      return [];
    }
    return (data || []).map((e) => ({
      title: e.name,
      image: e.image || "",
      href: e.page_url,
      meta: [e.status === "launching_soon" ? "Launching Soon" : "Live"].filter(Boolean),
      price: null,
      searchText: normalize([e.name, e.type, e.status, e.description].join(" ")),
    }));
  }

  const FETCHERS = { packages: fetchPackages, influencers: fetchInfluencers, meetgreet: fetchExperiences };

  async function loadTab(tab) {
    if (isFresh(tab)) return cache[tab];
    if (inflight[tab]) return inflight[tab];
    const fetcher = FETCHERS[tab];
    if (!fetcher) return [];
    inflight[tab] = fetcher()
      .then((items) => {
        cache[tab] = items;
        cacheTime[tab] = Date.now();
        return items;
      })
      .finally(() => {
        delete inflight[tab];
      });
    return inflight[tab];
  }

  /* ------------------------------------------------------------------ */
  /* Result card markup — same classes/structure as before, so the        */
  /* existing search-overlay.css visuals/animations apply unchanged.      */
  /* ------------------------------------------------------------------ */
  function cardMarkup(item) {
    const imageTag = item.image
      ? `<img class="search-result__image" src="${window.XploroSecurity.sanitizeUrl(item.image, { allowData: true })}" alt="" />`
      : `<span class="search-result__image" aria-hidden="true"></span>`;
    const metaParts = item.meta.map((m, i) =>
      i === 0 ? `<span>${esc(m)}</span>` : `<span class="search-result__meta-dot" aria-hidden="true"></span><span>${esc(m)}</span>`
    );
    return `
      <a class="search-result" href="${window.XploroSecurity.sanitizeUrl(item.href)}">
        ${imageTag}
        <div class="search-result__body">
          <span class="search-result__title">${esc(item.title)}</span>
          <span class="search-result__meta">${metaParts.join("")}</span>
        </div>
        <span class="search-result__cta" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
      </a>`;
  }

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
  /* Tabs — sliding underline + fade transition (unchanged)              */
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
        runSearch(panel, input ? input.value : "");
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
  /* Search — case-insensitive partial match against the active tab's    */
  /* cached rows; loads the tab's data on first use.                     */
  /* ------------------------------------------------------------------ */
  let searchToken = 0;

  async function runSearch(panel, query) {
    const tab = panel.dataset.searchPanel;
    const token = ++searchToken;
    const list = panel.querySelector("[data-search-list]");
    const empty = panel.querySelector("[data-search-empty]");

    const items = await loadTab(tab);
    if (token !== searchToken) return; // a newer search superseded this one

    const q = normalize(query);
    const matches = items.filter((item) => !q || item.searchText.includes(q));

    if (list) list.innerHTML = matches.map((item) => `<li>${cardMarkup(item)}</li>`).join("");
    if (empty) {
      empty.textContent = "No matching results found.";
      empty.classList.toggle("is-visible", matches.length === 0);
    }
  }

  /* Debounced input — avoids a fresh filter pass (and, on first keystroke   */
  /* per tab, a Supabase request) on every single keypress.                 */
  let debounceHandle = null;
  if (input) {
    input.addEventListener("input", () => {
      window.clearTimeout(debounceHandle);
      debounceHandle = window.setTimeout(() => {
        const activePanel = panels.find((p) => p.classList.contains("is-active"));
        if (activePanel) runSearch(activePanel, input.value);
      }, 300);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init — select the first tab once markup is in place                 */
  /* ------------------------------------------------------------------ */
  if (tabs.length) selectTab(tabs[0]);
})();
