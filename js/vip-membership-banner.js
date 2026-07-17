/* ==========================================================================
   XPLOROO · VIP Membership — Success Banner (Phase 35)
   vip-membership-banner.js — Shows the dismissible "You are now a VIP
   Member" banner at the top of vip.html only when the visitor just
   completed the simulated activation flow on vip-membership.html (see
   js/vip-membership.js). Reads a one-time sessionStorage flag, clears it
   immediately so a page refresh doesn't keep showing it, and wires up the
   dismiss button. Entirely self-contained — no interaction with vip.html's
   existing booking flow (js/vip-selection.js, js/vip-luxury-cards.js).
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const JUST_JOINED_KEY = "xploroo-vip-just-joined";
  const mount = document.querySelector("[data-vipm-banner-mount]");
  if (!mount) return;

  let justJoined = false;
  try {
    justJoined = sessionStorage.getItem(JUST_JOINED_KEY) === "1";
    if (justJoined) sessionStorage.removeItem(JUST_JOINED_KEY);
  } catch (_) {
    justJoined = false;
  }
  if (!justJoined) return;

  mount.innerHTML = `
    <div class="vipm-banner" data-vipm-banner>
      <div class="vipm-banner__inner">
        <p class="vipm-banner__text">
          &#127881; <strong>Congratulations! You are now a VIP Member.</strong><br />
          Welcome to the Xploroo Inner Circle. Enjoy your exclusive VIP experiences.
        </p>
        <button class="vipm-banner__close" type="button" aria-label="Dismiss" data-vipm-banner-close>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18"/>
          </svg>
        </button>
      </div>
    </div>`;

  const banner = mount.querySelector("[data-vipm-banner]");
  const closeBtn = mount.querySelector("[data-vipm-banner-close]");
  if (closeBtn && banner) {
    closeBtn.addEventListener("click", () => {
      banner.classList.add("is-dismissing");
      window.setTimeout(() => {
        mount.innerHTML = "";
      }, 340);
    });
  }
})();
