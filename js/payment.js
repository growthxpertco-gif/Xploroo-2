/* ==========================================================================
   XPLOROO · Payment page module
   payment.js — Drives payment.html. Reads the booking JSON that booking.js
   stored in sessionStorage and renders the booking summary. No real
   gateway is wired up yet, so the "Pay Securely" click IS the confirmation
   event: it saves the booking to Supabase (public.travel_bookings, via
   window.XploroTravelBookings — see js/travel-bookings.js) under the
   signed-in traveler, then swaps in the success panel. To integrate
   Razorpay/Stripe later, keep reading the same `xploroo-booking` object
   (amounts are integer rupees) and call createBooking() from the gateway's
   own success callback instead of the click handler — no page redesign
   needed, matches the file's original extension-point design.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/travel-bookings.js.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-bk-payment-page]");
  if (!page) return;

  const el = (name) => page.querySelector(`[data-bk="${name}"]`);
  const formatINR = (amount) => "₹" + Math.round(amount).toLocaleString("en-IN");

  let booking = null;
  try {
    booking = JSON.parse(sessionStorage.getItem("xploroo-booking"));
  } catch (_) {
    booking = null;
  }

  // Visiting payment.html directly (no booking in progress) → back to start.
  if (!booking || !booking.package || !booking.amounts) {
    const summaryCard = el("summary-card");
    if (summaryCard) summaryCard.hidden = true;
    const emptyEl = el("empty");
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  el("name").textContent = booking.package.name;
  el("meta").textContent =
    `${booking.package.destination} · ${booking.package.duration} · ` +
    `${booking.travellers} Traveller${booking.travellers > 1 ? "s" : ""}` +
    (booking.travelDate ? ` · ${booking.travelDate}` : "");

  el("pay-cost").textContent = formatINR(booking.amounts.cost);
  el("pay-tax").textContent = formatINR(booking.amounts.tax);

  const discountRow = el("pay-discount-row");
  discountRow.hidden = booking.amounts.discount <= 0;
  el("pay-discount").textContent = "−" + formatINR(booking.amounts.discount);

  // Referral discount — separate line item from the coupon discount above,
  // mirroring the same row already shown on booking.html.
  const referralDiscountRow = el("pay-referral-discount-row");
  const referralDiscountAmount = (booking.amounts && booking.amounts.referralDiscount) || 0;
  if (referralDiscountRow) {
    referralDiscountRow.hidden = referralDiscountAmount <= 0;
    el("pay-referral-discount").textContent = "−" + formatINR(referralDiscountAmount);
  }

  el("pay-total").textContent = formatINR(booking.amounts.total);

  /* ------------------------------------------------------------------ */
  /* Confirm — the guaranteed write path. A travel booking can never end   */
  /* up "paid" without this creating the public.travel_bookings row       */
  /* first: the success panel only ever appears after the insert succeeds.*/
  /* ------------------------------------------------------------------ */
  const payBtn = el("pay-btn");
  const payError = el("pay-error");

  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      if (!window.XploroAuth || !window.XploroTravelBookings) return;
      payError.textContent = "";
      payBtn.disabled = true;

      const user = await window.XploroAuth.getUser();
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      const { data, error } = await window.XploroTravelBookings.createBooking({
        packageSlug: booking.package.slug,
        packageName: booking.package.name,
        packageImage: booking.package.image,
        destination: booking.package.destination,
        duration: booking.package.duration,
        travelDate: booking.travelDate,
        travellers: booking.travellers,
        totalAmount: booking.amounts.total,
        currency: booking.amounts.currency,
        travelerFullName: booking.traveller && booking.traveller.fullName,
        travelerEmail: booking.traveller && booking.traveller.email,
        travelerPhone: booking.traveller && booking.traveller.phone,
        specialRequests: booking.specialRequests,
        couponCode: booking.coupon,
        cost: booking.amounts.cost,
        referral: booking.referral || null,
        referralDiscountAmount: referralDiscountAmount,
      });

      if (error || !data) {
        payError.textContent = "Something went wrong confirming your booking. Please try again.";
        payBtn.disabled = false;
        return;
      }

      try {
        sessionStorage.removeItem("xploroo-booking");
      } catch (_) {
        /* sessionStorage unavailable — harmless, booking is already saved */
      }

      const summaryCard = el("summary-card");
      if (summaryCard) summaryCard.hidden = true;
      const successEl = el("success");
      if (successEl) {
        successEl.hidden = false;
        const idEl = el("success-id");
        if (idEl) idEl.textContent = String(data.booking_id).slice(0, 8).toUpperCase();
      }
    });
  }
})();
