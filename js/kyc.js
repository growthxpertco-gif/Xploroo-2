/* ==========================================================================
   XPLOROO · Influencer KYC (Supabase-backed)
   kyc.js — public.kyc_submissions, one row per influencer (unique
   influencer_id, upsert on resubmit — same "single record, overwrite"
   pattern as influencer_services). Document/selfie uploads are stored as
   data URLs directly on the row, the same approach already used site-wide
   for profiles.avatar_url — no separate file-storage bucket exists in this
   project yet.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "kyc_submissions";

  async function getMyKyc() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return null;
    const { data, error } = await client.from(TABLE).select("*").eq("influencer_id", user.id).maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to load KYC submission:", error.message);
      return null;
    }
    return data;
  }

  async function submitKyc(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const payload = {
      influencer_id: user.id,
      full_name: fields.fullName || "",
      date_of_birth: fields.dateOfBirth || null,
      pan_number: fields.panNumber || "",
      aadhaar_number: fields.aadhaarNumber || "",
      pan_url: fields.panUrl || "",
      aadhaar_front_url: fields.aadhaarFrontUrl || "",
      aadhaar_back_url: fields.aadhaarBackUrl || "",
      selfie_url: fields.selfieUrl || "",
      bank_account_holder: fields.bankAccountHolder || "",
      bank_account_number: fields.bankAccountNumber || "",
      bank_ifsc: fields.bankIfsc || "",
      bank_name: fields.bankName || "",
      status: "Pending",
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };

    const { data, error } = await client.from(TABLE).upsert(payload, { onConflict: "influencer_id" }).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to submit KYC:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  window.XploroKyc = { getMyKyc, submitKyc };
})();
