/* ==========================================================================
   XPLOROO · Support tickets (Supabase-backed)
   support-tickets.js — public.support_tickets. Influencers create/read
   their own tickets (js/dash-support.js); the admin panel
   (js/admin-support-tickets.js) reads every ticket and can reply/change
   status — see the migration comment on this table for why admin gets a
   public select/update policy (js/admin-auth.js has no real Supabase
   session, same reasoning as every other admin-monitored table).
   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.supabaseClient) return;
  const client = window.supabaseClient;
  const TABLE = "support_tickets";

  async function getMyTickets() {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return [];
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("influencer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load support tickets:", error.message);
      return [];
    }
    return data || [];
  }

  async function createTicket(fields) {
    const user = window.XploroAuth ? await window.XploroAuth.getUser() : null;
    if (!user) return { data: null, error: new Error("Not signed in.") };

    const { data, error } = await client
      .from(TABLE)
      .insert({
        influencer_id: user.id,
        full_name: fields.fullName || "",
        email: fields.email || "",
        phone: fields.phone || "",
        subject: fields.subject || "",
        description: fields.description || "",
        priority: fields.priority || "Medium",
      })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to create support ticket:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  /* ------------------------------------------------------------------ */
  /* Admin — monitor + respond, every ticket across every influencer.     */
  /* ------------------------------------------------------------------ */
  async function getAllTickets() {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load all support tickets:", error.message);
      return [];
    }
    return data || [];
  }

  async function updateTicket(id, fields) {
    const { error } = await client
      .from(TABLE)
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[Xploroo] Failed to update support ticket:", error.message);
      return false;
    }
    return true;
  }

  window.XploroSupportTickets = { getMyTickets, createTicket, getAllTickets, updateTicket };
})();
