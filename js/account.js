/* ==========================================================================
   XPLOROO · Account dashboard
   account.js — Renders account.html entirely from real state:
     1. Session (localStorage "xploroo-session", written by js/auth.js on
        login) — avatar initial, name, email. No session → bounce to
        login.html; this page only makes sense for a logged-in user.
     2. Profile completion (localStorage "xploroo-profiles", keyed by
        email) — Full Name / Phone / City, editable in place.
     3. Role + Influencer application (window.XploroRole, see
        js/user-role.js) — role badges and the dynamic CTA/status panel,
        unchanged from before.
   Logout clears only the session key, leaving the registered account
   (xploroo-users) and saved profile (xploroo-profiles) untouched, then
   redirects home — the same "session vs. account" split js/header.js's
   mobile sidebar already relies on.
   Vanilla JS, no dependencies. Loaded with `defer`, after user-role.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-account-page]");
  if (!page || !window.XploroRole) return;

  const SESSION_KEY = "xploroo-session";
  const PROFILES_KEY = "xploroo-profiles";

  /* ------------------------------------------------------------------ */
  /* Session — the page requires one; bounce out immediately if absent.  */
  /* ------------------------------------------------------------------ */
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.email ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  const session = getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

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

  /* ------------------------------------------------------------------ */
  /* Header — avatar initial, name (saved name > email prefix > "New     */
  /* Traveler"), "Logged in as" email.                                   */
  /* ------------------------------------------------------------------ */
  const avatarEl = page.querySelector("[data-account-avatar]");
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

  function renderHeader() {
    const profile = getProfile(session.email);
    const displayName = (profile && profile.fullName) || emailPrefixName(session.email) || "New Traveler";

    avatarEl.textContent = session.email.trim().charAt(0).toUpperCase();
    nameEl.textContent = displayName;
    emailEl.textContent = `Logged in as: ${session.email}`;
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

  function renderProfileForm(existing) {
    profileSection.innerHTML = `
      <form class="account-profile__form" data-profile-form novalidate>
        <h2 class="account-profile__title">Complete Your Profile</h2>
        <label class="field">
          <span class="field__label">Full Name</span>
          <input class="input" type="text" name="fullName" placeholder="e.g. Aarav Sharma" value="${existing ? existing.fullName : ""}" required />
        </label>
        <label class="field">
          <span class="field__label">Phone Number</span>
          <input class="input" type="tel" name="phone" placeholder="e.g. 98765 43210" value="${existing ? existing.phone : ""}" required />
        </label>
        <label class="field">
          <span class="field__label">City</span>
          <input class="input" type="text" name="city" placeholder="e.g. Mumbai" value="${existing ? existing.city : ""}" required />
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

      saveProfile(session.email, { fullName, phone, city });
      renderHeader();
      renderProfileReadOnly({ fullName, phone, city });
    });
  }

  function renderProfileReadOnly(profile) {
    profileSection.innerHTML = `
      <div class="account-profile__card">
        <button class="account-profile__edit" type="button" data-profile-edit aria-label="Edit profile">${ICONS.edit}</button>
        <h2 class="account-profile__title">My Profile</h2>
        <dl class="account-profile__rows">
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.name}</span>
            <div>
              <dt>Full Name</dt>
              <dd>${profile.fullName}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.phone}</span>
            <div>
              <dt>Phone Number</dt>
              <dd>${profile.phone}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.city}</span>
            <div>
              <dt>City</dt>
              <dd>${profile.city}</dd>
            </div>
          </div>
          <div class="account-profile__row">
            <span class="account-profile__row-icon">${ICONS.email}</span>
            <div>
              <dt>Email Address</dt>
              <dd>${session.email}</dd>
            </div>
          </div>
        </dl>
      </div>`;

    profileSection.querySelector("[data-profile-edit]").addEventListener("click", () => {
      renderProfileForm(profile);
    });
  }

  function renderProfile() {
    const profile = getProfile(session.email);
    if (profile && profile.fullName && profile.phone && profile.city) {
      renderProfileReadOnly(profile);
    } else {
      renderProfileForm(profile);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Role badges + dynamic Influencer panel — unchanged logic.           */
  /* ------------------------------------------------------------------ */
  const INFLUENCER_BADGE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7L12 2Z"/></svg>';

  function renderRole() {
    const state = window.XploroRole.getState();
    const { role, application } = state;

    badgesEl.innerHTML = '<span class="role-badge">Traveler</span>';
    if (role === "influencer") {
      badgesEl.innerHTML += `<span class="role-badge">${INFLUENCER_BADGE_SVG}Influencer</span>`;
    }

    // Manage Services shortcut — only for approved Influencers.
    servicesEl.innerHTML = "";

    if (role === "influencer") {
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

    if (application.status === "pending") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Submitted Successfully</h2>
          <p class="account-status__desc">Your application is under review. We&rsquo;ll let you know as soon as it&rsquo;s been looked at.</p>
          <span class="status-pill status-pill--pending account-status__pill">Pending Approval</span>
        </section>`;
      return;
    }

    if (application.status === "rejected") {
      panelEl.innerHTML = `
        <section class="account-status">
          <h2 class="account-status__title">Application Rejected</h2>
          <p class="account-status__desc">This application wasn&rsquo;t approved, but you&rsquo;re welcome to apply again any time.</p>
          <span class="status-pill status-pill--rejected account-status__pill">Not Approved</span>
          <div class="account-status__action">
            <button class="btn btn--gradient btn--pill" type="button" data-apply-again>Apply Again</button>
          </div>
        </section>`;
      const applyAgainBtn = panelEl.querySelector("[data-apply-again]");
      if (applyAgainBtn) {
        applyAgainBtn.addEventListener("click", () => {
          window.XploroRole.resetApplication();
          window.location.href = "influencer-application.html";
        });
      }
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
  /* Logout — clear the session only; account + profile data stay put.   */
  /* ------------------------------------------------------------------ */
  logoutBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
    window.location.href = "index.html";
  });

  renderHeader();
  renderProfile();
  renderRole();
})();
