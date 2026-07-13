/* ==========================================================================
   XPLOROO · Forgot Password
   forgot-password.js — Drives forgot-password.html. Before sending anything,
   asks the check-email-exists Supabase Edge Function (server-side, holds
   the service role key — never exposed here) whether the entered address
   has an Xploroo account:
     - exists   -> calls Supabase Auth's resetPasswordForEmail(), shows the
                   "reset link sent" success screen.
     - !exists  -> never calls resetPasswordForEmail(), shows
                   "This email is not registered with Xploroo."
   No custom email system, no password storage, no localStorage — Supabase
   emails the reset link and redirects the user to reset-password.html with
   a recovery session.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-forgot-form]");
  if (!form || !window.supabaseClient) return;

  const client = window.supabaseClient;
  const submitBtn = form.querySelector(".auth-submit");
  const emailInput = form.querySelector('[name="email"]');

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

  function friendlyError(err) {
    const msg = ((err && err.message) || "").toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
      return "Network error. Please check your connection and try again.";
    }
    if (msg.includes("rate limit") || msg.includes("too many") || err.status === 429) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (msg.includes("valid email") || msg.includes("invalid email") || msg.includes("unable to validate email")) {
      return "Please enter a valid email address.";
    }
    return "Something went wrong. Please try again.";
  }

  function renderSuccess() {
    const card = document.querySelector("[data-forgot-card]");
    card.innerHTML = `
      <div class="auth-result">
        <span class="auth-result__icon auth-result__icon--success" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <h2 class="auth-result__title">&#9989; Password reset link sent.</h2>
        <p class="auth-result__desc">Please check your email.</p>
        <a class="btn btn--gradient btn--pill btn--lg auth-result__back" href="login.html">Return to Login</a>
      </div>`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return; // guards against a duplicate in-flight request

    const email = emailInput.value.trim();
    if (!email) {
      showMessage("Please enter your email address.", "error");
      emailInput.focus();
      return;
    }
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    showMessage("Checking…", "success");

    try {
      // Server-side existence check (check-email-exists Edge Function) —
      // holds the service role key only in its own environment, never in
      // this file or any frontend bundle. Determines whether we're allowed
      // to call resetPasswordForEmail() at all.
      const { data: checkData, error: checkError } = await client.functions.invoke("check-email-exists", {
        body: { email },
      });

      if (checkError) {
        showMessage(friendlyError(checkError), "error");
        submitBtn.disabled = false;
        return;
      }

      if (!checkData || checkData.exists !== true) {
        showMessage("This email is not registered with Xploroo.", "error");
        submitBtn.disabled = false;
        return;
      }

      showMessage("Sending reset link…", "success");

      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: "https://growthxpertco-gif.github.io/Xploroo-2/reset-password.html",
      });

      if (error) {
        showMessage(friendlyError(error), "error");
        submitBtn.disabled = false;
        return;
      }

      renderSuccess();
    } catch (err) {
      // A thrown exception here means a request never reached Supabase.
      showMessage(friendlyError(err), "error");
      submitBtn.disabled = false;
    }
  });
})();
