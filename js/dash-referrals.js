/* ==========================================================================
   XPLOROO · Influencer dashboard — Referral Program tab
   dash-referrals.js — Renders the "🎁 Referral Program" panel: the
   influencer's permanent code + link (Copy Link / Share), and four live
   stat cards (Referral Bookings / Total Referral Earnings / Available
   Referral Balance / Total Discounts Given), all read from
   window.XploroReferrals (public.referral_codes/_bookings/_commissions —
   see js/referral.js). Nothing here is hardcoded — everything comes from
   Supabase and reflects the latest state after a refresh.
   Vanilla JS, no dependencies. Loaded with `defer`, after referral.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroReferrals) return;

  const mount = page.querySelector('[data-dash-section="referrals"]');
  if (!mount) return;

  const formatINR = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

  function renderPending() {
    mount.innerHTML = `<div class="dash-empty"><p>Setting up your referral code&hellip;</p></div>`;
  }

  async function render() {
    const stats = await window.XploroReferrals.getMyReferralStats();

    if (!stats.code) {
      mount.innerHTML = `<div class="dash-empty"><p>Your referral code is being generated. Please check back shortly.</p></div>`;
      return;
    }

    mount.innerHTML = `
      <div class="referral-panel">
        <div class="referral-panel__code-card">
          <div class="referral-panel__code-block">
            <p class="referral-panel__label">Your Referral Code</p>
            <p class="referral-panel__code">${stats.code}</p>
          </div>
          <div class="referral-panel__link-row">
            <input class="input referral-panel__link-input" type="text" readonly value="${stats.link}" data-referral-link aria-label="Referral link" />
            <button class="btn btn--outline btn--sm" type="button" data-referral-copy>Copy Link</button>
            <button class="btn btn--primary btn--sm" type="button" data-referral-share>Share</button>
          </div>
          <p class="referral-panel__copy-message" data-referral-copy-message role="status" aria-live="polite"></p>
        </div>
      </div>

      <div class="dash-overview" style="margin-top:var(--space-6)">
        <article class="dash-overview__card dash-overview__card--upcoming">
          <span class="dash-overview__emoji" aria-hidden="true">&#128101;</span>
          <div class="dash-overview__body">
            <p class="dash-overview__title">Referral Bookings</p>
            <p class="dash-overview__value">${stats.bookings}</p>
            <p class="dash-overview__subtitle">Live from Supabase</p>
          </div>
        </article>
        <article class="dash-overview__card dash-overview__card--balance">
          <span class="dash-overview__emoji" aria-hidden="true">&#128176;</span>
          <div class="dash-overview__body">
            <p class="dash-overview__title">Total Referral Earnings</p>
            <p class="dash-overview__value">${formatINR(stats.totalEarnings)}</p>
            <p class="dash-overview__subtitle">Live from Supabase</p>
          </div>
        </article>
        <article class="dash-overview__card dash-overview__card--withdrawal">
          <span class="dash-overview__emoji" aria-hidden="true">&#128181;</span>
          <div class="dash-overview__body">
            <p class="dash-overview__title">Available Referral Balance</p>
            <p class="dash-overview__value">${formatINR(stats.availableBalance)}</p>
            <p class="dash-overview__subtitle">Included in your withdrawal balance</p>
          </div>
        </article>
        <article class="dash-overview__card dash-overview__card--services">
          <span class="dash-overview__emoji" aria-hidden="true">&#127881;</span>
          <div class="dash-overview__body">
            <p class="dash-overview__title">Total Discounts Given</p>
            <p class="dash-overview__value">${formatINR(stats.totalDiscountsGiven)}</p>
            <p class="dash-overview__subtitle">Passed on to your referred travellers</p>
          </div>
        </article>
      </div>`;

    const linkInput = mount.querySelector("[data-referral-link]");
    const copyBtn = mount.querySelector("[data-referral-copy]");
    const shareBtn = mount.querySelector("[data-referral-share]");
    const copyMessage = mount.querySelector("[data-referral-copy-message]");

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(stats.link);
        } catch (_) {
          linkInput.select();
          document.execCommand("copy");
        }
        copyMessage.textContent = "Link copied to clipboard.";
        window.setTimeout(() => (copyMessage.textContent = ""), 2500);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const shareData = { title: "Xploroo", text: `Book your next trip with Xploroo using my referral code ${stats.code}!`, url: stats.link };
        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (_) {
            /* user cancelled the share sheet — no error to surface */
          }
        } else {
          try {
            await navigator.clipboard.writeText(stats.link);
            copyMessage.textContent = "Sharing isn't supported here — link copied instead.";
            window.setTimeout(() => (copyMessage.textContent = ""), 3000);
          } catch (_) {}
        }
      });
    }
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    renderPending();
    render();

    const tabBtn = page.querySelector('[data-dash-tab="referrals"]');
    if (tabBtn) tabBtn.addEventListener("click", render);
  })();
})();
