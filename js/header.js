/* ==========================================================================
   XPLOROO · Header module
   header.js — Progressive-enhancement behavior for the site header:
     1. Sticky glass effect (backdrop blur) once the page is scrolled.
     2. Fullscreen mobile menu (open/close, a11y, scroll-lock, focus).
     3. Dark/light theme toggle (visual state only, for now).
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
})();
