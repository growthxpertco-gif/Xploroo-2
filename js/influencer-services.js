/* ==========================================================================
   XPLOROO · Influencer services & pricing
   influencer-services.js — Standalone module for the "My Services &
   Pricing" section shown to approved Influencers (rendered into
   influencer-application.html by js/influencer-application.js once
   XploroRole reports role === "influencer"). Owns the service catalog
   (CATALOG below) so adding a new service later is a one-line addition,
   and persists enabled/price/duration per service to localStorage
   ("xploroo-influencer-services"), keyed by service.

   These saved services are NOT yet wired into any public-facing profile
   page — this module only stores the data and reflects it back into this
   card grid so it survives a reload, per spec.
   Vanilla JS, no dependencies. Loaded with `defer`, before
   influencer-application.js.
   ========================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "xploroo-influencer-services";

  const CATALOG = [
    { key: "meetGreet", icon: "\u{1F91D}", name: "Meet & Greet", description: "In-person meetups with your followers and fans." },
    { key: "podcast", icon: "\u{1F399}️", name: "Podcast", description: "Guest spots or co-hosted podcast episodes." },
    { key: "eventAppearance", icon: "\u{1F389}", name: "Event Appearance", description: "Host or appear at brand and community events." },
    { key: "contentShoot", icon: "\u{1F4F8}", name: "Blog / Content Shoot", description: "Collaborative content shoots for blogs and social." },
    { key: "travelCollab", icon: "✈️", name: "Travel Collaboration", description: "Partner on sponsored trips and travel campaigns." },
  ];

  function getSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveService(key, data) {
    const all = getSaved();
    all[key] = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (_) {}
    return all[key];
  }

  function cardTemplate(service, saved) {
    const enabled = !!(saved && saved.enabled);
    const price = saved && saved.price != null ? saved.price : "";
    const duration = saved && saved.duration != null ? saved.duration : "";
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
        </div>
        <div class="service-card__footer">
          <button class="btn btn--gradient btn--pill service-card__save" type="button" data-service-save>Save</button>
          <span class="service-card__saved" data-service-saved-msg role="status" aria-live="polite"></span>
        </div>
      </article>`;
  }

  function renderCards(container) {
    if (!container) return;
    const saved = getSaved();
    container.innerHTML = CATALOG.map((service) => cardTemplate(service, saved[service.key])).join("");

    CATALOG.forEach((service) => {
      const cardEl = container.querySelector(`[data-service-card="${service.key}"]`);
      if (!cardEl) return;

      const saveBtn = cardEl.querySelector("[data-service-save]");
      const savedMsg = cardEl.querySelector("[data-service-saved-msg]");

      saveBtn.addEventListener("click", () => {
        const enabled = cardEl.querySelector("[data-service-enabled]").checked;
        const price = cardEl.querySelector("[data-service-price]").value.trim();
        const duration = cardEl.querySelector("[data-service-duration]").value.trim();

        saveService(service.key, { enabled, price, duration });

        savedMsg.textContent = "Saved";
        window.clearTimeout(cardEl._savedTimeout);
        cardEl._savedTimeout = window.setTimeout(() => {
          savedMsg.textContent = "";
        }, 2000);
      });
    });
  }

  window.XploroServices = { CATALOG, getSaved, saveService, renderCards };
})();
