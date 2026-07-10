/* ==========================================================================
   XPLOROO · Booking flow module
   booking.js — Drives booking.html in one of three mutually exclusive
   modes, resolved once at the top and never re-checked:

     1. Travel package booking (?package=<slug>) — UNCHANGED. Reads the
        PACKAGES catalog, stores the booking as JSON in sessionStorage
        ("xploroo-booking") on submit, and redirects to payment.html.

     2. Legacy influencer-experience demo (?service=<slug>&influencer=<slug>,
        from the static per-influencer pages like siya.html) — UNCHANGED.
        Purely a display/demo flow against the hardcoded SERVICES/
        INFLUENCERS catalogs below; still hands off to payment.html exactly
        as before. Kept only because those static pages still link here.

     3. Real Influencer Booking (Phase 6) — set when
        sessionStorage["xploroo-influencer-booking"] holds a rich payload
        (written by js/influencer-profile-page.js's Book Now click:
        influencerId/influencerName/influencerAvatar/serviceName/
        servicePrice/serviceDuration). Confirm Booking saves a row straight
        to Supabase (public.influencer_bookings via
        window.XploroInfluencerBookings, see js/influencer-bookings.js) —
        no payment.html hand-off, no sessionStorage "xploroo-booking". This
        is the only mode that ever writes to influencer_bookings.

   Modes 1 and 2 are untouched from before this phase; only mode 3 and the
   (mode-agnostic) null-guard on the summary image are new.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js,
   js/notifications.js and js/influencer-bookings.js (mode 3 dependencies —
   modes 1/2 never call them).
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
    manali:    { name: "Manali Getaway",                 destination: "Manali, HP",        duration: "4 Days / 3 Nights", price: 18999,  image: "https://picsum.photos/seed/manali-hero/600/600" },
    goa:       { name: "Goa Beach Escape",               destination: "Goa, India",        duration: "3 Days / 2 Nights", price: 14999,  image: "https://picsum.photos/seed/goa-hero/600/600" },
    vietnam:   { name: "Vietnam Discovery",              destination: "Vietnam",           duration: "5 Days / 4 Nights", price: 36999,  image: "https://picsum.photos/seed/vietnam-hero/600/600" },
    singapore: { name: "Singapore Explorer",             destination: "Singapore",         duration: "4 Days / 3 Nights", price: 39999,  image: "https://picsum.photos/seed/singapore-hero/600/600" },
    jaipur:    { name: "Jaipur Heritage Trail",          destination: "Jaipur, Rajasthan", duration: "5 Days / 4 Nights", price: 21999,  image: "https://picsum.photos/seed/jaipur-hero/600/600" },
    kasol:     { name: "Kasol & Parvati Valley",         destination: "Kasol, HP",         duration: "4 Days / 3 Nights", price: 16999,  image: "https://picsum.photos/seed/kasol-hero/600/600" },
    phuket:    { name: "Phuket Island Escape",           destination: "Phuket, Thailand",  duration: "4 Days / 3 Nights", price: 31999,  image: "https://picsum.photos/seed/phuket-hero/600/600" },
    iceland:   { name: "Iceland Northern Lights Escape", destination: "Iceland",           duration: "6 Nights / 7 Days", price: 725000, image: "https://picsum.photos/seed/iceland-hero/600/600" },
    japan:     { name: "Japan Cherry Blossom Trail",     destination: "Japan",             duration: "6 Days / 5 Nights", price: 99999,  image: "https://picsum.photos/seed/japan-hero/600/600" },
    italy:     { name: "Italy Classic Escape",           destination: "Italy",             duration: "6 Days / 5 Nights", price: 89999,  image: "https://picsum.photos/seed/italy-hero/600/600" },
  };

  /* ------------------------------------------------------------------ */
  /* Legacy influencer service catalog — demo-only, backs mode 2 (the      */
  /* static per-influencer pages). Not used by mode 3 (real bookings),     */
  /* which carries its own price/duration straight from Supabase.         */
  /* ------------------------------------------------------------------ */
  const SERVICES = {
    "meet-greet":     { name: "Meet & Greet",   price: 9999,  image: "https://picsum.photos/seed/meet-greet-hero/600/600" },
    "podcast-shoot":  { name: "Podcast Shoot",  price: 14999, image: "https://picsum.photos/seed/podcast-shoot-hero/600/600" },
    "blog-shoot":     { name: "Blog Shoot",     price: 11999, image: "https://picsum.photos/seed/blog-shoot-hero/600/600" },
    "personal-event": { name: "Personal Event", price: 24999, image: "https://picsum.photos/seed/personal-event-hero/600/600" },
  };

  /* ------------------------------------------------------------------ */
  /* Legacy influencer directory — slug -> display name, backs mode 2.     */
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
  /* Resolve the booking mode. A real Influencer Booking payload always   */
  /* wins over the legacy demo catalog when both happen to be present     */
  /* (e.g. a stale sessionStorage entry from an earlier visit); an         */
  /* explicit `?package=` on THIS navigation always wins over either.      */
  /* ------------------------------------------------------------------ */
  const params = new URLSearchParams(window.location.search);
  let slugFallback = null;
  let serviceSlugFallback = null;
  let influencerSlugFallback = null;
  let richBookingPayload = null;
  try {
    // Written by package-details.js on Book Now click — survives hosts whose
    // clean-URL redirect strips the `?package=` query string.
    slugFallback = sessionStorage.getItem("xploroo-selected-package");
    // Written by influencer-profile.js / influencer-profile-page.js on Book
    // Now click — same reasoning, for `?service=`/`?influencer=`.
    serviceSlugFallback = sessionStorage.getItem("xploroo-selected-service");
    influencerSlugFallback = sessionStorage.getItem("xploroo-selected-influencer");
    // Real Influencer Booking context — see js/influencer-profile-page.js.
    const raw = sessionStorage.getItem("xploroo-influencer-booking");
    richBookingPayload = raw ? JSON.parse(raw) : null;
  } catch (_) {
    /* sessionStorage unavailable — the query param path still works */
  }

  const hasQueryService = params.has("service");
  const hasQueryPackage = params.has("package");

  const serviceSlug = (
    hasQueryService ? params.get("service") :
    hasQueryPackage ? "" :
    (serviceSlugFallback || "")
  ).toLowerCase();
  const isLegacyServiceBooking = !hasQueryPackage && Object.prototype.hasOwnProperty.call(SERVICES, serviceSlug);

  // Real Influencer Booking wins whenever a valid rich payload exists and
  // the current navigation isn't an explicit `?package=` link.
  const isRealInfluencerBooking = !hasQueryPackage && !!(richBookingPayload && richBookingPayload.influencerId && richBookingPayload.serviceName);
  const isInfluencerBooking = isRealInfluencerBooking || isLegacyServiceBooking;

  const influencerSlug = (params.get("influencer") || (isLegacyServiceBooking ? influencerSlugFallback : "") || "").toLowerCase();
  const influencerName = isRealInfluencerBooking
    ? richBookingPayload.influencerName || "Xploroo Influencer"
    : INFLUENCERS[influencerSlug] || "Xploroo Influencer";

  const slug = (
    hasQueryPackage ? params.get("package") :
    hasQueryService ? "iceland" :
    (slugFallback || "iceland")
  ).toLowerCase();

  const pkg = isRealInfluencerBooking
    ? {
        name: richBookingPayload.serviceName,
        destination: influencerName, // shown under the "Influencer" label
        duration: richBookingPayload.serviceDuration || richBookingPayload.serviceName, // shown under the "Service" label
        price: Number(richBookingPayload.servicePrice) || 0,
        image: richBookingPayload.influencerAvatar || "",
      }
    : isLegacyServiceBooking
    ? {
        name: SERVICES[serviceSlug].name,
        destination: influencerName,
        duration: SERVICES[serviceSlug].name,
        price: SERVICES[serviceSlug].price,
        image: SERVICES[serviceSlug].image,
      }
    : (PACKAGES[slug] || PACKAGES.iceland);

  /* ------------------------------------------------------------------ */
  /* Element lookups                                                     */
  /* ------------------------------------------------------------------ */
  const el = (name) => page.querySelector(`[data-bk="${name}"]`);

  const mediaEl = el("media");
  const imageEl = el("image");
  const nameEls = page.querySelectorAll('[data-bk="name"]');
  const summaryTitleEl = el("summary-title");
  const destinationLabelEl = el("destination-label");
  const durationLabelEl = el("duration-label");
  const priceLabelEl = el("price-label");
  const travelDateLabelEl = el("travel-date-label");
  const destinationEl = el("destination");
  const durationEl = el("duration");
  const priceEl = el("price");
  const bookingTypeRowEl = el("booking-type-row");
  const preferredTimeRowEl = el("preferred-time-row");
  const preferredTimeInput = el("preferred-time");
  const notesRowEl = el("notes-row");
  const notesDisplayEl = el("notes-display");
  const travellersDisplayEl = el("travellers-display");
  const totalDisplayEl = el("total-display");
  const proceedLabelEl = el("proceed-label");
  const influencerSuccessEl = el("influencer-success");
  const bkLayoutEl = page.querySelector(".bk-layout");

  const travelDateInput = el("travel-date");
  const travellersInput = el("travellers");
  const couponInput = el("coupon");
  const couponApplyBtn = el("coupon-apply");
  const couponMessageEl = el("coupon-message");

  const step2SectionEl = el("step2"); // Traveller Details
  const step3SectionEl = el("step3"); // Additional Details

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

  if (isInfluencerBooking) {
    // Simplified influencer-experience view: relabel the summary, show only
    // Influencer / Service / Price / Booking Type, and drop everything trip-
    // related (traveller count, per-item total) — nothing here touches the
    // regular package flow below.
    if (summaryTitleEl) summaryTitleEl.textContent = isRealInfluencerBooking ? "Influencer Booking Summary" : "Booking Summary";
    if (destinationLabelEl) destinationLabelEl.textContent = "Influencer";
    if (durationLabelEl) durationLabelEl.textContent = "Service";
    if (priceLabelEl) priceLabelEl.textContent = "Price";
    if (bookingTypeRowEl) bookingTypeRowEl.hidden = false;

    if (mediaEl) {
      if (pkg.image) {
        if (imageEl) {
          imageEl.src = pkg.image;
          imageEl.alt = pkg.name;
        }
        mediaEl.hidden = !isRealInfluencerBooking; // legacy demo flow keeps the image hidden, as before
      } else {
        mediaEl.hidden = true;
      }
    }

    const travellersDisplayRow = travellersDisplayEl.closest(".bk-summary__item");
    if (travellersDisplayRow) travellersDisplayRow.hidden = true;

    const totalDisplayRow = totalDisplayEl.closest(".bk-summary__item");
    if (totalDisplayRow) totalDisplayRow.hidden = true;

    if (isRealInfluencerBooking) {
      // Real Influencer Booking (Phase 6) — Preferred Date (reuses the
      // Travel Date input, relabeled), Preferred Time and Notes for
      // Influencer all stay visible/editable; everything else trip-related
      // is dropped. Traveller Details is narrowed to Full Name/Email/Phone
      // only; Additional Details is narrowed to Notes only.
      if (travelDateLabelEl) travelDateLabelEl.textContent = "Preferred Date";
      if (preferredTimeRowEl) preferredTimeRowEl.hidden = false;
      if (preferredTimeInput) preferredTimeInput.required = true;
      if (notesRowEl) notesRowEl.hidden = false;
      if (proceedLabelEl) proceedLabelEl.textContent = "Confirm Booking";

      if (step2SectionEl) {
        step2SectionEl.querySelectorAll('[name="dob"], [name="gender"], [name="city"], [name="emergencyName"], [name="emergencyPhone"]').forEach((f) => {
          const wrap = f.closest(".field");
          if (wrap) wrap.hidden = true;
          f.required = false;
        });
      }
      if (step3SectionEl) {
        const travellersRow = travellersInput.closest(".field");
        if (travellersRow) travellersRow.hidden = true;
        travellersInput.required = false;

        const couponRow = couponInput.closest(".field");
        if (couponRow) couponRow.hidden = true;

        const notesField = step3SectionEl.querySelector('[name="specialRequests"]');
        if (notesField) {
          const label = notesField.closest(".field").querySelector(".field__label");
          if (label) label.innerHTML = 'Notes for Influencer <span class="field__hint" style="display:inline">(optional)</span>';
          notesField.addEventListener("input", () => {
            if (notesDisplayEl) notesDisplayEl.textContent = notesField.value.trim() || "—";
          });
        }
      }
    } else {
      // Legacy demo flow (static per-influencer pages) — unchanged: drop
      // Traveller Details and Additional Details entirely.
      const travelDateRow = travelDateInput.closest(".bk-summary__item");
      if (travelDateRow) travelDateRow.hidden = true;
      travelDateInput.required = false;

      if (step2SectionEl) {
        step2SectionEl.hidden = true;
        step2SectionEl.querySelectorAll("input, select, textarea").forEach((f) => (f.required = false));
      }
      if (step3SectionEl) {
        step3SectionEl.hidden = true;
        step3SectionEl.querySelectorAll("input, select, textarea").forEach((f) => (f.required = false));
      }
    }
  } else {
    // Regular package flow — unchanged: package image + full traveller form.
    if (imageEl) {
      imageEl.src = pkg.image;
      imageEl.alt = pkg.name;
    }
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
  /* Proceed — package/legacy flows keep going to payment.html; a real     */
  /* Influencer Booking saves straight to Supabase instead.               */
  /* ------------------------------------------------------------------ */
  function buildBookingState() {
    const data = new FormData(form);
    const t = computeTotals();
    return {
      // Kept as `package` (rather than a differently-shaped `service` key) so
      // payment.js — which reads `booking.package.*` unconditionally — keeps
      // working unchanged for both flows.
      bookingType: isLegacyServiceBooking ? "service" : "package",
      serviceSlug: isLegacyServiceBooking ? serviceSlug : null,
      influencerSlug: isLegacyServiceBooking ? influencerSlug : null,
      influencerName: isLegacyServiceBooking ? influencerName : null,
      package: {
        slug: isLegacyServiceBooking ? serviceSlug : slug,
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

  async function submitRealInfluencerBooking() {
    if (!window.XploroInfluencerBookings || !window.XploroAuth) {
      formErrorEl.textContent = "Something went wrong. Please refresh and try again.";
      return;
    }
    const user = await window.XploroAuth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    proceedBtn.disabled = true;
    const data = new FormData(form);
    const { error } = await window.XploroInfluencerBookings.createBooking({
      influencerId: richBookingPayload.influencerId,
      influencerName: influencerName,
      serviceName: pkg.name,
      servicePrice: pkg.price,
      duration: pkg.duration,
      bookingDate: travelDateInput.value,
      preferredTime: preferredTimeInput ? preferredTimeInput.value : "",
      notes: data.get("specialRequests") || "",
    });
    proceedBtn.disabled = false;

    if (error) {
      formErrorEl.textContent = "Failed to submit your booking. Please try again.";
      return;
    }

    try {
      sessionStorage.removeItem("xploroo-influencer-booking");
    } catch (_) {}

    if (bkLayoutEl) bkLayoutEl.hidden = true;
    if (influencerSuccessEl) influencerSuccessEl.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formErrorEl.textContent = "";

    if (!form.reportValidity()) {
      formErrorEl.textContent = "Please fill in all required details above.";
      return;
    }

    if (isRealInfluencerBooking) {
      await submitRealInfluencerBooking();
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
