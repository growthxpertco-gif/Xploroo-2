/* ==========================================================================
   XPLOROO · Notifications (Supabase-backed)
   notifications.js — Thin write/read layer over public.notifications.
   Currently only used by the influencer booking workflow (booking created /
   accepted / declined — see js/influencer-bookings.js, which calls
   window.XploroNotifications.create() at each of those three points), but
   deliberately generic (`type`/`title`/`message`) so any future feature can
   reuse it without a schema change.
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "notifications";

  async function create({ userId, type, title, message, relatedBookingId }) {
    if (!userId || !type || !title) return null;
    // Deliberately no .select() after insert: the creator (e.g. a traveler
    // notifying the influencer they just booked) usually isn't the
    // notification's own user_id, so the row wouldn't pass the "view own
    // notifications" SELECT policy used for RETURNING — Postgres reports
    // that as an RLS violation on the whole insert. We don't need the row
    // back here, so skipping `.select()` avoids that entirely.
    const { error } = await client.from(TABLE).insert({
      user_id: userId,
      type,
      title,
      message: message || "",
      related_booking_id: relatedBookingId || null,
    });
    if (error) {
      console.error("[Xploroo] Failed to create notification:", error.message);
      return false;
    }
    return true;
  }

  async function getMyNotifications() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load notifications:", error.message);
      return [];
    }
    return data || [];
  }

  async function markRead(id) {
    const { error } = await client.from(TABLE).update({ is_read: true }).eq("id", id);
    if (error) console.error("[Xploroo] Failed to mark notification read:", error.message);
  }

  window.XploroNotifications = { create, getMyNotifications, markRead };
})();
