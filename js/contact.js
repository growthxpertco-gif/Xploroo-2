/* ==========================================================================
   XPLOROO · Contact page
   contact.js — Client-side only acknowledgment for the contact form (no
   backend wired up yet, per spec). Vanilla JS, no dependencies, scoped to
   [data-contact-form].
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const message = form.querySelector("[data-contact-message]");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (message) {
      message.textContent = "Thanks for reaching out — we'll be in touch soon!";
      message.classList.add("is-success");
    }
    form.reset();
  });
})();
