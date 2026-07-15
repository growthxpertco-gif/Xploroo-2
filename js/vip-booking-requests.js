/* ==========================================================================
   XPLOROO · VIP Booking Requests (Supabase-backed)
   vip-booking-requests.js — Single source of truth for the Phase 32 VIP
   booking workflow (public.vip_booking_requests), driven from vip.html's
   "Select VIP Personality" flow via vip-booking.html. Completely
   independent of:
     - booking.html / payment.html (the real travel package checkout)
     - vip-package.html / vip-package-booking.html (the earlier,
       vip_packages-backed placeholder VIP flow)
     - influencer bookings (public.influencer_bookings)
   No shared table, no shared data layer with any of the above.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "vip_booking_requests";

  async function submitBookingRequest(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    // No `destination` field — the VIP experience destination is a
    // surprise planned by Xploroo, never selected or shown to the
    // customer, so it's never collected or written here.
    const payload = {
      user_id: user.id,
      full_name: fields.fullName || "",
      mobile_number: fields.mobileNumber || "",
      email_address: fields.emailAddress || "",
      travellers: Number(fields.travellers) || 1,
      preferred_date: fields.preferredDate || null,
      preferred_time: fields.preferredTime || "",
      vip_personality: fields.vipPersonality || "",
      occasion: fields.occasion || null,
      special_requirements: fields.specialRequirements || null,
    };

    const { data, error } = await client.from(TABLE).insert(payload).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to submit VIP booking request:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  async function getMyBookingRequests() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client.from(TABLE).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load VIP booking requests:", error.message);
      return [];
    }
    return data || [];
  }

  window.XploroVipBookingRequests = { submitBookingRequest, getMyBookingRequests };
})();
