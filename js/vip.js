/* ==========================================================================
   XPLOROO · VIP Experiences (Supabase-backed)
   vip.js — Single source of truth for public.vip_bookings, the real
   booking workflow behind vip.html / vip-meet-greet.html / vip-vlog.html /
   vip-booking.html (Phase 22). No membership lock yet — every signed-in
   user can create a VIP booking; the only thing later gating this behind
   VIP membership will add is a `profiles.is_vip` check before allowing
   access (see js/supabase.js — the column already exists, unused today).

   Booking stays `payment_status: "Pending Payment"` until a real payment
   gateway is wired up later — nothing here simulates or fakes a payment.

   Notifications:
     - Customer gets one at creation (self-notice, always allowed by RLS)
       and one on every admin status change (approved/rejected/completed/
       cancelled — sent server-side via admin-api, see that Edge Function).
     - The assigned influencer (if any) gets one at creation too — the
       customer inserting a notification for a DIFFERENT user's id only
       works because of a dedicated RLS policy that checks a real,
       just-created vip_bookings row ties the two together (see the Phase
       22 migration) — not a blanket "anyone can notify anyone" policy.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "vip_bookings";

  async function createBooking(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const payload = {
      customer_user_id: user.id,
      customer_name: fields.customerName || "",
      customer_email: fields.customerEmail || "",
      customer_phone: fields.customerPhone || "",
      travel_date: fields.travelDate || null,
      vip_package: fields.vipPackage, // 'meet_greet' | 'vlog'
      booking_type: fields.bookingType || "",
      destination: fields.destination || "",
      influencer_id: fields.influencerId || null,
      influencer_name: fields.influencerName || "",
      guests: fields.guests != null && fields.guests !== "" ? Number(fields.guests) : 1,
      special_request: fields.specialRequest || "",
    };

    const { data, error } = await client.from(TABLE).insert(payload).select().maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create VIP booking:", error.message);
      return { data: null, error };
    }

    if (window.XploroNotifications) {
      // Self-notice — always allowed (auth.uid() = user_id).
      window.XploroNotifications.create({
        userId: user.id,
        type: "vip_booking_created",
        title: "VIP Booking Received",
        message: `Your VIP ${payload.vip_package === "vlog" ? "Vlog Experience" : "Meet & Greet"} booking (${payload.booking_type}) has been received and is pending review.`,
        relatedVipBookingId: data.booking_id,
      });

      // Notify the assigned influencer, if any — permitted only because a
      // real vip_bookings row now exists tying this customer to that
      // influencer (see the RLS policy added alongside this table).
      if (payload.influencer_id) {
        window.XploroNotifications.create({
          userId: payload.influencer_id,
          type: "vip_booking_created",
          title: "New VIP Booking",
          message: `${payload.customer_name} booked a VIP ${payload.vip_package === "vlog" ? "Vlog Experience" : "Meet & Greet"} (${payload.booking_type}) with you.`,
          relatedVipBookingId: data.booking_id,
        });
      }
    }

    return { data, error: null };
  }

  async function getMyBookings() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load your VIP bookings:", error.message);
      return [];
    }
    return data || [];
  }

  async function getBookingsForInfluencer() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("influencer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load assigned VIP bookings:", error.message);
      return [];
    }
    return data || [];
  }

  window.XploroVip = { createBooking, getMyBookings, getBookingsForInfluencer };
})();
