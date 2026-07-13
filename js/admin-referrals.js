/* ==========================================================================
   XPLOROO · Admin — Referral Management
   admin-referrals.js — Renders the "🎁 Referral Management" tab: a global
   settings panel (Customer Discount % / Influencer Commission %, writes to
   public.referral_settings — no code change needed to reconfigure), and a
   table of every approved influencer's referral performance (Influencer /
   Referral Code / Referral Bookings / Discount Given / Commission Earned /
   Pending Commission / Paid Commission / Available Balance), each with a
   "Mark Paid" action on outstanding commissions. All data comes from
   window.XploroReferrals (see js/referral.js) — nothing hardcoded.
   Reuses the same .admin-card/.field/.input/.btn classes as every other
   admin tab for a consistent look.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js,
   referral.js and supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-referrals-root]");
  if (!root || !window.XploroReferrals || !window.supabaseClient) return;

  const client = window.supabaseClient;
  const esc = window.XploroSecurity.escapeHtml;
  const formatINR = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

  const ICON_GIFT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/></svg>';

  root.innerHTML = `
    <div class="admin-card" data-referral-settings-card>
      <div class="admin-card__body">
        <h2 class="admin-card__name" style="margin-bottom:var(--space-4)">Referral Settings</h2>
        <p style="margin:0 0 var(--space-5);font-size:var(--fs-sm);color:var(--color-text-muted)">
          Applies to every new referral booking going forward. Existing bookings/commissions are unaffected.
        </p>
        <form data-referral-settings-form>
          <div class="admin-card__meta" style="grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))">
            <label class="field">
              <span class="field__label">Customer Discount %</span>
              <input class="input" type="number" name="customerDiscountPercent" min="0" max="100" step="0.5" required />
            </label>
            <label class="field">
              <span class="field__label">Influencer Commission %</span>
              <input class="input" type="number" name="influencerCommissionPercent" min="0" max="100" step="0.5" required />
            </label>
          </div>
          <p class="admin-announce-message" data-referral-settings-message role="status" aria-live="polite"></p>
          <div class="admin-card__actions" style="margin-top:var(--space-5)">
            <button class="btn btn--primary btn--pill" type="submit">Save Settings</button>
          </div>
        </form>
      </div>
    </div>

    <h2 class="admin-card__name" style="margin:var(--space-8) 0 var(--space-4)">Influencer Referral Performance</h2>
    <div data-referral-table></div>`;

  /* ------------------------------------------------------------------ */
  /* Settings                                                             */
  /* ------------------------------------------------------------------ */
  const settingsForm = root.querySelector("[data-referral-settings-form]");
  const settingsMessage = root.querySelector("[data-referral-settings-message]");

  async function loadSettings() {
    const settings = await window.XploroReferrals.getSettings();
    settingsForm.querySelector('[name="customerDiscountPercent"]').value = settings.customer_discount_percent;
    settingsForm.querySelector('[name="influencerCommissionPercent"]').value = settings.influencer_commission_percent;
  }

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(settingsForm);
    const { ok } = await window.XploroAdminAuth.callAdminApi("update-referral-settings", {
      customerDiscountPercent: data.get("customerDiscountPercent"),
      influencerCommissionPercent: data.get("influencerCommissionPercent"),
    });
    settingsMessage.classList.remove("admin-announce-message--success", "admin-announce-message--error");
    settingsMessage.textContent = ok ? "✅ Settings saved." : "Failed to save settings.";
    settingsMessage.classList.add(ok ? "admin-announce-message--success" : "admin-announce-message--error");
  });

  /* ------------------------------------------------------------------ */
  /* Performance table                                                    */
  /* ------------------------------------------------------------------ */
  const tableMount = root.querySelector("[data-referral-table]");

  function renderEmpty() {
    tableMount.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_GIFT}</span>
        <p>No approved influencers have a referral code yet.</p>
      </div>`;
  }

  async function renderTable() {
    const summaries = await window.XploroReferrals.getAllReferralSummaries();
    if (!summaries.length) {
      renderEmpty();
      return;
    }

    const ids = summaries.map((s) => s.influencerId);
    const { data: apps } = await client.from("influencer_applications").select("user_id, full_name").in("user_id", ids);
    const nameById = new Map((apps || []).map((a) => [a.user_id, a.full_name]));

    // Pending commissions need their row `id` for the Mark Paid action.
    const { data: pendingCommissions } = await client
      .from("referral_commissions")
      .select("id, influencer_id")
      .eq("status", "Pending")
      .in("influencer_id", ids);
    const pendingByInfluencer = new Map();
    (pendingCommissions || []).forEach((c) => {
      if (!pendingByInfluencer.has(c.influencer_id)) pendingByInfluencer.set(c.influencer_id, []);
      pendingByInfluencer.get(c.influencer_id).push(c.id);
    });

    tableMount.innerHTML = `
      <div class="admin-list">
        ${summaries
          .map((s) => {
            const pendingIds = pendingByInfluencer.get(s.influencerId) || [];
            return `
          <article class="admin-card">
            <div class="admin-card__body">
              <div class="admin-card__head">
                <h2 class="admin-card__name">${esc(nameById.get(s.influencerId)) || "Unnamed Influencer"}</h2>
                <span class="status-pill status-pill--info">${esc(s.code)}</span>
              </div>
              <dl class="admin-card__meta">
                <div><dt>Referral Bookings</dt><dd>${s.bookingsCount}</dd></div>
                <div><dt>Discount Given</dt><dd>${formatINR(s.discountGiven)}</dd></div>
                <div><dt>Commission Earned</dt><dd>${formatINR(s.commissionEarned)}</dd></div>
                <div><dt>Pending Commission</dt><dd>${formatINR(s.pendingCommission)}</dd></div>
                <div><dt>Paid Commission</dt><dd>${formatINR(s.paidCommission)}</dd></div>
                <div><dt>Available Balance</dt><dd>${formatINR(s.availableBalance)}</dd></div>
              </dl>
              ${
                pendingIds.length
                  ? `<div class="admin-card__actions">
                       <button class="btn btn--primary btn--pill" type="button" data-referral-mark-paid="${s.influencerId}" data-commission-ids="${pendingIds.join(",")}">
                         Mark Pending Commission Paid
                       </button>
                     </div>`
                  : ""
              }
            </div>
          </article>`;
          })
          .join("")}
      </div>`;

    tableMount.querySelectorAll("[data-referral-mark-paid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const ids = btn.dataset.commissionIds.split(",").filter(Boolean);
        for (const id of ids) {
          await window.XploroAdminAuth.callAdminApi("mark-commission-paid", { commissionId: id });
        }
        renderTable();
      });
    });
  }

  loadSettings();
  renderTable();

  const tabBtn = document.querySelector('[data-admin-tab="referrals"]');
  if (tabBtn) tabBtn.addEventListener("click", renderTable);
})();
