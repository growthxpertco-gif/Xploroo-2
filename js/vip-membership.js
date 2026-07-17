/* ==========================================================================
   XPLOROO · VIP Membership Landing Page (Phase 35)
   vip-membership.js — Front-end-only interactions for vip-membership.html:
   hero CTA smooth-scroll to the tiers section, tier "Choose" selection
   (purely cosmetic — no backend, no subscription created), a scoped FAQ
   accordion, and the final CTA's simulated membership activation (sets a
   one-time sessionStorage flag read by vip.html's banner, then redirects).
   No payment, no subscription, no backend membership logic anywhere here.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-vipm-page]");
  if (!page) return;

  const JUST_JOINED_KEY = "xploroo-vip-just-joined";

  /* ------------------------------------------------------------------ */
  /* Hero CTA — smooth-scroll down to the Membership Tiers section.     */
  /* ------------------------------------------------------------------ */
  const heroCta = page.querySelector("[data-vipm-hero-cta]");
  const tiersSection = document.getElementById("vipm-tiers");
  if (heroCta && tiersSection) {
    heroCta.addEventListener("click", () => {
      tiersSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tier "Choose" buttons — purely cosmetic selection (no backend, no   */
  /* subscription). Highlights the chosen card and updates the final    */
  /* CTA section's "Selected plan" note, then scrolls there.            */
  /* ------------------------------------------------------------------ */
  const tierCards = Array.from(page.querySelectorAll("[data-vipm-tier-card]"));
  const finalSection = page.querySelector("[data-vipm-activate]")?.closest("section");
  const selectedNote = page.querySelector("[data-vipm-selected]");
  const selectedName = page.querySelector("[data-vipm-selected-name]");

  tierCards.forEach((card) => {
    const chooseBtn = card.querySelector("[data-vipm-choose-tier]");
    if (!chooseBtn) return;

    chooseBtn.addEventListener("click", () => {
      const tierName = chooseBtn.getAttribute("data-vipm-choose-tier") || "";

      tierCards.forEach((c) => c.classList.remove("is-selected"));
      card.classList.add("is-selected");

      if (selectedNote && selectedName) {
        selectedName.textContent = tierName;
        selectedNote.hidden = false;
      }

      if (finalSection) {
        finalSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* FAQ accordion — only one item open at a time (same pattern as       */
  /* js/faq.js), scoped entirely to [data-vipm-accordion].              */
  /* ------------------------------------------------------------------ */
  const accordion = page.querySelector("[data-vipm-accordion]");
  if (accordion) {
    const items = Array.from(accordion.querySelectorAll(".vipm-faq-item"));

    function closeItem(item) {
      const trigger = item.querySelector(".vipm-faq-item__trigger");
      item.classList.remove("is-open");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }
    function openItem(item) {
      const trigger = item.querySelector(".vipm-faq-item__trigger");
      item.classList.add("is-open");
      if (trigger) trigger.setAttribute("aria-expanded", "true");
    }

    items.forEach((item) => {
      const trigger = item.querySelector(".vipm-faq-item__trigger");
      if (!trigger) return;
      trigger.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other !== item) closeItem(other);
        });
        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Final CTA — "Become VIP Member". No payment/subscription/backend   */
  /* logic: this only simulates a short "activating" state, then sets a  */
  /* one-time sessionStorage flag (read by vip.html's success banner)    */
  /* and redirects to vip.html.                                         */
  /* ------------------------------------------------------------------ */
  const activateBtn = page.querySelector("[data-vipm-activate]");
  if (activateBtn) {
    activateBtn.addEventListener("click", () => {
      if (activateBtn.classList.contains("is-loading")) return;
      activateBtn.classList.add("is-loading");
      activateBtn.disabled = true;

      window.setTimeout(() => {
        try {
          sessionStorage.setItem(JUST_JOINED_KEY, "1");
        } catch (_) {
          /* sessionStorage unavailable — still redirect, banner just won't show */
        }
        window.location.href = "vip.html";
      }, 900);
    });
  }
})();
