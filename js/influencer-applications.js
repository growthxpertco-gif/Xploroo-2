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

   Phase 10 — Instagram Ownership Verification: `application_status` itself
   is untouched (still exactly "pending" | "approved" | "rejected", so every
   existing "approved" gate across the site keeps working unmodified). A
   parallel `verification_status` column ("Verification Required" ->
   "Verification Submitted" -> "Verified") tracks the applicant's proof of
   Instagram bio ownership, and approve() now refuses to run unless
   verification_status is "Verified" — see submitVerification()/
   verifyOwnership()/approve() below.

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

  // Phase 10 — Instagram Ownership Verification. Every application gets a
  // unique "XP-#####" code (retried on the rare collision, guarded by the
  // `influencer_applications_verification_code_key` unique index) that the
  // applicant must temporarily add to their Instagram bio before an admin
  // can verify and approve the application. See submitApplication(),
  // submitVerification() and verifyOwnership() below.
  function generateVerificationCode() {
    const digits = Math.floor(10000 + Math.random() * 90000);
    return `XP-${digits}`;
  }

  async function uniqueVerificationCode() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateVerificationCode();
      const { data } = await client.from(TABLE).select("id").eq("verification_code", candidate).maybeSingle();
      if (!data) return candidate;
    }
    // Astronomically unlikely fallback — still unique enough in practice.
    return `${generateVerificationCode()}-${Date.now().toString(36).toUpperCase()}`;
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
    const verificationCode = await uniqueVerificationCode();

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
      // Phase 10 — every (re-)submission starts a fresh Instagram ownership
      // verification cycle, so a resubmission after a rejection can't reuse
      // a stale/removed code.
      verification_code: verificationCode,
      verification_status: "Verification Required",
      verification_submitted_at: null,
      verified_at: null,
      verified_by: null,
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

  // Phase 10 — the applicant confirms they've added the verification code
  // to their Instagram bio. This never approves anything by itself; it just
  // hands the application to the admin queue for a manual bio check.
  async function submitVerification(application) {
    const { data, error } = await client
      .from(TABLE)
      .update({ verification_status: "Verification Submitted", verification_submitted_at: new Date().toISOString() })
      .eq("id", application.id)
      .eq("verification_status", "Verification Required")
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to submit Instagram verification:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  // Admin-only: confirms the verification code was found in the applicant's
  // Instagram bio. Conditional on the row still being "Verification
  // Submitted" so a duplicate click can't double-process it.
  async function verifyOwnership(application) {
    const { data, error } = await client
      .from(TABLE)
      .update({ verification_status: "Verified", verified_at: new Date().toISOString(), verified_by: "Admin" })
      .eq("id", application.id)
      .eq("verification_status", "Verification Submitted")
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to verify Instagram ownership:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  async function approve(application) {
    // Approval rule (Phase 10): an application can only be approved once
    // its Instagram ownership has been verified by an admin.
    if (!application || application.verification_status !== "Verified") {
      return { ok: false, error: "This Instagram account has not been verified." };
    }

    const { error } = await client
      .from(TABLE)
      .update({ application_status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: "Admin" })
      .eq("id", application.id);
    if (error) {
      console.error("[Xploroo] Failed to approve application:", error.message);
      return { ok: false, error: error.message };
    }
    await syncProfile(application.user_id, "traveler,influencer", "approved");
    return { ok: true };
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
    submitVerification,
    verifyOwnership,
    approve,
    reject,
  };
})();
