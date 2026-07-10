/* ==========================================================================
   XPLOROO · Influencer dashboard — KYC tab
   dash-kyc.js — Renders the real KYC form (public.kyc_submissions, via
   window.XploroKyc, see js/kyc.js) into the "KYC" panel: identity fields,
   four document/photo uploads (stored as data URLs, same pattern as
   profiles.avatar_url elsewhere on the site), bank account fields, and the
   current Pending/Approved/Rejected status. Once submitted, the read-only
   summary replaces the form (still edit-able via a "Resubmit" action, since
   a rejected/pending submission can always be corrected and resent).
   Vanilla JS, no dependencies. Loaded with `defer`, after kyc.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-dashboard-page]");
  if (!page || !window.XploroAuth || !window.XploroApplications || !window.XploroKyc) return;

  const mount = page.querySelector('[data-dash-section="kyc"]');
  if (!mount) return;

  function statusPill(status) {
    if (status === "Approved") return '<span class="status-pill status-pill--approved">Approved</span>';
    if (status === "Rejected") return '<span class="status-pill status-pill--rejected">Rejected</span>';
    return '<span class="status-pill status-pill--pending">Pending</span>';
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  function uploadField(key, label) {
    return `
      <label class="field">
        <span class="field__label">${label}</span>
        <span class="dash-upload">
          <input class="dash-upload__input" type="file" accept="image/*,.pdf" data-kyc-upload="${key}" />
          <span class="dash-upload__zone">
            <svg class="dash-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0-12 4 4m-4-4-4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
            <span class="dash-upload__text">Upload</span>
            <span class="dash-upload__name" data-kyc-upload-name="${key}">No file chosen</span>
          </span>
        </span>
      </label>`;
  }

  function renderForm(existing) {
    const uploads = { panUrl: "", aadhaarFrontUrl: "", aadhaarBackUrl: "", selfieUrl: "" };
    if (existing) {
      uploads.panUrl = existing.pan_url || "";
      uploads.aadhaarFrontUrl = existing.aadhaar_front_url || "";
      uploads.aadhaarBackUrl = existing.aadhaar_back_url || "";
      uploads.selfieUrl = existing.selfie_url || "";
    }

    mount.innerHTML = `
      ${existing ? `<div class="dash-kyc__current"><span class="dash-section-title" style="margin:0">Current Status</span>${statusPill(existing.status)}</div>` : ""}
      <form class="dash-ticket-form" data-kyc-form>
        <div class="dash-ticket-form__grid">
          <label class="field">
            <span class="field__label">Full Name</span>
            <input class="input" type="text" name="fullName" value="${existing ? existing.full_name || "" : ""}" required />
          </label>
          <label class="field">
            <span class="field__label">Date of Birth</span>
            <input class="input" type="date" name="dateOfBirth" value="${existing ? existing.date_of_birth || "" : ""}" required />
          </label>
          <label class="field">
            <span class="field__label">PAN Number</span>
            <input class="input" type="text" name="panNumber" value="${existing ? existing.pan_number || "" : ""}" placeholder="e.g. ABCDE1234F" required />
          </label>
          <label class="field">
            <span class="field__label">Aadhaar Number</span>
            <input class="input" type="text" name="aadhaarNumber" value="${existing ? existing.aadhaar_number || "" : ""}" placeholder="12-digit number" required />
          </label>
          ${uploadField("panUrl", "Upload PAN")}
          ${uploadField("aadhaarFrontUrl", "Upload Aadhaar Front")}
          ${uploadField("aadhaarBackUrl", "Upload Aadhaar Back")}
          ${uploadField("selfieUrl", "Selfie Verification Photo")}
          <label class="field">
            <span class="field__label">Bank Account Holder Name</span>
            <input class="input" type="text" name="bankAccountHolder" value="${existing ? existing.bank_account_holder || "" : ""}" required />
          </label>
          <label class="field">
            <span class="field__label">Account Number</span>
            <input class="input" type="text" name="bankAccountNumber" value="${existing ? existing.bank_account_number || "" : ""}" required />
          </label>
          <label class="field">
            <span class="field__label">IFSC Code</span>
            <input class="input" type="text" name="bankIfsc" value="${existing ? existing.bank_ifsc || "" : ""}" required />
          </label>
          <label class="field">
            <span class="field__label">Bank Name</span>
            <input class="input" type="text" name="bankName" value="${existing ? existing.bank_name || "" : ""}" required />
          </label>
        </div>
        <p class="dash-kyc-form__error" data-kyc-error role="alert" style="color:var(--color-danger);font-size:var(--fs-xs)"></p>
        <button class="btn btn--gradient btn--pill" type="submit" data-kyc-submit>${existing ? "Resubmit KYC" : "Submit KYC"}</button>
      </form>`;

    const form = mount.querySelector("[data-kyc-form]");
    const errorEl = mount.querySelector("[data-kyc-error]");

    Object.keys(uploads).forEach((key) => {
      if (uploads[key]) {
        const nameEl = form.querySelector(`[data-kyc-upload-name="${key}"]`);
        if (nameEl) nameEl.textContent = "Uploaded";
      }
      const input = form.querySelector(`[data-kyc-upload="${key}"]`);
      input.addEventListener("change", async () => {
        const file = input.files[0];
        const nameEl = form.querySelector(`[data-kyc-upload-name="${key}"]`);
        if (!file) {
          nameEl.textContent = "No file chosen";
          return;
        }
        nameEl.textContent = file.name;
        uploads[key] = await readFileAsDataUrl(file);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      errorEl.textContent = "";
      const submitBtn = mount.querySelector("[data-kyc-submit]");
      submitBtn.disabled = true;

      const data = new FormData(form);
      const { error } = await window.XploroKyc.submitKyc({
        fullName: data.get("fullName"),
        dateOfBirth: data.get("dateOfBirth"),
        panNumber: data.get("panNumber"),
        aadhaarNumber: data.get("aadhaarNumber"),
        panUrl: uploads.panUrl,
        aadhaarFrontUrl: uploads.aadhaarFrontUrl,
        aadhaarBackUrl: uploads.aadhaarBackUrl,
        selfieUrl: uploads.selfieUrl,
        bankAccountHolder: data.get("bankAccountHolder"),
        bankAccountNumber: data.get("bankAccountNumber"),
        bankIfsc: data.get("bankIfsc"),
        bankName: data.get("bankName"),
      });

      submitBtn.disabled = false;
      if (error) {
        errorEl.textContent = "Failed to submit KYC. Please try again.";
        return;
      }
      render();
    });
  }

  async function render() {
    const existing = await window.XploroKyc.getMyKyc();
    renderForm(existing);
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) return;
    const application = await window.XploroApplications.getMyApplication();
    if (!application || application.application_status !== "approved") return;

    render();
  })();
})();
