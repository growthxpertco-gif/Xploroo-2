/* ==========================================================================
   XPLOROO · Authentication module
   auth.js — Shared behavior for login.html and signup.html. Signup and
   login are backed by a single localStorage "users" list (see
   USERS_KEY below) so there's no real backend yet, but the two pages
   authenticate against the same data. Every other handler (OAuth
   buttons, forgot password) is still a placeholder no-op — only the
   forms themselves are wired up.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const USERS_KEY = "xploroo-users";
  const SESSION_KEY = "xploroo-session";

  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (_) {}
  }

  function findUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return getUsers().find((u) => u.email === normalized);
  }

  /* ------------------------------------------------------------------ */
  /* Inline status message — created once, reused for every submit.      */
  /* Sits between the last field and the submit button in both forms.    */
  /* ------------------------------------------------------------------ */
  const submitBtn = form.querySelector(".auth-submit");
  const message = document.createElement("p");
  message.className = "auth-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  submitBtn.parentElement.insertBefore(message, submitBtn);

  function showMessage(text, kind) {
    message.textContent = text;
    message.classList.remove("auth-message--success", "auth-message--error");
    message.classList.add(kind === "success" ? "auth-message--success" : "auth-message--error");
  }

  /* ------------------------------------------------------------------ */
  /* 1. Email / Password submit — signup on signup.html, sign-in on      */
  /*    login.html. Distinguished by the presence of signup-only fields  */
  /*    (fullName / confirmPassword) rather than a separate script.      */
  /* ------------------------------------------------------------------ */
  const fullNameField = form.querySelector('[name="fullName"]');
  const confirmPasswordField = form.querySelector('[name="confirmPassword"]');
  const isSignupForm = !!(fullNameField && confirmPasswordField);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!form.reportValidity()) return;

    if (isSignupForm) {
      const fullName = form.querySelector('[name="fullName"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;

      if (findUserByEmail(email)) {
        showMessage("An account with this email already exists.", "error");
        return;
      }

      const users = getUsers();
      users.push({
        fullName,
        email: email.toLowerCase(),
        password,
        createdAt: new Date().toISOString(),
      });
      saveUsers(users);

      showMessage("Account created successfully.", "success");
      form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;

      const user = findUserByEmail(email);
      if (!user || user.password !== password) {
        showMessage("Invalid email or password.", "error");
        return;
      }

      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ fullName: user.fullName, email: user.email }));
      } catch (_) {}

      showMessage("Login successful. Redirecting…", "success");
      form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
      setTimeout(() => {
        window.location.href = "account.html";
      }, 1200);
    }
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
