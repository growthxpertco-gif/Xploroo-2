/* ==========================================================================
   XPLOROO · Account dashboard
   account.js — Renders account.html entirely from real state:
     1. Supabase session (window.XploroAuth, see js/supabase.js) — name,
        email, and the profile picture (public.profiles.avatar_url, the
        single source of truth used everywhere on the site — falls back
        to the existing first-letter avatar when unset). The small edit
        icon on the avatar opens a file picker, previews immediately, and
        persists via XploroAuth.updateAvatar(). No session → bounce to
        login.html; this page only makes sense for a logged-in user.
     2. Profile completion (localStorage "xploroo-profiles", keyed by
        email) — Full Name / Phone / City, editable in place. This is a
        separate, lighter-weight "complete your profile" feature from the
        Supabase public.profiles row (full_name/email/role/
        influencer_status) created at signup; out of scope for this
        migration pass, left as-is.
     3. Influencer application (window.XploroApplications, see
        js/influencer-applications.js — Supabase-backed) — role badges and
        the dynamic CTA/status panel.
   Logout signs out of Supabase, leaving the saved profile
   (xploroo-profiles) untouched, then redirects home — same split
   js/header.js's mobile sidebar relies on.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroApplications || !window.XploroAuth) return;

  const PROFILES_KEY = "xploroo-profiles";
  const esc = window.XploroSecurity.escapeHtml;

  /* ------------------------------------------------------------------ */
  /* Profile store — { [email]: { fullName, phone, city } }              */
  /* ------------------------------------------------------------------ */
  function getProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function getProfile(email) {
    return getProfiles()[email] || null;
  }

  function saveProfile(email, data) {
    const profiles = getProfiles();
    profiles[email] = data;
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (_) {}
  }

  const avatarEl = page.querySelector("[data-account-avatar]");
  const avatarEditBtn = page.querySelector("[data-account-avatar-edit]");
  const avatarInput = page.querySelector("[data-account-avatar-input]");
  const nameEl = page.querySelector("[data-account-name]");
  const emailEl = page.querySelector("[data-account-email]");
  const badgesEl = page.querySelector("[data-account-badges]");
  const profileSection = page.querySelector("[data-account-profile]");
  const panelEl = page.querySelector("[data-account-panel]");
  const servicesEl = page.querySelector("[data-account-services]");
  const logoutBtn = page.querySelector("[data-account-logout]");

  function emailPrefixName(email) {
    const prefix = email.split("@")[0] || "";
    return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "";
  }

  /* ------------------------------------------------------------------ */
  /* Avatar — public.profiles.avatar_url is the single source of truth   */
  /* for the profile picture everywhere on the site (see js/supabase.js).*/
  /* Falls back to the existing first-letter avatar when none is set.    */
  /* ------------------------------------------------------------------ */
  function renderAvatar(avatarUrl, fallbackLetter) {
    if (avatarUrl) {
      avatarEl.innerHTML = `<img src="${window.XploroSecurity.sanitizeUrl(avatarUrl, { allowData: true })}" alt="" />`;
    } else {
      avatarEl.textContent = fallbackLetter;
    }
  }

  function renderHeader(user, profile) {
    const localProfile = getProfile(user.email);
    const displayName = (localProfile && localProfile.fullName) || emailPrefixName(user.email) || "New Traveler";

    renderAvatar(profile && profile.avatar_url, user.email.trim().charAt(0).toUpperCase());
    nameEl.textContent = displayName;
    emailEl.textContent = `Logged in as: ${user.email}`;
  }

  /* ------------------------------------------------------------------ */
  /* Profile details card — completion form <-> read-only card.          */
  /* ------------------------------------------------------------------ */
  const ICONS = {
    name: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"/></svg>',
    city: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  };

  function renderProfileForm(user, existing) {
    profileSection.innerHTML = `
      <form class="account-profile__form" data-profile-form novalidate>
        <h2 class="account-profile__title">Complete Your Profile</h2>
        <label class="field">
          <span class="field__label">Full Name</span>
          <input class="input" type="text" name="fullName" placeholder="e.g. Aarav Sharma" value="${existing ? esc(existing.fullName) : ""}" required />
        </label>
        <label class="field">
          <span class="field__label">Phone Number</span>
          <input class="input" type="tel" name="phone" placeholder="e.g. 98765 43210" value="${existing ? esc(existing.phone) : ""}" required />
        </label>
        <label class="field">
          <span class="field__label">City</span>
          <input class="input" type="text" name="city" placeholder="e.g. Mumbai" value="${existing ? esc(existing.city) : ""}" required />
        </label>
        <p class="account-profile__error" data-profile-error></p>
        <button class="btn btn--gradient btn--pill btn--lg account-profile__save" type="submit">Save Profile</button>
      </form>`;

    const form = profileSection.querySelector("[data-profile-form]");
    const errorEl = profileSection.querySelector("[data-profile-error]");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const fullName = form.querySelector('[name="fullName"]').value.trim();
      const phone = form.querySelector('[name="phone"]').value.trim();
      const city = form.querySelector('[name="city"]').value.trim();

      if (!fullName || !phone || !city) {
        errorEl.textContent = "Please fill in every field.";
        return;
      }

      saveProfile(user.email, { fullName, phone, city });
      renderHeader(user);
      renderProfileReadOnly(user, { fullName, phone, city });
    });
  }

  function renderProfileReadOnly(user, profile) {
    profileSection.innerHTML = `
      <div class="account-profile__card">
        <button class="account-profile__edit" type="button" data-profile-edit aria-label="Edit profile">${ICONS.edit}</button>
        <h2 class="account-profile__title">My Profile</h2>
        <dl class="account-profile__rows">
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.name}</span>
            <div>
              <dt>Full Name</dt>
              <dd>${esc(profile.fullName)}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.phone}</span>
            <div>
              <dt>Phone Number</dt>
              <dd>${esc(profile.phone)}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.city}</span>
            <div>
              <dt>City</dt>
              <dd>${esc(profile.city)}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.email}</span>
            <div>
              <dt>Email Address</dt>
              <dd>${esc(user.email)}</dd>
            </div>
          </div>
        </dl>
      </div>`;

    profileSection.querySelector("[data-profile-edit]").addEventListener("click", () => {
      renderProfileForm(user, profile);
    });
  }

  function renderProfile(user) {
    const profile = getProfile(user.email);
    if (profile && profile.fullName && profile.phone && profile.city) {
      renderProfileReadOnly(user, profile);
    } else {
      renderProfileForm(user, profile);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Role badges + dynamic Influencer panel — unchanged logic.           */
  /* ------------------------------------------------------------------ */
  const INFLUENCER_BADGE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 2Z"/></svg>';

  async function renderRole() {
    const application = await window.XploroApplications.getMyApplication();
    const status = application ? application.application_status : "none";

    badgesEl.innerHTML = '<span class="role-badge">Traveler</span>';
    if (status === "approved") {
      badgesEl.innerHTML += `<span class="role-badge">${INFLUENCER_BADGE_SVG}Influencer</span>`;
    }

    // Manage Services shortcut — only for approved Influencers.
    servicesEl.innerHTML = "";

    if (status === "approved") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">You&rsquo;re an Xploroo Influencer</h2>
          <p class="account-status__desc">Your application was approved. Collaboration invites, earnings, and everything else live in your Influencer Dashboard.</p>
          <a class="btn btn--gradient btn--pill account-status__action" href="influencer-dashboard.html">Go to Influencer Dashboard</a>
        </section>`;

      servicesEl.innerHTML = `
        <section class="account-cta">
          <h2 class="account-cta__title">Manage Your Influencer Services</h2>
          <p class="account-cta__desc">Update your services, pricing, and availability so travelers can book you for collaborations, podcasts, meet &amp; greets, events, and more.</p>
          <a class="btn btn--gradient btn--pill account-cta__action" href="influencer-application.html">Manage Services</a>
        </section>`;
      return;
    }

    if (status === "pending") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Submitted Successfully</h2>
          <p class="account-status__desc">Your application is under review. We&rsquo;ll let you know as soon as it&rsquo;s been looked at.</p>
          <span class="status-pill status-pill--pending account-status__pill">Pending Approval</span>
        </section>`;
      return;
    }

    if (status === "rejected") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Rejected</h2>
          <p class="account-status__desc">This application wasn&rsquo;t approved, but you&rsquo;re welcome to apply again any time.</p>
          <span class="status-pill status-pill--rejected account-status__pill">Not Approved</span>
          <div class="account-status__action">
            <a class="btn btn--gradient btn--pill" href="influencer-application.html">Apply Again</a>
          </div>
        </section>`;
      return;
    }

    // status === "none" — traveler who has never applied
    panelEl.innerHTML = `
      <section class="account-cta">
        <h2 class="account-cta__title">Become an Influencer</h2>
        <p class="account-cta__desc">Turn your travels into income. Apply to join Xploroo&rsquo;s creator program and unlock collaboration invites, earnings, and more.</p>
        <a class="btn btn--gradient btn--pill account-cta__action" href="influencer-application.html">Become an Influencer</a>
      </section>`;
  }

  /* ------------------------------------------------------------------ */
  /* Init — requires a Supabase session; bounce out immediately if none. */
  /* ------------------------------------------------------------------ */
  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    logoutBtn.addEventListener("click", async () => {
      await window.XploroAuth.signOut();
      window.location.href = "index.html";
    });

    if (avatarEditBtn && avatarInput) {
      avatarEditBtn.addEventListener("click", () => avatarInput.click());
      avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;

        const check = window.XploroSecurity.validateUploadFile(file, { maxSizeMB: 5 });
        if (!check.ok) {
          window.alert(check.error);
          avatarInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result || "");
          renderAvatar(dataUrl, ""); // show the new photo immediately
          await window.XploroAuth.updateAvatar(user.id, dataUrl);
        };
        reader.readAsDataURL(file);
      });
    }

    // Phase 18 — perf: renderProfile()/renderRole() don't need supaProfile
    // (renderProfile reads the separate localStorage profile; renderRole
    // fetches its own application data), so render them immediately instead
    // of waiting on getProfile() first. getProfile() and getMyApplication()
    // (inside renderRole) then run concurrently rather than sequentially.
    renderProfile(user);
    renderRole();

    const supaProfile = await window.XploroAuth.getProfile(user.id);
    renderHeader(user, supaProfile);
  })();
})();
