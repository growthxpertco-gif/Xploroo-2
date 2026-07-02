/* ==========================================================================
   XPLOROO · Footer module
   footer.js — Newsletter form validation + submit feedback. Vanilla JS, no
   dependencies, scoped to [data-newsletter-form]. Reusable across every
   page: this file has no dependency on any other section's markup.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.querySelector("[data-newsletter-form]");
  if (!form) return;

  const input = form.querySelector('input[type="email"]');
  const message = document.querySelector("[data-newsletter-message]");

  function setMessage(text, state) {
    if (!message) return;
    message.textContent = text;
    message.classList.remove("is-success", "is-error");
    if (state) message.classList.add(state);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = input.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      setMessage("Please enter a valid email address.", "is-error");
      input.focus();
      return;
    }

    // No backend wired up yet — acknowledge locally so the form still
    // feels complete and production-ready to drop a real endpoint into.
    setMessage("Thanks for joining — check your inbox soon!", "is-success");
    form.reset();
  });

  input.addEventListener("input", () => {
    if (message && message.classList.contains("is-error")) {
      setMessage("", null);
    }
  });
})();
