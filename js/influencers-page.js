/* ==========================================================================
   XPLOROO · Influencers page
   influencers-page.js — Opt-in card-wide click-through. Only cards that
   declare `data-ip-href` (currently just the first influencer card) become
   clickable; every other `.ip-card` is completely unaffected. Clicks on an
   inner link/button (social icons, "Book With Me") are left alone so they
   keep their own destination instead of being swallowed by the card link.
   Vanilla JS, no dependencies. Scoped entirely to [data-ip-href]. Loaded
   with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  document.querySelectorAll("[data-ip-href]").forEach((card) => {
    const destination = card.dataset.ipHref;

    function goToDestination() {
      window.location.href = destination;
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return; // let inner links/buttons behave normally
      goToDestination();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target.closest("a, button")) return;
      e.preventDefault();
      goToDestination();
    });
  });
})();
