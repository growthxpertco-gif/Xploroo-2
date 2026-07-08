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

  /* ------------------------------------------------------------------ */
  /* Influencer service catalog — one entry per bookable experience type. */
  /* Add new services here when future influencer pages need them; every  */
  /* influencer page reuses this same booking.html + catalog.            */
  /* ------------------------------------------------------------------ */
  const SERVICES = {
    "meet-greet":     { name: "Meet & Greet",   price: 9999,  image: "https://picsum.photos/seed/meet-greet-hero/600/600" },
    "podcast-shoot":  { name: "Podcast Shoot",  price: 14999, image: "https://picsum.photos/seed/podcast-shoot-hero/600/600" },
    "blog-shoot":     { name: "Blog Shoot",     price: 11999, image: "https://picsum.photos/seed/blog-shoot-hero/600/600" },
    "personal-event": { name: "Personal Event", price: 24999, image: "https://picsum.photos/seed/personal-event-hero/600/600" },
  };

  /* ------------------------------------------------------------------ */
  /* Influencer directory — slug -> display name, one entry per influencer */
  /* page. Add a new entry whenever a new influencer page is created; the  */
  /* slug must match that page's `?influencer=` value.                    */
  /* ------------------------------------------------------------------ */
  const INFLUENCERS = {
    vanshika:  "Vanshika Dharu",
    tanya:     "Tanya Munakhiya",
    palak:     "Palak Thakur",
    payal:     "Payal Agarwal",
    neelima:   "Neelima",
    rimli:     "Rimli Talukdar",
    gataansha: "Gataansha Raghuwanshi",
    ishmeet:   "Ishmeet Singh",
    varshita:  "Varshita Gupta",
    diwakar:   "Diwakar Pratap",
    vishal:    "Vishal Singh",
    anurag:    "Anurag Sharma",
    piyush:    "Piyush Munakhya",
    bhavesh:   "Bhavesh Rathod",
    siya:      "Siya",
    sabhya:    "Sabhya Khera",
    shruti:    "Shruti Rane",
    triplets:  "The Triplets",
  };

  /* Demo coupons — swap for a server-side check when a backend exists. */
  const COUPONS = {
    XPLOROO10: { type: "percent", value: 10, label: "10% off" },
    FIRSTTRIP: { type: "flat",    value: 2000, label: "₹2,000 off" },
  };

  const TAX_RATE = 0.05; // 5% GST

  /* ------------------------------------------------------------------ */
  /* Resolve the selected package OR influencer service. An influencer    */
  /* service link (`?service=<slug>`) always wins when present — this is  */
  /* the only branch point between the two flows; everything downstream   */
  /* (totals, coupon, payment hand-off) is shared code.                   */
  /* ------------------------------------------------------------------ */
  const params = new URLSearchParams(window.location.search);
  let slugFallback = null;
  let serviceSlugFallback = null;
  let influencerSlugFallback = null;
  try {
    // Written by package-details.js on Book Now click — survives hosts whose
    // clean-URL redirect strips the `?package=` query string.
    slugFallback = sessionStorage.getItem("xploroo-selected-package");
    // Written by influencer-profile.js on Book Now click — same reasoning,
    // for the `?service=` / `?influencer=` query strings used by influencer
    // experience pages.
    serviceSlugFallback = sessionStorage.getItem("xploroo-selected-service");
    influencerSlugFallback = sessionStorage.getItem("xploroo-selected-influencer");
  } catch (_) {
    /* sessionStorage unavailable — the query param path still works */
  }

  // An explicit query string on THIS navigation always wins over a
  // sessionStorage fallback from an earlier, unrelated visit — this stops a
  // stale `xploroo-selected-service`/`xploroo-selected-package` (e.g. left
  // over from booking an influencer service earlier in the same tab) from
  // hijacking a fresh booking of the other type. The fallback is only ever
  // consulted when the current URL is silent on both.
  const hasQueryService = params.has("service");
  const hasQueryPackage = params.has("package");

  const serviceSlug = (
    hasQueryService ? params.get("service") :
    hasQueryPackage ? "" :
    (serviceSlugFallback || "")
  ).toLowerCase();
  const isServiceBooking = Object.prototype.hasOwnProperty.call(SERVICES, serviceSlug);

  const influencerSlug = (params.get("influencer") || (isServiceBooking ? influencerSlugFallback : "") || "").toLowerCase();
  const influencerName = INFLUENCERS[influencerSlug] || "Xploroo Influencer";

  const slug = (
    hasQueryPackage ? params.get("package") :
    hasQueryService ? "dubai" :
    (slugFallback || "dubai")
  ).toLowerCase();
  const pkg = isServiceBooking
    ? {
        name: SERVICES[serviceSlug].name,
        destination: influencerName, // shown under the "Influencer" label
        duration: SERVICES[serviceSlug].name, // shown under the "Service" label
        price: SERVICES[serviceSlug].price,
        image: SERVICES[serviceSlug].image,
      }
    : (PACKAGES[slug] || PACKAGES.dubai);

  /* ------------------------------------------------------------------ */
  /* Element lookups                                                     */
  /* ------------------------------------------------------------------ */
  const el = (name) => page.querySelector(`[data-bk="${name}"]`);

  const imageEl = el("image");
  const nameEls = page.querySelectorAll('[data-bk="name"]');
  const summaryTitleEl = el("summary-title");
  const destinationLabelEl = el("destination-label");
  const durationLabelEl = el("duration-label");
  const priceLabelEl = el("price-label");
  const destinationEl = el("destination");
  const durationEl = el("duration");
  const priceEl = el("price");
  const bookingTypeRowEl = el("booking-type-row");
  const travellersDisplayEl = el("travellers-display");
  const totalDisplayEl = el("total-display");

  const travelDateInput = el("travel-date");
  const travellersInput = el("travellers");
  const couponInput = el("coupon");
  const couponApplyBtn = el("coupon-apply");
  const couponMessageEl = el("coupon-message");

  const step2SectionEl = el("step2"); // Traveller Details — hidden for influencer service bookings
  const step3SectionEl = el("step3"); // Additional Details — hidden for influencer service bookings

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
  nameEls.forEach((n) => (n.textContent = pkg.name));
  destinationEl.textContent = pkg.destination;
  durationEl.textContent = pkg.duration;
  priceEl.textContent = formatINR(pkg.price);

  if (isServiceBooking) {
    // Simplified influencer-experience view: relabel the summary, show only
    // Influencer / Service / Price / Booking Type, and drop everything trip-
    // related (image, travel date, traveller count, per-item total) plus the
    // Traveller Details and Additional Details steps entirely — nothing here
    // touches the regular package flow below.
    if (summaryTitleEl) summaryTitleEl.textContent = "Booking Summary";
    if (destinationLabelEl) destinationLabelEl.textContent = "Influencer";
    if (durationLabelEl) durationLabelEl.textContent = "Service";
    if (priceLabelEl) priceLabelEl.textContent = "Price";
    if (bookingTypeRowEl) bookingTypeRowEl.hidden = false;

    const mediaEl = page.querySelector(".bk-summary__media");
    if (mediaEl) mediaEl.hidden = true;

    const travelDateRow = travelDateInput.closest(".bk-summary__item");
    if (travelDateRow) travelDateRow.hidden = true;
    travelDateInput.required = false;

    const travellersDisplayRow = travellersDisplayEl.closest(".bk-summary__item");
    if (travellersDisplayRow) travellersDisplayRow.hidden = true;

    const totalDisplayRow = totalDisplayEl.closest(".bk-summary__item");
    if (totalDisplayRow) totalDisplayRow.hidden = true;

    if (step2SectionEl) {
      step2SectionEl.hidden = true;
      step2SectionEl.querySelectorAll("input, select, textarea").forEach((f) => (f.required = false));
    }
    if (step3SectionEl) {
      step3SectionEl.hidden = true;
      step3SectionEl.querySelectorAll("input, select, textarea").forEach((f) => (f.required = false));
    }
  } else {
    // Regular package flow — unchanged: package image + full traveller form.
    imageEl.src = pkg.image;
    imageEl.alt = pkg.name;
  }

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
      // Kept as `package` (rather than a differently-shaped `service` key) so
      // payment.js — which reads `booking.package.*` unconditionally — keeps
      // working unchanged for both flows. `bookingType`/`serviceSlug` let
      // future code branch on an influencer-service booking without a schema
      // change.
      bookingType: isServiceBooking ? "service" : "package",
      serviceSlug: isServiceBooking ? serviceSlug : null,
      influencerSlug: isServiceBooking ? influencerSlug : null,
      influencerName: isServiceBooking ? influencerName : null,
      package: {
        slug: isServiceBooking ? serviceSlug : slug,
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
