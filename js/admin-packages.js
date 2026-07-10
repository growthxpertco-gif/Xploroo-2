/* ==========================================================================
   XPLOROO · Admin — Package Management
   admin-packages.js — Local (localStorage-only) CRUD for travel packages,
   rendered into the "Package Management" tab of
   admin-influencer-applications.html.

   Storage: "xploroo-packages" — an array of package objects, each with a
   generated `id`. Nothing here is published to the site yet; this only
   builds and maintains the data.

   Exposes `window.XploroPackages = { getAll, getActive, save, remove }` as
   the single source of truth for saved packages, so a future integration
   (homepage, international/domestic packages pages, booking pages) can
   read from it without touching this admin UI — same pattern as
   window.XploroApplications (js/influencer-applications.js) and
   window.XploroServices (js/influencer-services.js).

   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js.
   ========================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "xploroo-packages";

  /* ------------------------------------------------------------------ */
  /* Data layer                                                          */
  /* ------------------------------------------------------------------ */
  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function getActive() {
    return getAll().filter((pkg) => pkg.status === "active");
  }

  function persist(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  function save(pkg) {
    const all = getAll();
    const now = new Date().toISOString();

    if (pkg.id) {
      const index = all.findIndex((p) => p.id === pkg.id);
      if (index !== -1) {
        all[index] = { ...all[index], ...pkg, updatedAt: now };
        persist(all);
        return all[index];
      }
    }

    const record = { ...pkg, id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: now, updatedAt: now };
    all.push(record);
    persist(all);
    return record;
  }

  function remove(id) {
    persist(getAll().filter((p) => p.id !== id));
  }

  window.XploroPackages = { getAll, getActive, save, remove };

  /* ------------------------------------------------------------------ */
  /* UI                                                                   */
  /* ------------------------------------------------------------------ */
  const root = document.querySelector("[data-admin-packages-root]");
  if (!root) return;

  let editingId = null;

  root.innerHTML = `
    <section class="pkg-form-card" data-pkg-form-card>
      <h2 class="pkg-form-card__title" data-pkg-form-title>Add a Package</h2>
      <form class="pkg-form" data-pkg-form novalidate>
        <div class="pkg-form__grid">

          <label class="field field--full">
            <span class="field__label">Package Name</span>
            <input class="input" type="text" name="packageName" placeholder="e.g. Goa Beach Escape" required />
          </label>

          <label class="field">
            <span class="field__label">Destination</span>
            <input class="input" type="text" name="destination" placeholder="e.g. Goa" required />
          </label>
          <label class="field">
            <span class="field__label">Country</span>
            <input class="input" type="text" name="country" placeholder="e.g. India" required />
          </label>

          <label class="field">
            <span class="field__label">Journey Start Date</span>
            <input class="input" type="date" name="startDate" required />
          </label>
          <label class="field">
            <span class="field__label">Journey End Date</span>
            <input class="input" type="date" name="endDate" required />
          </label>

          <label class="field">
            <span class="field__label">Flight Included</span>
            <select class="input select" name="flightIncluded" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Trip Duration</span>
            <input class="input" type="text" name="tripDuration" placeholder="e.g. 4 Days 3 Nights" required />
          </label>

          <label class="field field--full">
            <span class="field__label">Hotel Details <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" name="hotelDetails" rows="2" placeholder="e.g. 4-star beachfront resort"></textarea>
          </label>

          <label class="field field--full">
            <span class="field__label">Restaurant Details <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" name="restaurantDetails" rows="2" placeholder="e.g. Daily breakfast + one seafood dinner"></textarea>
          </label>

          <label class="field field--full">
            <span class="field__label">Local Transport <span class="field__hint" style="display:inline">(optional)</span></span>
            <input class="input" type="text" name="localTransport" placeholder="e.g. AC cab, airport transfers included" />
          </label>

          <label class="field field--full">
            <span class="field__label">Package Description</span>
            <textarea class="input" name="description" rows="3" placeholder="A short overview of the trip." required></textarea>
          </label>

          <label class="field">
            <span class="field__label">Price Per Person (&#8377;)</span>
            <input class="input" type="number" name="pricePerPerson" min="0" step="1" placeholder="e.g. 14999" required />
          </label>
          <label class="field">
            <span class="field__label">Maximum Seats</span>
            <input class="input" type="number" name="maxSeats" min="1" step="1" placeholder="e.g. 20" required />
          </label>

          <label class="field field--full">
            <span class="field__label">Inclusions <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" name="inclusions" rows="2" placeholder="e.g. Stay, breakfast, airport transfers"></textarea>
          </label>

          <label class="field field--full">
            <span class="field__label">Exclusions <span class="field__hint" style="display:inline">(optional)</span></span>
            <textarea class="input" name="exclusions" rows="2" placeholder="e.g. Flights, personal expenses"></textarea>
          </label>

          <div class="field field--full pkg-form__status">
            <span class="field__label">Package Status</span>
            <label class="pkg-status-toggle">
              <input type="checkbox" name="status" data-pkg-status-input checked />
              <span class="pkg-status-toggle__track" aria-hidden="true"><span class="pkg-status-toggle__thumb"></span></span>
              <span class="pkg-status-toggle__label" data-pkg-status-label>Active</span>
            </label>
          </div>

        </div>

        <div class="pkg-form__actions">
          <button class="btn btn--gradient btn--pill pkg-form__save" type="submit">Save Package</button>
          <button class="btn btn--glass btn--pill pkg-form__cancel" type="button" data-pkg-cancel-edit hidden>Cancel Edit</button>
        </div>
        <p class="pkg-form__message" data-pkg-form-message role="status" aria-live="polite"></p>
      </form>
    </section>

    <section class="pkg-saved">
      <div class="pkg-saved__head">
        <h2 class="pkg-saved__title">Saved Packages</h2>
        <button class="btn btn--glass btn--pill pkg-saved__add" type="button" data-pkg-add-another hidden>+ Add Another Package</button>
      </div>
      <div class="pkg-saved__grid" data-pkg-saved-grid></div>
    </section>`;

  const formCard = root.querySelector("[data-pkg-form-card]");
  const formTitle = root.querySelector("[data-pkg-form-title]");
  const form = root.querySelector("[data-pkg-form]");
  const messageEl = root.querySelector("[data-pkg-form-message]");
  const cancelEditBtn = root.querySelector("[data-pkg-cancel-edit]");
  const addAnotherBtn = root.querySelector("[data-pkg-add-another]");
  const savedGrid = root.querySelector("[data-pkg-saved-grid]");

  const statusInput = form.querySelector("[data-pkg-status-input]");
  const statusLabelEl = form.querySelector("[data-pkg-status-label]");
  statusInput.addEventListener("change", () => {
    statusLabelEl.textContent = statusInput.checked ? "Active" : "Inactive";
  });

  /* ------------------------------------------------------------------ */
  /* Form <-> data                                                        */
  /* ------------------------------------------------------------------ */
  function resetForm() {
    form.reset();
    statusInput.checked = true;
    statusLabelEl.textContent = "Active";
    editingId = null;
    formTitle.textContent = "Add a Package";
    cancelEditBtn.hidden = true;
    messageEl.textContent = "";
  }

  function populateForm(pkg) {
    Object.keys(pkg).forEach((key) => {
      const field = form.querySelector(`[name="${key}"]`);
      if (!field || key === "status") return;
      field.value = pkg[key] != null ? pkg[key] : "";
    });
    statusInput.checked = pkg.status === "active";
    statusLabelEl.textContent = statusInput.checked ? "Active" : "Inactive";
    editingId = pkg.id;
    formTitle.textContent = "Edit Package";
    cancelEditBtn.hidden = false;
    messageEl.textContent = "";
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return iso;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Saved packages grid                                                  */
  /* ------------------------------------------------------------------ */
  function renderSaved() {
    const all = getAll();

    addAnotherBtn.hidden = all.length === 0;

    if (all.length === 0) {
      savedGrid.innerHTML = `
        <div class="admin-empty">
          <span class="admin-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>
          </span>
          <p>No packages saved yet.</p>
        </div>`;
      return;
    }

    savedGrid.innerHTML = all
      .map(
        (pkg) => `
      <article class="pkg-card" data-pkg-card="${pkg.id}">
        <div class="pkg-card__head">
          <h3 class="pkg-card__name">${pkg.packageName || "Untitled Package"}</h3>
          <span class="status-pill status-pill--${pkg.status === "active" ? "approved" : "rejected"}">${pkg.status === "active" ? "Active" : "Inactive"}</span>
        </div>
        <p class="pkg-card__destination">${[pkg.destination, pkg.country].filter(Boolean).join(", ") || "&mdash;"}</p>
        <dl class="pkg-card__meta">
          <div><dt>Journey Dates</dt><dd>${formatDate(pkg.startDate) || "&mdash;"} &ndash; ${formatDate(pkg.endDate) || "&mdash;"}</dd></div>
          <div><dt>Price</dt><dd>&#8377;${pkg.pricePerPerson || "&mdash;"} / person</dd></div>
        </dl>
        <div class="pkg-card__actions">
          <button class="btn btn--glass btn--pill" type="button" data-pkg-edit="${pkg.id}">Edit</button>
          <button class="btn btn--danger btn--pill" type="button" data-pkg-delete="${pkg.id}">Delete</button>
        </div>
      </article>`
      )
      .join("");

    savedGrid.querySelectorAll("[data-pkg-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pkg = getAll().find((p) => p.id === btn.dataset.pkgEdit);
        if (!pkg) return;
        populateForm(pkg);
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
        form.querySelector('[name="packageName"]').focus();
      });
    });

    savedGrid.querySelectorAll("[data-pkg-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.XploroPackages.remove(btn.dataset.pkgDelete);
        if (editingId === btn.dataset.pkgDelete) resetForm();
        renderSaved();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Save (create or update)                                              */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const pkg = {
      packageName: data.get("packageName") || "",
      destination: data.get("destination") || "",
      country: data.get("country") || "",
      startDate: data.get("startDate") || "",
      endDate: data.get("endDate") || "",
      flightIncluded: data.get("flightIncluded") || "no",
      hotelDetails: data.get("hotelDetails") || "",
      restaurantDetails: data.get("restaurantDetails") || "",
      localTransport: data.get("localTransport") || "",
      description: data.get("description") || "",
      pricePerPerson: data.get("pricePerPerson") || "",
      maxSeats: data.get("maxSeats") || "",
      tripDuration: data.get("tripDuration") || "",
      inclusions: data.get("inclusions") || "",
      exclusions: data.get("exclusions") || "",
      status: statusInput.checked ? "active" : "inactive",
    };
    if (editingId) pkg.id = editingId;

    window.XploroPackages.save(pkg);

    resetForm();
    messageEl.textContent = "Package saved.";
    renderSaved();
  });

  cancelEditBtn.addEventListener("click", () => {
    resetForm();
  });

  addAnotherBtn.addEventListener("click", () => {
    resetForm();
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    form.querySelector('[name="packageName"]').focus();
  });

  renderSaved();
})();
