/* ==========================================================================
   XPLOROO · Package pages — native Share button
   package-share.js — One reusable module, included on every travel package
   page (…-package.html) only. Injects a premium glass "Share" pill into the
   top-right of the hero (`[data-pkg-hero]`), reading the package's own
   title/description straight from the DOM (`#pkg-title` /
   `.pkg-hero__desc`) so every page gets correct, dynamic share content —
   never a hardcoded package — without any per-page wiring.

   Tap behavior:
     - Web Share API available  -> native OS share sheet (WhatsApp,
       Instagram, Facebook, X, Telegram, Messages, Email, or any installed
       sharing app).
     - Not available (or share fails for a reason other than the user
       dismissing the sheet) -> copy the page URL to the clipboard and show
       a small "Link copied to clipboard" toast.

   Vanilla JS, no dependencies. Loaded with `defer`. Bails out immediately
   if `[data-pkg-hero]` isn't on the page, so it's safe even if ever
   included somewhere it shouldn't be.
   ========================================================================== */
(function () {
  "use strict";

  const hero = document.querySelector("[data-pkg-hero]");
  if (!hero) return;

  const ICON_SHARE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49"/></svg>';

  function getShareData() {
    const titleEl = hero.querySelector("#pkg-title, .pkg-hero__title");
    const descEl = hero.querySelector(".pkg-hero__desc");

    const title = titleEl ? titleEl.textContent.trim() : document.title;
    const rawDesc = descEl ? descEl.textContent.trim() : "";
    const shortDesc = rawDesc.length > 120 ? `${rawDesc.slice(0, 117).trimEnd()}…` : rawDesc;
    const text = shortDesc ? `Check out ${title} on Xploroo! ${shortDesc}` : `Check out ${title} on Xploroo!`;

    return { title: `${title} | Xploroo`, text, url: window.location.href };
  }

  /* ---------------------------------------------------------------- */
  /* Toast (clipboard-fallback confirmation)                             */
  /* ---------------------------------------------------------------- */
  let toastEl = null;
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "pkg-share-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    // Force reflow so re-triggering while already visible still animates.
    toastEl.classList.remove("is-visible");
    void toastEl.offsetWidth;
    toastEl.classList.add("is-visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
  }

  /* ---------------------------------------------------------------- */
  /* Clipboard fallback                                                  */
  /* ---------------------------------------------------------------- */
  async function copyLink(url) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (_) {
      // Nothing more we can do client-side — still surface the toast so the
      // user knows to copy the address bar URL manually.
    }
    showToast("✔ Link copied to clipboard");
  }

  /* ---------------------------------------------------------------- */
  /* Share button                                                        */
  /* ---------------------------------------------------------------- */
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn--glass btn--pill btn--sm pkg-share-btn";
  button.setAttribute("data-pkg-share-btn", "");
  button.setAttribute("aria-label", "Share this package");
  button.innerHTML = `${ICON_SHARE}<span>Share</span>`;

  button.addEventListener("click", async () => {
    const data = getShareData();

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user dismissed the share sheet
        // Any other failure — fall through to the clipboard fallback below.
      }
    }

    await copyLink(data.url);
  });

  hero.insertBefore(button, hero.firstChild);
})();
