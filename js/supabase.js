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

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error("[Xploroo] getSession failed:", error.message);
      return null;
    }
    return data.session;
  }

  async function getUser() {
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
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

  window.XploroAuth = { getSession, getUser, ensureProfile, signOut, getProfile, getAvatarsByUserIds, updateAvatar };
})();
