/* ==========================================================================
   XPLOROO · Payment page module
   payment.js — Drives payment.html (placeholder — no gateway yet).
   Reads the booking JSON that booking.js stored in sessionStorage and
   re-renders the booking summary. The "Pay Securely" button stays disabled
   until a real gateway is wired in: to integrate Razorpay/Stripe later,
   read the same `xploroo-booking` object (amounts are integer rupees) and
   replace the disabled button's handler with the gateway's checkout call —
   no page redesign needed.
   Vanilla JS, no dependencies. Loaded with `defer`.
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

  el("pay-total").textContent = formatINR(booking.amounts.total);
})();
