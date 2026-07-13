/* ==========================================================================
   XPLOROO · Supabase client + shared auth helpers
   supabase.js — Single source of truth for the Supabase connection and for
   reading "is someone logged in" anywhere on the site. Any page that needs
   Supabase loads the official CDN client (see the <script> tag placed
   right before this file — either a static <head>/<body> tag, or injected
   at runtime by js/header.js's loader for pages that don't declare it
   explicitly) and then this file, which creates exactly one client
   instance and exposes it as `window.supabaseClient`.

   window.XploroAuth is the replacement for the old localStorage
   "xploroo-session" / "xploroo-users" pair — every page-specific script
   (js/auth.js, js/account.js, js/header.js, js/admin.js) reads/writes
   auth state through these functions instead of localStorage directly:

     getSession()   -> supabase.auth.getSession() result (session|null)
     getUser()      -> supabase.auth.getUser() result (user|null)
     ensureProfile(user) -> creates the user's public.profiles row the
                             first time it's missing (id, full_name, email,
                             role: "traveler", influencer_status:
                             "not_applied", created_at) — safe to call on
                             every login/session check, it's a no-op once
                             the row exists.
     signOut()      -> supabase.auth.signOut()

   Profile picture — public.profiles.avatar_url is the single source of
   truth for every avatar on the site (account page, mobile sidebar,
   admin application cards, influencers.html cards, and anywhere else a
   user's photo appears later). Nothing stores its own copy anymore.

     getProfile(userId)        -> full profiles row (or null)
     getAvatarsByUserIds(ids)  -> Map<userId, avatar_url> for batch lookups
                                   (admin list, influencers.html grid)
     updateAvatar(userId, url) -> persists a new avatar_url

   Vanilla JS (non-module), no bundler. Loaded with `defer`, after the
   Supabase CDN `<script>` tag.
   ========================================================================== */

// Phase 20 — security hardening. Shared HTML-escaping helper used by every
// render function sitewide (dash-*.js, admin-*.js, and public pages) that
// interpolates database-sourced strings (names, bios, messages, notes,
// subjects, etc.) into innerHTML. Defined standalone, outside the IIFE
// below, so it's available even on the rare page where the Supabase client
// itself fails to initialize. Escaping the 5 characters that can start a
// new tag/attribute/entity is sufficient for safe interpolation inside
// HTML text content and quoted attribute values, which is the only context
// this codebase's template strings ever use.
window.XploroSecurity = {
  escapeHtml: function (value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  // Sanitizes a database-sourced value used as an href/src (e.g.
  // instagram_profile_link, package_image) before it's interpolated into
  // innerHTML. escapeHtml() alone isn't enough here — it stops HTML/attribute
  // breakout, but a value like `javascript:alert(document.cookie)` is valid,
  // fully-escaped attribute text that still executes when clicked/loaded.
  // This only allows http(s) links and (for images) data: URLs; anything
  // else — javascript:, vbscript:, data:text/html, malformed input — is
  // replaced with a harmless "#" so the link/image simply does nothing
  // instead of running attacker script.
  sanitizeUrl: function (value, options) {
    var opts = options || {};
    var allowData = !!opts.allowData;
    var str = String(value || "").trim();
    if (!str) return "";
    try {
      // A protocol-relative or bare-path URL has no scheme to check, and
      // the URL constructor requires a base for those — resolve against
      // location.origin only to classify the scheme; the returned value
      // is still the original (trimmed) string, never the resolved one.
      var resolved = new URL(str, window.location.origin);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") return str;
      if (allowData && resolved.protocol === "data:" && /^data:image\//i.test(str)) return str;
    } catch (_) {
      /* malformed URL — falls through to the safe default below */
    }
    return "#";
  },

  // Client-side first line of defense for file uploads (avatar/KYC docs,
  // both stored as base64 data URLs — see profiles.avatar_url /
  // kyc_submissions.*_url). The <input accept> attribute is only a UI hint
  // any user can bypass, so the real enforcement is a matching CHECK
  // constraint on each column (MIME-type allowlist + size cap) — this just
  // gives the user an immediate, friendly error instead of a failed save.
  // Never includes image/svg+xml (SVG can carry embedded scripts).
  validateUploadFile: function (file, options) {
    var opts = options || {};
    var allowedTypes = opts.allowedTypes || ["image/jpeg", "image/png", "image/gif", "image/webp"];
    var maxSizeMB = opts.maxSizeMB || 5;
    if (!file) return { ok: false, error: "No file selected." };
    if (allowedTypes.indexOf(file.type) === -1) {
      return { ok: false, error: "Unsupported file type. Please upload a " + allowedTypes.join(", ") + " file." };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { ok: false, error: "File is too large. Maximum size is " + maxSizeMB + "MB." };
    }
    return { ok: true };
  },
};

(function () {
  "use strict";

  const SUPABASE_URL = "https://ryljttolhnvyynkfwuju.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bGp0dG9saG52eXlua2Z3dWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTcwNzIsImV4cCI6MjA5OTE3MzA3Mn0.W6d83egsSQ6f8gGi9EO6jm1DtJykyLSLZI3KseJ0GDY";

  if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
    console.error(
      "[Xploroo] Supabase client library isn't loaded — make sure the CDN <script> tag (@supabase/supabase-js) appears before js/supabase.js."
    );
    return;
  }

  // Reuse a single instance even if this file is ever included twice.
  window.supabaseClient = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const client = window.supabaseClient;

  // Phase 18 — perf: getSession()/getUser() are called dozens of times per
  // page load (header.js alone calls getUser() twice, and nearly every
  // dash-*.js / data-layer module calls it again). The underlying auth
  // state cannot change within a single page's lifecycle except via
  // signOut() (which reloads the page) or a fresh sign-in, so it's safe to
  // cache the in-flight/resolved promise and share it across every caller.
  let sessionPromise = null;
  let userPromise = null;

  async function getSession() {
    if (!sessionPromise) {
      sessionPromise = client.auth.getSession().then(
        ({ data, error }) => {
          if (error) {
            console.error("[Xploroo] getSession failed:", error.message);
            return null;
          }
          return data.session;
        },
        (err) => {
          sessionPromise = null;
          throw err;
        }
      );
    }
    return sessionPromise;
  }

  async function getUser() {
    if (!userPromise) {
      userPromise = client.auth.getUser().then(
        ({ data, error }) => (error ? null : data.user),
        (err) => {
          userPromise = null;
          throw err;
        }
      );
    }
    return userPromise;
  }

  async function ensureProfile(user) {
    if (!user) return null;
    const { data: existing } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existing) return existing;

    const { error } = await client.from("profiles").insert({
      id: user.id,
      full_name: (user.user_metadata && user.user_metadata.full_name) || "",
      email: user.email || "",
      role: "traveler",
      influencer_status: "not_applied",
    });
    if (error) {
      console.error("[Xploroo] Failed to create profile row:", error.message);
      return null;
    }
    return { id: user.id };
  }

  async function signOut() {
    await client.auth.signOut();
    sessionPromise = null;
    userPromise = null;
  }

  async function getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      console.error("[Xploroo] getProfile failed:", error.message);
      return null;
    }
    return data;
  }

  async function getAvatarsByUserIds(userIds) {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!ids.length) return new Map();

    const { data, error } = await client.from("profiles").select("id, avatar_url").in("id", ids);
    if (error) {
      console.error("[Xploroo] getAvatarsByUserIds failed:", error.message);
      return new Map();
    }
    return new Map((data || []).map((row) => [row.id, row.avatar_url]));
  }

  async function updateAvatar(userId, avatarUrl) {
    if (!userId) return false;
    const { error } = await client.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    if (error) {
      console.error("[Xploroo] updateAvatar failed:", error.message);
      return false;
    }
    return true;
  }

  async function getProfilesByUserIds(userIds) {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!ids.length) return new Map();

    const { data, error } = await client.from("profiles").select("id, full_name, email, avatar_url").in("id", ids);
    if (error) {
      console.error("[Xploroo] getProfilesByUserIds failed:", error.message);
      return new Map();
    }
    return new Map((data || []).map((row) => [row.id, row]));
  }

  window.XploroAuth = {
    getSession,
    getUser,
    ensureProfile,
    signOut,
    getProfile,
    getAvatarsByUserIds,
    getProfilesByUserIds,
    updateAvatar,
  };
})();
