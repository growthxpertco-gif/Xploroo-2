/* ==========================================================================
   XPLOROO · Admin — Influencer Payments
   admin-payments.js — Local approval workflow for influencer payout
   requests, rendered into the "Influencer Payments" tab of
   admin-influencer-applications.html.

   Storage: "xploroo-admin-payments" — an array of payment-request objects,
   each moving through pending -> approved -> paid (or pending -> rejected).
   Nothing here talks to a real payments backend yet; this only maintains
   the data and status lifecycle.

   Exposes `window.XploroPayments = { getAll, save, approve, reject,
   markPaid }` as the single source of truth for payment requests, so a
   future integration (the Influencer Dashboard's Earnings/Withdrawals
   tabs, or a real payout backend) can read from it without touching this
   admin UI — same pattern as window.XploroPackages (js/admin-packages.js).

   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js.
   ========================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "xploroo-admin-payments";

  /* ------------------------------------------------------------------ */
  /* Data layer                                                          */
  /* ------------------------------------------------------------------ */
  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : seedDefault();
    } catch (_) {
      return seedDefault();
    }
  }

  function seedDefault() {
    const seed = [
      {
        id: "pay-1",
        influencerName: "Priya Sharma",
        serviceName: "Manali Getaway",
        bookingDate: "2026-07-20",
        amount: 12000,
        status: "pending",
        requestedOn: "2026-07-08T10:00:00Z",
        approvedBy: null,
        approvalDate: null,
        rejectionReason: null,
        paymentDate: null,
        transactionRef: null,
      },
      {
        id: "pay-2",
        influencerName: "Rohan Verma",
        serviceName: "Goa Beach Escape",
        bookingDate: "2026-06-10",
        amount: 15000,
        status: "approved",
        requestedOn: "2026-06-12T09:00:00Z",
        approvedBy: "Admin",
        approvalDate: "2026-06-15T11:30:00Z",
        rejectionReason: null,
        paymentDate: null,
        transactionRef: null,
      },
      {
        id: "pay-3",
        influencerName: "Sana Kapoor",
        serviceName: "Podcast Collaboration",
        bookingDate: "2026-05-02",
        amount: 8000,
        status: "paid",
        requestedOn: "2026-05-03T08:00:00Z",
        approvedBy: "Admin",
        approvalDate: "2026-05-05T10:00:00Z",
        rejectionReason: null,
        paymentDate: "2026-05-10T12:00:00Z",
        transactionRef: "TXN-8827XK",
      },
    ];
    persist(seed);
    return seed;
  }

  function persist(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  function updateRecord(id, patch) {
    const all = getAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return null;
    all[index] = { ...all[index], ...patch };
    persist(all);
    return all[index];
  }

  function approve(id) {
    return updateRecord(id, {
      status: "approved",
      approvedBy: "Admin",
      approvalDate: new Date().toISOString(),
    });
  }

  function reject(id, reason) {
    return updateRecord(id, {
      status: "rejected",
      rejectionReason: reason || "",
    });
  }

  function markPaid(id) {
    return updateRecord(id, {
      status: "paid",
      paymentDate: new Date().toISOString(),
      transactionRef: `TXN-${Date.now().toString(36).toUpperCase()}`,
    });
  }

  function save(record) {
    const all = getAll();
    if (record.id) {
      const index = all.findIndex((p) => p.id === record.id);
      if (index !== -1) {
        all[index] = { ...all[index], ...record };
        persist(all);
        return all[index];
      }
    }
    const created = {
      approvedBy: null,
      approvalDate: null,
      rejectionReason: null,
      paymentDate: null,
      transactionRef: null,
      status: "pending",
      requestedOn: new Date().toISOString(),
      ...record,
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    all.push(created);
    persist(all);
    return created;
  }

  window.XploroPayments = { getAll, save, approve, reject, markPaid };

  /* ------------------------------------------------------------------ */
  /* UI                                                                   */
  /* ------------------------------------------------------------------ */
  const root = document.querySelector("[data-admin-payments-root]");
  if (!root) return;

  root.innerHTML = '<div class="pay-list" data-pay-list></div>';
  const listEl = root.querySelector("[data-pay-list]");

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
    if (status === "approved") return '<span class="status-pill status-pill--approved">Approved</span>';
    if (status === "paid") return '<span class="status-pill status-pill--info">Paid</span>';
    if (status === "rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending Approval</span>';
  }

  function actionsHtml(p) {
    if (p.status === "pending") {
      return `
        <div class="pay-card__actions">
          <button class="btn btn--primary btn--pill" type="button" data-pay-approve="${p.id}">Approve Payment</button>
          <button class="btn btn--danger btn--pill" type="button" data-pay-reject-toggle="${p.id}">Reject Payment</button>
        </div>
        <div class="pay-card__reject-panel" data-pay-reject-panel="${p.id}" hidden>
          <label class="field">
            <span class="field__label">Rejection Reason <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" rows="2" placeholder="Let the influencer know why this was rejected." data-pay-reject-reason="${p.id}"></textarea>
          </label>
          <div class="pay-card__reject-actions">
            <button class="btn btn--danger btn--pill" type="button" data-pay-reject-confirm="${p.id}">Confirm Rejection</button>
            <button class="btn btn--glass btn--pill" type="button" data-pay-reject-cancel="${p.id}">Cancel</button>
          </div>
        </div>`;
    }

    if (p.status === "approved") {
      return `
        <dl class="pay-card__meta">
          <div><dt>Approved By</dt><dd>${p.approvedBy || "Admin"}</dd></div>
          <div><dt>Approval Date</dt><dd>${formatDate(p.approvalDate)}</dd></div>
        </dl>
        <div class="pay-card__actions">
          <button class="btn btn--gradient btn--pill" type="button" data-pay-mark-paid="${p.id}">Mark as Paid</button>
        </div>`;
    }

    if (p.status === "paid") {
      return `
        <dl class="pay-card__meta">
          <div><dt>Approved By</dt><dd>${p.approvedBy || "Admin"}</dd></div>
          <div><dt>Approval Date</dt><dd>${formatDate(p.approvalDate)}</dd></div>
          <div><dt>Payment Date</dt><dd>${formatDate(p.paymentDate)}</dd></div>
          <div><dt>Transaction Reference</dt><dd>${p.transactionRef || "&mdash;"}</dd></div>
        </dl>`;
    }

    // rejected
    return p.rejectionReason
      ? `<p class="pay-card__reason"><strong>Rejection reason:</strong> ${p.rejectionReason}</p>`
      : "";
  }

  function cardTemplate(p) {
    return `
      <article class="pay-card" data-pay-card="${p.id}">
        <div class="pay-card__head">
          <div>
            <h2 class="pay-card__name">${p.influencerName}</h2>
            <p class="pay-card__service">${p.serviceName}</p>
          </div>
          ${statusPill(p.status)}
        </div>
        <dl class="pay-card__meta">
          <div><dt>Booking Date</dt><dd>${formatDate(p.bookingDate)}</dd></div>
          <div><dt>Payment Amount</dt><dd>${formatMoney(p.amount)}</dd></div>
          <div><dt>Requested On</dt><dd>${formatDate(p.requestedOn)}</dd></div>
        </dl>
        ${actionsHtml(p)}
      </article>`;
  }

  function render() {
    const all = getAll();

    if (!all.length) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <span class="admin-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0-4-4m4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
          </span>
          <p>No influencer payment requests yet.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = all.map(cardTemplate).join("");

    listEl.querySelectorAll("[data-pay-approve]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.XploroPayments.approve(btn.dataset.payApprove);
        render();
      });
    });

    listEl.querySelectorAll("[data-pay-reject-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = listEl.querySelector(`[data-pay-reject-panel="${btn.dataset.payRejectToggle}"]`);
        if (panel) panel.hidden = false;
      });
    });
    listEl.querySelectorAll("[data-pay-reject-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = listEl.querySelector(`[data-pay-reject-panel="${btn.dataset.payRejectCancel}"]`);
        if (panel) panel.hidden = true;
      });
    });
    listEl.querySelectorAll("[data-pay-reject-confirm]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.payRejectConfirm;
        const reasonEl = listEl.querySelector(`[data-pay-reject-reason="${id}"]`);
        window.XploroPayments.reject(id, reasonEl ? reasonEl.value.trim() : "");
        render();
      });
    });

    listEl.querySelectorAll("[data-pay-mark-paid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.XploroPayments.markPaid(btn.dataset.payMarkPaid);
        render();
      });
    });
  }

  render();
})();
