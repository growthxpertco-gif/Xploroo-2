/* ==========================================================================
   XPLOROO · Influencer application
   influencer-application.js — Drives influencer-application.html: shows the
   form only when the visitor is eligible to apply (signed in, no pending
   or approved application). On submit, saves the application via
   window.XploroApplications.submitApplication() (see
   js/influencer-applications.js, Supabase-backed) and swaps in a success
   state. Once application_status is "approved", the application form
   never renders again — instead this shows the congratulations screen +
   the "My Services & Pricing" grid (see js/influencer-services.js).
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js and influencer-services.js.
   ========================================================================== */
(function () {
  "use strict";

  const card = document.querySelector("[data-apply-card]");
  if (!card || !window.XploroAuth || !window.XploroApplications) return;

  const formView = card.querySelector("[data-apply-form-view]");
  const form = card.querySelector("[data-apply-form]");

  /* ------------------------------------------------------------------ */
  /* Instagram Followers — numeric input only.                            */
  /* ------------------------------------------------------------------ */
  const followersInput = form.querySelector("[data-apply-followers]");
  if (followersInput) {
    followersInput.addEventListener("input", () => {
      followersInput.value = followersInput.value.replace(/[^0-9]/g, "");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Upload Profile Picture — circular preview here; the data URL is      */
  /* persisted to public.profiles.avatar_url on submit (see               */
  /* js/influencer-applications.js), the single source of truth for the  */
  /* picture everywhere on the site — this page keeps no copy of its own.*/
  /* ------------------------------------------------------------------ */
  let profilePictureDataUrl = "";
  const avatarInput = form.querySelector("[data-apply-avatar-input]");
  const avatarTrigger = form.querySelector("[data-apply-avatar-trigger]");
  const avatarPreview = form.querySelector("[data-apply-avatar-preview]");
  const avatarName = form.querySelector("[data-apply-avatar-name]");

  if (avatarTrigger && avatarInput) {
    avatarTrigger.addEventListener("click", () => avatarInput.click());

    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files[0];
      if (!file) {
        avatarName.textContent = "No file chosen";
        return;
      }

      avatarName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        profilePictureDataUrl = String(reader.result || "");
        avatarPreview.innerHTML = `<img src="${profilePictureDataUrl}" alt="" />`;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderBlocked(title, desc, pillState, backHref, backLabel) {
    const pillHtml = pillState
      ? `<span class="status-pill status-pill--${pillState} apply-blocked__pill">${pillState === "pending" ? "Pending Approval" : "Not Approved"}</span>`
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
  /* Rejected — its own message + an "Apply Again" button that reveals    */
  /* the (empty) form right here, rather than navigating away. Submitting */
  /* again overwrites the same row (upsert on user_id).                   */
  /* ------------------------------------------------------------------ */
  function renderRejected() {
    card.innerHTML = `
      <div class="apply-blocked">
        <h2 class="apply-blocked__title">Application Rejected</h2>
        <p class="apply-blocked__desc">This application wasn&rsquo;t approved, but you&rsquo;re welcome to apply again any time.</p>
        <span class="status-pill status-pill--rejected apply-blocked__pill">Not Approved</span>
        <button class="btn btn--gradient btn--pill apply-blocked__back" type="button" data-apply-again>Apply Again</button>
      </div>`;

    card.querySelector("[data-apply-again]").addEventListener("click", () => {
      card.innerHTML = "";
      card.appendChild(formView);
      formView.hidden = false;
      form.reset();
      avatarName.textContent = "No file chosen";
      avatarPreview.innerHTML =
        '<svg class="apply-avatar-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
      profilePictureDataUrl = "";
    });
  }

  /* ------------------------------------------------------------------ */
  /* Approved — congratulations screen + "My Services & Pricing". Once     */
  /* the application is approved this fully replaces the card; the form   */
  /* can never come back for this account.                                */
  /* ------------------------------------------------------------------ */
  async function renderApproved() {
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

        <!-- Desktop-only premium header (see styles/influencer-approved.css)
             — hidden by default, shown only ≥1025px in place of the mobile
             header above. Purely presentational; the mobile header/copy
             above is untouched. -->
        <header class="influencer-services__head influencer-services__head--desktop">
          <div class="influencer-services__head-text">
            <h2 class="influencer-services__title">Manage Your Services &amp; Pricing</h2>
            <p class="influencer-services__subtitle">Enable the services you offer, set your pricing, and keep your profile updated for travelers.</p>
          </div>
          <span class="influencer-services__verified-badge">&#10003; Verified Influencer</span>
        </header>

        <div class="influencer-services__grid" data-influencer-services-grid></div>
      </section>

      <!-- Desktop-only save toast (see styles/influencer-approved.css) —
           shown briefly by influencer-services.js after a successful save;
           hidden entirely on mobile, where the existing inline "Saved" text
           on each card is unchanged. -->
      <div class="influencer-services__toast" data-influencer-services-toast role="status" aria-live="polite">&#10003; Services Updated Successfully</div>`;

    if (window.XploroServices) {
      await window.XploroServices.renderCards(card.querySelector("[data-influencer-services-grid]"));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Submit — save the application, show the success state.               */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const submitBtn = form.querySelector(".apply-submit");
    submitBtn.disabled = true;

    const data = new FormData(form);
    const { error } = await window.XploroApplications.submitApplication({
      fullName: data.get("fullName") || "",
      followers: data.get("followers") || "",
      instagram: data.get("instagram") || "",
      niche: data.get("niche") || "",
      bio: data.get("bio") || "",
      profilePicture: profilePictureDataUrl,
    });

    if (error) {
      submitBtn.disabled = false;
      return;
    }

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

  /* ------------------------------------------------------------------ */
  /* Eligibility gate — decides whether the form, the approved screen, or */
  /* a status message shows, based on the applicant's Supabase row.       */
  /* ------------------------------------------------------------------ */
  (async function renderGate() {
    const user = await window.XploroAuth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const application = await window.XploroApplications.getMyApplication();
    const status = application ? application.application_status : "none";

    if (status === "approved") {
      formView.hidden = true;
      await renderApproved();
      return;
    }

    if (status === "pending") {
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

    if (status === "rejected") {
      formView.hidden = true;
      renderRejected();
      return;
    }

    // status === "none" — eligible to apply
    formView.hidden = false;
  })();
})();
