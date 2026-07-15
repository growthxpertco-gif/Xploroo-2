/* ==========================================================================
   XPLOROO · Influencer dashboard — Profile Picture tab
   dash-profile-picture.js — Renders the "Profile Picture" panel: current
   photo (from public.profiles.avatar_url — the single source of truth for
   the avatar everywhere on the site, see js/supabase.js), a "Change Profile
   Picture" control with preview, and an explicit Save step that uploads to
   the same 'avatars' Storage bucket and persists via
   window.XploroAuth.updateAvatar() used by account.js's avatar editor and
   the application form's upload. Because every reader (influencer cards,
   the public profile page, the admin panel, this dashboard) fetches
   avatar_url fresh from Supabase rather than caching its own copy, saving
   here is immediately reflected everywhere — no duplicate image storage.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications) return;

  const mount = page.querySelector('[data-dash-section="profile-picture"]');
  if (!mount) return;

  // Same restriction as the application form's upload — no GIF, only the
  // types this phase specifies.
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const PLACEHOLDER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  function render(currentAvatarUrl) {
    mount.innerHTML = `
      <div class="dash-avatar-upload">
        <span class="dash-avatar-upload__preview" data-dash-avatar-preview>
          ${currentAvatarUrl ? `<img src="${window.XploroSecurity.sanitizeUrl(currentAvatarUrl, { allowData: true })}" alt="" />` : PLACEHOLDER_ICON}
        </span>
        <div class="dash-avatar-upload__actions">
          <button class="btn btn--glass btn--pill" type="button" data-dash-avatar-trigger>&#128247; Change Profile Picture</button>
          <button class="btn btn--gradient btn--pill" type="button" data-dash-avatar-save hidden>&#128190; Save Photo</button>
          <span class="dash-avatar-upload__name" data-dash-avatar-name></span>
        </div>
        <input class="sr-only" type="file" accept="image/*" data-dash-avatar-input />
        <p class="dash-avatar-upload__message" data-dash-avatar-message role="status" aria-live="polite"></p>
      </div>`;

    const preview = mount.querySelector("[data-dash-avatar-preview]");
    const trigger = mount.querySelector("[data-dash-avatar-trigger]");
    const saveBtn = mount.querySelector("[data-dash-avatar-save]");
    const input = mount.querySelector("[data-dash-avatar-input]");
    const nameEl = mount.querySelector("[data-dash-avatar-name]");
    const messageEl = mount.querySelector("[data-dash-avatar-message]");

    let pendingFile = null;

    trigger.addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const file = input.files[0];
      messageEl.textContent = "";
      if (!file) return;

      const check = window.XploroSecurity.validateUploadFile(file, { allowedTypes: ALLOWED_TYPES, maxSizeMB: 5 });
      if (!check.ok) {
        window.alert(check.error);
        input.value = "";
        return;
      }

      pendingFile = file;
      nameEl.textContent = file.name;
      saveBtn.hidden = false;

      const reader = new FileReader();
      reader.onload = () => {
        preview.innerHTML = `<img src="${window.XploroSecurity.escapeHtml(String(reader.result || ""))}" alt="" />`;
      };
      reader.readAsDataURL(file);
    });

    saveBtn.addEventListener("click", async () => {
      if (!pendingFile) return;
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const user = await window.XploroAuth.getUser();
      if (!user) {
        saveBtn.disabled = false;
        saveBtn.textContent = "\u{1F4BE} Save Photo";
        return;
      }

      const publicUrl = await window.XploroAuth.uploadAvatarFile(user.id, pendingFile);
      if (!publicUrl || !(await window.XploroAuth.updateAvatar(user.id, publicUrl))) {
        messageEl.textContent = "Something went wrong. Please try again.";
        saveBtn.disabled = false;
        saveBtn.textContent = "\u{1F4BE} Save Photo";
        return;
      }

      pendingFile = null;
      input.value = "";
      messageEl.textContent = "✅ Profile picture updated.";
      render(publicUrl);
    });
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    const profile = await window.XploroAuth.getProfile(user.id);
    render(profile ? profile.avatar_url : null);
  })();
})();
