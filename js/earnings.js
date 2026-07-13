/* ==========================================================================
   XPLOROO · Influencer earnings (Supabase-backed)
   earnings.js — Single source of truth for public.earnings, one row per
   influencer_bookings row. Created automatically by
   js/influencer-bookings.js's createBooking() (status "Pending"), then
   flipped to "Paid" when the influencer accepts the booking or "Cancelled"
   when declined (also driven from influencer-bookings.js, so the two tables
   never drift). The dashboard's Earnings/Withdrawals tabs
   (js/dash-earnings.js, js/dash-withdrawals.js) read exclusively through
   this module — no hardcoded numbers anywhere.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   before js/influencer-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "earnings";

  // Called from the traveler's session at booking time — never chains
  // .select() after insert, since the traveler isn't the row's influencer_id
  // and would fail the "view own earnings" RETURNING check (same RLS
  // gotcha fixed for notifications in Phase 6).
  async function createForBooking({ bookingId, influencerId, travelerName, serviceName, bookingDate, amount }) {
    const { error } = await client.from(TABLE).insert({
      booking_id: bookingId,
      influencer_id: influencerId,
      traveler_name: travelerName || "Traveler",
      service_name: serviceName || "",
      booking_date: bookingDate || null,
      amount: amount != null && amount !== "" ? Number(amount) : 0,
      status: "Pending",
    });
    if (error) console.error("[Xploroo] Failed to create earnings record:", error.message);
    myEarningsPromise = null;
  }

  // Called from the influencer's own session (dash-bookings.js accept/decline).
  async function setStatusForBooking(bookingId, status) {
    const { error } = await client.from(TABLE).update({ status }).eq("booking_id", bookingId);
    if (error) console.error("[Xploroo] Failed to update earnings status:", error.message);
    myEarningsPromise = null;
  }

  // Phase 18 — perf: getMyEarnings() is independently called from
  // dash-earnings.js AND (via withdrawals.js's getAvailableBalance) the
  // inline dashboard-overview script on the same page load. Cached for the
  // page's lifecycle only, and invalidated on every write above/below so a
  // booking accept/decline or withdrawal never leaves stale earnings data
  // behind.
  let myEarningsPromise = null;

  async function getMyEarnings() {
    if (!myEarningsPromise) {
      myEarningsPromise = (async () => {
        const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
        if (!user) return [];
        const { data, error } = await client
          .from(TABLE)
          .select("*")
          .eq("influencer_id", user.id)
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[Xploroo] Failed to load earnings:", error.message);
          return [];
        }
        return data || [];
      })().catch((err) => {
        myEarningsPromise = null;
        throw err;
      });
    }
    return myEarningsPromise;
  }

  function summarize(earnings) {
    const sum = (status) => earnings.filter((e) => e.status === status).reduce((s, e) => s + Number(e.amount || 0), 0);
    const paid = sum("Paid");
    const pending = sum("Pending");
    return { total: paid + pending, paid, pending, cancelled: sum("Cancelled") };
  }

  // Admin-only: every influencer's earnings at once, so the Influencer
  // Payments tab can compute each requester's Available Balance without a
  // per-row query. Relies on the "Anyone can view earnings" select policy.
  async function getAllEarnings() {
    const { data, error } = await client.from(TABLE).select("*");
    if (error) {
      console.error("[Xploroo] Failed to load all earnings:", error.message);
      return [];
    }
    return data || [];
  }

  window.XploroEarnings = { createForBooking, setStatusForBooking, getMyEarnings, getAllEarnings, summarize };
})();
