/* ==========================================================================
   XPLOROO · Influencers page — live Supabase cards
   influencers-dynamic.js — Loads every approved Influencer application
   (application_status = "approved") from public.influencer_applications
   and renders one `.ip-card` per row, appended into the same `.ip-grid`
   the existing static cards already live in (styles/influencers-page.css
   — reused as-is, nothing added here touches those rules). Also builds
   the niche filter tabs.

   Existing static cards are never touched: they simply don't carry a
   `data-ip-niche` attribute, so the filter treats them as "All-only" —
   selecting a specific niche hides them and shows only the matching
   Supabase cards; selecting "All" shows everything together. This is a
   read-only, additive script — no data is duplicated or written back.

   Modularity note: as static cards get migrated to real
   influencer_applications rows over time, giving each one a matching
   `data-ip-niche` (or replacing it with a generated card entirely) is a
   one-line change per card — the tab-filtering logic here already
   supports it unchanged.

   Profile pictures come from public.profiles.avatar_url — the single
   source of truth for every avatar on the site (see js/supabase.js) —
   via window.XploroApplications.getApprovedApplications(), which already
   attaches each row's avatar_url. This file never queries Supabase
   directly for it, so there's exactly one place that join lives.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const grid = document.querySelector("[data-ip-grid]");
  const tabsContainer = document.querySelector("[data-ip-tabs]");
  if (!grid || !tabsContainer || !window.XploroApplications) return;

  const NICHES = [
    { value: "all", label: "All" },
    { value: "traveller", label: "Traveller" },
    { value: "content-creator", label: "Content Creator" },
    { value: "doctor", label: "Doctor" },
    { value: "fitness", label: "Fitness" },
    { value: "fashion", label: "Fashion" },
    { value: "food", label: "Food" },
    { value: "lifestyle", label: "Lifestyle" },
    { value: "technology", label: "Technology" },
    { value: "finance", label: "Finance" },
    { value: "business", label: "Business" },
    { value: "photography", label: "Photography" },
    { value: "videography", label: "Videography" },
    { value: "automobile", label: "Automobile" },
    { value: "education", label: "Education" },
    { value: "comedy", label: "Comedy" },
    { value: "gaming", label: "Gaming" },
    { value: "music", label: "Music" },
    { value: "dance", label: "Dance" },
    { value: "beauty", label: "Beauty" },
    { value: "parenting", label: "Parenting" },
    { value: "pets", label: "Pets" },
    { value: "adventure", label: "Adventure" },
    { value: "luxury", label: "Luxury" },
    { value: "wellness", label: "Wellness" },
    { value: "astrologer", label: "Astrologer" },
    { value: "other", label: "Other" },
  ];

  const PLACEHOLDER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  function formatFollowers(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M Followers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K Followers`;
    return `${num} Followers`;
  }

  function cardTemplate(app) {
    const mediaHtml = app.avatar_url
      ? `<img class="ip-card__img" src="${app.avatar_url}" alt="" />`
      : `<div class="ip-card__img ip-card__img--placeholder">${PLACEHOLDER_ICON}</div>`;

    // Book Now always opens the one reusable influencer-profile.html for
    // this influencer — never a hardcoded per-influencer page. Prefer the
    // readable username slug, fall back to the raw user_id.
    const profileHref = `influencer-profile.html?${app.username ? `username=${encodeURIComponent(app.username)}` : `id=${encodeURIComponent(app.user_id)}`}`;

    return `
      <article class="ip-card" data-ip-niche="${app.niche || "other"}" data-ip-dynamic aria-label="View ${app.full_name || "influencer"}&rsquo;s profile">
        <div class="ip-card__media">${mediaHtml}</div>
        <div class="ip-card__body">
          <h3 class="ip-card__name">${app.full_name || "Xploroo Influencer"}</h3>
          <p class="ip-card__bio">${app.short_bio || ""}</p>
          <p class="ip-card__followers">${formatFollowers(app.instagram_followers)}</p>
          <div class="ip-card__socials">
            ${app.instagram_profile_link ? `<a class="btn btn--outline btn--sm ip-card__social" href="${app.instagram_profile_link}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>` : ""}
          </div>
          <a class="btn btn--gradient btn--pill ip-card__book" href="${profileHref}" data-ip-book>Book Now</a>
        </div>
      </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Niche tabs — instant client-side filtering, no page reload.          */
  /* ------------------------------------------------------------------ */
  function applyFilter(activeValue) {
    Array.from(grid.querySelectorAll(".ip-card")).forEach((card) => {
      if (activeValue === "all") {
        card.hidden = false;
        return;
      }
      // Static cards (no data-ip-niche yet) only ever show under "All".
      card.hidden = card.dataset.ipNiche !== activeValue;
    });
  }

  function buildTabs() {
    tabsContainer.innerHTML = NICHES.map(
      (n, i) => `<button class="ip-tab" type="button" role="tab" data-ip-tab="${n.value}" aria-selected="${i === 0}">${n.label}</button>`
    ).join("");

    tabsContainer.querySelectorAll("[data-ip-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabsContainer.querySelectorAll("[data-ip-tab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
        applyFilter(btn.dataset.ipTab);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Load + render approved influencers.                                  */
  /* ------------------------------------------------------------------ */
  async function loadApprovedInfluencers() {
    const data = await window.XploroApplications.getApprovedApplications();
    if (!data.length) return;

    grid.insertAdjacentHTML("beforeend", data.map(cardTemplate).join(""));

    // Booking handoff — before following "Book Now", persist the target
    // influencer's id/username so influencer-profile.html can still recover
    // it if a host's clean-URL redirect strips the query string (e.g. the
    // `serve` dev server or Vercel's cleanUrls both 301 `/influencer-profile.html`
    // to `/influencer-profile`, dropping `?id=`/`?username=`). Same pattern
    // as js/package-details.js's booking.html handoff.
    grid.querySelectorAll('a[href*="influencer-profile.html?"]').forEach((link) => {
      link.addEventListener("click", () => {
        try {
          const url = new URL(link.href, window.location.href);
          const id = url.searchParams.get("id");
          const username = url.searchParams.get("username");
          if (id) sessionStorage.setItem("xploroo-selected-profile-id", id);
          if (username) sessionStorage.setItem("xploroo-selected-profile-username", username);
        } catch (_) {
          /* URL/sessionStorage unavailable — query param path still works */
        }
      });
    });
  }

  buildTabs();
  loadApprovedInfluencers();
})();
