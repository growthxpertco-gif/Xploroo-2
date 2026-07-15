/* ==========================================================================
   XPLOROO · Dynamic VIP Profile page (Phase 23)
   vip-profile-page.js — Drives vip-profile.html, the single reusable page
   for every VIP personality (no per-celebrity HTML file). Resolves the
   personality from ?id=<user_id> or ?username=<slug> via
   window.XploroApplications.getApprovedByIdOrUsername() — reusing the exact
   same influencer_applications lookup as influencer-profile.html, just
   requiring is_vip_personality = true — then renders:
     1. Profile header (photo/followers/Instagram) + About/Short Biography
        — reuses styles/influencer-profile.css `.ifp-*` classes verbatim.
     2. Gallery (public.influencer_applications.gallery_urls).
     3. VIP Experiences — public.vip_packages for this personality, in the
        exact Trending Packages carousel markup/classes
        (styles/trending-packages.css `.tp-*`), initialized via
        window.XploroTrendingPackages.init() once the markup exists (the
        carousel is injected after an async Supabase fetch, so it can't
        rely on trending-packages.js's own DOMContentLoaded-time query).

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js, js/vip.js and before js/trending-packages.js.
   ========================================================================== */
(function () {
  "use strict";

  const container = document.querySelector("[data-vip-container]");
  if (!container || !window.XploroApplications || !window.XploroVip) return;

  const esc = window.XploroSecurity.escapeHtml;
  const sanitizeUrl = window.XploroSecurity.sanitizeUrl;

  const PLACEHOLDER_ICON =
    '<svg class="ifp-profile__avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  const INSTAGRAM_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

  const WISHLIST_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7-4.35-9.5-8.8C.7 8.2 2.4 4.5 5.9 4.5c2 0 3.4 1.1 4.1 2.2C10.7 5.6 12.1 4.5 14.1 4.5c3.5 0 5.2 3.7 3.4 7.2C19 16.15 12 20.5 12 20.5Z"/></svg>';

  function formatFollowers(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M Followers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K Followers`;
    return `${num} Followers`;
  }

  function renderNotFound() {
    container.innerHTML = `
      <section class="ifp-hero" aria-labelledby="vip-name">
        <h1 class="ifp-hero__name" id="vip-name">VIP Personality Not Found</h1>
        <p class="ifp-hero__intro">We couldn&rsquo;t find this VIP profile. They may not be a VIP personality yet, or the link may be incorrect.</p>
      </section>`;
  }

  function profileHeaderTemplate(app) {
    const avatarHtml = app.avatar_url ? `<img src="${sanitizeUrl(app.avatar_url, { allowData: true })}" alt="" />` : PLACEHOLDER_ICON;
    const instagramHtml = app.instagram_profile_link
      ? `<a class="btn btn--outline btn--sm ifp-profile__instagram" href="${sanitizeUrl(app.instagram_profile_link)}" target="_blank" rel="noopener noreferrer">${INSTAGRAM_SVG}Instagram</a>`
      : "";
    return `
      <div class="ifp-profile">
        <div class="ifp-profile__avatar">${avatarHtml}</div>
        <p class="ifp-profile__followers">${formatFollowers(app.instagram_followers)}</p>
        ${instagramHtml}
      </div>`;
  }

  function heroTemplate(app) {
    const name = app.full_name || "Xploroo VIP Personality";
    const intro = app.short_bio || `${name} is one of Xploroo&rsquo;s exclusive VIP Personalities. Explore their VIP Experiences below.`;
    return `
      <section class="ifp-hero" aria-labelledby="vip-name">
        <h1 class="ifp-hero__name" id="vip-name">${esc(name)}</h1>
        <p class="ifp-hero__intro">${esc(intro)}</p>
      </section>`;
  }

  function galleryTemplate(app) {
    const urls = Array.isArray(app.gallery_urls) ? app.gallery_urls.filter(Boolean) : [];
    if (!urls.length) return "";
    return `
      <section class="vip-gallery" aria-labelledby="vip-gallery-title">
        <h2 class="vip-gallery__title" id="vip-gallery-title">Gallery</h2>
        <div class="vip-gallery__grid">
          ${urls.map((url) => `<div class="vip-gallery__item"><img src="${sanitizeUrl(url, { allowData: true })}" alt="" loading="lazy" /></div>`).join("")}
        </div>
      </section>`;
  }

  function formatPrice(price) {
    if (price == null || price === "") return "";
    return `&#8377;${Number(price).toLocaleString("en-IN")}`;
  }

  function packageCardTemplate(pkg, idParam) {
    const href = `vip-package.html?package=${encodeURIComponent(pkg.slug)}&${idParam}`;
    const mediaHtml = pkg.image
      ? `<img class="tp-card__img" src="${sanitizeUrl(pkg.image, { allowData: true })}" alt="${esc(pkg.title)}" />`
      : "";
    const priceHtml = formatPrice(pkg.price)
      ? `<span class="tp-card__price"><span class="tp-card__price-amount">${formatPrice(pkg.price)}</span></span>`
      : "";
    return `
      <li class="tp-slide">
        <article class="tp-card" data-tp-card data-tp-href="${esc(href)}" data-vip-package-slug="${esc(pkg.slug)}" aria-label="View ${esc(pkg.title)} details">
          <div class="tp-card__media">
            ${mediaHtml}
            <button class="tp-card__wishlist" type="button" aria-label="Save ${esc(pkg.title)}" aria-pressed="false" data-tp-wishlist>${WISHLIST_SVG}</button>
          </div>
          <div class="tp-card__body">
            <h3 class="tp-card__destination">${esc(pkg.title)}</h3>
            <p class="tp-card__duration">${esc(pkg.short_description) || ""}</p>
            <div class="tp-card__footer">${priceHtml}</div>
          </div>
        </article>
      </li>`;
  }

  function experiencesTemplate(packages, idParam) {
    if (!packages.length) {
      return `
        <section aria-labelledby="vip-experiences-title">
          <header class="vip-experiences-head">
            <h2 class="vip-experiences-head__title" id="vip-experiences-title">VIP Experiences</h2>
          </header>
          <p class="vip-experiences-empty">No VIP Experiences available yet &mdash; check back soon.</p>
        </section>`;
    }

    return `
      <section class="trending-packages" aria-labelledby="vip-experiences-title">
        <header class="vip-experiences-head">
          <h2 class="vip-experiences-head__title" id="vip-experiences-title">VIP Experiences</h2>
          <p class="vip-experiences-head__subtitle">Exclusive experiences hosted personally &mdash; each one is one-of-a-kind.</p>
        </header>

        <div class="tp-carousel" data-tp-carousel>
          <button class="tp-arrow tp-arrow--prev" type="button" data-tp-prev aria-label="Scroll to previous experiences">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="tp-arrow tp-arrow--next" type="button" data-tp-next aria-label="Scroll to next experiences">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <ul class="tp-track" data-tp-track role="list">
            ${packages.map((pkg) => packageCardTemplate(pkg, idParam)).join("")}
          </ul>
        </div>
      </section>`;
  }

  async function render() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    let username = params.get("username");
    if (!id && !username) {
      try {
        id = sessionStorage.getItem("xploroo-selected-profile-id");
        username = sessionStorage.getItem("xploroo-selected-profile-username");
      } catch (_) {
        /* sessionStorage unavailable */
      }
    }
    if (!id && !username) {
      renderNotFound();
      return;
    }

    const app = await window.XploroApplications.getApprovedByIdOrUsername({ id, username });
    if (!app || !app.is_vip_personality) {
      renderNotFound();
      return;
    }

    const packages = await window.XploroVip.getPackagesByInfluencerId(app.user_id);
    const idParam = app.username ? `username=${encodeURIComponent(app.username)}` : `id=${encodeURIComponent(app.user_id)}`;

    container.innerHTML = `
      ${profileHeaderTemplate(app)}
      ${heroTemplate(app)}
      ${galleryTemplate(app)}
      ${experiencesTemplate(packages, idParam)}`;

    if (packages.length) {
      const carousel = container.querySelector("[data-tp-carousel]");
      // Stash the target VIP package slug + this personality's id/username
      // before trending-packages.js's own click handler navigates away —
      // registered first so it runs first — so vip-package.html can still
      // recover them if a host's clean-URL redirect strips the query
      // string (same handoff pattern as booking.html / influencer-profile.html).
      carousel.querySelectorAll("[data-vip-package-slug]").forEach((card) => {
        card.addEventListener("click", () => {
          try {
            sessionStorage.setItem("xploroo-selected-vip-package-slug", card.dataset.vipPackageSlug);
            if (app.username) sessionStorage.setItem("xploroo-selected-profile-username", app.username);
            sessionStorage.setItem("xploroo-selected-profile-id", app.user_id);
          } catch (_) {
            /* sessionStorage unavailable — query param path still works */
          }
        });
      });
      if (window.XploroTrendingPackages) window.XploroTrendingPackages.init(carousel);
    }
  }

  render();
})();
