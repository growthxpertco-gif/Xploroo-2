/* ==========================================================================
   XPLOROO · Reset Password
   reset-password.js — Drives reset-password.html. This page is only ever
   opened via the link Supabase emails from resetPasswordForEmail()
   (see js/forgot-password.js) — the link carries a recovery token in the
   URL fragment which the Supabase SDK exchanges for a real session
   automatically on load, firing a "PASSWORD_RECOVERY" auth event once
   ready. If no session ever materializes (link already used, expired, or
   the page was opened directly), the invalid-link gate is shown instead of
   the form.

   Uses Supabase Auth's official updateUser({ password }) — no custom
   password storage, no localStorage. Signs the recovery session out again
   after a successful update so the user returns to login.html and signs
   in fresh with the new password.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-reset-page]");
  if (!page || !window.supabaseClient) return;

  const client = window.supabaseClient;
  const gate = page.querySelector("[data-reset-gate]");
  const formWrap = page.querySelector("[data-reset-form-wrap]");
  const form = page.querySelector("[data-reset-form]");

  function friendlyError(err) {
    const msg = ((err && err.message) || "").toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
      return "Network error. Please check your connection and try again.";
    }
    if (msg.includes("rate limit") || msg.includes("too many") || err.status === 429) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (msg.includes("should be at least") || msg.includes("at least 6") || msg.includes("at least 8")) {
      return "Password must be at least 8 characters.";
    }
    if (msg.includes("session") || msg.includes("token") || msg.includes("expired")) {
      return "This reset link is invalid or has expired. Please request a new one.";
    }
    return "Something went wrong. Please try again.";
  }

  /* ------------------------------------------------------------------ */
  /* Inline status message                                                */
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
  /* Password visibility toggle — same pattern as js/auth.js.             */
  /* ------------------------------------------------------------------ */
  page.querySelectorAll("[data-auth-toggle-password]").forEach((btn) => {
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
  /* Live "passwords match" validation                                    */
  /* ------------------------------------------------------------------ */
  const newPasswordInput = form.querySelector('[name="newPassword"]');
  const confirmPasswordInput = form.querySelector('[name="confirmPassword"]');
  function validateMatch() {
    const mismatch = confirmPasswordInput.value.length > 0 && confirmPasswordInput.value !== newPasswordInput.value;
    confirmPasswordInput.setCustomValidity(mismatch ? "Passwords do not match." : "");
  }
  newPasswordInput.addEventListener("input", validateMatch);
  confirmPasswordInput.addEventListener("input", validateMatch);

  /* ------------------------------------------------------------------ */
  /* Submit — Supabase Auth updateUser(), then sign out and redirect.     */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return; // guards against a duplicate in-flight request

    validateMatch();
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    showMessage("Updating your password…", "success");

    try {
      const { error } = await client.auth.updateUser({ password: newPasswordInput.value });
      if (error) {
        showMessage(friendlyError(error), "error");
        submitBtn.disabled = false;
        return;
      }

      showMessage("✅ Password updated successfully.", "success");
      form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));

      // The recovery session has done its job — sign out so the user logs
      // back in fresh with the new password, exactly as the redirect target
      // (login.html) implies.
      await client.auth.signOut();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (err) {
      showMessage(friendlyError(err), "error");
      submitBtn.disabled = false;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Session gate — this page must only ever act on a genuine recovery    */
  /* link, never on "the visitor just happens to already be logged in".   */
  /* Supabase's default (implicit) flow appends `#access_token=...        */
  /* &type=recovery` to the redirect URL, which the SDK auto-exchanges    */
  /* for a session (firing a "PASSWORD_RECOVERY" event) as soon as the    */
  /* client initializes. We capture whether the URL looked like a         */
  /* recovery link *before* the SDK strips the hash, and only ever show   */
  /* the form when that's true — an unrelated pre-existing session from   */
  /* browsing the site normally must never unlock this page.              */
  /* ------------------------------------------------------------------ */
  const looksLikeRecoveryLink =
    /type=recovery/.test(window.location.hash) ||
    /type=recovery/.test(window.location.search) ||
    /access_token=/.test(window.location.hash) ||
    /[?&]code=/.test(window.location.search);

  function showGate() {
    formWrap.hidden = true;
    gate.hidden = false;
  }
  function showForm() {
    gate.hidden = true;
    formWrap.hidden = false;
  }

  if (!looksLikeRecoveryLink) {
    showGate();
    return;
  }

  let resolved = false;
  function resolveSession(hasSession) {
    if (resolved) return;
    resolved = true;
    if (hasSession) showForm();
    else showGate();
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
      resolveSession(true);
    }
  });

  client.auth.getSession().then(({ data }) => {
    // Give onAuthStateChange a brief head start to catch the recovery
    // event; if nothing has resolved yet, decide from the current session.
    setTimeout(() => resolveSession(!!data.session), 600);
  });
})();
