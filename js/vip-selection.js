/* ==========================================================================
   XPLOROO · VIP Personality selector (vip.html)
   vip-selection.js — Drives the "Select VIP Personality" dropdown: swaps a
   single destination card in place (same `.tp-card` component as Trending
   Packages, see styles/trending-packages.css + styles/vip-selection.css)
   without ever navigating away from vip.html. The card itself links to the
   matching, already-existing VIP package details page (built in an earlier
   phase — dubai-vip-package.html etc.), and "Book Now" (moved below the
   informational sections in Phase 32) opens the new, completely
   independent vip-booking.html request form — never booking.html or the
   older vip-package-booking.html — passing only the selected VIP's name
   for auto-fill (see js/vip-booking.js). The booking flow itself never
   collects or shows a destination — that's a surprise Xploroo plans.
   Placeholder destination mapping only (used for this page's own card
   display) — swap VIP_PERSONALITIES for real data later.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const select = document.querySelector("[data-vip-select]");
  const cardMount = document.querySelector("[data-vip-card-mount]");
  const bookBtn = document.querySelector("[data-vip-book]");
  if (!select || !cardMount || !bookBtn) return;

  const VIP_PERSONALITIES = {
    "salman-khan": {
      package: "dubai-vip",
      href: "dubai-vip-package.html",
      destination: "Dubai VIP Experience",
      duration: "5 Days / 4 Nights",
      price: "Price on Request",
      img: "https://ik.imagekit.io/mg0v9kccj/IMG_20260707_145514.png.jpg.jpeg?updatedAt=1783417163324",
      alt: "Dubai",
    },
    "shah-rukh-khan": {
      package: "iceland-vip",
      href: "iceland-vip-package.html",
      destination: "Iceland VIP Experience",
      duration: "7 Days / 6 Nights",
      price: "Price on Request",
      img: "https://ik.imagekit.io/mg0v9kccj/IMG-20260704-WA0019.jpg.jpeg?updatedAt=1783347238975",
      alt: "Iceland",
    },
    "virat-kohli": {
      package: "singapore-vip",
      href: "singapore-vip-package.html",
      destination: "Singapore VIP Experience",
      duration: "4 Days / 3 Nights",
      price: "Price on Request",
      img: "https://ik.imagekit.io/mg0v9kccj/file_00000000e94471fab9ac9f8acff218c0.png?updatedAt=1783417163302",
      alt: "Singapore",
    },
    "ranveer-singh": {
      package: "japan-vip",
      href: "japan-vip-package.html",
      destination: "Japan VIP Experience",
      duration: "8 Days / 7 Nights",
      price: "Price on Request",
      img: "https://ik.imagekit.io/mg0v9kccj/IMG-20260706-WA0001.jpg.jpeg?updatedAt=1783347238979",
      alt: "Japan",
    },
  };

  const esc = window.XploroSecurity ? window.XploroSecurity.escapeHtml : (v) => String(v == null ? "" : v);

  // Tracks the currently-rendered VIP's package-details href — read fresh
  // by Book Now on every click, so it's always in sync with the dropdown
  // without relying on a stale closure from an earlier render.
  let currentHref = "";

  function renderCard(personality) {
    currentHref = personality.href;

    cardMount.innerHTML = `
      <article class="tp-card" data-vip-card role="link" tabindex="0" aria-label="View ${esc(personality.destination)}">
        <div class="tp-card__media">
          <img class="tp-card__img" src="${esc(personality.img)}" alt="${esc(personality.alt)}" />
        </div>
        <div class="tp-card__body">
          <h3 class="tp-card__destination">${esc(personality.destination)}</h3>
          <p class="tp-card__duration">${esc(personality.duration)}</p>
          <div class="tp-card__footer">
            <span class="tp-card__price">
              <span class="tp-card__price-amount">${esc(personality.price)}</span>
            </span>
          </div>
        </div>
      </article>`;

    // Re-bound fresh on every render, so it always navigates to the
    // currently-selected VIP's page — never a stale earlier selection.
    const card = cardMount.querySelector("[data-vip-card]");
    function goToDestination() {
      window.location.href = currentHref;
    }
    card.addEventListener("click", goToDestination);
    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      goToDestination();
    });
  }

  function renderSelected() {
    const personality = VIP_PERSONALITIES[select.value];
    if (personality) renderCard(personality);
  }

  select.addEventListener("change", renderSelected);
  bookBtn.addEventListener("click", () => {
    if (!currentHref) return;
    const vipName = select.options[select.selectedIndex].text;

    // Same handoff pattern used elsewhere on the site (e.g.
    // vip-package-page.js/booking.html) — stash the selection in
    // sessionStorage before navigating so vip-booking.html can still
    // recover it if a host's clean-URL redirect strips the query string.
    // Deliberately a distinct key from the older vip-package-booking.html
    // flow's "xploroo-selected-vip-package", per Phase 32's requirement
    // that this booking flow stay completely independent. No destination
    // is handed off — the VIP booking form never collects or shows one.
    try {
      sessionStorage.setItem("xploroo-vip-booking-selection", JSON.stringify({ vipPersonality: vipName }));
    } catch (_) {
      /* sessionStorage unavailable — query param path still works */
    }
    window.location.href = `vip-booking.html?vip=${encodeURIComponent(vipName)}`;
  });

  renderSelected();
})();
