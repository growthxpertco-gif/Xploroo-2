/* ==========================================================================
   XPLOROO · Header module
   header.js — Progressive-enhancement behavior for the site header:
     1. Sticky glass effect (backdrop blur) once the page is scrolled.
     2. Fullscreen mobile menu (open/close, a11y, scroll-lock, focus).
     3. Dark/light theme toggle (visual state only, for now).
     4. Logged-in account panels (mobile sidebar + desktop header) — swap
        Log In / Sign Up for a Supabase-session-aware profile panel.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  /* Query once; bail gracefully if the header isn't on the page. */
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const navToggle = header.querySelector("[data-nav-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-nav]");
  const closeBtn = document.querySelector("[data-menu-close]");
  const themeToggles = document.querySelectorAll("[data-theme-toggle]");
  const root = document.documentElement;

  /* ------------------------------------------------------------------ */
  /* 1. Sticky glass effect on scroll                                    */
  /* ------------------------------------------------------------------ */
  const SCROLL_THRESHOLD = 8; // px scrolled before the glass kicks in
  let ticking = false;

  function updateScrollState() {
    header.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
    ticking = false;
  }

  function onScroll() {
    // rAF-throttle so we never do layout work more than once per frame.
    if (!ticking) {
      window.requestAnimationFrame(updateScrollState);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  updateScrollState(); // set correct state on load (e.g. refresh mid-page)

  /* ------------------------------------------------------------------ */
  /* 2. Fullscreen mobile menu                                           */
  /* ------------------------------------------------------------------ */
  let lastFocused = null;

  function openMenu() {
    if (!mobileMenu || !navToggle) return;

    mobileMenu.hidden = false;
    // Force a reflow so the transition runs after `hidden` is removed.
    void mobileMenu.offsetWidth;

    mobileMenu.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    root.classList.add("is-menu-open"); // scroll-lock

    lastFocused = document.activeElement;
    const firstLink = mobileMenu.querySelector("a, button");
    if (firstLink) firstLink.focus();

    document.addEventListener("keydown", onKeydown);
  }

  function closeMenu() {
    if (!mobileMenu || !navToggle) return;

    mobileMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    root.classList.remove("is-menu-open");

    document.removeEventListener("keydown", onKeydown);

    // Re-apply `hidden` after the exit transition completes.
    const done = () => {
      if (!mobileMenu.classList.contains("is-open")) mobileMenu.hidden = true;
      mobileMenu.removeEventListener("transitionend", done);
    };
    mobileMenu.addEventListener("transitionend", done);

    // Restore focus to the toggle for keyboard users.
    if (navToggle) navToggle.focus();
  }

  function toggleMenu() {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeMenu();
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", toggleMenu);

    // Close after selecting a destination.
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Close if the viewport grows back to desktop while the menu is open.
    const desktopQuery = window.matchMedia("(min-width: 1025px)");
    const handleBreakpoint = (e) => {
      if (e.matches && navToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
      }
    };
    // addEventListener on MQL isn't in very old browsers — guard it.
    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", handleBreakpoint);
    }
  }

  // Dedicated close (X) button inside the overlay top bar.
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);

  /* ------------------------------------------------------------------ */
  /* 2b. Collapsible "Packages" submenu — tapping it only expands/        */
  /*     collapses its own submenu (no navigation, doesn't close the      */
  /*     mobile drawer). Submenu links behave like normal nav links and    */
  /*     close the drawer via the listener above (they're <a> tags).      */
  /* ------------------------------------------------------------------ */
  const submenuToggles = mobileMenu
    ? mobileMenu.querySelectorAll("[data-submenu-toggle]")
    : [];

  submenuToggles.forEach((toggle) => {
    const item = toggle.closest(".mobile-menu__item--submenu");
    if (!item) return;

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      item.classList.toggle("is-expanded", !isExpanded);
    });
  });

  /* ------------------------------------------------------------------ */
  /* 2c. Desktop "Packages" dropdown — click-to-toggle (hover reveal is    */
  /*     handled entirely in CSS). Closes on outside click and Escape.    */
  /*     Scoped to `.main-nav`, which is hidden on mobile, so this never   */
  /*     touches the mobile drawer's own Packages submenu above.          */
  /* ------------------------------------------------------------------ */
  const dropdownToggles = document.querySelectorAll("[data-dropdown-toggle]");

  function closeDropdown(item, toggle) {
    item.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  dropdownToggles.forEach((toggle) => {
    const item = toggle.closest(".main-nav__item--dropdown");
    if (!item) return;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = item.classList.contains("is-open");
      // Only one dropdown exists today, but close any others defensively.
      dropdownToggles.forEach((otherToggle) => {
        const otherItem = otherToggle.closest(".main-nav__item--dropdown");
        if (otherItem && otherItem !== item) closeDropdown(otherItem, otherToggle);
      });
      item.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  if (dropdownToggles.length) {
    document.addEventListener("click", (e) => {
      dropdownToggles.forEach((toggle) => {
        const item = toggle.closest(".main-nav__item--dropdown");
        if (item && item.classList.contains("is-open") && !item.contains(e.target)) {
          closeDropdown(item, toggle);
        }
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      dropdownToggles.forEach((toggle) => {
        const item = toggle.closest(".main-nav__item--dropdown");
        if (item && item.classList.contains("is-open")) closeDropdown(item, toggle);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Dark/light theme toggle — applies site-wide via a `data-theme`   */
  /*    attribute on <html> (every component reads its colors from the   */
  /*    CSS custom properties in variables.css, which branch on that     */
  /*    attribute), persists the choice, and keeps every toggle instance  */
  /*    (header + mobile overlay) in sync. Dark is the default: the      */
  /*    attribute is only ever added for light mode, never for dark.     */
  /* ------------------------------------------------------------------ */
  if (themeToggles.length) {
    const STORAGE_KEY = "xploroo-theme";

    // aria-checked = "is dark". Apply a state to every toggle + the page.
    const applyState = (isDark, persist) => {
      themeToggles.forEach((t) =>
        t.setAttribute("aria-checked", isDark ? "true" : "false")
      );
      if (isDark) {
        root.removeAttribute("data-theme");
      } else {
        root.setAttribute("data-theme", "light");
      }
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
        } catch (_) {
          /* ignore write failures (e.g. private browsing) */
        }
      }
    };

    // Restore any previously stored preference on load (defaults to dark;
    // an early inline script in <head> already set `data-theme` before
    // first paint to avoid a flash — this just syncs the toggle UI/state).
    let storedIsLight = false;
    try {
      storedIsLight = localStorage.getItem(STORAGE_KEY) === "light";
    } catch (_) {
      /* localStorage may be unavailable (private mode) — ignore. */
    }
    applyState(!storedIsLight, false);

    themeToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const isDark = toggle.getAttribute("aria-checked") === "true";
        applyState(!isDark, true);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Logged-in account panels (mobile sidebar + desktop header)       */
  /*    Swaps the Log In / Sign Up buttons — inside the mobile drawer's   */
  /*    bottom bar AND inside the desktop `.site-header__actions` —for a  */
  /*    glass account panel once a Supabase session exists                */
  /*    (window.XploroAuth, see js/supabase.js). header.js runs on every  */
  /*    page, most of which don't declare the Supabase CDN/config         */
  /*    <script> tags themselves, so this lazily injects them once if     */
  /*    missing (see ensureSupabaseReady) rather than requiring every      */
  /*    page to add them. The role badge reads the applicant's Supabase   */
  /*    application row (window.XploroApplications, see                   */
  /*    js/influencer-applications.js), lazily loaded the same way.       */
  /*    The two panels are fully independent DOM subtrees                */
  /*    (`.mobile-menu__actions` vs `.site-header__actions`) sharing only  */
  /*    these read-only helpers — neither one's markup touches the other. */
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
      if (typeof window.supabase === "undefined") {
        await loadScriptOnce(SUPABASE_CDN_SRC);
      }
      if (!window.XploroAuth) {
        await loadScriptOnce(SUPABASE_CONFIG_SRC);
      }
      if (!window.XploroApplications) {
        await loadScriptOnce(APPLICATIONS_SRC);
      }
      return !!(window.XploroAuth && window.XploroApplications);
    } catch (_) {
      return false;
    }
  }

  async function getRoleLabel() {
    if (!window.XploroApplications) return "Traveler";
    const application = await window.XploroApplications.getMyApplication();
    return application && application.application_status === "approved" ? "Influencer" : "Traveler";
  }

  /* ---- 4a. Mobile sidebar panel ---------------------------------------- */
  const mobileActions = mobileMenu ? mobileMenu.querySelector(".mobile-menu__actions") : null;

  if (mobileActions) {
    const authButtons = Array.from(mobileActions.querySelectorAll(".btn-auth"));

    const panel = document.createElement("div");
    panel.className = "mobile-account";
    panel.hidden = true;
    panel.innerHTML = `
      <span class="mobile-account__avatar" data-mobile-account-avatar aria-hidden="true"></span>
      <span class="mobile-account__body">
        <span class="mobile-account__name" data-mobile-account-name></span>
        <span class="mobile-account__badge" data-mobile-account-badge></span>
      </span>
      <span class="mobile-account__buttons">
        <a class="mobile-account__icon-btn" href="account.html" aria-label="View Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </a>
        <button class="mobile-account__icon-btn" type="button" data-mobile-logout aria-label="Log out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        </button>
      </span>`;
    mobileActions.appendChild(panel);

    const nameEl = panel.querySelector("[data-mobile-account-name]");
    const badgeEl = panel.querySelector("[data-mobile-account-badge]");
    const avatarEl = panel.querySelector("[data-mobile-account-avatar]");
    const logoutBtn = panel.querySelector("[data-mobile-logout]");

    async function renderMobileAccountState() {
      const ready = await ensureSupabaseReady();
      const user = ready ? await window.XploroAuth.getUser() : null;

      if (user) {
        const displayName = (user.user_metadata && user.user_metadata.full_name) || user.email.split("@")[0];
        const profile = await window.XploroAuth.getProfile(user.id);
        authButtons.forEach((btn) => (btn.hidden = true));
        panel.hidden = false;
        nameEl.textContent = displayName;
        badgeEl.textContent = await getRoleLabel();
        // Single source of truth: public.profiles.avatar_url (see
        // js/supabase.js) — falls back to the first-letter avatar.
        if (profile && profile.avatar_url) {
          avatarEl.innerHTML = `<img src="${window.XploroSecurity.sanitizeUrl(profile.avatar_url, { allowData: true })}" alt="" />`;
        } else {
          avatarEl.textContent = displayName.trim().charAt(0).toUpperCase() || "?";
        }
      } else {
        authButtons.forEach((btn) => (btn.hidden = false));
        panel.hidden = true;
      }
    }

    logoutBtn.addEventListener("click", async () => {
      if (window.XploroAuth) await window.XploroAuth.signOut();
      window.location.href = "index.html";
    });

    renderMobileAccountState();
  }

  /* ---- 4b. Desktop header panel ----------------------------------------
     Scoped entirely to `.site-header__actions` (the search icon + Log In /
     Sign Up cluster) — the mobile drawer above is a separate DOM subtree
     and is never touched by this block. */
  const desktopActions = header.querySelector(".site-header__actions");

  if (desktopActions) {
    const desktopAuthButtons = Array.from(desktopActions.querySelectorAll(".btn-auth"));

    const desktopPanel = document.createElement("div");
    desktopPanel.className = "desktop-account";
    desktopPanel.hidden = true;
    desktopPanel.innerHTML = `
      <button class="desktop-account__toggle" type="button" data-desktop-account-toggle aria-haspopup="true" aria-expanded="false">
        <span class="desktop-account__avatar" data-desktop-account-avatar aria-hidden="true"></span>
        <span class="desktop-account__info">
          <span class="desktop-account__name" data-desktop-account-name></span>
          <span class="desktop-account__badge" data-desktop-account-badge></span>
        </span>
        <svg class="desktop-account__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="desktop-account__dropdown" data-desktop-account-dropdown>
        <a class="desktop-account__dropdown-link" href="account.html">&#128100; View Profile</a>
        <button class="desktop-account__dropdown-link" type="button" data-desktop-logout>&#128682; Logout</button>
      </div>`;
    desktopActions.appendChild(desktopPanel);

    const dTogglebtn = desktopPanel.querySelector("[data-desktop-account-toggle]");
    const dNameEl = desktopPanel.querySelector("[data-desktop-account-name]");
    const dBadgeEl = desktopPanel.querySelector("[data-desktop-account-badge]");
    const dAvatarEl = desktopPanel.querySelector("[data-desktop-account-avatar]");
    const dLogoutBtn = desktopPanel.querySelector("[data-desktop-logout]");

    function closeDesktopAccountMenu() {
      desktopPanel.classList.remove("is-open");
      dTogglebtn.setAttribute("aria-expanded", "false");
    }

    dTogglebtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = desktopPanel.classList.contains("is-open");
      desktopPanel.classList.toggle("is-open", !isOpen);
      dTogglebtn.setAttribute("aria-expanded", String(!isOpen));
    });
    document.addEventListener("click", (e) => {
      if (desktopPanel.classList.contains("is-open") && !desktopPanel.contains(e.target)) {
        closeDesktopAccountMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && desktopPanel.classList.contains("is-open")) closeDesktopAccountMenu();
    });

    dLogoutBtn.addEventListener("click", async () => {
      if (window.XploroAuth) await window.XploroAuth.signOut();
      window.location.href = "index.html";
    });

    async function renderDesktopAccountState() {
      const ready = await ensureSupabaseReady();
      const user = ready ? await window.XploroAuth.getUser() : null;

      if (user) {
        const displayName = (user.user_metadata && user.user_metadata.full_name) || user.email.split("@")[0];
        const profile = await window.XploroAuth.getProfile(user.id);
        desktopAuthButtons.forEach((btn) => (btn.hidden = true));
        desktopPanel.hidden = false;
        dNameEl.textContent = displayName;
        dBadgeEl.textContent = await getRoleLabel();
        // Same single source of truth as the mobile panel and account.html:
        // public.profiles.avatar_url — falls back to the first-letter avatar.
        if (profile && profile.avatar_url) {
          dAvatarEl.innerHTML = `<img src="${window.XploroSecurity.sanitizeUrl(profile.avatar_url, { allowData: true })}" alt="" />`;
        } else {
          dAvatarEl.textContent = displayName.trim().charAt(0).toUpperCase() || "?";
        }
      } else {
        desktopAuthButtons.forEach((btn) => (btn.hidden = false));
        desktopPanel.hidden = true;
        closeDesktopAccountMenu();
      }
    }

    renderDesktopAccountState();
  }

  /* ------------------------------------------------------------------ */
  /* 5. VIP nav link (Phase 23) — injected here at runtime rather than    */
  /* baked into every page's HTML, so all 69+ pages pick it up without a  */
  /* per-file edit. Deep-links straight to the new "⭐ VIP" tab on         */
  /* influencers.html (see js/influencers-dynamic.js) — VIP personalities */
  /* are just a filter on the same page now, not a separate hub page.     */
  /* ------------------------------------------------------------------ */
  (function injectVipNavLink() {
    function insertAfterHref(list, afterHref, li) {
      if (!list) return;
      const target = Array.from(list.children).find((item) => {
        const link = item.querySelector("a[href]");
        return link && link.getAttribute("href") === afterHref;
      });
      if (target) target.insertAdjacentElement("afterend", li);
      else list.appendChild(li);
    }

    const VIP_HREF = "vip.html";

    const desktopList = document.querySelector(".main-nav__list");
    if (desktopList && !desktopList.querySelector(`a[href="${VIP_HREF}"]`)) {
      const li = document.createElement("li");
      li.className = "main-nav__item";
      li.innerHTML = `<a class="main-nav__link" href="${VIP_HREF}">&#11088; VIP</a>`;
      insertAfterHref(desktopList, "influencers.html", li);
    }

    const mobileList = document.querySelector(".mobile-menu__list");
    if (mobileList && !mobileList.querySelector(`a[href="${VIP_HREF}"]`)) {
      const li = document.createElement("li");
      li.className = "mobile-menu__item";
      li.innerHTML = `<a class="mobile-menu__link" href="${VIP_HREF}">VIP</a>`;
      insertAfterHref(mobileList, "influencers.html", li);
    }
  })();
})();
