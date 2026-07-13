/* ==========================================================================
   XPLOROO · Admin — Broadcast Announcements
   admin-announcements.js — Renders the "📢 Announcements" tab of
   admin-influencer-applications.html: a send form (title/message/type) and,
   below it, "Sent Announcements" history with per-broadcast Total
   Influencers / Total Read / Total Unread stats (public.admin_announcements
   + public.announcement_reads, via window.XploroAnnouncements — see
   js/announcements.js). Reuses the same .admin-card/.field/.input/.btn
   classes as the other admin tabs for a consistent look.
   Vanilla JS, no dependencies. Loaded with `defer`, after admin-tabs.js and
   announcements.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-announcements-root]");
  if (!root || !window.XploroAnnouncements) return;

  const TYPE_OPTIONS = [
    { value: "general", label: "General Announcement" },
    { value: "booking_update", label: "Booking Update" },
    { value: "payment_update", label: "Payment Update" },
    { value: "system_update", label: "System Update" },
    { value: "important_notice", label: "Important Notice" },
  ];

  const ICON_MEGAPHONE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.8 13 22h-3.6l-1.2-5"/></svg>';

  function formatDateTime(iso) {
    if (!iso) return "&mdash;";
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch (_) {
      return "&mdash;";
    }
  }

  function typePill(type) {
    return `<span class="status-pill status-pill--info">${window.XploroAnnouncements.TYPE_LABEL[type] || type}</span>`;
  }

  root.innerHTML = `
    <div class="admin-card" data-announce-form-card>
      <div class="admin-card__body">
        <h2 class="admin-card__name" style="margin-bottom:var(--space-4)">Send a broadcast announcement</h2>
        <p style="margin:0 0 var(--space-5);font-size:var(--fs-sm);color:var(--color-text-muted)">
          Delivered to every currently approved influencer&rsquo;s Notifications tab.
        </p>

        <form data-announce-form>
          <label class="field">
            <span class="field__label">Announcement Title</span>
            <input class="input" type="text" name="title" placeholder="e.g. Payout schedule update" required />
          </label>

          <label class="field" style="margin-top:var(--space-4)">
            <span class="field__label">Message</span>
            <textarea class="input" name="message" rows="4" placeholder="Write the announcement&hellip;" required></textarea>
          </label>

          <label class="field" style="margin-top:var(--space-4)">
            <span class="field__label">Announcement Type</span>
            <select class="input select" name="type" required>
              ${TYPE_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join("")}
            </select>
          </label>

          <p class="admin-announce-message" data-announce-message role="status" aria-live="polite"></p>

          <div class="admin-card__actions" style="margin-top:var(--space-5)">
            <button class="btn btn--primary btn--pill" type="submit" data-announce-submit>Send Announcement</button>
          </div>
        </form>
      </div>
    </div>

    <h2 class="admin-card__name" style="margin:var(--space-8) 0 var(--space-4)">Sent Announcements</h2>
    <div data-announce-history></div>`;

  const form = root.querySelector("[data-announce-form]");
  const message = root.querySelector("[data-announce-message]");
  const submitBtn = root.querySelector("[data-announce-submit]");
  const historyMount = root.querySelector("[data-announce-history]");

  function showMessage(text, kind) {
    message.textContent = text;
    message.classList.remove("admin-announce-message--success", "admin-announce-message--error");
    message.classList.add(kind === "success" ? "admin-announce-message--success" : "admin-announce-message--error");
  }

  function renderEmptyHistory() {
    historyMount.innerHTML = `
      <div class="admin-empty">
        <span class="admin-empty__icon" aria-hidden="true">${ICON_MEGAPHONE}</span>
        <p>No announcements sent yet.</p>
      </div>`;
  }

  async function renderHistory() {
    const [announcements, totalInfluencers] = await Promise.all([
      window.XploroAnnouncements.getAllAnnouncements(),
      window.XploroAnnouncements.getApprovedInfluencerCount(),
    ]);

    if (!announcements.length) {
      renderEmptyHistory();
      return;
    }

    const readStats = await window.XploroAnnouncements.getReadStatsByAnnouncementIds(announcements.map((a) => a.id));

    historyMount.innerHTML = `
      <div class="admin-list">
        ${announcements
          .map((a) => {
            const totalRead = readStats.get(a.id) || 0;
            const totalUnread = Math.max(totalInfluencers - totalRead, 0);
            return `
          <article class="admin-card">
            <div class="admin-card__body">
              <div class="admin-card__head">
                <h2 class="admin-card__name">${a.title}</h2>
                ${typePill(a.type)}
              </div>
              <p style="margin:var(--space-2) 0 var(--space-4);font-size:var(--fs-sm);color:var(--color-text-muted)">${a.message}</p>
              <dl class="admin-card__meta">
                <div><dt>Sent</dt><dd>${formatDateTime(a.created_at)}</dd></div>
                <div><dt>Total Influencers</dt><dd>${totalInfluencers}</dd></div>
                <div><dt>Total Read</dt><dd>${totalRead}</dd></div>
                <div><dt>Total Unread</dt><dd>${totalUnread}</dd></div>
              </dl>
            </div>
          </article>`;
          })
          .join("")}
      </div>`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    const data = new FormData(form);
    const title = (data.get("title") || "").toString().trim();
    const msg = (data.get("message") || "").toString().trim();
    const type = (data.get("type") || "general").toString();
    if (!title || !msg) return;

    submitBtn.disabled = true;
    showMessage("Sending…", "success");

    const { error } = await window.XploroAnnouncements.create({ title, message: msg, type });
    if (error) {
      showMessage("Something went wrong. Please try again.", "error");
      submitBtn.disabled = false;
      return;
    }

    showMessage("✅ Announcement sent successfully.", "success");
    form.reset();
    submitBtn.disabled = false;
    renderHistory();
  });

  renderHistory();

  const tabBtn = document.querySelector('[data-admin-tab="announcements"]');
  if (tabBtn) tabBtn.addEventListener("click", renderHistory);
})();
