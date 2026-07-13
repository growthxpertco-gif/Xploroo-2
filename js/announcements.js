/* ==========================================================================
   XPLOROO · Admin Broadcast Announcements (Supabase-backed)
   announcements.js — Single source of truth for public.admin_announcements
   + public.announcement_reads. One row per broadcast (never duplicated per
   recipient), with a separate per-influencer read/dismiss row created
   lazily on first open/dismiss — see the migration comment for why. Used by
   both js/admin-announcements.js (Admin Panel's Announcements tab) and
   js/dash-notifications.js (Influencer Dashboard's Notifications tab).

   Deliberately mirrors js/influencer-applications.js's module shape
   (window.Xploro*, plain async functions, no framework) so it reads like
   the rest of this codebase.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js
   and js/influencer-applications.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "admin_announcements";
  const READS_TABLE = "announcement_reads";

  const TYPE_LABEL = {
    general: "General Announcement",
    booking_update: "Booking Update",
    payment_update: "Payment Update",
    system_update: "System Update",
    important_notice: "Important Notice",
  };

  /* ------------------------------------------------------------------ */
  /* Admin — create + read history                                       */
  /* ------------------------------------------------------------------ */
  async function create({ title, message, type }) {
    if (!title || !message || !type) return { data: null, error: new Error("Missing fields.") };
    const { data, error } = await client
      .from(TABLE)
      .insert({ title, message, type, created_by: "Admin" })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create announcement:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  async function getAllAnnouncements() {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load announcements:", error.message);
      return [];
    }
    return data || [];
  }

  // "Approved influencer" = the same population the Admin Panel already
  // manages (influencer_applications.application_status = "approved") —
  // deliberately NOT filtered by public_visibility, since a hidden profile
  // is still an active approved influencer who should receive admin comms.
  async function getApprovedInfluencerCount() {
    const { count, error } = await client
      .from("influencer_applications")
      .select("id", { count: "exact", head: true })
      .eq("application_status", "approved");
    if (error) {
      console.error("[Xploroo] Failed to count approved influencers:", error.message);
      return 0;
    }
    return count || 0;
  }

  // Batch stats for the admin history list — one round trip for every
  // announcement's read rows, then tallied client-side per announcement_id.
  async function getReadStatsByAnnouncementIds(ids) {
    const map = new Map(ids.map((id) => [id, 0]));
    if (!ids.length) return map;
    const { data, error } = await client
      .from(READS_TABLE)
      .select("announcement_id, is_read")
      .in("announcement_id", ids)
      .eq("is_read", true);
    if (error) {
      console.error("[Xploroo] Failed to load announcement read stats:", error.message);
      return map;
    }
    (data || []).forEach((row) => map.set(row.announcement_id, (map.get(row.announcement_id) || 0) + 1));
    return map;
  }

  /* ------------------------------------------------------------------ */
  /* Influencer — my feed + read/dismiss                                 */
  /* ------------------------------------------------------------------ */
  // Every announcement, enriched with this influencer's own read/dismiss
  // state (a missing announcement_reads row means "unread, not dismissed").
  // Dismissed rows are filtered out client-side — the broadcast itself is
  // never touched, only this influencer's own status row.
  async function getMyAnnouncements() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];

    const [{ data: announcements, error: annError }, { data: reads, error: readsError }] = await Promise.all([
      client.from(TABLE).select("*").order("created_at", { ascending: false }),
      client.from(READS_TABLE).select("*").eq("user_id", user.id),
    ]);
    if (annError) {
      console.error("[Xploroo] Failed to load announcements:", annError.message);
      return [];
    }
    if (readsError) console.error("[Xploroo] Failed to load announcement read status:", readsError.message);

    const readsByAnnouncement = new Map((reads || []).map((r) => [r.announcement_id, r]));

    return (announcements || [])
      .map((a) => {
        const status = readsByAnnouncement.get(a.id);
        return {
          id: a.id,
          source: "announcement",
          title: a.title,
          message: a.message,
          type: a.type,
          typeLabel: TYPE_LABEL[a.type] || a.type,
          created_at: a.created_at,
          is_read: !!(status && status.is_read),
          is_deleted: !!(status && status.is_deleted),
        };
      })
      .filter((a) => !a.is_deleted);
  }

  async function markRead(announcementId) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return false;
    const { error } = await client
      .from(READS_TABLE)
      .upsert(
        { announcement_id: announcementId, user_id: user.id, is_read: true, read_at: new Date().toISOString() },
        { onConflict: "announcement_id,user_id" }
      );
    if (error) {
      console.error("[Xploroo] Failed to mark announcement read:", error.message);
      return false;
    }
    return true;
  }

  // Dismiss = hide from THIS influencer's own feed only. Implemented as an
  // upsert on their own announcement_reads row — admin_announcements is
  // never written to or deleted from here.
  async function dismiss(announcementId) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return false;
    const { error } = await client
      .from(READS_TABLE)
      .upsert(
        { announcement_id: announcementId, user_id: user.id, is_deleted: true },
        { onConflict: "announcement_id,user_id" }
      );
    if (error) {
      console.error("[Xploroo] Failed to dismiss announcement:", error.message);
      return false;
    }
    return true;
  }

  window.XploroAnnouncements = {
    TYPE_LABEL,
    create,
    getAllAnnouncements,
    getApprovedInfluencerCount,
    getReadStatsByAnnouncementIds,
    getMyAnnouncements,
    markRead,
    dismiss,
  };
})();
