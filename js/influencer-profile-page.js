/* ==========================================================================
   XPLOROO · Dynamic Influencer Profile page
   influencer-profile-page.js — Drives influencer-profile.html, the single
   reusable page that replaces creating a new per-influencer HTML file.
   Resolves the influencer from ?id=<user_id> or ?username=<slug> via
   window.XploroApplications.getApprovedByIdOrUsername(), loads their saved
   services via window.XploroServices.getServicesByUserId(), and renders the
   exact same markup/classes as the static template (siya.html): .ifp-hero
   + .ifp-experiences, one .ifp-experience per ENABLED service only. A small
   .ifp-profile block (avatar/followers/Instagram button) is rendered above
   the hero — additive markup not present on the static pages, styled via
   the new rules in styles/influencer-profile.css.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js and js/influencer-services.js.
   ========================================================================== */
(function () {
  "use strict";

  const container = document.querySelector("[data-ifp-container]");
  if (!container || !window.XploroApplications || !window.XploroServices) return;

  const CATALOG_BY_KEY = window.XploroServices.CATALOG.reduce((map, s) => {
    map[s.key] = s;
    return map;
  }, {});

  // Matches the slugs already used by the static pages (siya.html etc.) so
  // booking.html?service=<slug> keeps working unchanged for the shared keys.
  const SLUG_BY_KEY = {
    meetGreet: "meet-greet",
    podcast: "podcast-shoot",
    eventAppearance: "event-appearance",
    blogShoot: "blog-shoot",
    travelCollab: "travel-collab",
    bookAppointment: "book-appointment",
  };

  // data-theme values — reuses Siya's four themes for the matching services,
  // plus the three additive themes registered in influencer-profile.css.
  const THEME_BY_KEY = {
    meetGreet: "meet-greet",
    podcast: "podcast-shoot",
    eventAppearance: "event-appearance",
    blogShoot: "blog-shoot",
    travelCollab: "travel-collab",
    bookAppointment: "book-appointment",
  };

  const ARROW_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  const PLACEHOLDER_ICON =
    '<svg class="ifp-profile__avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  const INSTAGRAM_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

  function formatFollowers(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M Followers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K Followers`;
    return `${num} Followers`;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderNotFound() {
    container.innerHTML = `
      <section class="ifp-hero" aria-labelledby="ifp-name">
        <h1 class="ifp-hero__name" id="ifp-name">Influencer Not Found</h1>
        <p class="ifp-hero__intro">We couldn&rsquo;t find this influencer&rsquo;s profile. They may not be approved yet, or the link may be incorrect.</p>
      </section>`;
  }

  function profileHeaderTemplate(app) {
    const avatarHtml = app.avatar_url ? `<img src="${escapeHtml(app.avatar_url)}" alt="" />` : PLACEHOLDER_ICON;
    const instagramHtml = app.instagram_profile_link
      ? `<a class="btn btn--outline btn--sm ifp-profile__instagram" href="${escapeHtml(app.instagram_profile_link)}" target="_blank" rel="noopener noreferrer">${INSTAGRAM_SVG}Instagram</a>`
      : "";
    return `
      <div class="ifp-profile">
        <div class="ifp-profile__avatar">${avatarHtml}</div>
        <p class="ifp-profile__followers">${formatFollowers(app.instagram_followers)}</p>
        ${instagramHtml}
      </div>`;
  }

  function heroTemplate(app) {
    const name = app.full_name || "Xploroo Influencer";
    const intro =
      app.short_bio ||
      `Sharing real, unforgettable travel moments — ${name} brings their travel community along for every hidden gem, local discovery and once-in-a-lifetime view. Book a real moment with them below.`;
    return `
      <section class="ifp-hero" aria-labelledby="ifp-name">
        <h1 class="ifp-hero__name" id="ifp-name">${escapeHtml(name)}</h1>
        <p class="ifp-hero__intro">${escapeHtml(intro)}</p>
      </section>`;
  }

  function experienceTemplate(key, saved, bookingId) {
    const catalogEntry = CATALOG_BY_KEY[key];
    if (!catalogEntry) return "";
    const price = saved.price ? `&#8377;${escapeHtml(saved.price)} <span>onwards</span>` : "";
    const metaParts = [saved.duration, saved.date, saved.time, saved.location].filter(Boolean).map(escapeHtml);
    const metaHtml = metaParts.length ? `<p class="ifp-experience__desc">${metaParts.join(" &middot; ")}</p>` : "";

    return `
      <article class="ifp-experience" data-theme="${THEME_BY_KEY[key]}">
        <div class="ifp-experience__head">
          <span class="ifp-experience__emoji" aria-hidden="true">${catalogEntry.icon}</span>
          <h3 class="ifp-experience__title">${escapeHtml(catalogEntry.name)}</h3>
        </div>
        <p class="ifp-experience__desc">${escapeHtml(catalogEntry.description)}</p>
        ${metaHtml}
        ${price ? `<p class="ifp-experience__price">${price}</p>` : ""}
        <a class="ifp-experience__cta" href="booking.html?service=${SLUG_BY_KEY[key]}&influencer=${encodeURIComponent(bookingId)}">
          Book Now
          ${ARROW_SVG}
        </a>
      </article>`;
  }

  // Same stash-into-sessionStorage behaviour as js/influencer-profile.js
  // (which only wires up links present at DOMContentLoaded — these are
  // added later, once the Supabase fetch resolves, so it's re-implemented
  // here for this page only).
  function wireBookingLinks() {
    container.querySelectorAll('a[href*="booking.html?"]').forEach((link) => {
      link.addEventListener("click", () => {
        try {
          const url = new URL(link.href, window.location.href);
          const service = url.searchParams.get("service");
          const influencer = url.searchParams.get("influencer");
          if (service) sessionStorage.setItem("xploroo-selected-service", service);
          if (influencer) sessionStorage.setItem("xploroo-selected-influencer", influencer);
          sessionStorage.removeItem("xploroo-selected-package");
        } catch (_) {
          /* URL/sessionStorage unavailable — query param path still works */
        }
      });
    });
  }

  async function render() {
    const params = new URLSearchParams(window.location.search);
    // Fall back to sessionStorage if a host's clean-URL redirect stripped
    // the query string on the way here (see js/influencers-dynamic.js —
    // same pattern already used for booking.html's ?package=/?service=).
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
    if (!app) {
      renderNotFound();
      return;
    }

    const services = await window.XploroServices.getServicesByUserId(app.user_id);
    const bookingId = app.username || app.user_id;

    const experiencesHtml = window.XploroServices.CATALOG.map((service) => {
      const saved = services[service.key];
      if (!saved || !saved.enabled) return "";
      return experienceTemplate(service.key, saved, bookingId);
    })
      .filter(Boolean)
      .join("");

    container.innerHTML = `
      ${profileHeaderTemplate(app)}
      ${heroTemplate(app)}
      <section aria-labelledby="ifp-experiences-title">
        <header class="ifp-section-head">
          <h2 class="ifp-section-head__title" id="ifp-experiences-title">Book Experiences</h2>
          <p class="ifp-section-head__subtitle">Choose how you&rsquo;d like to connect &mdash; every experience is hosted personally.</p>
        </header>
        <div class="ifp-experiences">
          ${experiencesHtml || '<p class="ifp-hero__intro">No services available yet &mdash; check back soon.</p>'}
        </div>
      </section>`;

    wireBookingLinks();
  }

  render();
})();
