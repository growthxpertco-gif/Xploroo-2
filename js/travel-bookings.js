/* ==========================================================================
   XPLOROO · Travel package bookings (Supabase-backed)
   travel-bookings.js — Single source of truth for public.travel_bookings,
   one row per travel package booking. Created the moment a booking is
   successfully "paid" (see js/payment.js — no real gateway is wired up
   yet, so clicking Pay Securely IS the confirmation event, matching the
   file's own long-standing "swap this for the real gateway later" note).
   window.XploroTravelBookings is the only thing that talks to this table —
   js/payment.js (create), js/my-bookings.js (traveler's own list) and
   js/admin-travel-bookings.js (admin monitor-only list) all go through
   here, mirroring the exact same module shape as
   js/influencer-bookings.js (Phase 6) for consistency.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "travel_bookings";

  /* ------------------------------------------------------------------ */
  /* Create — called from payment.html's Pay Securely click. This is the  */
  /* single guaranteed write path: a travel booking can never be marked   */
  /* paid/confirmed without a row landing here first.                     */
  /* ------------------------------------------------------------------ */
  async function createBooking(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const payload = {
      traveler_user_id: user.id,
      package_slug: fields.packageSlug || null,
      package_name: fields.packageName || "",
      package_image: fields.packageImage || "",
      destination: fields.destination || "",
      duration: fields.duration || "",
      travel_date: fields.travelDate || null,
      travellers: fields.travellers != null ? Number(fields.travellers) : 1,
      total_amount: fields.totalAmount != null ? Number(fields.totalAmount) : 0,
      currency: fields.currency || "INR",
      traveler_full_name: fields.travelerFullName || "",
      traveler_email: fields.travelerEmail || "",
      traveler_phone: fields.travelerPhone || "",
      special_requests: fields.specialRequests || "",
      coupon_code: fields.couponCode || null,
      booking_status: "Confirmed",
      payment_status: "Paid",
    };

    const { data, error } = await client.from(TABLE).insert(payload).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create travel booking:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  /* ------------------------------------------------------------------ */
  /* Traveler's own bookings — my-bookings.html "Travel Packages" tab.    */
  /* ------------------------------------------------------------------ */
  async function getMyBookings() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("traveler_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load your travel bookings:", error.message);
      return [];
    }
    return data || [];
  }

  /* ------------------------------------------------------------------ */
  /* Admin — monitor-only, every travel booking across every traveler.    */
  /* ------------------------------------------------------------------ */
  async function getAllBookings() {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load all travel bookings:", error.message);
      return [];
    }
    return data || [];
  }

  window.XploroTravelBookings = { createBooking, getMyBookings, getAllBookings };
})();
