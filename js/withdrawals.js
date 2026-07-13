/* ==========================================================================
   XPLOROO · Influencer withdrawals (Supabase-backed)
   withdrawals.js — public.withdrawal_requests, one row per withdrawal
   request. Available Balance is never stored — it's always derived live as
   Total Paid Earnings (window.XploroEarnings, see js/earnings.js) minus
   Paid Withdrawals (Phase 9). Approving a request (status -> "Paid")
   subtracts it from the balance automatically; rejecting one (status ->
   "Rejected") never counted against the balance in the first place, so
   nothing needs to be manually "restored".
   Also the admin-side data layer for the Influencer Payments tab
   (getAllWithdrawals/approveWithdrawal/rejectWithdrawal) — see
   js/admin-withdrawals.js. Every approve/reject is a conditional update
   (`.eq("status", "Pending")`) so a duplicate click or a second admin tab
   can never process the same request twice.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/earnings.js and js/notifications.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "withdrawal_requests";

  // Phase 18 — perf: getMyWithdrawals() is independently called from
  // dash-withdrawals.js and (directly, plus again via getAvailableBalance)
  // the inline dashboard-overview script on influencer-dashboard.html.
  // Cached for the page's lifecycle only, invalidated on requestWithdrawal
  // below so a fresh request is never masked by a stale list.
  let myWithdrawalsPromise = null;

  async function getMyWithdrawals() {
    if (!myWithdrawalsPromise) {
      myWithdrawalsPromise = (async () => {
        const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
        if (!user) return [];
        const { data, error } = await client
          .from(TABLE)
          .select("*")
          .eq("influencer_id", user.id)
          .order("requested_at", { ascending: false });
        if (error) {
          console.error("[Xploroo] Failed to load withdrawal requests:", error.message);
          return [];
        }
        return data || [];
      })().catch((err) => {
        myWithdrawalsPromise = null;
        throw err;
      });
    }
    return myWithdrawalsPromise;
  }

  // Available Balance = Total Paid Earnings − Paid Withdrawals. Always
  // derived from the two transaction tables, never a stored/manual number.
  async function getAvailableBalance() {
    if (!window.XploroEarnings) return 0;
    const [earnings, withdrawals] = await Promise.all([window.XploroEarnings.getMyEarnings(), getMyWithdrawals()]);
    const paidEarnings = window.XploroEarnings.summarize(earnings).paid;
    const paidWithdrawals = withdrawals
      .filter((w) => w.status === "Paid")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    return Math.max(0, paidEarnings - paidWithdrawals);
  }

  async function requestWithdrawal({ amount, bankAccountHolder, bankAccountNumber, bankIfsc, bankName, notes }) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const requestedAmount = Number(amount);
    if (!requestedAmount || requestedAmount <= 0) {
      return { data: null, error: new Error("Enter a valid amount.") };
    }

    const available = await getAvailableBalance();
    if (requestedAmount > available) {
      return { data: null, error: new Error("Amount exceeds your available balance.") };
    }

    const { data, error } = await client
      .from(TABLE)
      .insert({
        influencer_id: user.id,
        amount: requestedAmount,
        bank_account_holder: bankAccountHolder || "",
        bank_account_number: bankAccountNumber || "",
        bank_ifsc: bankIfsc || "",
        bank_name: bankName || "",
        notes: notes || "",
      })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create withdrawal request:", error.message);
      return { data: null, error };
    }

    if (window.XploroNotifications) {
      window.XploroNotifications.create({
        userId: user.id,
        type: "withdrawal_submitted",
        title: "Withdrawal Submitted",
        message: `Your withdrawal request for ₹${requestedAmount.toLocaleString("en-IN")} has been submitted and is pending review.`,
      });
    }

    myWithdrawalsPromise = null;
    return { data, error: null };
  }

  /* ---------------------------------------------------------------- */
  /* Admin — Influencer Payments tab (see js/admin-withdrawals.js)      */
  /* ---------------------------------------------------------------- */
  async function getAllWithdrawals() {
    const { data, error } = await client.from(TABLE).select("*").order("requested_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load all withdrawal requests:", error.message);
      return [];
    }
    return data || [];
  }

  // Conditional update on status="Pending" so a duplicate click or a second
  // admin tab can never approve/reject the same request twice — if another
  // process already moved it out of Pending, `data` comes back null and the
  // caller knows nothing happened.
  async function approveWithdrawal(id, approvedBy) {
    const { data, error } = await client
      .from(TABLE)
      .update({
        status: "Paid",
        approved_at: new Date().toISOString(),
        approved_by: approvedBy || "Admin",
      })
      .eq("id", id)
      .eq("status", "Pending")
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to approve withdrawal request:", error.message);
      return { data: null, error };
    }
    if (!data) return { data: null, error: new Error("This request has already been processed.") };
    return { data, error: null };
  }

  async function rejectWithdrawal(id) {
    const { data, error } = await client
      .from(TABLE)
      .update({ status: "Rejected" })
      .eq("id", id)
      .eq("status", "Pending")
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to reject withdrawal request:", error.message);
      return { data: null, error };
    }
    if (!data) return { data: null, error: new Error("This request has already been processed.") };
    return { data, error: null };
  }

  window.XploroWithdrawals = {
    getMyWithdrawals,
    getAvailableBalance,
    requestWithdrawal,
    getAllWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
  };
})();
