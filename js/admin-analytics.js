/* ==========================================================================
   XPLOROO · Admin — Live user statistics
   admin-analytics.js — Populates the four summary cards at the top of
   admin-influencer-applications.html (see .admin-overview) directly from
   public.profiles, the single existing source of truth for every user's
   role and influencer status (no duplicate table, no dummy data):

     Total Registered Users        -> count(*) of every row
     Total Travellers              -> count where role contains "traveler"
     Total Influencers             -> count where influencer_status = "approved"
     Pending Influencer Applications -> count where influencer_status = "pending"

   Every query uses Supabase's `{ count: "exact", head: true }` mode, which
   asks Postgres for a row count only — no rows are downloaded — so this
   stays cheap even as the user base grows.

   Refreshed once on load (so the counts always reflect the latest Supabase
   state after a page refresh, per spec) and again a moment after any
   Approve/Reject click in the Influencer Applications tab, so the numbers
   also update live in the same session without requiring a manual reload.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.querySelector("[data-admin-overview]");
  if (!root || !window.supabaseClient) return;

  const client = window.supabaseClient;
  const TABLE = "profiles";

  const valueEls = {
    users: root.querySelector('[data-overview-value="users"]'),
    travellers: root.querySelector('[data-overview-value="travellers"]'),
    influencers: root.querySelector('[data-overview-value="influencers"]'),
    pending: root.querySelector('[data-overview-value="pending"]'),
  };

  async function countRows(build) {
    const { count, error } = await build(client.from(TABLE).select("id", { count: "exact", head: true }));
    if (error) {
      console.error("[Xploroo] Failed to load admin user statistics:", error.message);
      return null;
    }
    return count || 0;
  }

  function setValue(key, count) {
    const el = valueEls[key];
    if (!el) return;
    el.textContent = count === null ? "&mdash;" : String(count);
  }

  async function render() {
    const [totalUsers, totalTravellers, totalInfluencers, totalPending] = await Promise.all([
      countRows((q) => q),
      countRows((q) => q.like("role", "%traveler%")),
      countRows((q) => q.eq("influencer_status", "approved")),
      countRows((q) => q.eq("influencer_status", "pending")),
    ]);

    setValue("users", totalUsers);
    setValue("travellers", totalTravellers);
    setValue("influencers", totalInfluencers);
    setValue("pending", totalPending);
  }

  render();

  // Live-ish refresh: any Approve/Reject click in the Influencer
  // Applications tab (js/admin.js) writes to profiles.influencer_status —
  // re-read the counts shortly after so this session's cards catch up
  // without a manual page reload. Purely additive/read-only: this file
  // never touches admin.js or writes to any table itself.
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-admin-approve], [data-admin-reject]")) {
      window.setTimeout(render, 600);
    }
  });
})();
