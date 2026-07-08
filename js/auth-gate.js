/* ==========================================================================
   XPLOROO · Auth gate module
   auth-gate.js — Restricts Play & Win (travel-quizzes.html) to logged-in
   visitors. Delegated click listener catches every link to that page
   (header nav, mobile menu, footer — no per-link wiring needed); if the
   visitor isn't logged in, navigation is cancelled and a premium "Login
   Required" modal is shown instead (built and injected here — no static
   markup needed on any page).

   SWAPPING IN REAL AUTH LATER
   ---------------------------
   `isLoggedIn()` is the ONLY function that needs to change. Right now it
   reads a placeholder localStorage flag; once real authentication exists,
   replace its body with the real session/API check and every call site in
   this file (and any other script that wants to gate something) keeps
   working unchanged.

   Vanilla JS, no dependencies. Loaded with `defer`. Never runs on
   travel-quizzes.html itself — that page is intentionally not gated by
   this script (see the task this shipped under: "do not modify the Play &
   Win page itself").
   ========================================================================== */
(function () {
  "use strict";

  const GATED_PAGE = "travel-quizzes.html";
  const STORAGE_KEY = "xploroo-logged-in";

  /* ------------------------------------------------------------------ */
  /* Placeholder auth check — replace this one function when real login  */
  /* ships. Everything else in this file is written against it, not      */
  /* against localStorage directly.                                      */
  /* ------------------------------------------------------------------ */
  function isLoggedIn() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (_) {
      return false; // storage unavailable (e.g. private browsing) — treat as signed out
    }
  }

  /* A link "goes to" the gated page if its href resolves to it, ignoring
     any query string/hash (e.g. a future `?tab=weekly` variant still gates). */
  function isGatedLink(link) {
    if (!link) return false;
    let url;
    try {
      url = new URL(link.getAttribute("href") || "", window.location.href);
    } catch (_) {
      return false;
    }
    return url.pathname.replace(/^\/+/, "").split("/").pop() === GATED_PAGE;
  }

  /* ------------------------------------------------------------------ */
  /* Modal — built once, lazily, only if a gated click actually happens   */
  /* (pages a signed-out visitor never touches Play & Win from stay free  */
  /* of the extra DOM). */
  /* ------------------------------------------------------------------ */
  let modalEl = null;
  let lastFocused = null;

  function buildModal() {
    const el = document.createElement("div");
    el.className = "auth-gate";
    el.hidden = true;
    el.innerHTML =
      '<div class="auth-gate__backdrop" data-auth-gate-dismiss></div>' +
      '<div class="auth-gate__panel" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">' +
        '<h2 class="auth-gate__title" id="auth-gate-title">Login Required</h2>' +
        '<p class="auth-gate__message">Please sign in to your Xploroo account to access the Play &amp; Win Zone, participate in challenges, earn Xploroo Coins, and compete for exciting rewards.</p>' +
        '<div class="auth-gate__actions">' +
          '<a class="btn btn--gradient btn--pill auth-gate__login" href="login.html">Login</a>' +
          '<a class="btn btn--glass btn--pill auth-gate__signup" href="signup.html">Sign Up</a>' +
        "</div>" +
        '<button class="auth-gate__later" type="button" data-auth-gate-dismiss>Maybe Later</button>' +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  function openModal() {
    if (!modalEl) modalEl = buildModal();
    lastFocused = document.activeElement;

    modalEl.hidden = false;
    void modalEl.offsetWidth; // force reflow so the fade-in transition runs
    modalEl.classList.add("is-open");

    const panel = modalEl.querySelector(".auth-gate__panel");
    if (panel) panel.focus?.();

    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    if (!modalEl || !modalEl.classList.contains("is-open")) return;
    modalEl.classList.remove("is-open");
    document.removeEventListener("keydown", onKeydown);

    const done = () => {
      if (!modalEl.classList.contains("is-open")) modalEl.hidden = true;
      modalEl.removeEventListener("transitionend", done);
    };
    modalEl.addEventListener("transitionend", done);

    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  /* ------------------------------------------------------------------ */
  /* Delegated listeners — cover every current and future Play & Win link */
  /* on the page (nav, mobile menu, footer) with one handler each.        */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-auth-gate-dismiss]")) {
      closeModal();
      return;
    }

    const link = e.target.closest("a[href]");
    if (!isGatedLink(link)) return;
    if (isLoggedIn()) return; // signed in — let normal navigation proceed

    e.preventDefault();
    openModal();
  });
})();
