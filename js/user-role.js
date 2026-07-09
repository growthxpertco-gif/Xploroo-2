/* ==========================================================================
   XPLOROO · User role module
   user-role.js — Single source of truth for the Traveler → Influencer role
   and application-approval workflow. Every page in the role system
   (account.html, influencer-application.html, influencer-dashboard.html,
   admin-influencer-applications.html) reads and writes state ONLY through
   the functions exposed on `window.XploroRole` below — never touches
   localStorage directly. That's the seam meant for a real backend later:
   swap the body of these functions for real API calls (and swap
   `getState()`'s single-record read for a real "current user" fetch) and
   every page keeps working unchanged.

   Every new signup starts a Traveler — there is no separate Influencer
   signup anywhere in the site. The only way to become an Influencer is
   Traveler → apply → admin approves.

   Vanilla JS, no dependencies. Loaded with `defer`, before any page-specific
   script that calls it.
   ========================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "xploroo-user-role";

  /* ------------------------------------------------------------------ */
  /* Shape of the stored record. `role` and `application.status` are the  */
  /* two flags every page branches on.                                    */
  /* ------------------------------------------------------------------ */
  function defaultState() {
    return {
      role: "traveler", // "traveler" | "influencer"
      application: {
        status: "none", // "none" | "pending" | "approved" | "rejected"
        submittedAt: null,
        reviewedAt: null,
        data: null, // the form fields captured at submission time
      },
    };
  }

  function getState() {
    let parsed;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch (_) {
      parsed = null; // storage unavailable (e.g. private browsing) — fall back to defaults
    }
    const base = defaultState();
    if (!parsed) return base;
    return {
      ...base,
      ...parsed,
      application: { ...base.application, ...(parsed.application || {}) },
    };
  }

  function setState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* storage unavailable — state just won't persist across reloads */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Traveler submits the Influencer application.                        */
  /* ------------------------------------------------------------------ */
  function submitApplication(data) {
    const state = getState();
    state.application = {
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      data,
    };
    setState(state);
    return state;
  }

  /* ------------------------------------------------------------------ */
  /* Admin actions. Both are no-ops unless an application is actually    */
  /* pending, so a stale/double click can't do anything unexpected.      */
  /* ------------------------------------------------------------------ */
  function approveApplication() {
    const state = getState();
    if (state.application.status !== "pending") return state;
    state.role = "influencer";
    state.application.status = "approved";
    state.application.reviewedAt = new Date().toISOString();
    setState(state);
    return state;
  }

  function rejectApplication() {
    const state = getState();
    if (state.application.status !== "pending") return state;
    state.application.status = "rejected";
    state.application.reviewedAt = new Date().toISOString();
    setState(state);
    return state;
  }

  /* Lets a rejected Traveler apply again later — clears back to "none"   */
  /* without touching `role` (a rejection never changes role).            */
  function resetApplication() {
    const state = getState();
    state.application = defaultState().application;
    setState(state);
    return state;
  }

  window.XploroRole = {
    getState,
    submitApplication,
    approveApplication,
    rejectApplication,
    resetApplication,
  };
})();
