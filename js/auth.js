/* ==========================================================================
   XPLOROO · Authentication module
   auth.js — Shared behavior for login.html and signup.html. Signup and
   login both run on Supabase Auth (window.supabaseClient, see
   js/supabase.js) — no localStorage user store anymore. On first signup
   (once a session exists) a public.profiles row is created via
   window.XploroAuth.ensureProfile(); login re-checks/creates it too, to
   cover projects where email confirmation delays the first session.
   "Forgot Password?" is a real link straight to forgot-password.html (see
   js/forgot-password.js + js/reset-password.js) — nothing to wire up here.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-auth-form]");
  if (!form || !window.supabaseClient) return;

  const client = window.supabaseClient;

  function mapAuthError(err) {
    const message = (err && err.message) || (typeof err === "string" ? err : "");
    const msg = message.toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
      return "Network error. Please check your connection and try again.";
    }
    if (msg.includes("rate limit") || msg.includes("too many") || (err && err.status === 429)) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "An account with this email already exists.";
    }
    if (msg.includes("invalid") && msg.includes("email")) {
      return "Please enter a valid email address.";
    }
    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("password")) {
      return "Password is too weak. Please use at least 6 characters.";
    }
    return message || "Something went wrong. Please try again.";
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return; // guards against a duplicate in-flight request

    if (!form.reportValidity()) return;

    submitBtn.disabled = true;

    try {
      if (isSignupForm) {
        const fullName = form.querySelector('[name="fullName"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();
        const password = form.querySelector('[name="password"]').value;

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });

        if (error) {
          showMessage(mapAuthError(error), "error");
          submitBtn.disabled = false;
          return;
        }

        // Supabase doesn't return an error for a pre-existing, already-
        // confirmed email — as an anti-enumeration measure it responds with
        // a user object whose `identities` array is empty instead.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          showMessage("An account with this email already exists.", "error");
          submitBtn.disabled = false;
          return;
        }

        // If email confirmation is off, signUp already returns a session —
        // create the profile row now. Otherwise login.html's first sign-in
        // creates it (see the else-branch below).
        if (data.session && data.user && window.XploroAuth) {
          await window.XploroAuth.ensureProfile(data.user);
        }

        showMessage("Account created successfully.", "success");
        form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else {
        const email = form.querySelector('[name="email"]').value.trim();
        const password = form.querySelector('[name="password"]').value;

        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error) {
          showMessage(mapAuthError(error), "error");
          submitBtn.disabled = false;
          return;
        }

        if (data.user && window.XploroAuth) {
          await window.XploroAuth.ensureProfile(data.user);
        }

        showMessage("Login successful. Redirecting…", "success");
        form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
        setTimeout(() => {
          window.location.href = "account.html";
        }, 1200);
      }
    } catch (err) {
      // A thrown exception here means the request never reached Supabase
      // (e.g. offline) — reportValidity() already ruled out empty/malformed
      // fields, so anything caught here is a genuine network failure.
      showMessage(mapAuthError(err), "error");
      submitBtn.disabled = false;
    }
  });

  /* ------------------------------------------------------------------ */
  /* 2. Password visibility toggle — pure UI, no backend involved.        */
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
  /* 3. Signup only — live "passwords match" hint. Pure client-side UX,   */
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
