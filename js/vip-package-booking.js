/* ==========================================================================
   XPLOROO · Placeholder VIP Experience booking request (Phase 23)
   vip-package-booking.js — Drives vip-package-booking.html. Deliberately
   NOT the real payment/checkout flow (booking.html/payment.html) — per
   Phase 23 scope this is a placeholder: a logged-in customer submits a
   booking request, it lands in public.vip_package_bookings with status
   "Pending Review", and that's it. No payment, no VIP Membership gate.

   Every logged-in user can reach this page for now (Phase 23 explicitly
   defers the VIP Membership lock to a later phase).

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/vip.js.
   ========================================================================== */
(function () {
  "use strict";

  const container = document.querySelector("[data-vip-booking-container]");
  if (!container || !window.XploroAuth || !window.XploroVip || !window.supabaseClient) return;

  const esc = window.XploroSecurity.escapeHtml;
  const client = window.supabaseClient;

  function formatPrice(price) {
    if (price == null || price === "") return "Price on Request";
    return `&#8377;${Number(price).toLocaleString("en-IN")}`;
  }

  function renderSignInPrompt() {
    container.innerHTML = `
      <section class="ifp-hero" aria-labelledby="vip-booking-title">
        <h1 class="ifp-hero__name" id="vip-booking-title" style="font-size:var(--fs-2xl)">Sign In to Continue</h1>
        <p class="ifp-hero__intro">Please log in to request a VIP Experience booking.</p>
        <div style="margin-top:var(--space-5)"><a class="btn btn--gradient btn--pill" href="login.html">Log In</a></div>
      </section>`;
  }

  function renderNotFound() {
    container.innerHTML = `
      <section class="ifp-hero" aria-labelledby="vip-booking-title">
        <h1 class="ifp-hero__name" id="vip-booking-title" style="font-size:var(--fs-2xl)">VIP Experience Not Found</h1>
        <p class="ifp-hero__intro">This VIP Experience may have been removed or the link is incorrect.</p>
        <div style="margin-top:var(--space-5)"><a class="btn btn--gradient btn--pill" href="influencers.html?niche=vip">Browse VIP Personalities</a></div>
      </section>`;
  }

  function renderSuccess(pkgTitle) {
    container.innerHTML = `
      <section class="ifp-hero" aria-labelledby="vip-booking-title" style="text-align:center">
        <h1 class="ifp-hero__name" id="vip-booking-title" style="font-size:var(--fs-2xl)">Booking Requested</h1>
        <p class="ifp-hero__intro">Your request for &ldquo;${esc(pkgTitle)}&rdquo; has been submitted. The Xploroo team will follow up to confirm details &mdash; no payment has been collected.</p>
        <span class="status-pill status-pill--pending" style="margin-top:var(--space-5);display:inline-flex">Pending Review</span>
        <div style="margin-top:var(--space-5)"><a class="btn btn--gradient btn--pill" href="account.html">View My Account</a></div>
      </section>`;
  }

  function formTemplate(pkg, user, prefill) {
    return `
      <section class="ifp-hero" aria-labelledby="vip-booking-title">
        <h1 class="ifp-hero__name" id="vip-booking-title" style="font-size:var(--fs-2xl)">Request VIP Booking</h1>
        <p class="ifp-hero__intro">${esc(pkg.title)} &middot; ${formatPrice(pkg.price)}</p>
      </section>
      <form data-vip-booking-form>
        <label class="field">
          <span class="field__label">Full Name</span>
          <input class="input" type="text" name="customerName" autocomplete="name" value="${esc(prefill.name)}" required />
        </label>
        <label class="field" style="margin-top:var(--space-4)">
          <span class="field__label">Email Address</span>
          <input class="input" type="email" name="customerEmail" autocomplete="email" value="${esc(prefill.email)}" required />
        </label>
        <label class="field" style="margin-top:var(--space-4)">
          <span class="field__label">Phone Number</span>
          <input class="input" type="tel" name="customerPhone" autocomplete="tel" placeholder="+91 98765 43210" pattern="[0-9+()\\-\\s]{7,20}" required />
        </label>
        <div class="admin-card__meta" style="grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));margin-top:var(--space-4)">
          <label class="field">
            <span class="field__label">Preferred Date</span>
            <input class="input" type="date" name="preferredDate" />
          </label>
          <label class="field">
            <span class="field__label">Guests</span>
            <input class="input" type="number" name="guests" min="1" max="20" step="1" value="1" required />
          </label>
        </div>
        <label class="field" style="margin-top:var(--space-4)">
          <span class="field__label">Special Request <span class="field__hint" style="display:inline">(optional)</span></span>
          <textarea class="input" name="specialRequest" rows="4" placeholder="Anything the team should know&hellip;"></textarea>
        </label>
        <p class="admin-announce-message" data-vip-booking-message role="status" aria-live="polite"></p>
        <div style="margin-top:var(--space-5)">
          <button class="btn btn--gradient btn--pill" type="submit">Submit Booking Request</button>
        </div>
      </form>`;
  }

  async function render() {
    const params = new URLSearchParams(window.location.search);
    let packageId = params.get("package");
    if (!packageId) {
      try {
        packageId = sessionStorage.getItem("xploroo-selected-vip-package");
      } catch (_) {
        /* sessionStorage unavailable */
      }
    }
    if (!packageId) {
      renderNotFound();
      return;
    }

    const user = await window.XploroAuth.getUser();
    if (!user) {
      renderSignInPrompt();
      return;
    }

    const pkg = await window.XploroVip.getPackage({ id: packageId });
    if (!pkg) {
      renderNotFound();
      return;
    }

    const { data: profile } = await client.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const prefill = { name: (profile && profile.full_name) || "", email: (profile && profile.email) || user.email || "" };

    container.innerHTML = formTemplate(pkg, user, prefill);

    const form = container.querySelector("[data-vip-booking-form]");
    const messageEl = container.querySelector("[data-vip-booking-message]");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      messageEl.classList.remove("admin-announce-message--error");
      messageEl.textContent = "";

      const data = new FormData(form);
      const { error } = await window.XploroVip.createPackageBooking({
        packageId: pkg.id,
        influencerId: pkg.influencer_id,
        customerUserId: user.id,
        customerName: data.get("customerName"),
        customerEmail: data.get("customerEmail"),
        customerPhone: data.get("customerPhone"),
        preferredDate: data.get("preferredDate"),
        guests: Number(data.get("guests")) || 1,
        specialRequest: data.get("specialRequest"),
      });

      if (error) {
        submitBtn.disabled = false;
        messageEl.textContent = "Something went wrong. Please try again.";
        messageEl.classList.add("admin-announce-message--error");
        return;
      }

      try {
        sessionStorage.removeItem("xploroo-selected-vip-package");
        sessionStorage.removeItem("xploroo-vip-package-summary");
      } catch (_) {
        /* sessionStorage unavailable */
      }
      renderSuccess(pkg.title);
    });
  }

  render();
})();
