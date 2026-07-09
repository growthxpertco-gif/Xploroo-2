/* ==========================================================================
   XPLOROO · Influencer application
   influencer-application.js — Drives influencer-application.html: shows the
   form only when the visitor is eligible to apply (Traveler, no pending
   application), otherwise shows a status message instead. On submit, saves
   the application via XploroRole.submitApplication() (see js/user-role.js)
   and swaps in a success state — no network call, no real file upload
   (both file fields are explicitly placeholders per spec).
   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js.
   ========================================================================== */
(function () {
  "use strict";

  const card = document.querySelector("[data-apply-card]");
  if (!card || !window.XploroRole) return;

  const formView = card.querySelector("[data-apply-form-view]");
  const form = card.querySelector("[data-apply-form]");

  /* ------------------------------------------------------------------ */
  /* File inputs — placeholder upload controls: just reflect the chosen  */
  /* filename back to the user, nothing is stored or sent anywhere.      */
  /* ------------------------------------------------------------------ */
  form.querySelectorAll(".apply-file__input").forEach((input) => {
    const nameEl = input.parentElement.querySelector("[data-apply-file-name]");
    input.addEventListener("change", () => {
      if (nameEl) nameEl.textContent = input.files[0] ? input.files[0].name : "No file chosen";
    });
  });

  /* ------------------------------------------------------------------ */
  /* Eligibility gate — decides whether the form or a status message      */
  /* shows, based on the shared role state.                               */
  /* ------------------------------------------------------------------ */
  function renderGate() {
    const state = window.XploroRole.getState();

    if (state.role === "influencer") {
      formView.hidden = true;
      renderBlocked(
        "You&rsquo;re Already an Influencer",
        "Your application was already approved &mdash; head to your Influencer Dashboard to get started.",
        null,
        "influencer-dashboard.html",
        "Go to Influencer Dashboard"
      );
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
      portfolioFileName: form.querySelector('[name="portfolio"]')?.files[0]?.name || "",
      photoFileName: form.querySelector('[name="photo"]')?.files[0]?.name || "",
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
