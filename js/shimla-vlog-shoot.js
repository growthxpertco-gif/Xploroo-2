/* ==========================================================================
   XPLOROO · Shimla Vlog Shoot Package — pricing calculator
   shimla-vlog-shoot.js — Drives the With/Without Influencers option
   selector, the number-of-persons stepper, and the live price summary on
   shimlavlogshoot.html. Entirely self-contained (own state, own DOM hooks,
   `data-svs-*`), never touches js/booking.js, the normal package catalog,
   or any other page's booking flow — this package's total depends on an
   option + a per-person count that the existing single-price booking
   flow has no concept of, so "Book This Vlog Shoot" hands off via a
   dedicated WhatsApp inquiry instead of the normal payment.html flow.
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-svs-calculator]");
  if (!root) return;

  const PER_PERSON_STEP = 10000; // every additional person after the first
  const MIN_PERSONS = 1;
  const MAX_PERSONS = 12;
  const WHATSAPP_NUMBER = "918988204344"; // same number used site-wide

  const optionInputs = Array.from(
    root.querySelectorAll("[data-svs-option]")
  );
  const personsValueEl = root.querySelector("[data-svs-persons-value]");
  const decBtn = root.querySelector("[data-svs-persons-dec]");
  const incBtn = root.querySelector("[data-svs-persons-inc]");
  const summaryPackage = root.querySelector("[data-svs-summary-package]");
  const summaryBase = root.querySelector("[data-svs-summary-base]");
  const summaryExtra = root.querySelector("[data-svs-summary-extra]");
  const summaryExtraRow = root.querySelector("[data-svs-summary-extra-row]");
  const summaryTotal = root.querySelector("[data-svs-summary-total]");
  const bookBtn = root.querySelector("[data-svs-book]");

  let persons = MIN_PERSONS;

  function formatINR(amount) {
    return "₹" + amount.toLocaleString("en-IN");
  }

  function selectedOption() {
    const checked = optionInputs.find((el) => el.checked);
    return checked
      ? { name: checked.dataset.svsName, price: parseInt(checked.dataset.svsOption, 10) }
      : null;
  }

  function render() {
    const option = selectedOption();
    if (!option) return;

    const extraPersons = persons - 1;
    const extraCost = extraPersons * PER_PERSON_STEP;
    const total = option.price + extraCost;

    personsValueEl.textContent = persons;
    decBtn.disabled = persons <= MIN_PERSONS;
    incBtn.disabled = persons >= MAX_PERSONS;

    summaryPackage.textContent = option.name;
    summaryBase.textContent = formatINR(option.price);
    summaryTotal.textContent = formatINR(total);

    if (extraPersons > 0) {
      summaryExtraRow.hidden = false;
      summaryExtra.textContent =
        extraPersons + " × " + formatINR(PER_PERSON_STEP);
    } else {
      summaryExtraRow.hidden = true;
    }

    bookBtn.dataset.svsTotal = total;
    bookBtn.dataset.svsPackage = option.name;
    bookBtn.dataset.svsPersons = persons;
  }

  optionInputs.forEach((el) => el.addEventListener("change", render));

  decBtn.addEventListener("click", () => {
    if (persons > MIN_PERSONS) {
      persons -= 1;
      render();
    }
  });
  incBtn.addEventListener("click", () => {
    if (persons < MAX_PERSONS) {
      persons += 1;
      render();
    }
  });

  bookBtn.addEventListener("click", () => {
    const message =
      "Hi Xploroo! I'd like to book the Shimla Vlog Shoot Package (2N/3D).\n" +
      "Option: " + bookBtn.dataset.svsPackage + "\n" +
      "Travellers: " + bookBtn.dataset.svsPersons + "\n" +
      "Total: " + formatINR(parseInt(bookBtn.dataset.svsTotal, 10));
    const url =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener");
  });

  // "Book Now" hero CTA + sticky bar CTA scroll to the calculator instead
  // of pre-selecting an option, matching the multi-option pattern used
  // elsewhere on this site.
  document.querySelectorAll("[data-svs-scroll-to-pricing]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  render();

  /* ------------------------------------------------------------------ */
  /* Sticky mobile bar — mirrors the live total so it's visible even     */
  /* after the user scrolls past the calculator.                         */
  /* ------------------------------------------------------------------ */
  const stickyTotal = document.querySelector("[data-svs-sticky-total]");
  if (stickyTotal) {
    const observer = new MutationObserver(() => {
      stickyTotal.textContent = summaryTotal.textContent;
    });
    observer.observe(summaryTotal, { childList: true, characterData: true, subtree: true });
    stickyTotal.textContent = summaryTotal.textContent;
  }
})();
