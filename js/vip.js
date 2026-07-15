/* ==========================================================================
   XPLOROO · VIP Personalities data layer (Phase 23)
   vip.js — Everything vip-profile.html and vip-package.html need from
   Supabase for public.vip_packages and public.vip_package_bookings. VIP
   personalities themselves are NOT a separate table — they're just approved
   influencer_applications rows with is_vip_personality = true, so resolving
   a VIP profile reuses window.XploroApplications.getApprovedByIdOrUsername()
   (already selects "*", so is_vip_personality comes along for free) rather
   than duplicating that query here.

   Vanilla JS, no dependencies. Loaded with `defer`, after js/supabase.js.
   ========================================================================== */
(function () {
  "use strict";

  const client = window.supabaseClient;
  if (!client) return;

  const PACKAGES_TABLE = "vip_packages";
  const BOOKINGS_TABLE = "vip_package_bookings";

  // Every active VIP Experience belonging to one VIP personality, newest
  // first — powers the VIP Experiences carousel on vip-profile.html.
  async function getPackagesByInfluencerId(influencerId) {
    const { data, error } = await client
      .from(PACKAGES_TABLE)
      .select("*")
      .eq("influencer_id", influencerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Xploroo] Failed to load VIP experiences:", error.message);
      return [];
    }
    return data || [];
  }

  // Resolves one VIP Experience for vip-package.html, from either its id or
  // its (influencer-scoped) slug. Only ever returns active packages — an
  // admin-deactivated experience behaves as "not found" for visitors.
  async function getPackage({ id, influencerId, slug }) {
    let query = client.from(PACKAGES_TABLE).select("*").eq("is_active", true);
    query = id ? query.eq("id", id) : query.eq("influencer_id", influencerId).eq("slug", slug);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to load VIP experience:", error.message);
      return null;
    }
    return data;
  }

  // Placeholder booking flow (Phase 23) — no payment, no membership gate.
  // Just a real Supabase row so the influencer/admin can follow up. RLS
  // requires auth.uid() === customerUserId and the package to be active.
  async function createPackageBooking({ packageId, influencerId, customerUserId, customerName, customerEmail, customerPhone, preferredDate, guests, specialRequest }) {
    const { data, error } = await client
      .from(BOOKINGS_TABLE)
      .insert({
        package_id: packageId,
        influencer_id: influencerId,
        customer_user_id: customerUserId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        preferred_date: preferredDate || null,
        guests: guests || 1,
        special_request: specialRequest || null,
      })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[Xploroo] Failed to submit VIP Experience booking:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }

  window.XploroVip = {
    getPackagesByInfluencerId,
    getPackage,
    createPackageBooking,
  };
})();
