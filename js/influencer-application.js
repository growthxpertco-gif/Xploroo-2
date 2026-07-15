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
  const esc = window.XploroSecurity.escapeHtml;

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
  /* Phase 30 — mandatory: the application cannot be submitted without a  */
  /* photo. Validated via setCustomValidity() on the (visually hidden)    */
  /* file input, checked at submit time against profilePictureDataUrl     */
  /* rather than the input's native .files — that variable is also set    */
  /* by "Apply Again"'s pre-fill from a previously-uploaded photo, so a   */
  /* re-application doesn't force re-choosing a file every time.          */
  /* ------------------------------------------------------------------ */
  const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  let profilePictureDataUrl = "";
  let profilePictureFile = null;
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

      const check = window.XploroSecurity.validateUploadFile(file, { allowedTypes: AVATAR_ALLOWED_TYPES, maxSizeMB: 5 });
      if (!check.ok) {
        window.alert(check.error);
        avatarInput.value = "";
        avatarName.textContent = "No file chosen";
        return;
      }

      avatarName.textContent = file.name;
      profilePictureFile = file;
      avatarInput.setCustomValidity("");
      const reader = new FileReader();
      reader.onload = () => {
        profilePictureDataUrl = String(reader.result || "");
        avatarPreview.innerHTML = `<img src="${window.XploroSecurity.escapeHtml(profilePictureDataUrl)}" alt="" />`;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Phase 10 — Instagram Ownership Verification                          */
  /* ------------------------------------------------------------------ */
  async function copyVerificationCode(code, btn) {
    const originalLabel = btn.innerHTML;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (_) {
      /* Clipboard unavailable — still tell the user something happened. */
    }
    btn.innerHTML = "&#9989; Copied!";
    setTimeout(() => {
      btn.innerHTML = originalLabel;
    }, 1800);
  }

  // Application is pending — shows persistent verification panel that
  // remains visible across page refreshes and logins until approved/rejected.
  function renderPendingVerification(application) {
    card.innerHTML = `
      <div class="apply-pending-verification">
        <div class="apply-pending-verification__content">
          <h2 class="apply-pending-verification__title">🎉 One Final Step Before Review</h2>
          <p class="apply-pending-verification__intro">Your application has been received successfully.</p>
          <p class="apply-pending-verification__desc">To verify that you are the real owner of the Instagram account, please add the verification code below to your Instagram bio.</p>

          <div class="apply-pending-verification__code-section">
            <div class="apply-pending-verification__code-box">
              <span class="apply-pending-verification__code">${esc(application.verification_code)}</span>
              <button class="btn btn--glass btn--pill btn--sm apply-pending-verification__copy" type="button" data-apply-copy-code>📋 Copy Code</button>
            </div>
          </div>

          <div class="apply-pending-verification__actions">
            <a class="btn btn--glass btn--pill" href="account.html">← Back to My Account</a>
          </div>

          <div class="apply-pending-verification__info">
            <p class="apply-pending-verification__info-text">Once you've updated your Instagram bio with this code, our team will verify your profile. After successful verification, you can remove the code from your bio.</p>
            <p class="apply-pending-verification__info-text">Your application will remain under review until verification is completed.</p>
            <div class="apply-pending-verification__status">
              <span class="status-pill status-pill--pending">🟡 Verification Pending</span>
            </div>
          </div>
        </div>
      </div>`;

    const copyBtn = card.querySelector("[data-apply-copy-code]");
    copyBtn.addEventListener("click", () => copyVerificationCode(application.verification_code, copyBtn));
  }

  // Applicant confirmed the code is in their bio — waiting on the admin's
  // manual check now, nothing left for the applicant to do here.
  function renderVerificationSubmitted() {
    card.innerHTML = `
      <div class="apply-blocked">
        <h2 class="apply-blocked__title">Verification Submitted</h2>
        <p class="apply-blocked__desc">We&rsquo;re checking your Instagram bio for the verification code. This usually doesn&rsquo;t take long &mdash; we&rsquo;ll be in touch soon.</p>
        <span class="status-pill status-pill--info apply-blocked__pill">Verification Submitted</span>
        <a class="btn btn--glass btn--pill apply-blocked__back" href="account.html">Back to My Account</a>
      </div>`;
  }

  // Admin confirmed the code was found in the bio — ownership verified,
  // application now just needs the admin's final Approve/Reject decision.
  function renderVerified() {
    card.innerHTML = `
      <div class="apply-blocked">
        <h2 class="apply-blocked__title">Instagram Verified</h2>
        <p class="apply-blocked__desc">Your Instagram ownership has been verified. Your application is now awaiting final approval.</p>
        <span class="status-pill status-pill--approved apply-blocked__pill">Verified</span>
        <a class="btn btn--glass btn--pill apply-blocked__back" href="account.html">Back to My Account</a>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Rejected — its own message + an "Apply Again" button that reveals    */
  /* the form pre-filled with previous application data. Submitting again */
  /* overwrites the same row (upsert on user_id), changes status back to  */
  /* pending, and generates a new verification code.                      */
  /* ------------------------------------------------------------------ */
  function renderRejected(application) {
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

      // Pre-fill form with previous application data
      if (application) {
        const fullNameInput = form.querySelector("[name='fullName']");
        const instagramInput = form.querySelector("[name='instagram']");
        const followersInput = form.querySelector("[name='followers']");
        const bioInput = form.querySelector("[name='bio']");
        const nicheSelect = form.querySelector("[name='niche']");

        if (fullNameInput) fullNameInput.value = application.full_name || "";
        if (instagramInput) instagramInput.value = application.instagram_profile_link || "";
        if (followersInput) followersInput.value = application.instagram_followers || "";
        if (bioInput) bioInput.value = application.short_bio || "";
        if (nicheSelect) nicheSelect.value = application.niche || "";

        // If there's a previous avatar, show it
        if (application.avatar_url) {
          avatarPreview.innerHTML = `<img src="${window.XploroSecurity.sanitizeUrl(application.avatar_url, { allowData: true })}" alt="" />`;
          avatarName.textContent = "Previous profile picture loaded";
          profilePictureDataUrl = application.avatar_url;
          profilePictureFile = null;
        } else {
          avatarName.textContent = "No file chosen";
          avatarPreview.innerHTML =
            '<svg class="apply-avatar-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
          profilePictureDataUrl = "";
        }
      } else {
        form.reset();
        avatarName.textContent = "No file chosen";
        avatarPreview.innerHTML =
          '<svg class="apply-avatar-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
        profilePictureDataUrl = "";
      }
      avatarInput.setCustomValidity("");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Approved — congratulations screen + "My Services & Pricing". Once     */
  /* the application is approved this fully replaces the card; the form   */
  /* can never come back for this account.                                */
  /* ------------------------------------------------------------------ */
  function visibilityStatusText(visible) {
    return visible ? "🟢 ON — Visible on Xploroo" : "⚪ OFF — Hidden from Xploroo";
  }

  async function renderApproved(application) {
    // Phase 12 — Public Profile Visibility, independent of approval. Never
    // stored anywhere but influencer_applications.public_visibility itself
    // (default true) — toggling it only changes whether
    // getApprovedApplications()/getApprovedByIdOrUsername() include this
    // row; nothing about approval, services, or bookings is touched.
    const isVisible = application.public_visibility !== false;

    card.innerHTML = `
      <section class="visibility-card" data-visibility-card>
        <div class="visibility-card__text">
          <h2 class="visibility-card__title">Public Profile Visibility</h2>
          <p class="visibility-card__subtitle">Control whether your profile appears publicly on the Xploroo Influencers page. You can hide your profile anytime without losing your verified influencer status.</p>
        </div>
        <div class="visibility-card__control">
          <label class="visibility-card__toggle">
            <input type="checkbox" data-visibility-toggle-input ${isVisible ? "checked" : ""} aria-label="Public profile visibility" />
            <span class="visibility-card__toggle-track" aria-hidden="true">
              <span class="visibility-card__toggle-thumb"></span>
            </span>
          </label>
          <span class="visibility-card__status${isVisible ? " visibility-card__status--on" : ""}" data-visibility-status>${visibilityStatusText(isVisible)}</span>
        </div>
      </section>

      <div class="influencer-success">
        <div class="influencer-success__illustration" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4.5"/></svg>
        </div>
        <h2 class="influencer-success__title">&#127881; Congratulations!</h2>
        <p class="influencer-success__subtitle">Welcome to the Xploroo Influencer Community.</p>
        <p class="influencer-success__message">You&rsquo;re now an official Xploroo Influencer. Get ready to travel the world, collaborate with exciting brands, connect with travelers, and earn through unforgettable experiences.</p>
        <span class="influencer-success__badge">&#10003; Verified Xploroo Influencer</span>
        <p class="influencer-success__message">Your Instagram account has been verified successfully. You may now remove the verification code from your Instagram Bio.</p>
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

    const toggleInput = card.querySelector("[data-visibility-toggle-input]");
    const statusEl = card.querySelector("[data-visibility-status]");
    if (toggleInput) {
      toggleInput.addEventListener("change", async () => {
        const next = toggleInput.checked;
        toggleInput.disabled = true;
        const { error } = await window.XploroApplications.setPublicVisibility(next);
        toggleInput.disabled = false;

        if (error) {
          // Revert the switch visually — the DB write never happened.
          toggleInput.checked = !next;
          window.alert("Something went wrong updating your visibility. Please try again.");
          return;
        }

        statusEl.textContent = visibilityStatusText(next);
        statusEl.classList.toggle("visibility-card__status--on", next);
      });
    }

    if (window.XploroServices) {
      await window.XploroServices.renderCards(card.querySelector("[data-influencer-services-grid]"));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Submit — save the application, show the success state.               */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Phase 30 — profile picture is mandatory. Checked against
    // profilePictureDataUrl (set by a fresh upload above, or by "Apply
    // Again"'s pre-fill from a previously-uploaded photo) rather than the
    // file input's own .files, so re-applying with the existing photo
    // still counts as "has a profile picture" without forcing a re-upload.
    // Uses the same setCustomValidity()+reportValidity() mechanism as the
    // rest of this form's native validation (see confirmPassword in
    // js/auth.js for the same pattern).
    avatarInput.setCustomValidity(profilePictureDataUrl ? "" : "Please upload a profile picture.");
    if (!form.reportValidity()) return;

    const submitBtn = form.querySelector(".apply-submit");
    submitBtn.disabled = true;

    // Phase 21 — perf: upload to Storage only now, at actual submit time
    // (same moment the old base64 value was persisted), so an abandoned
    // form never writes a picture — only a completed submission does,
    // exactly as before.
    let profilePictureUrl = "";
    if (profilePictureFile) {
      const user = await window.XploroAuth.getUser();
      if (user) profilePictureUrl = (await window.XploroAuth.uploadAvatarFile(user.id, profilePictureFile)) || "";
    }

    const formData = new FormData(form);
    const { data, error } = await window.XploroApplications.submitApplication({
      fullName: formData.get("fullName") || "",
      followers: formData.get("followers") || "",
      instagram: formData.get("instagram") || "",
      niche: formData.get("niche") || "",
      bio: formData.get("bio") || "",
      profilePicture: profilePictureUrl,
    });

    if (error || !data) {
      submitBtn.disabled = false;
      return;
    }

    // Application submitted — show the persistent verification panel
    // with the verification code (submitApplication() already generated
    // a fresh verification_code).
    renderPendingVerification(data);
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
      await renderApproved(application);
      return;
    }

    if (status === "pending") {
      formView.hidden = true;
      // Show persistent verification panel for all pending applications
      // regardless of verification_status sub-state. Panel remains visible
      // across page refreshes and logins until approved/rejected.
      renderPendingVerification(application);
      return;
    }

    if (status === "rejected") {
      formView.hidden = true;
      // Attach avatar URL from profiles table for pre-filling rejected form
      if (application && window.XploroAuth) {
        const avatars = await window.XploroAuth.getAvatarsByUserIds([user.id]);
        if (avatars.has(user.id)) application.avatar_url = avatars.get(user.id);
      }
      renderRejected(application);
      return;
    }

    // status === "none" — eligible to apply
    formView.hidden = false;
  })();
})();
