/* ==========================================================================
   XPLOROO · FAQ page
   faq.js — Premium accordion: only one FAQ stays open at a time, smooth
   expand/collapse via the `.faq-item.is-open` class (the actual animation
   is a CSS grid-template-rows transition in faq-page.css). Vanilla JS, no
   dependencies, scoped entirely to [data-faq-accordion].
   ========================================================================== */
(function () {
  "use strict";

  const accordion = document.querySelector("[data-faq-accordion]");
  if (!accordion) return;

  const items = Array.from(accordion.querySelectorAll(".faq-item"));

  function closeItem(item) {
    const trigger = item.querySelector(".faq-item__trigger");
    item.classList.remove("is-open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function openItem(item) {
    const trigger = item.querySelector(".faq-item__trigger");
    item.classList.add("is-open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }

  items.forEach((item) => {
    const trigger = item.querySelector(".faq-item__trigger");
    if (!trigger) return;

    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      items.forEach((other) => {
        if (other !== item) closeItem(other);
      });
      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });
  });
})();
