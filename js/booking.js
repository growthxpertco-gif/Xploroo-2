/* ==========================================================================
   XPLOROO · Booking flow module
   booking.js — Drives booking.html:
     1. Reads `?package=<slug>` from the URL and populates the summary card
        from the PACKAGES catalog below.
     2. Live-recalculates the payment summary (travellers × price + taxes
        − discount) whenever the traveller count or coupon changes.
     3. Validates the traveller form, then stores the complete booking as
        JSON in sessionStorage and redirects to payment.html.
   The stored booking object (see buildBookingState) is the single payload a
   future Razorpay/Stripe integration needs — amounts are kept in integer
   rupees so a gateway "order create" call can consume them directly.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-bk-page]");
  if (!page) return;

  /* ------------------------------------------------------------------ */
  /* Package catalog — one entry per package page. Add new destinations  */
  /* here when their package pages are created.                          */
  /* ------------------------------------------------------------------ */
  const PACKAGES = {
    dubai:     { name: "Dubai Escape",                   destination: "Dubai, UAE",        duration: "4 Days / 3 Nights", price: 49999,  image: "https://picsum.photos/seed/dubai-hero/600/600" },
    manali:    { name: "Manali Getaway",                 destination: "Manali, HP",        duration: "4 Days / 3 Nights", price: 18999,  image: "https://picsum.photos/seed/manali-hero/600/600" },
    goa:       { name: "Goa Beach Escape",               destination: "Goa, India",        duration: "3 Days / 2 Nights", price: 14999,  image: "https://picsum.photos/seed/goa-hero/600/600" },
    vietnam:   { name: "Vietnam Discovery",              destination: "Vietnam",           duration: "5 Days / 4 Nights", price: 36999,  image: "https://picsum.photos/seed/vietnam-hero/600/600" },
    singapore: { name: "Singapore Explorer",             destination: "Singapore",         duration: "4 Days / 3 Nights", price: 39999,  image: "https://picsum.photos/seed/singapore-hero/600/600" },
    jaipur:    { name: "Jaipur Heritage Trail",          destination: "Jaipur, Rajasthan", duration: "5 Days / 4 Nights", price: 21999,  image: "https://picsum.photos/seed/jaipur-hero/600/600" },
    kasol:     { name: "Kasol & Parvati Valley",         destination: "Kasol, HP",         duration: "4 Days / 3 Nights", price: 16999,  image: "https://picsum.photos/seed/kasol-hero/600/600" },
    phuket:    { name: "Phuket Island Escape",           destination: "Phuket, Thailand",  duration: "4 Days / 3 Nights", price: 31999,  image: "https://picsum.photos/seed/phuket-hero/600/600" },
    iceland:   { name: "Iceland Northern Lights Escape", destination: "Iceland",           duration: "6 Days / 5 Nights", price: 109999, image: "https://picsum.photos/seed/iceland-hero/600/600" },
    japan:     { name: "Japan Cherry Blossom Trail",     destination: "Japan",             duration: "6 Days / 5 Nights", price: 99999,  image: "https://picsum.photos/seed/japan-hero/600/600" },
    italy:     { name: "Italy Classic Escape",           destination: "Italy",             duration: "6 Days / 5 Nights", price: 89999,  image: "https://picsum.photos/seed/italy-hero/600/600" },
  };

  /* Demo coupons — swap for a server-side check when a backend exists. */
  const COUPONS = {
    XPLOROO10: { type: "percent", value: 10, label: "10% off" },
    FIRSTTRIP: { type: "flat",    value: 2000, label: "₹2,000 off" },
  };

  const TAX_RATE = 0.05; // 5% GST

  /* ------------------------------------------------------------------ */
  /* Resolve the selected package (falls back to Dubai so the page never  */
  /* renders empty during direct visits).                                 */
  /* ------------------------------------------------------------------ */
  const params = new URLSearchParams(window.location.search);
  let slugFallback = null;
  try {
    // Written by package-details.js on Book Now click — survives hosts whose
    // clean-URL redirect strips the `?package=` query string.
    slugFallback = sessionStorage.getItem("xploroo-selected-package");
  } catch (_) {
    /* sessionStorage unavailable — the query param path still works */
  }
  const slug = (params.get("package") || slugFallback || "dubai").toLowerCase();
  const pkg = PACKAGES[slug] || PACKAGES.dubai;

  /* ------------------------------------------------------------------ */
  /* Element lookups                                                     */
  /* ------------------------------------------------------------------ */
  const el = (name) => page.querySelector(`[data-bk="${name}"]`);

  const imageEl = el("image");
  const nameEls = page.querySelectorAll('[data-bk="name"]');
  const destinationEl = el("destination");
  const durationEl = el("duration");
  const priceEl = el("price");
  const travellersDisplayEl = el("travellers-display");
  const totalDisplayEl = el("total-display");

  const travelDateInput = el("travel-date");
  const travellersInput = el("travellers");
  const couponInput = el("coupon");
  const couponApplyBtn = el("coupon-apply");
  const couponMessageEl = el("coupon-message");

  const payCostEl = el("pay-cost");
  const payTaxEl = el("pay-tax");
  const payDiscountRow = el("pay-discount-row");
  const payDiscountEl = el("pay-discount");
  const payTotalEl = el("pay-total");

  const form = el("form");
  const proceedBtn = el("proceed");
  const formErrorEl = el("form-error");

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const formatINR = (amount) => "₹" + Math.round(amount).toLocaleString("en-IN");

  function getTravellers() {
    const n = parseInt(travellersInput.value, 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 20) : 1;
  }

  let activeCoupon = null; // { code, type, value }

  function computeTotals() {
    const travellers = getTravellers();
    const cost = pkg.price * travellers;
    let discount = 0;
    if (activeCoupon) {
      discount = activeCoupon.type === "percent"
        ? Math.round(cost * (activeCoupon.value / 100))
        : Math.min(activeCoupon.value, cost);
    }
    const tax = Math.round((cost - discount) * TAX_RATE);
    return { travellers, cost, discount, tax, total: cost - discount + tax };
  }

  /* ------------------------------------------------------------------ */
  /* Populate the static summary card                                    */
  /* ------------------------------------------------------------------ */
  imageEl.src = pkg.image;
  imageEl.alt = pkg.name;
  nameEls.forEach((n) => (n.textContent = pkg.name));
  destinationEl.textContent = pkg.destination;
  durationEl.textContent = pkg.duration;
  priceEl.textContent = formatINR(pkg.price);

  // Default travel date: two weeks from today (user can change it).
  const defaultDate = new Date(Date.now() + 14 * 86_400_000);
  travelDateInput.value = defaultDate.toISOString().slice(0, 10);
  travelDateInput.min = new Date().toISOString().slice(0, 10);

  /* ------------------------------------------------------------------ */
  /* Live totals                                                         */
  /* ------------------------------------------------------------------ */
  function render() {
    const t = computeTotals();
    travellersDisplayEl.textContent = String(t.travellers);
    totalDisplayEl.textContent = formatINR(t.total);
    payCostEl.textContent = formatINR(t.cost);
    payTaxEl.textContent = formatINR(t.tax);
    payDiscountRow.hidden = t.discount <= 0;
    payDiscountEl.textContent = "−" + formatINR(t.discount);
    payTotalEl.textContent = formatINR(t.total);
  }

  travellersInput.addEventListener("input", render);
  travellersInput.addEventListener("change", () => {
    travellersInput.value = String(getTravellers()); // clamp 1-20
    render();
  });

  /* ------------------------------------------------------------------ */
  /* Coupon                                                              */
  /* ------------------------------------------------------------------ */
  couponApplyBtn.addEventListener("click", () => {
    const code = couponInput.value.trim().toUpperCase();
    couponMessageEl.classList.remove("is-success", "is-error");

    if (!code) {
      activeCoupon = null;
      couponMessageEl.textContent = "";
      render();
      return;
    }
    const def = COUPONS[code];
    if (def) {
      activeCoupon = { code, type: def.type, value: def.value };
      couponMessageEl.textContent = `Coupon applied — ${def.label}.`;
      couponMessageEl.classList.add("is-success");
    } else {
      activeCoupon = null;
      couponMessageEl.textContent = "Invalid coupon code.";
      couponMessageEl.classList.add("is-error");
    }
    render();
  });

  /* ------------------------------------------------------------------ */
  /* Proceed to payment                                                  */
  /* ------------------------------------------------------------------ */
  function buildBookingState() {
    const data = new FormData(form);
    const t = computeTotals();
    return {
      package: {
        slug,
        name: pkg.name,
        destination: pkg.destination,
        duration: pkg.duration,
        pricePerPerson: pkg.price,
        image: pkg.image,
      },
      travelDate: travelDateInput.value,
      travellers: t.travellers,
      traveller: {
        fullName: data.get("fullName"),
        email: data.get("email"),
        phone: data.get("phone"),
        dob: data.get("dob"),
        gender: data.get("gender"),
        city: data.get("city"),
        emergencyName: data.get("emergencyName"),
        emergencyPhone: data.get("emergencyPhone"),
      },
      specialRequests: data.get("specialRequests") || "",
      coupon: activeCoupon ? activeCoupon.code : null,
      amounts: {
        cost: t.cost,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        currency: "INR",
      },
    };
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    formErrorEl.textContent = "";

    if (!form.reportValidity()) {
      formErrorEl.textContent = "Please fill in all required traveller details above.";
      return;
    }

    try {
      sessionStorage.setItem("xploroo-booking", JSON.stringify(buildBookingState()));
    } catch (_) {
      /* sessionStorage unavailable — payment.html falls back gracefully */
    }
    window.location.href = "payment.html";
  });

  // Delegate the aside CTA to the form so native validation still runs.
  if (proceedBtn && proceedBtn.form !== form) {
    proceedBtn.addEventListener("click", () => form.requestSubmit());
  }

  render();
})();
