/* ==========================================================================
   XPLOROO · Admin — Influencer Payments (withdrawal approvals)
   admin-withdrawals.js — Phase 9. Renders every real withdrawal request
   (public.withdrawal_requests, via window.XploroWithdrawals, see
   js/withdrawals.js) into the "Influencer Payments" tab of
   admin-influencer-applications.html. Replaces the old localStorage-backed
   js/admin-payments.js entirely — no seeded/dummy data, nothing here is
   hardcoded.

   Approve sets status="Paid" (approved_at/approved_by stored, available
   balance drops automatically since it's derived as Total Paid Earnings −
   Paid Withdrawals — see js/withdrawals.js). Reject sets status="Rejected"
   (never counted against the balance in the first place, so nothing needs
   restoring). Both actions go through XploroWithdrawals.approve/reject-
   Withdrawal(), which conditionally update on status="Pending" so a
   duplicate click or a second admin tab can never double-process the same
   request — this file additionally disables the buttons immediately on
   click as the first line of defense.

   Reuses the shared `.admin-card`/`.admin-list`/`.admin-empty` components
   (styles/admin.css) — same visual language as the other admin tabs.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/earnings.js, js/withdrawals.js and js/notifications.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-payments-root]");
  if (!root || !window.XploroWithdrawals) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0-4-4m4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

  function renderEmpty() {
    root.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_INBOX}</span>
        <p>No influencer withdrawal requests yet.</p>
      </div>`;
  }

  function formatDate(iso) {
    if (!iso) return "&mdash;";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function formatMoney(n) {
    return `&#8377;${(Number(n) || 0).toLocaleString("en-IN")}`;
  }

  function maskAccountNumber(number) {
    const digits = String(number || "").trim();
    if (!digits) return "&mdash;";
    return digits.length <= 4 ? digits : `&bull;&bull;&bull;&bull; ${digits.slice(-4)}`;
  }

  function statusPill(status) {
    if (status === "Paid" || status === "Approved") return `<span class="status-pill status-pill--approved">${status}</span>`;
    if (status === "Rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  function cardTemplate(w, profile, availableBalance) {
    const initial = (profile.full_name || "?").trim().charAt(0).toUpperCase();
    const photoHtml = profile.avatar_url
      ? `<img class="admin-card__photo" src="${profile.avatar_url}" alt="" />`
      : `<span class="admin-card__photo" aria-hidden="true">${initial}</span>`;

    const actionsHtml =
      w.status === "Pending"
        ? `
        <div class="admin-card__actions">
          <button class="btn btn--primary btn--pill" type="button" data-wd-approve="${w.id}">✅ Approve Payment</button>
          <button class="btn btn--danger btn--pill" type="button" data-wd-reject-toggle="${w.id}">❌ Reject Payment</button>
        </div>
        <div class="pay-card__reject-panel" data-wd-reject-panel="${w.id}" hidden>
          <label class="field">
            <span class="field__label">Rejection Reason <span class="field__hint" style="display:inline">(optional, sent to the influencer)</span></span>
            <textarea class="input" rows="2" placeholder="Let the influencer know why this was rejected." data-wd-reject-reason="${w.id}"></textarea>
          </label>
          <div class="pay-card__reject-actions">
            <button class="btn btn--danger btn--pill" type="button" data-wd-reject-confirm="${w.id}">Confirm Rejection</button>
            <button class="btn btn--glass btn--pill" type="button" data-wd-reject-cancel="${w.id}">Cancel</button>
          </div>
        </div>`
        : w.status === "Paid"
        ? `
        <dl class="admin-card__meta">
          <div><dt>Approved By</dt><dd>${w.approved_by || "Admin"}</dd></div>
          <div><dt>Approved On</dt><dd>${formatDate(w.approved_at)}</dd></div>
          <div><dt>Transaction Reference</dt><dd>${w.transaction_reference || "&mdash;"}</dd></div>
        </dl>`
        : "";

    return `
      <article class="admin-card" data-wd-card="${w.id}">
        ${photoHtml}
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${profile.full_name || "Unnamed Influencer"}</h2>
            ${statusPill(w.status)}
          </div>
          <p class="pay-card__service">${profile.email || "&mdash;"}</p>

          <dl class="admin-card__meta">
            <div><dt>Amount Requested</dt><dd>${formatMoney(w.amount)}</dd></div>
            <div><dt>Available Balance</dt><dd>${formatMoney(availableBalance)}</dd></div>
            <div><dt>Payment Method</dt><dd>Bank Transfer</dd></div>
            <div><dt>Bank Account Holder</dt><dd>${w.bank_account_holder || "&mdash;"}</dd></div>
            <div><dt>Bank Name</dt><dd>${w.bank_name || "&mdash;"}</dd></div>
            <div><dt>Account Number</dt><dd>${maskAccountNumber(w.bank_account_number)}</dd></div>
            <div><dt>IFSC Code</dt><dd>${w.bank_ifsc || "&mdash;"}</dd></div>
            <div><dt>Request Date</dt><dd>${formatDate(w.requested_at)}</dd></div>
          </dl>

          ${actionsHtml}
        </div>
      </article>`;
  }

  async function render() {
    const withdrawals = await window.XploroWithdrawals.getAllWithdrawals();
    if (!withdrawals.length) {
      renderEmpty();
      return;
    }

    const influencerIds = Array.from(new Set(withdrawals.map((w) => w.influencer_id)));
    const [profiles, allEarnings, allWithdrawals] = await Promise.all([
      window.XploroAuth.getProfilesByUserIds(influencerIds),
      window.XploroEarnings ? window.XploroEarnings.getAllEarnings() : [],
      // Reuse the list we already have instead of a second round trip.
      Promise.resolve(withdrawals),
    ]);

    // Available Balance per influencer = Total Paid Earnings − Paid
    // Withdrawals, same derived formula as the influencer's own dashboard
    // (js/withdrawals.js getAvailableBalance) — computed here in bulk so the
    // list doesn't fire one query per card.
    function balanceFor(influencerId) {
      const paidEarnings = allEarnings
        .filter((e) => e.influencer_id === influencerId && e.status === "Paid")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const paidWithdrawals = allWithdrawals
        .filter((w) => w.influencer_id === influencerId && w.status === "Paid")
        .reduce((sum, w) => sum + Number(w.amount || 0), 0);
      return Math.max(0, paidEarnings - paidWithdrawals);
    }

    root.innerHTML = `<div class="admin-list">${withdrawals
      .map((w) => cardTemplate(w, profiles.get(w.influencer_id) || {}, balanceFor(w.influencer_id)))
      .join("")}</div>`;

    root.querySelectorAll("[data-wd-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const id = btn.dataset.wdApprove;
        const w = withdrawals.find((item) => item.id === id);
        const { data, error } = await window.XploroWithdrawals.approveWithdrawal(id);
        if (error) {
          btn.disabled = false;
          window.alert(error.message || "Failed to approve this withdrawal.");
          return;
        }
        if (window.XploroNotifications && w) {
          window.XploroNotifications.create({
            userId: w.influencer_id,
            type: "withdrawal_approved",
            title: "Withdrawal Approved",
            message: `Your withdrawal request for ${formatMoney(w.amount).replace(/&#8377;/, "₹")} has been approved and paid.`,
          });
        }
        render();
      });
    });

    root.querySelectorAll("[data-wd-reject-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = root.querySelector(`[data-wd-reject-panel="${btn.dataset.wdRejectToggle}"]`);
        if (panel) panel.hidden = false;
      });
    });
    root.querySelectorAll("[data-wd-reject-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = root.querySelector(`[data-wd-reject-panel="${btn.dataset.wdRejectCancel}"]`);
        if (panel) panel.hidden = true;
      });
    });
    root.querySelectorAll("[data-wd-reject-confirm]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const id = btn.dataset.wdRejectConfirm;
        const w = withdrawals.find((item) => item.id === id);
        const reasonEl = root.querySelector(`[data-wd-reject-reason="${id}"]`);
        const reason = reasonEl ? reasonEl.value.trim() : "";

        const { error } = await window.XploroWithdrawals.rejectWithdrawal(id);
        if (error) {
          btn.disabled = false;
          window.alert(error.message || "Failed to reject this withdrawal.");
          return;
        }
        if (window.XploroNotifications && w) {
          window.XploroNotifications.create({
            userId: w.influencer_id,
            type: "withdrawal_rejected",
            title: "Withdrawal Rejected",
            message: reason
              ? `Your withdrawal request for ${formatMoney(w.amount).replace(/&#8377;/, "₹")} was rejected: ${reason}`
              : `Your withdrawal request for ${formatMoney(w.amount).replace(/&#8377;/, "₹")} was rejected. The amount remains available in your balance.`,
          });
        }
        render();
      });
    });
  }

  render();
})();
