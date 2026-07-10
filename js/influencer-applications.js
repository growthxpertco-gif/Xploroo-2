/* ==========================================================================
   XPLOROO · Influencer applications (Supabase-backed)
   influencer-applications.js — Single source of truth for the Traveler →
   Influencer application/approval workflow, replacing the old localStorage
   "xploroo-user-role" module (js/user-role.js, no longer used). Backed by
   the public.influencer_applications table (one row per user, unique on
   user_id — re-applying after a rejection overwrites the same row via
   upsert, which is what makes duplicate applications impossible).

   window.XploroApplications is the only thing every other page-specific
   script (influencer-application.js, admin.js, account.js,
   influencer-dashboard.js, dash-sections.js) talks to — none of them touch
   Supabase or localStorage directly for application state anymore. That's
   the seam for anything that changes later (e.g. real admin auth instead
   of the current prototype): only this file's internals would need to
   change.

   Every state change also mirrors onto the applicant's public.profiles
   row (role + influencer_status — created at signup, see
   js/supabase.js's ensureProfile), so profiles always matches the
   influencer_applications status:
     not applied yet -> role: "traveler",              influencer_status: "not_applied" (signup default)
     pending          -> role: "traveler",              influencer_status: "pending"
     approved         -> role: "traveler,influencer",   influencer_status: "approved"
     rejected         -> role: "traveler",              influencer_status: "rejected"

   Profile picture: public.profiles.avatar_url is the single source of
   truth (see js/supabase.js) — this table has no picture column of its
   own. getPendingApplications()/getApprovedApplications() below attach
   each row's avatar_url from profiles so callers (admin.js,
   influencers-dynamic.js) never query profiles themselves.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "influencer_applications";

  async function getMyApplication() {
    if (!window.XploroAuth) return null;
    const user = await window.XploroAuth.getUser();
    if (!user) return null;

    const { data, error } = await client.from(TABLE).select("*").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to load influencer application:", error.message);
      return null;
    }
    return data;
  }

  function slugify(name) {
    return (name || "influencer")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "influencer";
  }

  // Ensures `base` is unique in influencer_applications.username, excluding
  // the applicant's own row (so re-submitting keeps the same slug).
  async function uniqueUsername(base, userId) {
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const { data } = await client.from(TABLE).select("user_id").eq("username", candidate).maybeSingle();
      if (!data || data.user_id === userId) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  async function submitApplication(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const username = await uniqueUsername(slugify(fields.fullName), user.id);

    const payload = {
      user_id: user.id,
      full_name: fields.fullName || "",
      username,
      instagram_followers: fields.followers ? Number(fields.followers) : null,
      instagram_profile_link: fields.instagram || "",
      short_bio: fields.bio || "",
      niche: fields.niche || "",
      application_status: "pending",
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };

    const { data, error } = await client.from(TABLE).upsert(payload, { onConflict: "user_id" }).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to submit influencer application:", error.message);
      return { data, error };
    }

    // Covers both a first-time submission and a rejected user applying
    // again — either way the profile should now read "pending".
    await syncProfile(user.id, "traveler", "pending");

    // The profile picture (if the applicant chose one on this form) is
    // stored once, on profiles.avatar_url — never duplicated here.
    if (fields.profilePicture && window.XploroAuth) {
      await window.XploroAuth.updateAvatar(user.id, fields.profilePicture);
    }

    return { data, error };
  }

  async function attachAvatars(applications) {
    if (!applications.length || !window.XploroAuth) return applications;
    const avatars = await window.XploroAuth.getAvatarsByUserIds(applications.map((a) => a.user_id));
    return applications.map((a) => ({ ...a, avatar_url: avatars.get(a.user_id) || null }));
  }

  async function getPendingApplications() {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("application_status", "pending")
      .order("submitted_at", { ascending: true });
    if (error) {
      console.error("[Xploroo] Failed to load pending applications:", error.message);
      return [];
    }
    return attachAvatars(data || []);
  }

  async function getApprovedApplications() {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("application_status", "approved")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load approved applications:", error.message);
      return [];
    }
    return attachAvatars(data || []);
  }

  // Resolves the single reusable influencer-profile.html to a specific
  // approved influencer, by ?id=<user_id> or ?username=<slug>. Returns null
  // if not found or not approved (profile page then shows a not-found state).
  async function getApprovedByIdOrUsername({ id, username }) {
    let query = client.from(TABLE).select("*").eq("application_status", "approved");
    query = id ? query.eq("user_id", id) : query.eq("username", username);

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to load influencer profile:", error.message);
      return null;
    }
    if (!data) return null;

    const [withAvatar] = await attachAvatars([data]);
    return withAvatar;
  }

  async function syncProfile(userId, role, influencerStatus) {
    const { error } = await client.from("profiles").update({ role, influencer_status: influencerStatus }).eq("id", userId);
    if (error) console.error("[Xploroo] Failed to sync profile after review:", error.message);
  }

  async function approve(application) {
    const { error } = await client
      .from(TABLE)
      .update({ application_status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: "Admin" })
      .eq("id", application.id);
    if (error) {
      console.error("[Xploroo] Failed to approve application:", error.message);
      return false;
    }
    await syncProfile(application.user_id, "traveler,influencer", "approved");
    return true;
  }

  async function reject(application) {
    const { error } = await client
      .from(TABLE)
      .update({ application_status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: "Admin" })
      .eq("id", application.id);
    if (error) {
      console.error("[Xploroo] Failed to reject application:", error.message);
      return false;
    }
    await syncProfile(application.user_id, "traveler", "rejected");
    return true;
  }

  window.XploroApplications = {
    getMyApplication,
    submitApplication,
    getPendingApplications,
    getApprovedApplications,
    getApprovedByIdOrUsername,
    approve,
    reject,
  };
})();
