/* ==========================================================================
   XPLOROO · VIP Booking
   vip-booking.js — Drives vip-booking.html, the single reusable booking
   form behind every VIP "Book Now" button (Meet & Greet — Solo/Couple/
   Family, Vlog — With/Without Influencer). Reads `package`/`type`/`style`
   from the query string (set by vip-meet-greet.html / vip-vlog.html),
   prefills the signed-in user's known name/email, and creates a real
   public.vip_bookings row via window.XploroVip.createBooking() — no
   localStorage, no dummy data. Booking always starts `payment_status:
   "Pending Payment"` until a real payment gateway is wired up later
   (Phase 22 — workflow only, no membership lock, no payment yet).
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/influencer-applications.js, js/notifications.js and js/vip.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-vip-booking-page]");
  if (!page || !window.XploroAuth || !window.XploroVip) return;

  const gate = page.querySelector("[data-vip-booking-gate]");
  const content = page.querySelector("[data-vip-booking-content]");
  const successEl = page.querySelector("[data-vip-booking-success]");
  const titleEl = page.querySelector("[data-vip-booking-title]");
  const summaryEl = page.querySelector("[data-vip-booking-summary]");
  const form = page.querySelector("[data-vip-booking-form]");
  const errorEl = page.querySelector("[data-vip-booking-error]");
  const submitBtn = page.querySelector("[data-vip-booking-submit]");
  const influencerField = page.querySelector("[data-vip-influencer-field]");
  const influencerSelect = page.querySelector("[data-vip-influencer-select]");
  const esc = window.XploroSecurity ? window.XploroSecurity.escapeHtml : (v) => v;

  const PACKAGE_LABEL = { meet_greet: "Meet & Greet", vlog: "Vlog Experience" };

  const params = new URLSearchParams(window.location.search);
  const vipPackage = params.get("package") === "vlog" ? "vlog" : "meet_greet";
  const bookingType = params.get("type") || (vipPackage === "vlog" ? "With Influencer" : "Solo");
  const vlogStyle = params.get("style") || "";

  // Meet & Greet is always with an influencer; a Vlog only needs one when
  // the visitor picked "With Influencer" on vip-vlog.html.
  const needsInfluencer = vipPackage === "meet_greet" || bookingType === "With Influencer";

  function renderSummary() {
    titleEl.textContent = `Complete Your VIP ${PACKAGE_LABEL[vipPackage]} Booking`;
    summaryEl.innerHTML = `
      <span><strong>Package:</strong> ${esc(PACKAGE_LABEL[vipPackage])}</span>
      <span><strong>Booking Type:</strong> ${esc(bookingType)}</span>
      ${vlogStyle ? `<span><strong>Vlog Style:</strong> ${esc(vlogStyle)}</span>` : ""}
    `;

    if (!needsInfluencer) {
      influencerField.hidden = true;
      influencerSelect.required = false;
    } else {
      influencerSelect.required = true;
    }
  }

  async function populateInfluencers() {
    if (!needsInfluencer || !window.XploroApplications) return;
    const influencers = await window.XploroApplications.getApprovedApplications();
    if (!influencers.length) {
      influencerSelect.innerHTML = '<option value="">No influencers available yet</option>';
      return;
    }
    influencerSelect.innerHTML =
      '<option value="">Select an influencer&hellip;</option>' +
      influencers.map((inf) => `<option value="${esc(inf.user_id)}" data-name="${esc(inf.full_name)}">${esc(inf.full_name) || "Xploroo Influencer"}</option>`).join("");
  }

  function showError(text) {
    errorEl.textContent = text;
  }

  (async function init() {
    const user = await window.XploroAuth.getUser();
    if (!user) {
      gate.hidden = false;
      content.hidden = true;
      return;
    }
    gate.hidden = true;
    content.hidden = false;

    renderSummary();
    await populateInfluencers();

    const profile = await window.XploroAuth.getProfile(user.id);
    const nameInput = form.querySelector('[name="customerName"]');
    const emailInput = form.querySelector('[name="customerEmail"]');
    if (nameInput && !nameInput.value) nameInput.value = (profile && profile.full_name) || "";
    if (emailInput && !emailInput.value) emailInput.value = user.email || "";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError("");
      if (!form.reportValidity()) return;
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;

      const data = new FormData(form);
      const influencerOption = needsInfluencer ? influencerSelect.selectedOptions[0] : null;
      const specialRequestParts = [];
      if (vlogStyle) specialRequestParts.push(`Vlog Style: ${vlogStyle}`);
      const userNote = (data.get("specialRequest") || "").toString().trim();
      if (userNote) specialRequestParts.push(userNote);

      const { data: booking, error } = await window.XploroVip.createBooking({
        customerName: (data.get("customerName") || "").toString().trim(),
        customerEmail: (data.get("customerEmail") || "").toString().trim(),
        customerPhone: (data.get("customerPhone") || "").toString().trim(),
        travelDate: data.get("travelDate") || null,
        vipPackage,
        bookingType,
        destination: (data.get("destination") || "").toString().trim(),
        influencerId: influencerOption ? influencerOption.value : "",
        influencerName: influencerOption ? influencerOption.dataset.name || influencerOption.textContent : "",
        guests: data.get("guests") || 1,
        specialRequest: specialRequestParts.join(" | "),
      });

      if (error || !booking) {
        submitBtn.disabled = false;
        // Postgres unique_violation (23505) from the influencer/date
        // conflict guard — surface a clear, actionable message instead of
        // the raw database error.
        if (error && error.code === "23505") {
          showError("This influencer is already booked for the selected date. Please choose a different date or influencer.");
        } else if (error && /application_status|public_visibility|row-level security/i.test(error.message || "")) {
          showError("This influencer is not currently available for booking. Please choose another.");
        } else {
          showError("Something went wrong submitting your booking. Please try again.");
        }
        return;
      }

      content.hidden = true;
      successEl.hidden = false;
    });
  })();
})();
