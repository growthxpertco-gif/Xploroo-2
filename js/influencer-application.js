/* ==========================================================================
   XPLOROO · Influencer application
   influencer-application.js — Drives influencer-application.html: shows the
   form only when the visitor is eligible to apply (Traveler, no pending
   application). On submit, saves the application via
   XploroRole.submitApplication() (see js/user-role.js) and swaps in a
   success state. Once the role is "influencer" (admin-approved), the
   application form never renders again — instead this shows the
   congratulations screen + the "My Services & Pricing" grid (see
   js/influencer-services.js).
   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js and
   influencer-services.js.
   ========================================================================== */
(function () {
  "use strict";

  const card = document.querySelector("[data-apply-card]");
  if (!card || !window.XploroRole) return;

  const formView = card.querySelector("[data-apply-form-view]");
  const form = card.querySelector("[data-apply-form]");

  /* ------------------------------------------------------------------ */
  /* Eligibility gate — decides whether the form, the approved screen, or */
  /* a status message shows, based on the shared role state.              */
  /* ------------------------------------------------------------------ */
  function renderGate() {
    const state = window.XploroRole.getState();

    if (state.role === "influencer") {
      formView.hidden = true;
      renderApproved();
      return;
    }

    if (state.application.status === "pending") {
      formView.hidden = true;
      renderBlocked(
        "Application Already Under Review",
        "You&rsquo;ve already submitted an application and it&rsquo;s currently being reviewed. We&rsquo;ll be in touch soon.",
        "pending",
        "account.html",
        "Back to My Account"
      );
      return;
    }

    // status is "none" or "rejected" — eligible to apply
    formView.hidden = false;
  }

  function renderBlocked(title, desc, pillState, backHref, backLabel) {
    const pillHtml = pillState
      ? `<span class="status-pill status-pill--${pillState} apply-blocked__pill">Pending Approval</span>`
      : "";
    card.innerHTML = `
      <div class="apply-blocked">
        <h2 class="apply-blocked__title">${title}</h2>
        <p class="apply-blocked__desc">${desc}</p>
        ${pillHtml}
        <a class="btn btn--gradient btn--pill apply-blocked__back" href="${backHref}">${backLabel}</a>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Approved — congratulations screen + "My Services & Pricing". Once     */
  /* role is "influencer" this fully replaces the card; the application    */
  /* form can never come back for this browser's session.                 */
  /* ------------------------------------------------------------------ */
  function renderApproved() {
    card.innerHTML = `
      <div class="influencer-success">
        <div class="influencer-success__illustration" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4.5"/></svg>
        </div>
        <h2 class="influencer-success__title">&#127881; Congratulations!</h2>
        <p class="influencer-success__subtitle">Welcome to the Xploroo Influencer Community.</p>
        <p class="influencer-success__message">You&rsquo;re now an official Xploroo Influencer. Get ready to travel the world, collaborate with exciting brands, connect with travelers, and earn through unforgettable experiences.</p>
        <span class="influencer-success__badge">&#10003; Verified Xploroo Influencer</span>
      </div>

      <section class="influencer-services" data-influencer-services>
        <header class="influencer-services__head">
          <h2 class="influencer-services__title">My Services &amp; Pricing</h2>
          <p class="influencer-services__subtitle">Choose which services you offer and set your pricing. This will be shown on your public profile soon.</p>
        </header>
        <div class="influencer-services__grid" data-influencer-services-grid></div>
      </section>`;

    if (window.XploroServices) {
      window.XploroServices.renderCards(card.querySelector("[data-influencer-services-grid]"));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Submit — save the application, show the success state.               */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    window.XploroRole.submitApplication({
      fullName: data.get("fullName") || "",
      instagram: data.get("instagram") || "",
      youtube: data.get("youtube") || "",
      otherLinks: data.get("otherLinks") || "",
      followers: data.get("followers") || "",
      niche: data.get("niche") || "",
      city: data.get("city") || "",
      country: data.get("country") || "",
      bio: data.get("bio") || "",
      whyJoin: data.get("whyJoin") || "",
    });

    card.innerHTML = `
      <div class="apply-success">
        <span class="apply-success__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <h2 class="apply-success__title">Application Submitted Successfully.</h2>
        <p class="apply-success__desc">Your application is under review.</p>
        <span class="status-pill status-pill--pending apply-success__pill">Pending Approval</span>
        <a class="btn btn--glass btn--pill apply-success__back" href="account.html">Back to My Account</a>
      </div>`;
  });

  renderGate();
})();
