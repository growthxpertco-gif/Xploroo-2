/* ==========================================================================
   XPLOROO · Influencer services & pricing
   influencer-services.js — Standalone module for the "My Services &
   Pricing" section shown to approved Influencers (rendered into
   influencer-application.html by js/influencer-application.js once the
   application's Supabase status is "approved"). Owns the service catalog
   (CATALOG below) so adding a new service later is a one-line addition.

   Backed by public.influencer_services (Supabase) — one row per influencer
   (unique on user_id), storing every service as a single JSONB object keyed
   by service key. Saving a service does a read-modify-write on that JSONB
   object and upserts the whole row, so there is always exactly one record
   per influencer and the previous values are overwritten, never duplicated.

   This same data is read by the public influencer-profile.html (via
   getServicesByUserId) to show only the enabled services with their price/
   duration/date/time/location — see js/influencer-profile-page.js.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   before influencer-application.js.
   ========================================================================== */
(function () {
  "use strict";

  const TABLE = "influencer_services";

  const CATALOG = [
    { key: "meetGreet", icon: "\u{1F91D}", name: "Meet & Greet", description: "In-person meetups with your followers and fans." },
    { key: "podcast", icon: "\u{1F399}️", name: "Podcast", description: "Guest spots or co-hosted podcast episodes." },
    { key: "eventAppearance", icon: "\u{1F389}", name: "Event Appearance", description: "Host or appear at brand and community events." },
    { key: "blogShoot", icon: "\u{1F4F8}", name: "Blog Shoot", description: "Collaborative content shoots for blogs and social." },
    { key: "travelCollab", icon: "✈️", name: "Travel Collaboration", description: "Partner on sponsored trips and travel campaigns." },
    { key: "bookAppointment", icon: "\u{1F4C5}", name: "Book Appointment", description: "A dedicated 1:1 slot for calls, consults or planning sessions." },
  ];

  function client() {
    return window.supabaseClient || null;
  }

  async function getMyServices() {
    const c = client();
    if (!c || !window.XploroAuth) return {};
    const user = await window.XploroAuth.getUser();
    if (!user) return {};
    return getServicesByUserId(user.id);
  }

  async function getServicesByUserId(userId) {
    const c = client();
    if (!c || !userId) return {};
    const { data, error } = await c.from(TABLE).select("services").eq("user_id", userId).maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to load influencer services:", error.message);
      return {};
    }
    return (data && data.services) || {};
  }

  async function saveService(key, data) {
    const c = client();
    if (!c || !window.XploroAuth) return null;
    const user = await window.XploroAuth.getUser();
    if (!user) return null;

    const current = await getServicesByUserId(user.id);
    const updated = { ...current, [key]: data };

    const { error } = await c
      .from(TABLE)
      .upsert({ user_id: user.id, services: updated, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      console.error("[Xploroo] Failed to save influencer service:", error.message);
      return null;
    }
    return updated[key];
  }

  function cardTemplate(service, saved) {
    const enabled = !!(saved && saved.enabled);
    const price = saved && saved.price != null ? saved.price : "";
    const duration = saved && saved.duration != null ? saved.duration : "";
    const date = saved && saved.date != null ? saved.date : "";
    const time = saved && saved.time != null ? saved.time : "";
    const location = saved && saved.location != null ? saved.location : "";
    return `
      <article class="service-card" data-service-card="${service.key}">
        <div class="service-card__head">
          <span class="service-card__icon" aria-hidden="true">${service.icon}</span>
          <div class="service-card__heading">
            <h3 class="service-card__name">${service.name}</h3>
            <p class="service-card__desc">${service.description}</p>
          </div>
          <label class="service-card__toggle">
            <input type="checkbox" data-service-enabled ${enabled ? "checked" : ""} />
            <span class="service-card__toggle-track" aria-hidden="true"><span class="service-card__toggle-thumb"></span></span>
            <span class="sr-only">Enable ${service.name}</span>
          </label>
        </div>
        <div class="service-card__fields">
          <label class="field">
            <span class="field__label">Price (&#8377;)</span>
            <input class="input" type="number" min="0" step="1" data-service-price value="${price}" placeholder="e.g. 5000" />
          </label>
          <label class="field">
            <span class="field__label">Duration <span class="field__hint" style="display:inline">(optional)</span></span>
            <input class="input" type="text" data-service-duration value="${duration}" placeholder="e.g. 2 Hours" />
          </label>
          <label class="field">
            <span class="field__label">Date <span class="field__hint" style="display:inline">(optional)</span></span>
            <input class="input" type="date" data-service-date value="${date}" />
          </label>
          <label class="field">
            <span class="field__label">Time <span class="field__hint" style="display:inline">(optional)</span></span>
            <input class="input" type="time" data-service-time value="${time}" />
          </label>
          <label class="field">
            <span class="field__label">Location <span class="field__hint" style="display:inline">(optional)</span></span>
            <input class="input" type="text" data-service-location value="${location}" placeholder="e.g. Mumbai" />
          </label>
        </div>
        <div class="service-card__footer">
          <button class="btn btn--gradient btn--pill service-card__save" type="button" data-service-save>Save</button>
          <span class="service-card__saved" data-service-saved-msg role="status" aria-live="polite"></span>
        </div>
      </article>`;
  }

  async function renderCards(container) {
    if (!container) return;
    const saved = await getMyServices();
    container.innerHTML = CATALOG.map((service) => cardTemplate(service, saved[service.key])).join("");

    CATALOG.forEach((service) => {
      const cardEl = container.querySelector(`[data-service-card="${service.key}"]`);
      if (!cardEl) return;

      const saveBtn = cardEl.querySelector("[data-service-save]");
      const savedMsg = cardEl.querySelector("[data-service-saved-msg]");

      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        const enabled = cardEl.querySelector("[data-service-enabled]").checked;
        const price = cardEl.querySelector("[data-service-price]").value.trim();
        const duration = cardEl.querySelector("[data-service-duration]").value.trim();
        const date = cardEl.querySelector("[data-service-date]").value.trim();
        const time = cardEl.querySelector("[data-service-time]").value.trim();
        const location = cardEl.querySelector("[data-service-location]").value.trim();

        await saveService(service.key, { enabled, price, duration, date, time, location });

        saveBtn.disabled = false;
        savedMsg.textContent = "Saved";
        window.clearTimeout(cardEl._savedTimeout);
        cardEl._savedTimeout = window.setTimeout(() => {
          savedMsg.textContent = "";
        }, 2000);

        showSavedToast();
      });
    });
  }

  // Desktop-only success toast (see [data-influencer-services-toast] in
  // js/influencer-application.js + styles/influencer-approved.css) — purely
  // additive on top of the unchanged per-card "Saved" text above; hidden
  // entirely on mobile via CSS, so it never touches the mobile layout.
  let toastTimeout = null;
  function showSavedToast() {
    const toast = document.querySelector("[data-influencer-services-toast]");
    if (!toast) return;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2500);
  }

  window.XploroServices = { CATALOG, getMyServices, getServicesByUserId, saveService, renderCards };
})();
