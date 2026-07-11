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

/* ==========================================================================
   Growth Xpert badge + Email icon — injected here (rather than duplicated
   into every page's footer markup) so both appear on every page from one
   place. Independent of the newsletter block above: its own null-guards,
   so it still runs on any page whose footer might not include the
   newsletter form. Existing footer content/markup is never touched, only
   appended to. Styling lives in styles/footer.css (`.footer-badge`) and
   reuses the existing `.footer-social__link` class as-is for the email
   icon, so it automatically matches the other icons' size/spacing/hover.
   ========================================================================== */
(function () {
  "use strict";

  const socialList = document.querySelector(".footer-social");
  if (socialList && !socialList.querySelector('[data-footer-email]')) {
    const emailItem = document.createElement("li");
    emailItem.innerHTML = `
      <a class="footer-social__link" href="mailto:xploroo.co@gmail.com" aria-label="Email Xploroo" data-footer-email>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v.01L12 12l8-5.99V6H4Zm16 2.24-7.4 5.55a1 1 0 0 1-1.2 0L4 8.24V18h16V8.24Z"/></svg>
      </a>`;
    socialList.appendChild(emailItem);
  }

  const footerContainer = document.querySelector(".site-footer__container");
  if (footerContainer && socialList && !footerContainer.querySelector('[data-footer-badge]')) {
    const badge = document.createElement("a");
    badge.className = "footer-badge";
    badge.href = "https://wa.me/919148128249";
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.setAttribute("aria-label", "Chat with Growth Xpert on WhatsApp");
    badge.setAttribute("data-footer-badge", "");
    badge.innerHTML = `<span class="footer-badge__icon" aria-hidden="true">&#128640;</span>Growth Xpert`;
    socialList.insertAdjacentElement("afterend", badge);
  }
})();
