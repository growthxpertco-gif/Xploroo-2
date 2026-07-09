/* ==========================================================================
   XPLOROO · Influencer dashboard — section content
   dash-sections.js — Renders real, production-shaped content into each of
   the 10 dashboard panels (influencer-dashboard.html). Each section reads
   from its own localStorage key, seeding realistic demo data on first run
   only (so the dashboard looks fully alive today) — every read after that
   reflects whatever's actually stored, so this is ready for a real backend
   to replace the storage layer without any UI changes.

   This module never touches `.dash-sidebar`, the tab-switching mechanics,
   or the approval gate — all owned by influencer-dashboard.js/css. It only
   fills the `[data-dash-section]` mount point already present inside each
   panel.

   Storage keys (all namespaced "xploroo-dash-*"):
     invites        — collaboration invites (pending / accepted / declined)
     transactions   — earnings ledger (feeds the Earnings summary + table)
     withdrawals    — { availableBalance, lifetimeWithdrawn,
                        pendingWithdrawal, history: [] }
     kyc            — { identity: {status, fileName}, bank: {status, fileName} }
     content        — content-tracker entries, keyed by invite id, one per
                       accepted collaboration
     calendar       — upcoming trips / deadlines / payouts / meetings
     reviews        — reviews array
     leaderboard    — { me, topTen }
     notifications  — notification feed
     tickets        — support tickets

   Vanilla JS, no dependencies. Loaded with `defer`, after
   influencer-dashboard.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroRole) return;
  if (window.XploroRole.getState().role !== "influencer") return;

  /* ------------------------------------------------------------------ */
  /* Storage helpers                                                      */
  /* ------------------------------------------------------------------ */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }
  function seedIfMissing(key, factory) {
    if (localStorage.getItem(key) === null) writeJSON(key, factory());
  }
  function genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    const num = Number(n) || 0;
    return `&#8377;${num.toLocaleString("en-IN")}`;
  }
  function emptyState(message, iconSvg) {
    return `
      <div class="dash-empty">
        <span class="dash-empty__icon" aria-hidden="true">${iconSvg}</span>
        <p>${message}</p>
      </div>`;
  }
  const ICON_INBOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>';
  const ICON_CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const ICON_STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 3Z"/></svg>';
  const ICON_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const ICON_TICKET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/></svg>';

  const mounts = {};
  page.querySelectorAll("[data-dash-section]").forEach((el) => {
    mounts[el.dataset.dashSection] = el;
  });

  /* ==================================================================== */
  /* 1. Collaboration Invites                                              */
  /* ==================================================================== */
  const INVITES_KEY = "xploroo-dash-invites";

  seedIfMissing(INVITES_KEY, () => [
    {
      id: "inv-1",
      packageName: "Bali Island Retreat",
      destination: "Bali, Indonesia",
      journeyStart: "2026-09-12",
      journeyEnd: "2026-09-18",
      payout: 25000,
      deliverables: ["Instagram Reel", "Instagram Story", "Blog"],
      status: "pending",
    },
    {
      id: "inv-2",
      packageName: "Dubai Escape",
      destination: "Dubai, UAE",
      journeyStart: "2026-10-05",
      journeyEnd: "2026-10-09",
      payout: 18000,
      deliverables: ["Instagram Reel", "YouTube Video"],
      status: "pending",
    },
    {
      id: "inv-3",
      packageName: "Manali Getaway",
      destination: "Manali, HP",
      journeyStart: "2026-07-20",
      journeyEnd: "2026-07-24",
      payout: 12000,
      deliverables: ["Instagram Reel", "Instagram Story", "YouTube Video", "Blog"],
      status: "accepted",
    },
  ]);

  function ensureContentEntry(invite) {
    const content = readJSON(CONTENT_KEY, {});
    if (content[invite.id]) return;
    content[invite.id] = {
      tripName: invite.packageName,
      deliverables: invite.deliverables.map((name) => ({ name, uploadLink: "", status: "pending" })),
    };
    writeJSON(CONTENT_KEY, content);
  }

  function renderInvites() {
    const mount = mounts.invites;
    if (!mount) return;

    const all = readJSON(INVITES_KEY, []);
    const pending = all.filter((i) => i.status === "pending");

    if (!pending.length) {
      mount.innerHTML = emptyState("No collaboration invites yet.", ICON_INBOX);
      return;
    }

    mount.innerHTML = `<div class="dash-cards">${pending
      .map(
        (inv) => `
      <article class="dash-invite-card" data-invite-card="${inv.id}">
        <div class="dash-invite-card__head">
          <div>
            <h3 class="dash-invite-card__name">${inv.packageName}</h3>
            <p class="dash-invite-card__destination">${inv.destination}</p>
          </div>
          <span class="status-pill status-pill--pending">Pending Response</span>
        </div>
        <dl class="dash-invite-card__meta">
          <div><dt>Journey Dates</dt><dd>${formatDate(inv.journeyStart)} &ndash; ${formatDate(inv.journeyEnd)}</dd></div>
          <div><dt>Payout</dt><dd>${formatMoney(inv.payout)}</dd></div>
        </dl>
        <div class="dash-invite-card__deliverables">
          ${inv.deliverables.map((d) => `<span class="dash-chip">${d}</span>`).join("")}
        </div>
        <div class="dash-invite-card__actions">
          <button class="btn btn--primary btn--pill" type="button" data-invite-accept="${inv.id}">Accept</button>
          <button class="btn btn--danger btn--pill" type="button" data-invite-decline="${inv.id}">Decline</button>
        </div>
      </article>`
      )
      .join("")}</div>`;

    mount.querySelectorAll("[data-invite-accept]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const list = readJSON(INVITES_KEY, []);
        const invite = list.find((i) => i.id === btn.dataset.inviteAccept);
        if (!invite) return;
        invite.status = "accepted";
        writeJSON(INVITES_KEY, list);
        ensureContentEntry(invite);
        renderInvites();
        renderContent();
      });
    });
    mount.querySelectorAll("[data-invite-decline]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const list = readJSON(INVITES_KEY, []);
        const invite = list.find((i) => i.id === btn.dataset.inviteDecline);
        if (!invite) return;
        invite.status = "declined";
        writeJSON(INVITES_KEY, list);
        renderInvites();
      });
    });
  }

  /* ==================================================================== */
  /* 2. Earnings                                                           */
  /* ==================================================================== */
  const TRANSACTIONS_KEY = "xploroo-dash-transactions";

  seedIfMissing(TRANSACTIONS_KEY, () => [
    { id: "txn-1", trip: "Manali Getaway", amount: 12000, status: "paid", paymentDate: "2026-06-18" },
    { id: "txn-2", trip: "Goa Beach Escape", amount: 15000, status: "processing", paymentDate: "" },
    { id: "txn-3", trip: "Vietnam Discovery", amount: 20000, status: "pending", paymentDate: "" },
  ]);

  function earningsStatusPill(status) {
    if (status === "paid") return '<span class="status-pill status-pill--approved">Paid</span>';
    if (status === "processing") return '<span class="status-pill status-pill--info">Processing</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  function renderEarnings() {
    const mount = mounts.earnings;
    if (!mount) return;

    const txns = readJSON(TRANSACTIONS_KEY, []);
    const completed = txns.filter((t) => t.status === "paid").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pending = txns
      .filter((t) => t.status === "pending" || t.status === "processing")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const total = completed + pending;

    const now = new Date();
    const thisMonth = txns
      .filter((t) => {
        if (t.status !== "paid" || !t.paymentDate) return false;
        const d = new Date(t.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const summaryHtml = `
      <div class="dash-stat-grid">
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(total)}</p><p class="dash-stat-card__label">Total Earnings</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(pending)}</p><p class="dash-stat-card__label">Pending Payments</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(completed)}</p><p class="dash-stat-card__label">Completed Payments</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true">${ICON_CALENDAR}</span>
          <div><p class="dash-stat-card__value">${formatMoney(thisMonth)}</p><p class="dash-stat-card__label">This Month</p></div>
        </div>
      </div>`;

    const tableHtml = !txns.length
      ? emptyState("No transactions yet.", ICON_INBOX)
      : `
      <h3 class="dash-section-title">Transaction Timeline</h3>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Trip</th><th>Amount</th><th>Status</th><th>Payment Date</th></tr></thead>
          <tbody>
            ${txns
              .map(
                (t) => `
              <tr>
                <td>${t.trip}</td>
                <td>${formatMoney(t.amount)}</td>
                <td>${earningsStatusPill(t.status)}</td>
                <td>${t.paymentDate ? formatDate(t.paymentDate) : "&mdash;"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

    mount.innerHTML = summaryHtml + tableHtml;
  }

  /* ==================================================================== */
  /* 3. Withdrawals                                                        */
  /* ==================================================================== */
  const WITHDRAWALS_KEY = "xploroo-dash-withdrawals";

  seedIfMissing(WITHDRAWALS_KEY, () => ({
    availableBalance: 9000,
    lifetimeWithdrawn: 42000,
    pendingWithdrawal: 5000,
    history: [
      { id: "wd-1", amount: 10000, date: "2026-05-02", status: "completed", utr: "UTR20260502XXTR1" },
      { id: "wd-2", amount: 5000, date: "2026-06-20", status: "processing", utr: "&mdash;" },
    ],
  }));

  function withdrawalStatusPill(status) {
    if (status === "completed") return '<span class="status-pill status-pill--approved">Completed</span>';
    if (status === "processing") return '<span class="status-pill status-pill--info">Processing</span>';
    return '<span class="status-pill status-pill--rejected">Failed</span>';
  }

  function isKycApproved() {
    const kyc = readJSON(KYC_KEY, null);
    return !!(kyc && kyc.identity.status === "approved" && kyc.bank.status === "approved");
  }

  function renderWithdrawals() {
    const mount = mounts.withdrawals;
    if (!mount) return;

    const wd = readJSON(WITHDRAWALS_KEY, { availableBalance: 0, lifetimeWithdrawn: 0, pendingWithdrawal: 0, history: [] });
    const kycOk = isKycApproved();
    const canRequest = kycOk && wd.availableBalance > 0;

    const warningHtml = !kycOk
      ? `<div class="dash-wd-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg><span>Complete KYC before requesting withdrawals.</span></div>`
      : "";

    const summaryHtml = `
      <div class="dash-stat-grid">
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0-4-4m4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(wd.availableBalance)}</p><p class="dash-stat-card__label">Available Balance</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(wd.lifetimeWithdrawn)}</p><p class="dash-stat-card__label">Lifetime Withdrawn</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          <div><p class="dash-stat-card__value">${formatMoney(wd.pendingWithdrawal)}</p><p class="dash-stat-card__label">Pending Withdrawal</p></div>
        </div>
      </div>`;

    const historyHtml = !wd.history.length
      ? emptyState("No withdrawals yet.", ICON_INBOX)
      : `
      <h3 class="dash-section-title">Withdrawal History</h3>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Amount</th><th>Date</th><th>Status</th><th>UTR</th></tr></thead>
          <tbody>
            ${wd.history
              .map(
                (h) => `
              <tr>
                <td>${formatMoney(h.amount)}</td>
                <td>${formatDate(h.date)}</td>
                <td>${withdrawalStatusPill(h.status)}</td>
                <td>${h.utr || "&mdash;"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

    mount.innerHTML = `
      ${warningHtml}
      ${summaryHtml}
      <div class="dash-wd-request">
        <button class="btn btn--gradient btn--pill" type="button" data-request-withdrawal ${canRequest ? "" : "disabled"}>Request Withdrawal</button>
      </div>
      ${historyHtml}`;

    const requestBtn = mount.querySelector("[data-request-withdrawal]");
    if (requestBtn) {
      requestBtn.addEventListener("click", () => {
        const current = readJSON(WITHDRAWALS_KEY, { availableBalance: 0, lifetimeWithdrawn: 0, pendingWithdrawal: 0, history: [] });
        if (!isKycApproved() || current.availableBalance <= 0) return;
        current.history.unshift({
          id: genId("wd"),
          amount: current.availableBalance,
          date: new Date().toISOString(),
          status: "processing",
          utr: "&mdash;",
        });
        current.pendingWithdrawal += current.availableBalance;
        current.availableBalance = 0;
        writeJSON(WITHDRAWALS_KEY, current);
        renderWithdrawals();
      });
    }
  }

  /* ==================================================================== */
  /* 4. KYC                                                                */
  /* ==================================================================== */
  const KYC_KEY = "xploroo-dash-kyc";

  seedIfMissing(KYC_KEY, () => ({
    identity: { status: "pending", fileName: "" },
    bank: { status: "pending", fileName: "" },
  }));

  function kycPill(status) {
    if (status === "approved") return '<span class="status-pill status-pill--approved">Approved</span>';
    if (status === "rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  function kycUploadCard(key, title, desc, data) {
    return `
      <div class="dash-card">
        <div class="dash-kyc-card__head">
          <h3 class="dash-section-title" style="margin:0">${title}</h3>
          ${kycPill(data.status)}
        </div>
        <p class="dash-kyc-card__desc">${desc}</p>
        <span class="dash-upload">
          <input class="dash-upload__input" type="file" accept="image/*,.pdf" data-kyc-upload="${key}" />
          <span class="dash-upload__zone">
            <svg class="dash-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0-12 4 4m-4-4-4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
            <span class="dash-upload__text">Upload document</span>
            <span class="dash-upload__name">${data.fileName || "No file chosen"}</span>
          </span>
        </span>
      </div>`;
  }

  function renderKyc() {
    const mount = mounts.kyc;
    if (!mount) return;

    const kyc = readJSON(KYC_KEY, { identity: { status: "pending", fileName: "" }, bank: { status: "pending", fileName: "" } });
    const overall =
      kyc.identity.status === "approved" && kyc.bank.status === "approved"
        ? "approved"
        : kyc.identity.status === "rejected" || kyc.bank.status === "rejected"
        ? "rejected"
        : "pending";

    mount.innerHTML = `
      <div class="dash-kyc__current">
        <span class="dash-section-title" style="margin:0">Current Status</span>
        ${kycPill(overall)}
      </div>
      <div class="dash-kyc__grid">
        ${kycUploadCard("identity", "Identity Verification", "Upload a government-issued ID (Aadhaar, Passport, or Driving Licence).", kyc.identity)}
        ${kycUploadCard("bank", "Bank Verification", "Upload a cancelled cheque or bank statement to verify your payout account.", kyc.bank)}
      </div>`;

    mount.querySelectorAll("[data-kyc-upload]").forEach((input) => {
      input.addEventListener("change", () => {
        const current = readJSON(KYC_KEY, { identity: { status: "pending", fileName: "" }, bank: { status: "pending", fileName: "" } });
        const section = input.dataset.kycUpload;
        const file = input.files[0];
        if (!file) return;
        current[section] = { status: "pending", fileName: file.name };
        writeJSON(KYC_KEY, current);
        renderKyc();
        renderWithdrawals();
      });
    });
  }

  /* ==================================================================== */
  /* 5. Content Tracker                                                    */
  /* ==================================================================== */
  const CONTENT_KEY = "xploroo-dash-content";

  seedIfMissing(CONTENT_KEY, () => ({
    "inv-3": {
      tripName: "Manali Getaway",
      deliverables: [
        { name: "Instagram Reel", uploadLink: "https://instagram.com/reel/demo123", status: "approved" },
        { name: "Instagram Story", uploadLink: "https://instagram.com/stories/demo456", status: "approved" },
        { name: "YouTube Video", uploadLink: "", status: "pending" },
        { name: "Blog", uploadLink: "", status: "pending" },
      ],
    },
  }));

  function contentStatusPill(status) {
    if (status === "approved") return '<span class="status-pill status-pill--approved">Approved</span>';
    if (status === "rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending Review</span>';
  }

  function renderContent() {
    const mount = mounts.content;
    if (!mount) return;

    const content = readJSON(CONTENT_KEY, {});
    const tripIds = Object.keys(content);

    if (!tripIds.length) {
      mount.innerHTML = emptyState("No accepted collaborations yet — content tracking will appear here once you accept an invite.", ICON_INBOX);
      return;
    }

    mount.innerHTML = `<div class="dash-cards">${tripIds
      .map((id) => {
        const trip = content[id];
        return `
        <div class="dash-content-group" data-content-group="${id}">
          <h3 class="dash-content-group__title">${trip.tripName}</h3>
          ${trip.deliverables
            .map(
              (d, index) => `
            <div class="dash-content-row">
              <span class="dash-content-row__label">${d.name}</span>
              <input class="input input--sm dash-content-row__link" type="url" placeholder="Paste upload link" value="${d.uploadLink}" data-content-link="${id}:${index}" />
              <button class="btn btn--glass btn--pill dash-content-row__save" type="button" data-content-save="${id}:${index}">Save</button>
              ${contentStatusPill(d.status)}
            </div>`
            )
            .join("")}
        </div>`;
      })
      .join("")}</div>`;

    mount.querySelectorAll("[data-content-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [tripId, index] = btn.dataset.contentSave.split(":");
        const current = readJSON(CONTENT_KEY, {});
        const input = mount.querySelector(`[data-content-link="${tripId}:${index}"]`);
        if (!current[tripId] || !input) return;
        current[tripId].deliverables[Number(index)].uploadLink = input.value.trim();
        writeJSON(CONTENT_KEY, current);
        renderContent();
      });
    });
  }

  /* ==================================================================== */
  /* 6. Calendar                                                           */
  /* ==================================================================== */
  const CALENDAR_KEY = "xploroo-dash-calendar";

  seedIfMissing(CALENDAR_KEY, () => [
    { id: "cal-1", type: "trip", title: "Manali Getaway &mdash; Departure", date: "2026-07-20", description: "Trip start date for the Manali collaboration." },
    { id: "cal-2", type: "payout", title: "July Payout Release", date: "2026-08-01", description: "Completed-trip earnings are released to your account." },
    { id: "cal-3", type: "meeting", title: "Brand Kickoff Call &mdash; Dubai Escape", date: "2026-09-01", description: "Onboarding call with the Xploroo partnerships team." },
    { id: "cal-4", type: "deadline", title: "Bali Reel Submission Deadline", date: "2026-09-25", description: "Submit the Instagram Reel deliverable for Bali." },
  ]);

  const CAL_TYPE_LABEL = { trip: "Upcoming Trip", deadline: "Content Deadline", payout: "Payout Date", meeting: "Meeting" };
  const CAL_TYPE_PILL = { trip: "info", deadline: "pending", payout: "approved", meeting: "rejected" };

  function renderCalendar() {
    const mount = mounts.calendar;
    if (!mount) return;

    const events = readJSON(CALENDAR_KEY, []);
    const now = new Date();
    const upcoming = events
      .filter((e) => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!upcoming.length) {
      mount.innerHTML = emptyState("No upcoming events.", ICON_CALENDAR);
      return;
    }

    mount.innerHTML = `<div class="dash-cal-grid">${upcoming
      .map((e) => {
        const d = new Date(e.date);
        const day = d.toLocaleDateString(undefined, { day: "2-digit" });
        const month = d.toLocaleDateString(undefined, { month: "short" });
        return `
        <div class="dash-cal-card">
          <div class="dash-cal-card__date">
            <span class="dash-cal-card__date-day">${day}</span>
            <span class="dash-cal-card__date-month">${month}</span>
          </div>
          <div>
            <h3 class="dash-cal-card__title">${e.title}</h3>
            <p class="dash-cal-card__desc">${e.description}</p>
            <span class="status-pill status-pill--${CAL_TYPE_PILL[e.type] || "info"} dash-cal-card__type">${CAL_TYPE_LABEL[e.type] || "Event"}</span>
          </div>
        </div>`;
      })
      .join("")}</div>`;
  }

  /* ==================================================================== */
  /* 7. Reviews                                                            */
  /* ==================================================================== */
  const REVIEWS_KEY = "xploroo-dash-reviews";

  seedIfMissing(REVIEWS_KEY, () => [
    { id: "rev-1", reviewer: "Xploroo Team", stars: 5, comment: "Priya&rsquo;s Manali content exceeded expectations &mdash; great storytelling and on-time delivery.", trip: "Manali Getaway", date: "2026-07-05" },
    { id: "rev-2", reviewer: "Wanderlust Stays (Brand Partner)", stars: 4, comment: "Solid engagement on the reel, would collaborate again.", trip: "Goa Beach Escape", date: "2026-06-02" },
  ]);

  function starString(count) {
    return "&#9733;".repeat(count) + "&#9734;".repeat(5 - count);
  }

  function renderReviews() {
    const mount = mounts.reviews;
    if (!mount) return;

    const reviews = readJSON(REVIEWS_KEY, []);

    if (!reviews.length) {
      mount.innerHTML = emptyState("No reviews yet.", ICON_STAR);
      return;
    }

    const avg = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

    mount.innerHTML = `
      <div class="dash-stat-grid">
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true">${ICON_STAR}</span>
          <div><p class="dash-stat-card__value">${avg.toFixed(1)} / 5</p><p class="dash-stat-card__label">Average Rating</p></div>
        </div>
        <div class="dash-stat-card">
          <span class="dash-icon-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/></svg></span>
          <div><p class="dash-stat-card__value">${reviews.length}</p><p class="dash-stat-card__label">Total Reviews</p></div>
        </div>
      </div>
      <div class="dash-cards">
        ${reviews
          .map(
            (r) => `
          <article class="dash-review-card">
            <div class="dash-review-card__head">
              <h3 class="dash-review-card__reviewer">${r.reviewer}</h3>
              <span class="dash-review-stars" aria-label="${r.stars} out of 5 stars">${starString(r.stars)}</span>
            </div>
            <p class="dash-review-card__comment">${r.comment}</p>
            <p class="dash-review-card__meta">${r.trip} &middot; ${formatDate(r.date)}</p>
          </article>`
          )
          .join("")}
      </div>`;
  }

  /* ==================================================================== */
  /* 8. Leaderboard                                                        */
  /* ==================================================================== */
  const LEADERBOARD_KEY = "xploroo-dash-leaderboard";

  seedIfMissing(LEADERBOARD_KEY, () => ({
    me: { rank: 4, points: 3200, level: "Silver Explorer", tripsCompleted: 3 },
    topTen: [
      { rank: 1, name: "Aarav Mehta", points: 8200, trips: 9 },
      { rank: 2, name: "Sana Kapoor", points: 7100, trips: 8 },
      { rank: 3, name: "Rohan Verma", points: 5400, trips: 6 },
      { rank: 4, name: "You", points: 3200, trips: 3 },
      { rank: 5, name: "Isha Malhotra", points: 2950, trips: 4 },
      { rank: 6, name: "Karan Bhatt", points: 2600, trips: 3 },
      { rank: 7, name: "Meera Nair", points: 2100, trips: 2 },
      { rank: 8, name: "Dev Sharma", points: 1800, trips: 2 },
      { rank: 9, name: "Alia Rao", points: 1500, trips: 1 },
      { rank: 10, name: "Yusuf Khan", points: 1200, trips: 1 },
    ],
  }));

  function renderLeaderboard() {
    const mount = mounts.leaderboard;
    if (!mount) return;

    const lb = readJSON(LEADERBOARD_KEY, null);
    if (!lb) {
      mount.innerHTML = emptyState("Leaderboard data isn&rsquo;t available yet.", ICON_STAR);
      return;
    }

    mount.innerHTML = `
      <div class="dash-lb-me">
        <div class="dash-stat-card"><div><p class="dash-stat-card__value">#${lb.me.rank}</p><p class="dash-stat-card__label">Current Rank</p></div></div>
        <div class="dash-stat-card"><div><p class="dash-stat-card__value">${lb.me.points.toLocaleString()}</p><p class="dash-stat-card__label">Total Points</p></div></div>
        <div class="dash-stat-card"><div><p class="dash-stat-card__value">${lb.me.level}</p><p class="dash-stat-card__label">Level</p></div></div>
        <div class="dash-stat-card"><div><p class="dash-stat-card__value">${lb.me.tripsCompleted}</p><p class="dash-stat-card__label">Trips Completed</p></div></div>
      </div>
      <h3 class="dash-section-title">Monthly Top Influencers</h3>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Rank</th><th>Name</th><th>Points</th><th>Trips</th></tr></thead>
          <tbody>
            ${lb.topTen
              .map(
                (row) => `
              <tr class="${row.name === "You" ? "dash-lb-row--me" : ""}">
                <td>#${row.rank}</td>
                <td>${row.name}</td>
                <td>${row.points.toLocaleString()}</td>
                <td>${row.trips}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ==================================================================== */
  /* 9. Notifications                                                      */
  /* ==================================================================== */
  const NOTIFICATIONS_KEY = "xploroo-dash-notifications";

  seedIfMissing(NOTIFICATIONS_KEY, () => [
    { id: "n-1", type: "invite", title: "New Invite", message: "You&rsquo;ve received a new collaboration invite for Dubai Escape.", date: "2026-07-08T10:00:00Z", read: false },
    { id: "n-2", type: "reminder", title: "Trip Reminder", message: "Your Manali Getaway trip starts in 2 weeks &mdash; pack your bags!", date: "2026-07-06T08:00:00Z", read: false },
    { id: "n-3", type: "payment", title: "Payment Released", message: "&#8377;12,000 has been released for Manali Getaway.", date: "2026-07-05T09:30:00Z", read: false },
    { id: "n-4", type: "admin", title: "Admin Message", message: "Please complete your KYC to enable withdrawals.", date: "2026-07-02T11:15:00Z", read: true },
    { id: "n-5", type: "approval", title: "Application Approved", message: "Your Influencer application has been approved. Welcome aboard!", date: "2026-06-28T14:00:00Z", read: true },
  ]);

  const NOTIF_TYPE_LABEL = { invite: "New Invite", payment: "Payment Released", approval: "Application Approved", reminder: "Trip Reminder", admin: "Admin Message" };

  function renderNotifications() {
    const mount = mounts.notifications;
    if (!mount) return;

    const items = readJSON(NOTIFICATIONS_KEY, []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!items.length) {
      mount.innerHTML = emptyState("No notifications yet.", ICON_BELL);
      return;
    }

    const unreadCount = items.filter((n) => !n.read).length;

    mount.innerHTML = `
      ${unreadCount ? `<span class="status-pill status-pill--info" style="margin-bottom:var(--space-4);display:inline-flex">${unreadCount} Unread</span>` : ""}
      <div class="dash-cards">
        ${items
          .map(
            (n) => `
          <article class="dash-notif-card ${n.read ? "" : "dash-notif-card--unread"}" data-notif-card="${n.id}">
            <div class="dash-notif-card__body">
              <h3 class="dash-notif-card__title">${!n.read ? '<span class="dash-notif-card__dot" aria-hidden="true"></span>' : ""}${NOTIF_TYPE_LABEL[n.type] || n.title}</h3>
              <p class="dash-notif-card__message">${n.message}</p>
              <p class="dash-notif-card__date">${new Date(n.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </article>`
          )
          .join("")}
      </div>`;

    mount.querySelectorAll("[data-notif-card]").forEach((card) => {
      card.addEventListener("click", () => {
        const list = readJSON(NOTIFICATIONS_KEY, []);
        const n = list.find((x) => x.id === card.dataset.notifCard);
        if (!n || n.read) return;
        n.read = true;
        writeJSON(NOTIFICATIONS_KEY, list);
        renderNotifications();
      });
    });
  }

  /* ==================================================================== */
  /* 10. Support                                                           */
  /* ==================================================================== */
  const TICKETS_KEY = "xploroo-dash-tickets";

  seedIfMissing(TICKETS_KEY, () => [
    { id: "tkt-1", subject: "Payout not received for Manali trip", category: "Payments", message: "I completed the Manali Getaway trip but haven&rsquo;t received the payout yet.", priority: "High", status: "In Progress", createdAt: "2026-07-04T12:00:00Z" },
    { id: "tkt-2", subject: "Unable to update Instagram link", category: "Technical", message: "The content tracker isn&rsquo;t saving my new reel link.", priority: "Medium", status: "Resolved", createdAt: "2026-06-25T09:00:00Z" },
  ]);

  function ticketStatusPill(status) {
    if (status === "Resolved") return '<span class="status-pill status-pill--approved">Resolved</span>';
    if (status === "In Progress") return '<span class="status-pill status-pill--info">In Progress</span>';
    return '<span class="status-pill status-pill--pending">Open</span>';
  }

  function renderSupport() {
    const mount = mounts.support;
    if (!mount) return;

    const tickets = readJSON(TICKETS_KEY, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const formHtml = `
      <form class="dash-ticket-form" data-ticket-form hidden novalidate>
        <div class="dash-ticket-form__grid">
          <label class="field field--full">
            <span class="field__label">Subject</span>
            <input class="input" type="text" name="subject" placeholder="e.g. Payout delayed for my last trip" required />
          </label>
          <label class="field">
            <span class="field__label">Category</span>
            <select class="input select" name="category" required>
              <option value="Payments">Payments</option>
              <option value="Technical">Technical</option>
              <option value="Collaboration">Collaboration</option>
              <option value="KYC">KYC</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Priority</span>
            <select class="input select" name="priority" required>
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label class="field field--full">
            <span class="field__label">Message</span>
            <textarea class="input" name="message" rows="3" placeholder="Describe your issue." required></textarea>
          </label>
        </div>
        <button class="btn btn--gradient btn--pill" type="submit">Submit Ticket</button>
      </form>`;

    const listHtml = !tickets.length
      ? emptyState("No support tickets yet.", ICON_TICKET)
      : `
      <h3 class="dash-section-title">Ticket History</h3>
      <div class="dash-cards">
        ${tickets
          .map(
            (t) => `
          <article class="dash-ticket-card">
            <div>
              <h4 class="dash-ticket-card__subject">${t.subject}</h4>
              <p class="dash-ticket-card__meta">${t.category} &middot; ${t.priority} Priority &middot; ${formatDate(t.createdAt)}</p>
            </div>
            ${ticketStatusPill(t.status)}
          </article>`
          )
          .join("")}
      </div>`;

    mount.innerHTML = `
      <div class="dash-support__head">
        <span></span>
        <button class="btn btn--glass btn--pill" type="button" data-ticket-toggle>+ Create Ticket</button>
      </div>
      ${formHtml}
      ${listHtml}`;

    const toggleBtn = mount.querySelector("[data-ticket-toggle]");
    const form = mount.querySelector("[data-ticket-form]");
    toggleBtn.addEventListener("click", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('[name="subject"]').focus();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const list = readJSON(TICKETS_KEY, []);
      list.unshift({
        id: genId("tkt"),
        subject: data.get("subject") || "",
        category: data.get("category") || "Other",
        message: data.get("message") || "",
        priority: data.get("priority") || "Medium",
        status: "Open",
        createdAt: new Date().toISOString(),
      });
      writeJSON(TICKETS_KEY, list);
      renderSupport();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                 */
  /* ------------------------------------------------------------------ */
  renderInvites();
  renderEarnings();
  renderWithdrawals();
  renderKyc();
  renderContent();
  renderCalendar();
  renderReviews();
  renderLeaderboard();
  renderNotifications();
  renderSupport();
})();
