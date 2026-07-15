/* ==========================================================================
   XPLOROO · Admin — VIP Personalities (Phase 23)
   admin-vip-personalities.js — Renders the "⭐ VIP Personalities" tab.

   Two jobs:
   1. Every approved influencer, with a toggle to mark/unmark them as a VIP
      personality (public.influencer_applications.is_vip_personality). This
      is the ONLY thing that moves someone from their normal niche tab into
      the VIP tab on influencers.html — no separate account, no duplicated
      record.
   2. For influencers currently marked VIP, manage their VIP Experiences
      (public.vip_packages): add a new package, activate/deactivate, delete.

   All mutations go through window.XploroAdminAuth.callAdminApi(), which
   wraps the admin-api Edge Function (service role) — see get-vip-admin-data,
   toggle-vip-personality, create-vip-package, update-vip-package-status,
   delete-vip-package.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-auth.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-vip-personalities-root]");
  if (!root || !window.XploroAdminAuth) return;

  const esc = window.XploroSecurity.escapeHtml;
  const formatINR = (n) => (n == null || n === "" ? "&mdash;" : "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN"));

  const ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

  root.innerHTML = `
    <h2 class="admin-card__name" style="margin:0 0 var(--space-4)">Approved Influencers</h2>
    <p style="margin:0 0 var(--space-5);font-size:var(--fs-sm);color:var(--color-text-muted)">
      Toggle "Make VIP Personality" to move an influencer into the ⭐ VIP tab on the Influencers page. Their normal niche tab is unaffected once toggled off.
    </p>
    <div data-vip-influencer-list></div>

    <h2 class="admin-card__name" style="margin:var(--space-8) 0 var(--space-4)">VIP Experiences by Personality</h2>
    <div data-vip-package-list></div>`;

  const influencerListEl = root.querySelector("[data-vip-influencer-list]");
  const packageListEl = root.querySelector("[data-vip-package-list]");

  function renderEmpty(el, text) {
    el.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_STAR}</span>
        <p>${esc(text)}</p>
      </div>`;
  }

  function nicheLabel(value) {
    if (!value) return "&mdash;";
    return esc(
      value
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }

  async function loadData() {
    const { ok, data } = await window.XploroAdminAuth.callAdminApi("get-vip-admin-data", {});
    if (!ok) return { influencers: [], packages: [] };
    return data;
  }

  function influencerCardTemplate(inf) {
    const initial = esc((inf.full_name || "?").trim().charAt(0).toUpperCase());
    const photoHtml = inf.avatar_url
      ? `<img class="admin-card__photo" src="${window.XploroSecurity.sanitizeUrl(inf.avatar_url, { allowData: true })}" alt="" />`
      : `<span class="admin-card__photo" aria-hidden="true">${initial}</span>`;

    return `
      <article class="admin-card" data-vip-influencer-card="${inf.user_id}">
        ${photoHtml}
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(inf.full_name) || "Unnamed Influencer"}</h2>
            ${inf.is_vip_personality ? '<span class="status-pill status-pill--approved">⭐ VIP Personality</span>' : ""}
          </div>
          <dl class="admin-card__meta">
            <div><dt>Username</dt><dd>${esc(inf.username) || "&mdash;"}</dd></div>
            <div><dt>Niche</dt><dd>${nicheLabel(inf.niche)}</dd></div>
          </dl>
          <div class="admin-card__actions">
            <button class="btn ${inf.is_vip_personality ? "btn--danger" : "btn--primary"} btn--pill" type="button" data-vip-toggle="${inf.user_id}" data-vip-current="${inf.is_vip_personality ? "1" : "0"}">
              ${inf.is_vip_personality ? "Remove VIP Personality" : "Make VIP Personality"}
            </button>
          </div>
        </div>
      </article>`;
  }

  function packageCardTemplate(pkg) {
    return `
      <article class="admin-card">
        <div class="admin-card__body">
          <div class="admin-card__head">
            <h2 class="admin-card__name">${esc(pkg.title)}</h2>
            ${pkg.is_active ? '<span class="status-pill status-pill--approved">Active</span>' : '<span class="status-pill status-pill--rejected">Inactive</span>'}
          </div>
          <dl class="admin-card__meta">
            <div><dt>Price</dt><dd>${formatINR(pkg.price)}</dd></div>
            <div><dt>Slug</dt><dd>${esc(pkg.slug)}</dd></div>
          </dl>
          <p style="margin:0 0 var(--space-4);font-size:var(--fs-sm);color:var(--color-text-muted)">${esc(pkg.short_description) || ""}</p>
          <div class="admin-card__actions">
            <button class="btn btn--glass btn--pill" type="button" data-vip-pkg-status="${pkg.id}" data-vip-pkg-active="${pkg.is_active ? "1" : "0"}">
              ${pkg.is_active ? "Deactivate" : "Activate"}
            </button>
            <button class="btn btn--danger btn--pill" type="button" data-vip-pkg-delete="${pkg.id}">Delete</button>
          </div>
        </div>
      </article>`;
  }

  function personalityPackagesTemplate(inf, packages) {
    const ownPackages = packages.filter((p) => p.influencer_id === inf.user_id);
    return `
      <div class="admin-card" data-vip-personality-block="${inf.user_id}" style="margin-bottom:var(--space-6)">
        <div class="admin-card__body">
          <h3 class="admin-card__name" style="margin-bottom:var(--space-4)">${esc(inf.full_name) || "Unnamed Influencer"}</h3>

          <div class="admin-list">
            ${ownPackages.length ? ownPackages.map(packageCardTemplate).join("") : '<p style="font-size:var(--fs-sm);color:var(--color-text-muted)">No VIP Experiences yet.</p>'}
          </div>

          <form data-vip-pkg-form="${inf.user_id}" style="margin-top:var(--space-5)">
            <div class="admin-card__meta" style="grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))">
              <label class="field">
                <span class="field__label">Experience Title</span>
                <input class="input" type="text" name="title" placeholder="e.g. Dubai VIP Meet" required />
              </label>
              <label class="field">
                <span class="field__label">Price (₹, optional)</span>
                <input class="input" type="number" name="price" min="0" step="1" />
              </label>
            </div>
            <label class="field" style="margin-top:var(--space-3)">
              <span class="field__label">Short Description</span>
              <input class="input" type="text" name="shortDescription" placeholder="One line about this experience" />
            </label>
            <label class="field" style="margin-top:var(--space-3)">
              <span class="field__label">Image URL (optional)</span>
              <input class="input" type="text" name="image" placeholder="https://..." />
            </label>
            <p class="admin-announce-message" data-vip-pkg-message role="status" aria-live="polite"></p>
            <div class="admin-card__actions" style="margin-top:var(--space-4)">
              <button class="btn btn--primary btn--pill" type="submit">Add VIP Experience</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  async function render() {
    const { influencers, packages } = await loadData();

    if (!influencers.length) {
      renderEmpty(influencerListEl, "No approved influencers yet.");
    } else {
      influencerListEl.innerHTML = `<div class="admin-list">${influencers.map(influencerCardTemplate).join("")}</div>`;
    }

    influencerListEl.querySelectorAll("[data-vip-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const userId = btn.dataset.vipToggle;
        const nextIsVip = btn.dataset.vipCurrent !== "1";
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("toggle-vip-personality", { userId, isVip: nextIsVip });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to update this influencer.");
          return;
        }
        render();
      });
    });

    const vipInfluencers = influencers.filter((i) => i.is_vip_personality);
    if (!vipInfluencers.length) {
      renderEmpty(packageListEl, "No VIP Personalities yet. Toggle an influencer above to manage their VIP Experiences here.");
      return;
    }

    packageListEl.innerHTML = vipInfluencers.map((inf) => personalityPackagesTemplate(inf, packages)).join("");

    packageListEl.querySelectorAll("[data-vip-pkg-form]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const messageEl = form.querySelector("[data-vip-pkg-message]");
        submitBtn.disabled = true;
        const data = new FormData(form);
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("create-vip-package", {
          influencerId: form.dataset.vipPkgForm,
          title: data.get("title"),
          shortDescription: data.get("shortDescription") || "",
          price: data.get("price") || null,
          image: data.get("image") || null,
        });
        messageEl.classList.remove("admin-announce-message--success", "admin-announce-message--error");
        if (!ok) {
          submitBtn.disabled = false;
          messageEl.textContent = error || "Failed to add VIP Experience.";
          messageEl.classList.add("admin-announce-message--error");
          return;
        }
        render();
      });
    });

    packageListEl.querySelectorAll("[data-vip-pkg-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const packageId = btn.dataset.vipPkgStatus;
        const nextActive = btn.dataset.vipPkgActive !== "1";
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("update-vip-package-status", { packageId, isActive: nextActive });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to update this VIP Experience.");
          return;
        }
        render();
      });
    });

    packageListEl.querySelectorAll("[data-vip-pkg-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Delete this VIP Experience? This cannot be undone.")) return;
        btn.disabled = true;
        const packageId = btn.dataset.vipPkgDelete;
        const { ok, error } = await window.XploroAdminAuth.callAdminApi("delete-vip-package", { packageId });
        if (!ok) {
          btn.disabled = false;
          window.alert(error || "Failed to delete this VIP Experience.");
          return;
        }
        render();
      });
    });
  }

  render();

  const tabBtn = document.querySelector('[data-admin-tab="vip-personalities"]');
  if (tabBtn) tabBtn.addEventListener("click", render);
})();
