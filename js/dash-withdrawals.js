/* ==========================================================================
   XPLOROO · Influencer dashboard — Withdrawals tab
   dash-withdrawals.js — Renders the real Available Balance (derived from
   earnings, see js/withdrawals.js) and lets the influencer request a
   withdrawal against it (public.withdrawal_requests). Bank details default
   to whatever was verified on the influencer's approved KYC submission
   (window.XploroKyc, see js/kyc.js) — editable in case a different account
   is wanted for a specific payout, per the "Bank Account (already
   verified)" field in the spec.
   Vanilla JS, no dependencies. Loaded with `defer`, after earnings.js,
   withdrawals.js and kyc.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroWithdrawals) return;

  const mount = page.querySelector('[data-dash-section="withdrawals"]');
  if (!mount) return;

  const ICON_INBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>';

  const esc = window.XploroSecurity.escapeHtml;

  function emptyState(message) {
    return `<div class="dash-empty"><span class="dash-empty__icon" aria-hidden="true">${ICON_INBOX}</span><p>${message}</p></div>`;
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

  function statusPill(status) {
    if (status === "Approved" || status === "Paid") return `<span class="status-pill status-pill--approved">${status}</span>`;
    if (status === "Rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  async function render() {
    const [available, history, kyc] = await Promise.all([
      window.XploroWithdrawals.getAvailableBalance(),
      window.XploroWithdrawals.getMyWithdrawals(),
      window.XploroKyc ? window.XploroKyc.getMyKyc() : null,
    ]);

    const kycApproved = !!(kyc && kyc.status === "Approved");
    const canRequest = kycApproved && available > 0;

    const warningHtml = !kycApproved
      ? `<div class="dash-wd-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg><span>Complete and get your KYC approved before requesting withdrawals.</span></div>`
      : "";

    const summaryHtml = `
      <div class="dash-stat-grid">
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0-4-4m4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(available)}</p><p class="dash-stat-card__label">Available Balance</p></div>
        </div>
      </div>`;

    const formHtml = `
      <form class="dash-ticket-form" data-wd-form>
        <div class="dash-ticket-form__grid">
          <label class="field">
            <span class="field__label">Amount (&#8377;)</span>
            <input class="input" type="number" min="1" max="${available}" name="amount" placeholder="e.g. 5000" required ${canRequest ? "" : "disabled"} />
          </label>
          <label class="field">
            <span class="field__label">Bank Account (verified)</span>
            <input class="input" type="text" value="${kycApproved ? `${esc(kyc.bank_name)} &middot; ${esc(kyc.bank_account_number)}` : "Not verified yet"}" disabled />
          </label>
          <label class="field field--full">
            <span class="field__label">Notes <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" name="notes" rows="2" placeholder="Anything the finance team should know" ${canRequest ? "" : "disabled"}></textarea>
          </label>
        </div>
        <p class="dash-wd-form__error" data-wd-error role="alert" style="color:var(--color-danger);font-size:var(--fs-xs)"></p>
        <button class="btn btn--gradient btn--pill" type="submit" data-wd-submit ${canRequest ? "" : "disabled"}>Request Withdrawal</button>
      </form>`;

    const historyHtml = !history.length
      ? emptyState("No withdrawals yet.")
      : `
      <h3 class="dash-section-title">Withdrawal History</h3>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Amount</th><th>Requested</th><th>Status</th><th>Transaction Reference</th></tr></thead>
          <tbody>
            ${history
              .map(
                (w) => `
              <tr>
                <td>${formatMoney(w.amount)}</td>
                <td>${formatDate(w.requested_at)}</td>
                <td>${statusPill(w.status)}</td>
                <td>${esc(w.transaction_reference) || "&mdash;"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

    mount.innerHTML = `${warningHtml}${summaryHtml}${formHtml}${historyHtml}`;

    const form = mount.querySelector("[data-wd-form]");
    const errorEl = mount.querySelector("[data-wd-error]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      const submitBtn = mount.querySelector("[data-wd-submit]");
      submitBtn.disabled = true;

      const data = new FormData(form);
      const { error } = await window.XploroWithdrawals.requestWithdrawal({
        amount: data.get("amount"),
        bankAccountHolder: kyc ? kyc.bank_account_holder : "",
        bankAccountNumber: kyc ? kyc.bank_account_number : "",
        bankIfsc: kyc ? kyc.bank_ifsc : "",
        bankName: kyc ? kyc.bank_name : "",
        notes: data.get("notes") || "",
      });

      if (error) {
        errorEl.textContent = error.message || "Failed to submit withdrawal request.";
        submitBtn.disabled = false;
        return;
      }
      render();
    });
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();

    // Available balance depends on earnings, which can change from the
    // "Service Bookings" tab in the same session — re-render every time the
    // influencer opens the Withdrawals tab.
    const tabBtn = page.querySelector('[data-dash-tab="withdrawals"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
