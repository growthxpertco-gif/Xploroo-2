/* ==========================================================================
   XPLOROO · Dynamic VIP Package page (Phase 23)
   vip-package-page.js — Drives vip-package.html, the single reusable page
   for every VIP Experience (no per-experience HTML file). Resolves the
   owning VIP personality from ?id=/?username= (reusing
   window.XploroApplications.getApprovedByIdOrUsername(), same as
   influencer-profile.html / vip-profile.html) and the experience itself
   from ?package=<slug> via window.XploroVip.getPackage().

   Reuses styles/package-details.css `.pkg-*` classes verbatim — identical
   layout/design language to every travel package page. Only the FAQ
   accordion (styles/vip-package.css `.vip-faq*`) is new.

   Per Phase 23 scope: Terms & Conditions, Rules, Hotel, Celebrity Info,
   What's Included, FAQs and Cancellation Policy are all placeholder
   content for now — real content comes in a later phase. Book Now opens
   the placeholder booking flow (vip-package-booking.html), never payment.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js and js/vip.js.
   ========================================================================== */
(function () {
  "use strict";

  const container = document.querySelector("[data-vip-pkg-container]");
  if (!container || !window.XploroApplications || !window.XploroVip) return;

  const esc = window.XploroSecurity.escapeHtml;
  const sanitizeUrl = window.XploroSecurity.sanitizeUrl;

  const CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const CHEVRON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  function formatPrice(price) {
    if (price == null || price === "") return "Price on Request";
    return `&#8377;${Number(price).toLocaleString("en-IN")}`;
  }

  function renderNotFound() {
    container.innerHTML = `
      <div class="pkg-container" style="padding-block:4rem;text-align:center">
        <h1 class="pkg-hero__title">VIP Experience Not Found</h1>
        <p class="pkg-hero__desc">This VIP Experience may have been removed or the link is incorrect.</p>
        <a class="pkg-cta pkg-cta--block" href="influencers.html?niche=vip" style="max-width:20rem;margin-inline:auto">Browse VIP Personalities</a>
      </div>`;
  }

  function infoCardsTemplate(personalityName) {
    return `
      <div class="pkg-info-grid">
        <div class="pkg-info-card pkg-info-card--duration">
          <span class="pkg-info-card__icon">${CHECK_SVG}</span>
          <span><span class="pkg-info-card__label">Hosted By</span><span class="pkg-info-card__value">${esc(personalityName)}</span></span>
        </div>
        <div class="pkg-info-card pkg-info-card--destination">
          <span class="pkg-info-card__icon">${CHECK_SVG}</span>
          <span><span class="pkg-info-card__label">Booking Type</span><span class="pkg-info-card__value">VIP Experience</span></span>
        </div>
        <div class="pkg-info-card pkg-info-card--group">
          <span class="pkg-info-card__icon">${CHECK_SVG}</span>
          <span><span class="pkg-info-card__label">Availability</span><span class="pkg-info-card__value">On Request</span></span>
        </div>
        <div class="pkg-info-card pkg-info-card--trip">
          <span class="pkg-info-card__icon">${CHECK_SVG}</span>
          <span><span class="pkg-info-card__label">Response Time</span><span class="pkg-info-card__value">Within 48 Hours</span></span>
        </div>
      </div>`;
  }

  function faqTemplate() {
    const faqs = [
      ["How does booking a VIP Experience work?", "Submit a booking request with your preferred date and details. The Xploroo team and the VIP personality's team will confirm availability and follow up with next steps."],
      ["Is payment required now?", "No. This is a booking request only — no payment is collected at this stage. You'll be contacted separately to complete your booking."],
      ["Can I request a custom date or add-ons?", "Yes — mention your preferences in the Special Request field when booking, and the team will do their best to accommodate them."],
      ["What is the cancellation policy?", "Full Terms & Conditions and Cancellation Policy for this experience will be published soon. For now, contact Xploroo support with any cancellation requests."],
    ];
    return `
      <div class="vip-faq">
        ${faqs
          .map(
            ([q, a]) => `
          <details class="vip-faq__item">
            <summary class="vip-faq__question">${esc(q)} ${CHEVRON_SVG}</summary>
            <p class="vip-faq__answer">${esc(a)}</p>
          </details>`
          )
          .join("")}
      </div>`;
  }

  function pageTemplate(pkg, personality) {
    const personalityName = personality.full_name || "Xploroo VIP Personality";
    const heroImageHtml = pkg.image
      ? `<div class="pkg-gallery"><div class="pkg-gallery__hero"><img class="pkg-gallery__hero-img" src="${sanitizeUrl(pkg.image, { allowData: true })}" alt="${esc(pkg.title)}" /></div></div>`
      : "";

    return `
      <section class="pkg-hero pkg-container" data-pkg-hero aria-labelledby="vip-pkg-title">
        <nav class="pkg-breadcrumb" aria-label="Breadcrumb">
          <a class="pkg-breadcrumb__link" href="index.html">Home</a>
          <span class="pkg-breadcrumb__sep" aria-hidden="true">&rsaquo;</span>
          <a class="pkg-breadcrumb__link" href="influencers.html?niche=vip">VIP</a>
          <span class="pkg-breadcrumb__sep" aria-hidden="true">&rsaquo;</span>
          <span class="pkg-breadcrumb__current" aria-current="page">${esc(pkg.title)}</span>
        </nav>

        <h1 class="pkg-hero__title" id="vip-pkg-title">${esc(pkg.title)}</h1>
        <p class="pkg-hero__desc">${esc(pkg.short_description) || `An exclusive VIP Experience hosted personally by ${esc(personalityName)}.`}</p>

        <div class="pkg-hero__status">
          <div class="pkg-hero__status-left">
            <span class="pkg-badge pkg-badge--category">&#11088; VIP Experience</span>
          </div>
          <a class="pkg-cta pkg-cta--hero" href="#" data-vip-book>
            Book Now
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>

        ${heroImageHtml}
      </section>

      <div class="pkg-container">
        <div class="pkg-layout">
          <div class="pkg-layout__main">

            <section aria-label="VIP Experience information">
              ${infoCardsTemplate(personalityName)}
            </section>

            <section aria-labelledby="vip-pkg-overview-title">
              <div class="pkg-overview">
                <div class="pkg-overview__text">
                  <h2 id="vip-pkg-overview-title">About This Experience</h2>
                  <p>${esc(pkg.short_description) || `More details about ${esc(pkg.title)} will be shared once you submit a booking request. The Xploroo team works directly with ${esc(personalityName)}'s team to tailor every VIP Experience.`}</p>
                </div>
                <aside class="pkg-highlights">
                  <h3 class="pkg-highlights__title">Celebrity Information</h3>
                  <ul class="pkg-highlights__list">
                    <li class="pkg-highlights__item">${CHECK_SVG}<span>Hosted personally by ${esc(personalityName)}</span></li>
                    <li class="pkg-highlights__item">${CHECK_SVG}<span>Verified Xploroo VIP Personality</span></li>
                    <li class="pkg-highlights__item">${CHECK_SVG}<span>Full profile details coming soon</span></li>
                  </ul>
                </aside>
              </div>
            </section>

            <section aria-label="Terms, rules and cancellation policy">
              <div class="pkg-tabs__nav" role="tablist" aria-label="VIP Experience details tabs">
                <button class="pkg-tabs__tab" type="button" role="tab" aria-selected="true" data-vip-pkg-tab="terms">Terms &amp; Conditions</button>
                <button class="pkg-tabs__tab" type="button" role="tab" aria-selected="false" data-vip-pkg-tab="rules">Rules</button>
                <button class="pkg-tabs__tab" type="button" role="tab" aria-selected="false" data-vip-pkg-tab="cancellation">Cancellation Policy</button>
              </div>

              <div class="pkg-tabs__panel is-active is-visible" data-vip-pkg-tab-panel="terms">
                <p class="pkg-hero__desc">Full Terms &amp; Conditions for this VIP Experience will be published here soon. Placeholder content only — check back after this experience is finalized.</p>
              </div>
              <div class="pkg-tabs__panel" data-vip-pkg-tab-panel="rules">
                <p class="pkg-hero__desc">Experience-specific rules (age limits, ID requirements, conduct guidelines, etc.) will be published here soon.</p>
              </div>
              <div class="pkg-tabs__panel" data-vip-pkg-tab-panel="cancellation">
                <p class="pkg-hero__desc">The Cancellation Policy for this VIP Experience will be published here soon. For now, contact Xploroo support with any cancellation requests.</p>
              </div>
            </section>

            <section aria-labelledby="vip-pkg-included-title">
              <div class="pkg-section__head">
                <h2 class="pkg-section__title" id="vip-pkg-included-title">What&rsquo;s Included</h2>
              </div>
              <div class="pkg-included__grid">
                <div class="pkg-included__item">
                  <span class="pkg-included__icon">${CHECK_SVG}</span>
                  <span class="pkg-included__label">Personal Hosting</span>
                </div>
                <div class="pkg-included__item">
                  <span class="pkg-included__icon">${CHECK_SVG}</span>
                  <span class="pkg-included__label">Hotel Details (soon)</span>
                </div>
                <div class="pkg-included__item">
                  <span class="pkg-included__icon">${CHECK_SVG}</span>
                  <span class="pkg-included__label">Pricing (soon)</span>
                </div>
                <div class="pkg-included__item">
                  <span class="pkg-included__icon">${CHECK_SVG}</span>
                  <span class="pkg-included__label">Dedicated Support</span>
                </div>
              </div>
            </section>

            <section aria-labelledby="vip-pkg-faq-title">
              <div class="pkg-section__head">
                <h2 class="pkg-section__title" id="vip-pkg-faq-title">FAQs</h2>
              </div>
              ${faqTemplate()}
            </section>

          </div>

          <aside class="pkg-layout__aside" aria-label="Booking summary">
            <div class="pkg-pricing" id="vip-pkg-pricing">
              <span class="pkg-pricing__label">Experience Price</span>
              <p class="pkg-pricing__amount">${formatPrice(pkg.price)}</p>
              <ul class="pkg-pricing__list">
                <li>${CHECK_SVG}No Payment Collected Now</li>
                <li>${CHECK_SVG}Personally Hosted</li>
                <li>${CHECK_SVG}Xploroo Verified</li>
              </ul>
              <a class="pkg-cta pkg-cta--block" href="#" data-vip-book>Book Now</a>
            </div>
          </aside>
        </div>
      </div>`;
  }

  function wireTabs() {
    const tabs = Array.from(container.querySelectorAll("[data-vip-pkg-tab]"));
    const panels = Array.from(container.querySelectorAll("[data-vip-pkg-tab-panel]"));
    tabs.forEach((tabEl) => {
      tabEl.addEventListener("click", () => {
        const target = tabEl.dataset.vipPkgTab;
        tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tabEl)));
        panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.vipPkgTabPanel === target));
      });
    });
  }

  function wireStickyBar(pkg) {
    const stickyBar = document.querySelector("[data-pkg-sticky-bar]");
    const hero = container.querySelector("[data-pkg-hero]");
    if (!stickyBar || !hero) return;

    const priceEl = stickyBar.querySelector("[data-vip-sticky-price]");
    if (priceEl) priceEl.innerHTML = `<strong>${formatPrice(pkg.price)}</strong>`;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => stickyBar.classList.toggle("is-visible", !entry.isIntersecting)),
        { threshold: 0 }
      );
      observer.observe(hero);
    }
  }

  // Book Now — persist the target package so vip-package-booking.html can
  // recover it even if a host's clean-URL redirect strips the query string
  // (same handoff pattern as booking.html / influencer-profile.html).
  function wireBookingLinks(pkg, personality) {
    const href = `vip-package-booking.html?package=${encodeURIComponent(pkg.id)}`;
    document.querySelectorAll("[data-vip-book]").forEach((link) => {
      link.href = href;
      link.addEventListener("click", () => {
        try {
          sessionStorage.setItem("xploroo-selected-vip-package", pkg.id);
          sessionStorage.setItem(
            "xploroo-vip-package-summary",
            JSON.stringify({ title: pkg.title, price: pkg.price, influencerId: personality.user_id, influencerName: personality.full_name || "" })
          );
        } catch (_) {
          /* sessionStorage unavailable — query param path still works */
        }
      });
    });
  }

  async function render() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    let username = params.get("username");
    let slug = params.get("package");
    if (!id && !username) {
      try {
        id = sessionStorage.getItem("xploroo-selected-profile-id");
        username = sessionStorage.getItem("xploroo-selected-profile-username");
      } catch (_) {
        /* sessionStorage unavailable */
      }
    }
    if (!slug) {
      try {
        slug = sessionStorage.getItem("xploroo-selected-vip-package-slug");
      } catch (_) {
        /* sessionStorage unavailable */
      }
    }
    if ((!id && !username) || !slug) {
      renderNotFound();
      return;
    }

    const personality = await window.XploroApplications.getApprovedByIdOrUsername({ id, username });
    if (!personality || !personality.is_vip_personality) {
      renderNotFound();
      return;
    }

    const pkg = await window.XploroVip.getPackage({ influencerId: personality.user_id, slug });
    if (!pkg) {
      renderNotFound();
      return;
    }

    container.innerHTML = pageTemplate(pkg, personality);
    wireTabs();
    wireStickyBar(pkg);
    wireBookingLinks(pkg, personality);
  }

  render();
})();
