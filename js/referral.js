/* ==========================================================================
   XPLOROO · Influencer Referral & Discount System (Supabase-backed)
   referral.js — Single source of truth for public.referral_codes,
   referral_settings, referral_bookings and referral_commissions. Every
   other referral file (js/referral-capture.js, booking.js/payment.js's
   referral hooks, js/dash-referrals.js, js/admin-referrals.js) goes
   through window.XploroReferrals — nothing talks to these tables directly.

   Design notes:
     - A referral code is generated once, the first time it's needed for a
       given influencer (called from influencer-applications.js's approve()
       right after an application is approved — see ensureCodeForInfluencer()
       below), and never regenerated: referral_codes.influencer_id is
       UNIQUE, so a second call for the same influencer just returns the
       existing row.
     - referral_bookings.booking_id is UNIQUE — a single travel_bookings row
       can never carry two referrals (prevents stacking/duplicate discounts).
     - referral_commissions.referral_booking_id is UNIQUE — a booking can
       never generate a duplicate commission even if creation is retried.
     - Commission is calculated against the booking's ORIGINAL (pre-discount)
       amount, using whatever percentages are configured in
       referral_settings at the moment of booking — matches the worked
       example in the spec (₹100,000 booking → 5% customer discount AND
       10% influencer commission, both computed off the same ₹100,000).
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const CODES_TABLE = "referral_codes";
  const SETTINGS_TABLE = "referral_settings";
  const BOOKINGS_TABLE = "referral_bookings";
  const COMMISSIONS_TABLE = "referral_commissions";

  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids visual ambiguity
  function generateCode() {
    let code = "";
    for (let i = 0; i < 7; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return code;
  }

  /* ------------------------------------------------------------------ */
  /* Referral codes                                                      */
  /* ------------------------------------------------------------------ */

  // Called once from influencer-applications.js's approve(). Idempotent: if
  // this influencer already has a code (e.g. re-approved after a prior
  // rejection), the existing row/code is returned untouched — "the
  // referral code should never change".
  async function ensureCodeForInfluencer(influencerId) {
    const { data: existing } = await client.from(CODES_TABLE).select("code").eq("influencer_id", influencerId).maybeSingle();
    if (existing) return existing.code;

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      const { data, error } = await client
        .from(CODES_TABLE)
        .insert({ influencer_id: influencerId, code })
        .select("code")
        .maybeSingle();
      if (!error && data) return data.code;
      // Unique-constraint collision on `code` (astronomically unlikely with
      // a 7-char, 33-symbol alphabet) — just try another one.
    }
    return null;
  }

  async function getMyReferralCode() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return null;
    const { data } = await client.from(CODES_TABLE).select("code").eq("influencer_id", user.id).maybeSingle();
    if (data) return data.code;
    // Self-heals for any influencer approved before this feature existed.
    return ensureCodeForInfluencer(user.id);
  }

  function referralLink(code) {
    return `https://growthxpertco-gif.github.io/Xploroo-2/?ref=${code}`;
  }

  // Resolves a raw code OR a full referral link to { code, influencerId },
  // or null if the code doesn't exist. Used by both the homepage capture
  // script and the booking page's manual entry field.
  async function resolveReferral(raw) {
    if (!raw) return null;
    let code = raw.trim();
    const linkMatch = code.match(/[?&]ref=([A-Za-z0-9]+)/);
    if (linkMatch) code = linkMatch[1];
    code = code.toUpperCase();
    if (!code) return null;

    const { data, error } = await client.from(CODES_TABLE).select("code, influencer_id").eq("code", code).maybeSingle();
    if (error || !data) return null;
    return { code: data.code, influencerId: data.influencer_id };
  }

  /* ------------------------------------------------------------------ */
  /* Settings                                                             */
  /* ------------------------------------------------------------------ */
  async function getSettings() {
    const { data, error } = await client.from(SETTINGS_TABLE).select("*").eq("id", 1).maybeSingle();
    if (error || !data) return { customer_discount_percent: 5, influencer_commission_percent: 10 };
    return data;
  }

  async function updateSettings({ customerDiscountPercent, influencerCommissionPercent }) {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .update({
        customer_discount_percent: Number(customerDiscountPercent),
        influencer_commission_percent: Number(influencerCommissionPercent),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to update referral settings:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  /* ------------------------------------------------------------------ */
  /* Booking-time — create the referral booking + commission             */
  /* ------------------------------------------------------------------ */

  // Called from travel-bookings.js's createBooking(), only ever after the
  // travel_bookings row itself has already been inserted — commission is
  // never generated before payment. Self-referral (customer === the
  // referring influencer) and duplicate-per-booking are both blocked here
  // as a second line of defense on top of the DB's own unique constraints.
  async function recordReferralForBooking({ bookingId, customerId, referral, originalAmount, discountAmount, finalAmount }) {
    if (!referral || !referral.code || !referral.influencerId) return { data: null, error: null };
    if (referral.influencerId === customerId) {
      return { data: null, error: new Error("Self-referral is not allowed.") };
    }

    const { data: refBooking, error: refBookingError } = await client
      .from(BOOKINGS_TABLE)
      .insert({
        booking_id: bookingId,
        influencer_id: referral.influencerId,
        customer_id: customerId,
        referral_code: referral.code,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: "Confirmed",
      })
      .select()
      .maybeSingle();
    if (refBookingError || !refBooking) {
      // Most likely cause: booking_id already has a referral (unique
      // constraint) — i.e. this exact booking was already processed.
      console.error("[Xploroo] Failed to record referral booking:", refBookingError && refBookingError.message);
      return { data: null, error: refBookingError };
    }

    const settings = await getSettings();
    const discountPercent = Number(settings.customer_discount_percent) || 0;
    const commissionPercent = Number(settings.influencer_commission_percent) || 0;
    const commissionAmount = Math.round(originalAmount * (commissionPercent / 100));

    const { data: commission, error: commissionError } = await client
      .from(COMMISSIONS_TABLE)
      .insert({
        referral_booking_id: refBooking.id,
        booking_id: bookingId,
        influencer_id: referral.influencerId,
        customer_id: customerId,
        referral_code: referral.code,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        status: "Pending",
      })
      .select()
      .maybeSingle();
    if (commissionError) {
      console.error("[Xploroo] Failed to record referral commission:", commissionError.message);
      return { data: refBooking, error: commissionError };
    }

    if (window.XploroNotifications) {
      window.XploroNotifications.create({
        userId: referral.influencerId,
        type: "referral_booking_completed",
        title: "New Referral Booking Completed",
        message: `A traveller booked using your referral code ${referral.code}. You earned ₹${commissionAmount.toLocaleString("en-IN")} commission.`,
      });
      window.XploroNotifications.create({
        userId: referral.influencerId,
        type: "referral_commission_earned",
        title: "Referral Commission Earned",
        message: `₹${commissionAmount.toLocaleString("en-IN")} commission is pending review for your ${referral.code} referral.`,
      });
    }

    return { data: commission, error: null };
  }

  /* ------------------------------------------------------------------ */
  /* Influencer Dashboard — my referral stats                            */
  /* ------------------------------------------------------------------ */
  async function getMyReferralStats() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { code: null, link: null, bookings: 0, totalEarnings: 0, availableBalance: 0, totalDiscountsGiven: 0 };

    const code = await getMyReferralCode();
    const [{ data: bookings }, { data: commissions }] = await Promise.all([
      client.from(BOOKINGS_TABLE).select("*").eq("influencer_id", user.id),
      client.from(COMMISSIONS_TABLE).select("*").eq("influencer_id", user.id),
    ]);

    const activeBookings = (bookings || []).filter((b) => b.status !== "Refunded");
    const totalDiscountsGiven = activeBookings.reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);
    const nonReversed = (commissions || []).filter((c) => c.status !== "Reversed");
    const totalEarnings = nonReversed.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
    const availableBalance = (commissions || [])
      .filter((c) => c.status === "Paid")
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    return {
      code,
      link: code ? referralLink(code) : null,
      bookings: activeBookings.length,
      totalEarnings,
      availableBalance,
      totalDiscountsGiven,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Admin — Referral Management tab                                     */
  /* ------------------------------------------------------------------ */
  async function getAllReferralSummaries() {
    const [{ data: codes }, { data: bookings }, { data: commissions }] = await Promise.all([
      client.from(CODES_TABLE).select("*"),
      client.from(BOOKINGS_TABLE).select("*"),
      client.from(COMMISSIONS_TABLE).select("*"),
    ]);

    return (codes || []).map((c) => {
      const myBookings = (bookings || []).filter((b) => b.influencer_id === c.influencer_id && b.status !== "Refunded");
      const myCommissions = (commissions || []).filter((cm) => cm.influencer_id === c.influencer_id);
      const discountGiven = myBookings.reduce((s, b) => s + Number(b.discount_amount || 0), 0);
      const commissionEarned = myCommissions.filter((cm) => cm.status !== "Reversed").reduce((s, cm) => s + Number(cm.commission_amount || 0), 0);
      const pendingCommission = myCommissions.filter((cm) => cm.status === "Pending").reduce((s, cm) => s + Number(cm.commission_amount || 0), 0);
      const paidCommission = myCommissions.filter((cm) => cm.status === "Paid").reduce((s, cm) => s + Number(cm.commission_amount || 0), 0);
      return {
        influencerId: c.influencer_id,
        code: c.code,
        bookingsCount: myBookings.length,
        discountGiven,
        commissionEarned,
        pendingCommission,
        paidCommission,
        availableBalance: paidCommission,
      };
    });
  }

  // Admin action: mark a Pending commission as Paid, and feed it into the
  // SAME public.earnings table the withdrawal system already reads —
  // reuses the existing balance/withdrawal machinery exactly as-is instead
  // of building a second one.
  async function markCommissionPaid(commissionId) {
    const { data: commission, error } = await client
      .from(COMMISSIONS_TABLE)
      .update({ status: "Paid" })
      .eq("id", commissionId)
      .eq("status", "Pending")
      .select()
      .maybeSingle();
    if (error || !commission) {
      return { data: null, error: error || new Error("This commission has already been processed.") };
    }

    if (window.XploroEarnings) {
      await client.from("earnings").insert({
        booking_id: commission.booking_id,
        influencer_id: commission.influencer_id,
        traveler_name: "Referral Commission",
        service_name: `Referral (${commission.referral_code})`,
        booking_date: new Date().toISOString().slice(0, 10),
        amount: commission.commission_amount,
        status: "Paid",
      });
    }

    return { data: commission, error: null };
  }

  // Admin action: reverse the commission for a booking that's just been
  // refunded (called from admin-travel-bookings.js's "Mark Refunded"
  // action). Also cancels the matching earnings row, if one was created by
  // markCommissionPaid() above, so a refunded booking's commission stops
  // counting toward the influencer's withdrawal balance.
  async function reverseCommissionForBooking(bookingId) {
    const { data: refBooking } = await client.from(BOOKINGS_TABLE).select("id").eq("booking_id", bookingId).maybeSingle();
    if (refBooking) {
      await client.from(BOOKINGS_TABLE).update({ status: "Refunded" }).eq("id", refBooking.id);
    }

    const { data: commission } = await client
      .from(COMMISSIONS_TABLE)
      .update({ status: "Reversed" })
      .eq("booking_id", bookingId)
      .neq("status", "Reversed")
      .select()
      .maybeSingle();

    if (commission) {
      await client.from("earnings").update({ status: "Cancelled" }).eq("booking_id", bookingId).eq("service_name", `Referral (${commission.referral_code})`);
    }
    return { data: commission || null, error: null };
  }

  window.XploroReferrals = {
    ensureCodeForInfluencer,
    getMyReferralCode,
    referralLink,
    resolveReferral,
    getSettings,
    updateSettings,
    recordReferralForBooking,
    getMyReferralStats,
    getAllReferralSummaries,
    markCommissionPaid,
    reverseCommissionForBooking,
  };
})();
