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

   Approving/rejecting also mirrors the result onto the applicant's
   public.profiles row (role + influencer_status), keeping that record —
   created at signup, see js/supabase.js's ensureProfile — in sync.

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

  async function submitApplication(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const payload = {
      user_id: user.id,
      full_name: fields.fullName || "",
      profile_picture: fields.profilePicture || null,
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
    if (error) console.error("[Xploroo] Failed to submit influencer application:", error.message);
    return { data, error };
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
    return data || [];
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
    await syncProfile(application.user_id, "influencer", "approved");
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

  window.XploroApplications = { getMyApplication, submitApplication, getPendingApplications, approve, reject };
})();
