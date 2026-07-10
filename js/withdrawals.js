/* ==========================================================================
   XPLOROO · Influencer withdrawals (Supabase-backed)
   withdrawals.js — public.withdrawal_requests, one row per withdrawal
   request. Available Balance is never stored — it's always derived live
   from earnings (window.XploroEarnings, see js/earnings.js) minus every
   withdrawal already requested (Pending/Approved/Paid all reserve funds so
   the same money can't be withdrawn twice while a request is in flight).
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/earnings.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "withdrawal_requests";

  async function getMyWithdrawals() {
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
  }

  // Available Balance = Paid earnings − everything already reserved by a
  // non-rejected withdrawal request (Pending/Approved/Paid).
  async function getAvailableBalance() {
    if (!window.XploroEarnings) return 0;
    const [earnings, withdrawals] = await Promise.all([window.XploroEarnings.getMyEarnings(), getMyWithdrawals()]);
    const paid = window.XploroEarnings.summarize(earnings).paid;
    const reserved = withdrawals
      .filter((w) => w.status !== "Rejected")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    return Math.max(0, paid - reserved);
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
    return { data, error: null };
  }

  window.XploroWithdrawals = { getMyWithdrawals, getAvailableBalance, requestWithdrawal };
})();
