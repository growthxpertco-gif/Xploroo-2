/* ==========================================================================
   XPLOROO · Admin authentication (temporary, frontend-only)
   admin-auth.js — A single, deliberately separate auth system for the
   admin panel. Nothing here reads or writes any of the traveler/influencer
   auth keys ("xploroo-users" / "xploroo-session" — see js/auth.js) or vice
   versa; admin identity lives entirely under its own sessionStorage key.

   Hard-coded temporary credentials (per spec — replace with a real login
   API later): username "Xploroo", password "Xploroo123".

   window.XploroAdminAuth exposes the session read/write API so:
     - the inline guard script at the top of admin-influencer-applications.html
       can synchronously redirect before paint if there's no session, and
     - this same file's logout handler can clear it.
   Swapping in a real backend later means replacing the body of these
   functions (e.g. checking a server session / JWT instead of
   sessionStorage) — every call site stays the same.

   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const SESSION_KEY = "xploroo-admin-session";
  const ADMIN_USERNAME = "Xploroo";
  const ADMIN_PASSWORD = "Xploroo123";

  function hasAdminSession() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function createAdminSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch (_) {}
  }

  function clearAdminSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  window.XploroAdminAuth = { hasAdminSession, createAdminSession, clearAdminSession };

  /* ------------------------------------------------------------------ */
  /* Login form — admin-login.html only.                                  */
  /* ------------------------------------------------------------------ */
  const loginForm = document.querySelector("[data-admin-login-form]");
  if (loginForm) {
    const errorEl = loginForm.querySelector("[data-admin-login-error]");

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!loginForm.reportValidity()) return;

      const username = loginForm.querySelector('[name="username"]').value.trim();
      const password = loginForm.querySelector('[name="password"]').value;

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        createAdminSession();
        window.location.href = "admin-influencer-applications.html";
        return;
      }

      if (errorEl) {
        errorEl.textContent = "Invalid username or password.";
        errorEl.classList.remove("auth-message--success");
        errorEl.classList.add("auth-message--error");
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Logout button — admin-influencer-applications.html only.            */
  /* ------------------------------------------------------------------ */
  const logoutBtn = document.querySelector("[data-admin-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAdminSession();
      window.location.href = "admin-login.html";
    });
  }
})();
