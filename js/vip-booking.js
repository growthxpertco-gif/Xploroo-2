/* ==========================================================================
   XPLOROO · VIP Booking Request (Phase 32)
   vip-booking.js — Drives vip-booking.html. Reads the VIP personality
   handed off from vip.html's "Select VIP Personality" flow
   (js/vip-selection.js) via query params, falling back to sessionStorage if
   a host's clean-URL redirect strips the query string (same handoff
   pattern used across the site — see js/vip-package-page.js). Requires
   sign-in, prefills name/email from the profile, and on submit writes to
   public.vip_booking_requests (window.XploroVipBookingRequests) plus a
   customer-facing confirmation notification (window.XploroNotifications).
   Completely independent of booking.html/payment.js and of
   vip-package-booking.html/js/vip.js.

   No Destination field anywhere — the VIP experience destination is a
   surprise planned by Xploroo, never selected or shown to the customer.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/notifications.js and js/vip-booking-requests.js.
   ========================================================================== */
(function () {
  "use strict";

  const container = document.querySelector("[data-vip-booking-request-container]");
  if (!container || !window.XploroAuth || !window.XploroVipBookingRequests || !window.supabaseClient) return;

  const esc = window.XploroSecurity.escapeHtml;
  const client = window.supabaseClient;

  const OCCASIONS = ["Birthday", "Anniversary", "Proposal", "Corporate", "Family", "Other"];

  function readSelection() {
    const params = new URLSearchParams(window.location.search);
    let vipPersonality = params.get("vip") || "";

    if (!vipPersonality) {
      try {
        const stored = JSON.parse(sessionStorage.getItem("xploroo-vip-booking-selection") || "null");
        if (stored) vipPersonality = stored.vipPersonality || "";
      } catch (_) {
        /* sessionStorage unavailable or malformed — fall through */
      }
    }
    return { vipPersonality };
  }

  function renderNotFound() {
    container.innerHTML = `
      <section class="vip-booking-signin">
        <h1 class="vip-booking-signin__title">No VIP Selected</h1>
        <p class="vip-booking-signin__desc">Please choose a VIP personality first, then tap Book Now.</p>
        <a class="btn btn--gradient btn--pill vip-booking-signin__action" href="vip.html">Back to VIP Packages</a>
      </section>`;
  }

  function renderSignInPrompt() {
    container.innerHTML = `
      <section class="vip-booking-signin">
        <h1 class="vip-booking-signin__title">Sign In to Continue</h1>
        <p class="vip-booking-signin__desc">Please log in to submit a VIP booking request.</p>
        <a class="btn btn--gradient btn--pill vip-booking-signin__action" href="login.html">Log In</a>
      </section>`;
  }

  function renderSuccess(selection) {
    container.innerHTML = `
      <section class="vip-booking-success">
        <h1 class="vip-booking-success__title">&#127881; VIP Booking Request Submitted</h1>
        <p class="vip-booking-success__desc">Your request with ${esc(selection.vipPersonality)} has been received. Our team will personally plan the destination and every detail of the experience, then follow up shortly &mdash; no payment has been collected.</p>
        <span class="status-pill status-pill--pending vip-booking-success__pill">Pending Review</span>
        <div><a class="btn btn--gradient btn--pill vip-booking-success__action" href="account.html">View My VIP Bookings</a></div>
      </section>`;
  }

  function formTemplate(selection, prefill) {
    return `
      <div class="vip-booking-hero">
        <h1 class="vip-booking-hero__title">Request VIP Booking</h1>
        <p class="vip-booking-hero__subtitle">Tell us a little more and our team will personally plan every detail.</p>
      </div>

      <div class="vip-booking-layout">
        <div class="vip-booking-form-card">
          <form data-vip-booking-form novalidate>
            <div class="vip-booking-grid">
              <label class="field">
                <span class="field__label">Full Name</span>
                <input class="input" type="text" name="fullName" autocomplete="name" value="${esc(prefill.name)}" required />
              </label>
              <label class="field">
                <span class="field__label">Mobile Number</span>
                <input class="input" type="tel" name="mobileNumber" autocomplete="tel" placeholder="+91 98765 43210" pattern="[0-9+()\\-\\s]{7,20}" required />
              </label>
              <label class="field">
                <span class="field__label">Email Address</span>
                <input class="input" type="email" name="emailAddress" autocomplete="email" value="${esc(prefill.email)}" required />
              </label>
              <label class="field">
                <span class="field__label">Number of Travellers</span>
                <input class="input" type="number" name="travellers" min="1" max="20" step="1" value="1" required data-vip-booking-travellers />
              </label>
              <label class="field">
                <span class="field__label">Preferred Date</span>
                <input class="input" type="date" name="preferredDate" required />
              </label>
              <label class="field">
                <span class="field__label">Preferred Time</span>
                <input class="input" type="time" name="preferredTime" required />
              </label>
              <label class="field">
                <span class="field__label">VIP Personality</span>
                <input class="input" type="text" value="${esc(selection.vipPersonality)}" readonly />
              </label>
              <label class="field">
                <span class="field__label">Occasion <span class="field__hint" style="display:inline">(optional)</span></span>
                <select class="input select" name="occasion">
                  <option value="">Select</option>
                  ${OCCASIONS.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
                </select>
              </label>
              <label class="field field--full">
                <span class="field__label">Special Requirements <span class="field__hint" style="display:inline">(optional)</span></span>
                <textarea class="input" name="specialRequirements" rows="5" placeholder="Anything our team should know&hellip;"></textarea>
              </label>
            </div>

            <p class="vip-booking-form__error" data-vip-booking-error role="alert" style="color:var(--color-danger);font-size:var(--fs-xs);margin-top:var(--space-4)"></p>
            <button class="btn btn--gradient btn--pill vip-booking-submit" type="submit">Submit VIP Booking Request</button>
          </form>
        </div>

        <aside class="card card--glass card--lg vip-booking-summary">
          <h2 class="vip-booking-summary__title">Booking Summary</h2>
          <div class="vip-booking-summary__rows">
            <div class="vip-booking-summary__row">
              <span class="vip-booking-summary__label">Selected VIP</span>
              <span class="vip-booking-summary__value">${esc(selection.vipPersonality)}</span>
            </div>
            <div class="vip-booking-summary__row">
              <span class="vip-booking-summary__label">Travellers</span>
              <span class="vip-booking-summary__value" data-vip-booking-summary-travellers>1</span>
            </div>
            <div class="vip-booking-summary__row">
              <span class="vip-booking-summary__label">Booking Status</span>
              <span class="vip-booking-summary__value"><span class="status-pill status-pill--pending">Pending Confirmation</span></span>
            </div>
            <div class="vip-booking-summary__row">
              <span class="vip-booking-summary__label">Price</span>
              <span class="vip-booking-summary__value">On Request</span>
            </div>
          </div>
        </aside>
      </div>`;
  }

  async function render() {
    const selection = readSelection();
    if (!selection.vipPersonality) {
      renderNotFound();
      return;
    }

    const user = await window.XploroAuth.getUser();
    if (!user) {
      renderSignInPrompt();
      return;
    }

    const { data: profile } = await client.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const prefill = { name: (profile && profile.full_name) || "", email: (profile && profile.email) || user.email || "" };

    container.innerHTML = formTemplate(selection, prefill);

    const form = container.querySelector("[data-vip-booking-form]");
    const errorEl = container.querySelector("[data-vip-booking-error]");
    const travellersInput = container.querySelector("[data-vip-booking-travellers]");
    const summaryTravellers = container.querySelector("[data-vip-booking-summary-travellers]");

    travellersInput.addEventListener("input", () => {
      summaryTravellers.textContent = travellersInput.value || "1";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const submitBtn = form.querySelector(".vip-booking-submit");
      submitBtn.disabled = true;
      errorEl.textContent = "";

      const data = new FormData(form);
      const { data: booking, error } = await window.XploroVipBookingRequests.submitBookingRequest({
        fullName: data.get("fullName"),
        mobileNumber: data.get("mobileNumber"),
        emailAddress: data.get("emailAddress"),
        travellers: data.get("travellers"),
        preferredDate: data.get("preferredDate"),
        preferredTime: data.get("preferredTime"),
        vipPersonality: selection.vipPersonality,
        occasion: data.get("occasion"),
        specialRequirements: data.get("specialRequirements"),
      });

      if (error || !booking) {
        submitBtn.disabled = false;
        errorEl.textContent = "Something went wrong. Please try again.";
        return;
      }

      if (window.XploroNotifications) {
        await window.XploroNotifications.create({
          userId: user.id,
          type: "vip_booking_submitted",
          title: "VIP Booking Request Submitted Successfully",
          message: `Your request with ${selection.vipPersonality} is pending review.`,
          relatedVipBookingId: booking.id,
        });
      }

      try {
        sessionStorage.removeItem("xploroo-vip-booking-selection");
      } catch (_) {
        /* sessionStorage unavailable */
      }

      renderSuccess(selection);
    });
  }

  render();
})();
