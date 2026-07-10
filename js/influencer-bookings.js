/* ==========================================================================
   XPLOROO · Influencer service bookings (Supabase-backed)
   influencer-bookings.js — Single source of truth for the Influencer
   Booking workflow (Phase 6). Backed by public.influencer_bookings — one
   row per traveler booking of an influencer's service. Completely separate
   from the travel-package booking flow (js/booking.js's PACKAGES catalog +
   sessionStorage "xploroo-booking" + payment.html), which this module never
   touches.

   window.XploroInfluencerBookings is the only thing that talks to
   influencer_bookings / creates the three booking notifications — booking.js
   (create), js/dash-bookings.js (influencer accept/decline),
   js/account-bookings.js (traveler's own list) and js/admin-bookings.js
   (admin monitor-only list) all go through here.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js and js/notifications.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "influencer_bookings";

  async function attachTravelerNames(bookings) {
    if (!bookings.length) return bookings;
    const ids = Array.from(new Set(bookings.map((b) => b.traveler_user_id)));
    const { data, error } = await client.from("profiles").select("id, full_name, email").in("id", ids);
    if (error) {
      console.error("[Xploroo] Failed to load traveler profiles:", error.message);
      return bookings;
    }
    const byId = new Map((data || []).map((p) => [p.id, p]));
    return bookings.map((b) => {
      const profile = byId.get(b.traveler_user_id);
      return { ...b, traveler_name: (profile && profile.full_name) || (profile && profile.email) || "Traveler" };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Create — called from booking.html's Confirm Booking (influencer      */
  /* mode only). Sends the "Booking Created" notification to the          */
  /* influencer being booked.                                             */
  /* ------------------------------------------------------------------ */
  async function createBooking(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const payload = {
      traveler_user_id: user.id,
      influencer_user_id: fields.influencerId,
      influencer_name: fields.influencerName || "",
      service_name: fields.serviceName || "",
      service_price: fields.servicePrice != null && fields.servicePrice !== "" ? Number(fields.servicePrice) : null,
      duration: fields.duration || "",
      booking_date: fields.bookingDate || null,
      preferred_time: fields.preferredTime || "",
      notes: fields.notes || "",
    };

    const { data, error } = await client.from(TABLE).insert(payload).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create influencer booking:", error.message);
      return { data: null, error };
    }

    if (window.XploroNotifications) {
      await window.XploroNotifications.create({
        userId: fields.influencerId,
        type: "booking_created",
        title: "New Booking Request",
        message: `You have a new booking request for ${payload.service_name}.`,
        relatedBookingId: data.booking_id,
      });
    }

    if (window.XploroEarnings) {
      const travelerProfile = window.XploroAuth ? await window.XploroAuth.getProfile(user.id) : null;
      await window.XploroEarnings.createForBooking({
        bookingId: data.booking_id,
        influencerId: fields.influencerId,
        travelerName: (travelerProfile && travelerProfile.full_name) || user.email || "Traveler",
        serviceName: payload.service_name,
        bookingDate: payload.booking_date,
        amount: payload.service_price,
      });
    }

    return { data, error: null };
  }

  /* ------------------------------------------------------------------ */
  /* Influencer dashboard — Service Bookings tab.                         */
  /* ------------------------------------------------------------------ */
  async function getBookingsForInfluencer() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("influencer_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load influencer bookings:", error.message);
      return [];
    }
    return attachTravelerNames(data || []);
  }

  async function setStatus(bookingId, influencerId, serviceName, travelerUserId, status) {
    const { error } = await client.from(TABLE).update({ booking_status: status }).eq("booking_id", bookingId);
    if (error) {
      console.error(`[Xploroo] Failed to ${status.toLowerCase()} booking:`, error.message);
      return false;
    }
    if (window.XploroNotifications) {
      await window.XploroNotifications.create({
        userId: travelerUserId,
        type: status === "Accepted" ? "booking_accepted" : "booking_declined",
        title: status === "Accepted" ? "Booking Accepted" : "Booking Declined",
        message: `Your booking for ${serviceName} was ${status.toLowerCase()} by the influencer.`,
        relatedBookingId: bookingId,
      });
    }
    if (window.XploroEarnings) {
      await window.XploroEarnings.setStatusForBooking(bookingId, status === "Accepted" ? "Paid" : "Cancelled");
    }
    return true;
  }

  function accept(booking) {
    return setStatus(booking.booking_id, booking.influencer_user_id, booking.service_name, booking.traveler_user_id, "Accepted");
  }

  function decline(booking) {
    return setStatus(booking.booking_id, booking.influencer_user_id, booking.service_name, booking.traveler_user_id, "Declined");
  }

  /* ------------------------------------------------------------------ */
  /* Traveler's own bookings — account.html "My Influencer Bookings".     */
  /* ------------------------------------------------------------------ */
  async function getBookingsForTraveler() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("traveler_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load your influencer bookings:", error.message);
      return [];
    }
    return data || [];
  }

  /* ------------------------------------------------------------------ */
  /* Admin — monitor-only, every booking across every influencer.         */
  /* ------------------------------------------------------------------ */
  async function getAllBookings() {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load all influencer bookings:", error.message);
      return [];
    }
    return attachTravelerNames(data || []);
  }

  window.XploroInfluencerBookings = {
    createBooking,
    getBookingsForInfluencer,
    getBookingsForTraveler,
    getAllBookings,
    accept,
    decline,
  };
})();
