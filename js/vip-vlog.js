/* ==========================================================================
   XPLOROO · VIP Vlog Experience
   vip-vlog.js — Drives vip-vlog.html. The only dynamic behavior on this
   page: keep the two "Book" links' `style=` query param in sync with
   whichever Vlog Style radio is currently selected, so vip-booking.html
   receives it without a page reload or a separate step.
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const styleGrid = document.querySelector("[data-vip-style-grid]");
  const bookWithLink = document.querySelector("[data-vip-book-with]");
  const bookWithoutLink = document.querySelector("[data-vip-book-without]");
  if (!styleGrid || !bookWithLink || !bookWithoutLink) return;

  function currentStyle() {
    const checked = styleGrid.querySelector('input[name="vlogStyle"]:checked');
    return checked ? checked.value : "";
  }

  function applyStyleToLinks() {
    const style = currentStyle();
    [bookWithLink, bookWithoutLink].forEach((link) => {
      const url = new URL(link.href, window.location.href);
      url.searchParams.set("style", style);
      link.href = url.pathname + url.search;
    });
  }

  styleGrid.querySelectorAll('input[name="vlogStyle"]').forEach((input) => {
    input.addEventListener("change", applyStyleToLinks);
  });

  applyStyleToLinks(); // set the initial (default-checked) style on load
})();
