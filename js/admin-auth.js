/* ==========================================================================
   XPLOROO · Admin authentication
   admin-auth.js — Session read/write API for the admin panel. As of the
   Phase 20 security hardening, the actual username/password check no
   longer happens here (or anywhere in frontend code) — it's verified
   server-side by the admin-login Edge Function against a bcrypt hash
   (public.admin_credentials), which only a service-role caller can read.
   On success it issues an opaque, short-lived session token stored in
   public.admin_sessions (a table the browser can never read or write
   directly). Every admin mutation (js/admin*.js) sends this token to the
   admin-api Edge Function, which re-verifies it server-side on every call
   before touching the database — so even a JavaScript-console/sessionStorage
   bypass of the client-side gate below grants no real capability, since the
   underlying writes are re-checked independently of anything the browser
   claims.

   window.XploroAdminAuth exposes the session read/write API so:
     - the inline guard script at the top of admin-influencer-applications.html
       can synchronously redirect before paint if there's no (unexpired)
       local session, and
     - every admin-*.js mutation call site can read the current token.
   The client-side session is a UX convenience only — the server-side check
   in admin-api is the real security boundary.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const SESSION_KEY = "xploroo-admin-session";
  const ADMIN_LOGIN_URL = "https://ryljttolhnvyynkfwuju.supabase.co/functions/v1/admin-login";
  const ADMIN_API_URL = "https://ryljttolhnvyynkfwuju.supabase.co/functions/v1/admin-api";

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.token || !parsed.expiresAt) return null;
      if (new Date(parsed.expiresAt) <= new Date()) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function hasAdminSession() {
    return !!readSession();
  }

  function getAdminToken() {
    const session = readSession();
    return session ? session.token : null;
  }

  function storeSession(token, expiresAt) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt }));
    } catch (_) {}
  }

  function clearAdminSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  // Every admin mutation (approve/reject, mark paid, post announcement,
  // etc.) goes through here — a thin wrapper around admin-api that attaches
  // the current session token. Returns the parsed JSON response either way;
  // callers check `.ok`/`.error` themselves, same shape as before.
  async function callAdminApi(action, payload) {
    const token = getAdminToken();
    if (!token) {
      clearAdminSession();
      window.location.href = "admin-login.html";
      return { ok: false, error: "Session expired. Please log in again." };
    }
    try {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, payload: payload || {} }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearAdminSession();
        window.location.href = "admin-login.html";
      }
      return { ok: res.ok && data.ok !== false, error: data.error || null, data };
    } catch (_err) {
      return { ok: false, error: "Network error. Please check your connection and try again." };
    }
  }

  window.XploroAdminAuth = { hasAdminSession, getAdminToken, clearAdminSession, callAdminApi };

  /* ------------------------------------------------------------------ */
  /* Login form — admin-login.html only.                                  */
  /* ------------------------------------------------------------------ */
  const loginForm = document.querySelector("[data-admin-login-form]");
  if (loginForm) {
    const errorEl = loginForm.querySelector("[data-admin-login-error]");
    const submitBtn = loginForm.querySelector('[type="submit"]');

    function showError(text) {
      if (!errorEl) return;
      errorEl.textContent = text;
      errorEl.classList.remove("auth-message--success");
      errorEl.classList.add("auth-message--error");
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginForm.reportValidity()) return;
      if (submitBtn && submitBtn.disabled) return;

      const username = loginForm.querySelector('[name="username"]').value.trim();
      const password = loginForm.querySelector('[name="password"]').value;

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch(ADMIN_LOGIN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.token) {
          // Distinguish "wrong credentials" from every other failure mode
          // (rate-limited, server error, malformed response) instead of
          // collapsing them all into the same misleading message — makes a
          // real backend/deployment problem immediately diagnosable instead
          // of looking identical to a typo'd password.
          if (res.status === 401) {
            showError(data.error || "Invalid username or password.");
          } else if (res.status === 429) {
            showError(data.error || "Too many attempts. Please try again later.");
          } else {
            console.error("[Xploroo Admin] Unexpected admin-login response:", res.status, data);
            showError(data.error || `Login failed (server error ${res.status}). Please try again.`);
          }
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        storeSession(data.token, data.expiresAt);
        window.location.href = "admin-influencer-applications.html";
      } catch (_err) {
        showError("Network error. Please check your connection and try again.");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Logout button — admin-influencer-applications.html only.            */
  /* ------------------------------------------------------------------ */
  const logoutBtn = document.querySelector("[data-admin-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const token = getAdminToken();
      clearAdminSession();
      if (token) {
        // Revoke server-side immediately rather than waiting for the
        // session to merely expire — best-effort, doesn't block navigation.
        fetch(ADMIN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action: "logout" }),
        }).catch(() => {});
      }
      window.location.href = "admin-login.html";
    });
  }
})();
