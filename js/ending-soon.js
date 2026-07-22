/* ==========================================================================
   XPLOROO · Ending Soon module
   ending-soon.js — Builds the Ending Soon cards at load time from the real
   `data-trip-date` attributes already declared on the Trending Packages
   cards (see the `.tp-track[data-tp-track]` cards in index.html) — that is
   the ONLY source of package data for this section, so Trending Packages
   and Ending Soon can never disagree about a destination's image, price,
   link or date. A card qualifies only if its trip date is still in the
   future; qualifying cards are sorted nearest-departure-first and the
   closest 6 are rendered. Nothing here invents a date, a seat count, a
   "people viewing" figure or a discount — the urgency badge text is pure
   calendar-day arithmetic against each card's real date.

   Drag-to-scroll + arrow navigation (mirrors the Trending Packages
   carousel behavior 1:1 for a consistent feel) and the wishlist toggle are
   unchanged from before. Vanilla JS, no dependencies. Scoped entirely to
   [data-es-carousel], so it never touches the Trending Packages carousel
   (which uses the separate [data-tp-carousel] attribute) — trending-
   packages.js is not shared or modified.
   ========================================================================== */
(function () {
  "use strict";

  const carousel = document.querySelector("[data-es-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-es-track]");
  const prevBtn = carousel.querySelector("[data-es-prev]");
  const nextBtn = carousel.querySelector("[data-es-next]");
  if (!track) return;

  const MAX_CARDS = 6;

  /* ------------------------------------------------------------------ */
  /* 0. Build cards from Trending Packages' real trip dates.              */
  /* ------------------------------------------------------------------ */

  // Parse "yyyy-mm-dd" as LOCAL midnight, not UTC — a plain `new
  // Date(iso)` treats a date-only ISO string as UTC midnight, which can
  // silently roll to the wrong calendar day depending on the visitor's
  // timezone offset.
  function parseTripDate(iso) {
    const parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function daysUntil(target, today) {
    const MS_PER_DAY = 86_400_000;
    return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
  }

  // Suggested tiers, driven purely by real days-until-departure:
  //   >30 days   → "BOOKINGS OPEN"
  //   15–30 days → "LIMITED TIME TO BOOK"
  //   8–14 days  → "ONLY X DAYS LEFT"
  //   2–7 days   → "DEPARTING IN X DAYS"
  //   1 day      → "DEPARTING TOMORROW"
  //   0 (today)  → "DEPARTING TODAY"
  //   past       → not shown (return null)
  function urgencyFor(days) {
    if (days > 30) return { tier: "open", label: "BOOKINGS OPEN" };
    if (days >= 15) return { tier: "limited", label: "LIMITED TIME TO BOOK" };
    if (days >= 8) return { tier: "soon", label: "ONLY " + days + " DAYS LEFT" };
    if (days >= 2) return { tier: "urgent", label: "DEPARTING IN " + days + " DAYS" };
    if (days === 1) return { tier: "urgent", label: "DEPARTING TOMORROW" };
    if (days === 0) return { tier: "urgent", label: "DEPARTING TODAY" };
    return null;
  }

  function selectCandidates() {
    const source = Array.from(
      document.querySelectorAll("[data-tp-track] [data-tp-card][data-trip-date]")
    );
    const today = startOfToday();

    return source
      .map((card) => {
        const iso = card.dataset.tripDate;
        const date = parseTripDate(iso);
        const days = daysUntil(date, today);
        const urgency = urgencyFor(days);
        if (!urgency) return null; // expired trip — never shown here
        return {
          sourceCard: card,
          date: date,
          urgency: urgency,
          dateLabel: card.dataset.tripDateLabel || iso,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date)
      .slice(0, MAX_CARDS);
  }

  function buildSlide(entry) {
    const sourceCard = entry.sourceCard;
    const href = sourceCard.dataset.tpHref;
    const imgSrc = sourceCard.querySelector(".tp-card__img")?.src || "";
    const mediaEl = sourceCard.querySelector(".tp-card__media");
    const destination = (sourceCard.querySelector(".tp-card__destination")?.textContent || "").trim();
    const durationEls = Array.from(sourceCard.querySelectorAll(".tp-card__duration"));
    const metaText = durationEls.length
      ? durationEls[durationEls.length - 1].textContent.trim()
      : "";
    const priceAmount = (sourceCard.querySelector(".tp-card__price-amount")?.textContent || "").trim();
    const priceUnit = (sourceCard.querySelector(".tp-card__price-unit")?.textContent || "").trim();

    // Preserve whichever destination-gradient modifier class the source
    // card's media element carries (e.g. `tp-card__media--kyoto`), so the
    // fallback gradient behind the image matches Trending Packages.
    const mediaModifier = mediaEl
      ? Array.from(mediaEl.classList).find((c) => c.indexOf("tp-card__media--") === 0)
      : null;

    const li = document.createElement("li");
    li.className = "tp-slide";

    const article = document.createElement("article");
    article.className = "tp-card";
    article.setAttribute("data-tp-card", "");
    article.setAttribute("data-tp-href", href);
    article.setAttribute("aria-label", "View " + destination + " package details");

    const mediaDiv = document.createElement("div");
    mediaDiv.className = "tp-card__media" + (mediaModifier ? " " + mediaModifier : "");

    const imgEl = document.createElement("img");
    imgEl.className = "tp-card__img";
    imgEl.src = imgSrc;
    imgEl.alt = destination;
    mediaDiv.appendChild(imgEl);

    const wishlistBtn = document.createElement("button");
    wishlistBtn.type = "button";
    wishlistBtn.className = "tp-card__wishlist";
    wishlistBtn.setAttribute("aria-label", "Save " + destination + " package");
    wishlistBtn.setAttribute("aria-pressed", "false");
    wishlistBtn.setAttribute("data-tp-wishlist", "");
    wishlistBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7-4.35-9.5-8.8C.7 8.2 2.4 4.5 5.9 4.5c2 0 3.4 1.1 4.1 2.2C10.7 5.6 12.1 4.5 14.1 4.5c3.5 0 5.2 3.7 3.4 7.2C19 16.15 12 20.5 12 20.5Z"/></svg>';
    mediaDiv.appendChild(wishlistBtn);

    const body = document.createElement("div");
    body.className = "tp-card__body";

    // Visual hierarchy, top to bottom: destination → real trip date →
    // urgency → price/info → Book Now.
    const meta = document.createElement("p");
    meta.className = "tp-card__meta";
    const metaSpan = document.createElement("span");
    metaSpan.textContent = metaText ? destination + " · " + metaText : destination;
    meta.innerHTML =
      '<svg class="tp-card__pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
    meta.appendChild(metaSpan);

    const dateRow = document.createElement("p");
    dateRow.className = "tp-card__date";
    dateRow.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    const dateSpan = document.createElement("span");
    dateSpan.textContent = "Departs " + entry.dateLabel;
    dateRow.appendChild(dateSpan);

    const badge = document.createElement("span");
    badge.className = "tp-card__badge tp-card__badge--tier-" + entry.urgency.tier;
    badge.textContent = entry.urgency.label;

    const footer = document.createElement("div");
    footer.className = "tp-card__footer";
    const priceSpan = document.createElement("span");
    priceSpan.className = "tp-card__price";
    const priceAmountSpan = document.createElement("span");
    priceAmountSpan.className = "tp-card__price-amount";
    priceAmountSpan.textContent = priceAmount;
    const priceUnitSpan = document.createElement("span");
    priceUnitSpan.className = "tp-card__price-unit";
    priceUnitSpan.textContent = priceUnit;
    priceSpan.appendChild(priceAmountSpan);
    priceSpan.appendChild(priceUnitSpan);
    const cta = document.createElement("a");
    cta.className = "tp-card__cta";
    cta.href = href;
    cta.textContent = "Book Now";
    footer.appendChild(priceSpan);
    footer.appendChild(cta);

    body.appendChild(meta);
    body.appendChild(dateRow);
    body.appendChild(badge);
    body.appendChild(footer);

    article.appendChild(mediaDiv);
    article.appendChild(body);
    li.appendChild(article);
    return li;
  }

  const candidates = selectCandidates();
  candidates.forEach((entry) => track.appendChild(buildSlide(entry)));
  if (!candidates.length) return; // nothing qualified — section stays empty

  /* ------------------------------------------------------------------ */
  /* 1. Mouse drag-to-scroll (touch keeps native swipe/snap scrolling)    */
  /* ------------------------------------------------------------------ */
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;

  function onPointerDown(e) {
    if (e.pointerType === "touch") return;
    isDragging = true;
    dragMoved = false;
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 4) {
      // Only take pointer capture once an actual drag is confirmed — doing
      // this unconditionally on pointerdown (the previous behavior) made
      // the browser retarget every subsequent click at `track` itself
      // instead of whatever card/link was under the cursor, silently
      // breaking desktop card navigation even for a plain, non-dragging
      // click. Touch is unaffected either way (see the early return above).
      if (!dragMoved) track.setPointerCapture(e.pointerId);
      dragMoved = true;
    }
    track.scrollLeft = startScrollLeft - delta;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
  }

  function onTrackClickCapture(e) {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved = false;
    }
  }

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointerleave", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("click", onTrackClickCapture, true);

  /* ------------------------------------------------------------------ */
  /* 2. Arrow navigation                                                 */
  /* ------------------------------------------------------------------ */
  function getStep() {
    const slide = track.querySelector(".tp-slide");
    if (!slide) return track.clientWidth * 0.9;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    return slide.getBoundingClientRect().width + gap;
  }

  function updateArrowState() {
    const maxScroll = track.scrollWidth - track.clientWidth - 1;
    if (prevBtn) prevBtn.disabled = track.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getStep(), behavior: "smooth" });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: getStep(), behavior: "smooth" });
    });
  }

  let scrollTicking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          updateArrowState();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateArrowState);
  updateArrowState();

  /* ------------------------------------------------------------------ */
  /* 3. Wishlist (heart) toggle                                          */
  /* ------------------------------------------------------------------ */
  carousel.querySelectorAll("[data-tp-wishlist]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isSaved = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", isSaved ? "false" : "true");

      button.classList.remove("tp-pulse");
      void button.offsetWidth;
      button.classList.add("tp-pulse");
    });
  });

  /* ------------------------------------------------------------------ */
  /* 4. Card navigation — opt-in via `data-tp-href` (mirrors the exact    */
  /*    same pattern already working in trending-packages.js). Clicking  */
  /*    anywhere on the card navigates to its package page; clicks on     */
  /*    the wishlist button or the "Book Now" link are excluded so they    */
  /*    aren't double-handled (the link already navigates natively, and   */
  /*    the wishlist button must never trigger navigation).               */
  /* ------------------------------------------------------------------ */
  carousel.querySelectorAll("[data-tp-href]").forEach((card) => {
    const destination = card.dataset.tpHref;
    const wishlistBtn = card.querySelector("[data-tp-wishlist]");
    const ctaLink = card.querySelector(".tp-card__cta");

    function isExcluded(target) {
      return (wishlistBtn && wishlistBtn.contains(target)) || (ctaLink && ctaLink.contains(target));
    }

    function goToDestination() {
      window.location.href = destination;
    }

    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", (e) => {
      if (isExcluded(e.target)) return;
      goToDestination();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (isExcluded(e.target)) return;
      e.preventDefault();
      goToDestination();
    });
  });
})();
