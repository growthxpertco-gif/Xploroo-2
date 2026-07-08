/* ==========================================================================
   XPLOROO · Authentication module
   auth.js — Shared behavior for login.html and signup.html. Every handler
   below is a placeholder: forms never submit anywhere and no network calls
   are made. Each block is written so a real integration can replace just
   its body later without touching markup or other handlers.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  /* ------------------------------------------------------------------ */
  /* 1. Email / Password submit — placeholder only.                       */
  /*    Future: POST credentials to the auth backend, then redirect to    */
  /*    the user's dashboard on success.                                  */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Intentionally a no-op for now — see comment above.
  });

  /* ------------------------------------------------------------------ */
  /* 2. Google OAuth — placeholder only.                                  */
  /*    Future: kick off the Google Identity Services / OAuth redirect.   */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-auth-google]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Intentionally a no-op for now — see comment above.
    });
  });

  /* ------------------------------------------------------------------ */
  /* 3. Apple Sign In — placeholder only.                                 */
  /*    Future: kick off the Sign in with Apple JS flow.                  */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-auth-apple]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Intentionally a no-op for now — see comment above.
    });
  });

  /* ------------------------------------------------------------------ */
  /* 4. Forgot Password — placeholder only.                               */
  /*    Future: link to a dedicated reset-password flow/page.             */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-auth-forgot-password]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      // Intentionally a no-op for now — see comment above.
    });
  });

  /* ------------------------------------------------------------------ */
  /* 5. Password visibility toggle — pure UI, no backend involved.        */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-auth-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("aria-controls"));
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.setAttribute("aria-pressed", String(isHidden));
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
  });

  /* ------------------------------------------------------------------ */
  /* 6. Signup only — live "passwords match" hint. Pure client-side UX,   */
  /*    not an authentication feature.                                    */
  /* ------------------------------------------------------------------ */
  const password = form.querySelector('[name="password"]');
  const confirmPassword = form.querySelector('[name="confirmPassword"]');
  if (password && confirmPassword) {
    const validateMatch = () => {
      const mismatch = confirmPassword.value.length > 0 && confirmPassword.value !== password.value;
      confirmPassword.setCustomValidity(mismatch ? "Passwords do not match." : "");
    };
    password.addEventListener("input", validateMatch);
    confirmPassword.addEventListener("input", validateMatch);
  }
})();
