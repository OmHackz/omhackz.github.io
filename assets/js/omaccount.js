// ---------- OmAccount: universal account for every OmHackz app ----------
// Plain-HTML Supabase client (no build step). Load order on auth pages:
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 (exposes window.supabase)
//   2. assets/js/omaccount-config.js  (window.OMACCOUNT with url + anon key)
//   3. this file (exposes window.OmAccount)
// The anon key is publishable. Real security lives in Supabase RLS (see
// supabase/schema.sql). NEVER ship a service_role key in client code.
(function omAccount() {
  if (window.OmAccount) return;

  const cfg = window.OMACCOUNT || {};
  const OWNER_GITHUB = (cfg.ownerGithub || "OmHackz").toLowerCase();
  const OWNER_EMAIL = String(cfg.ownerEmail || "").toLowerCase();
  const PLACEHOLDER = !cfg.supabaseUrl || /YOUR-PROJECT/.test(cfg.supabaseUrl) ||
    !cfg.supabaseAnonKey || /YOUR-ANON-KEY/.test(cfg.supabaseAnonKey);

  let client = null;

  function configured() { return !PLACEHOLDER; }

  function supa() {
    if (!configured()) {
      throw new Error("Supabase is not configured yet — set your URL and anon key in assets/js/omaccount-config.js (see supabase/README.md).");
    }
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      throw new Error("Supabase CDN failed to load — check your connection and reload.");
    }
    if (!client) {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return client;
  }

  async function getSession() {
    const { data } = await supa().auth.getSession();
    return data.session || null;
  }

  async function getUser() {
    const { data } = await supa().auth.getUser();
    return data.user || null;
  }

  function usernameOf(user) {
    const meta = (user && user.user_metadata) || {};
    return meta.user_name || meta.preferred_username || meta.name ||
      (user && user.email ? user.email.split("@")[0] : "");
  }

  // Keep the public profile row in sync (never touches is_owner).
  async function ensureProfile(user, fullName) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    const name = fullName || meta.full_name || meta.name || "";
    const row = {
      id: user.id,
      full_name: name,
      username: usernameOf(user),
      avatar_url: meta.avatar_url || meta.picture || null,
    };
    const { error } = await supa().from("profiles").upsert(row, { onConflict: "id" });
    if (error && !/row-level security|permission/i.test(error.message)) throw error;
    return getProfile(user.id);
  }

  async function getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supa().from("profiles").select("*").eq("id", userId).single();
    if (error) return null;
    return data;
  }

  // Owner gate: ONLY the OmHackz account may register apps (app ids).
  // This is UX only — the database enforces it again with RLS.
  function isOwner(user, profile) {
    if (profile && profile.is_owner === true) return true;
    if (profile && String(profile.username || "").toLowerCase() === OWNER_GITHUB) return true;
    if (user && String(usernameOf(user) || "").toLowerCase() === OWNER_GITHUB &&
      (user.app_metadata || {}).provider === "github") return true;
    if (OWNER_EMAIL && user && String(user.email || "").toLowerCase() === OWNER_EMAIL) return true;
    return false;
  }

  function accountUrl() { return new URL("account.html", location.href).toString(); }
  function loginUrl(next) {
    const u = new URL("login.html", location.href);
    if (next) u.searchParams.set("next", next);
    return u.toString();
  }

  async function signUpEmail({ fullName, email, password }) {
    const { data, error } = await supa().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || "" } },
    });
    if (error) throw error;
    if (data.user && !data.session) {
      return { needsConfirm: true, user: data.user };
    }
    if (data.user) await ensureProfile(data.user, fullName);
    return { session: data.session, user: data.user };
  }

  async function signInPassword({ email, password }) {
    const { data, error } = await supa().auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      const meta = data.user.user_metadata || {};
      await ensureProfile(data.user, meta.full_name || meta.name || "");
    }
    return data;
  }

  async function sendOtp(email, fullName) {
    const { error } = await supa().auth.signInWithOtp({
      email,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) throw error;
  }

  async function verifyOtp(email, token) {
    const { data, error } = await supa().auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    if (data.user) {
      const meta = data.user.user_metadata || {};
      await ensureProfile(data.user, meta.full_name || meta.name || "");
    }
    return data;
  }

  async function oauth(provider) {
    const { error } = await supa().auth.signInWithOAuth({
      provider,
      options: { redirectTo: accountUrl() },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supa().auth.signOut();
  }

  function validAppId(id) { return /^[a-z0-9][a-z0-9-]{1,40}$/.test(String(id || "")); }

  function parseUris(text) {
    return String(text || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }

  async function listApps() {
    const { data, error } = await supa().from("om_apps").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getApp(appId) {
    const { data, error } = await supa().from("om_apps").select("*").eq("app_id", appId).single();
    if (error) return null;
    return data;
  }

  async function registerApp({ app_id, name, description, redirect_uris }) {
    const user = await getUser();
    if (!user) throw new Error("Sign in first.");
    const profile = await getProfile(user.id);
    if (!isOwner(user, profile)) throw new Error("Only the OmHackz owner account can register apps.");
    if (!validAppId(app_id)) throw new Error("App id must match ^[a-z0-9][a-z0-9-]{1,40}$.");
    if (!redirect_uris.length) throw new Error("Add at least one redirect URI.");
    const { error } = await supa().from("om_apps").insert({
      app_id: String(app_id).toLowerCase(),
      name: name || app_id,
      description: description || "",
      redirect_uris,
      owner_github: window.OMACCOUNT.ownerGithub || "OmHackz",
      created_by: user.id,
    });
    if (error) throw error;
  }

  async function deleteApp(appId) {
    const user = await getUser();
    if (!user) throw new Error("Sign in first.");
    const profile = await getProfile(user.id);
    if (!isOwner(user, profile)) throw new Error("Only the OmHackz owner account can delete apps.");
    const { error } = await supa().from("om_apps").delete().eq("app_id", appId);
    if (error) throw error;
  }

  async function myAuthorizations() {
    const user = await getUser();
    if (!user) return [];
    const { data, error } = await supa()
      .from("om_authorizations")
      .select("app_id, scopes, created_at, om_apps(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function authorizeApp(appId, scopes) {
    const session = await getSession();
    if (!session) throw new Error("Sign in first.");
    const { error } = await supa().from("om_authorizations").upsert(
      { user_id: session.user.id, app_id: appId, scopes: scopes || ["profile"] },
      { onConflict: "user_id,app_id" }
    );
    if (error) throw error;
    return session;
  }

  async function revokeApp(appId) {
    const user = await getUser();
    if (!user) throw new Error("Sign in first.");
    const { error } = await supa().from("om_authorizations")
      .delete().eq("user_id", user.id).eq("app_id", appId);
    if (error) throw error;
  }

  window.OmAccount = {
    configured, supa, getSession, getUser, getProfile, ensureProfile, isOwner,
    signUpEmail, signInPassword, sendOtp, verifyOtp, oauth, signOut,
    listApps, getApp, registerApp, deleteApp,
    myAuthorizations, authorizeApp, revokeApp,
    accountUrl, loginUrl, validAppId, parseUris, usernameOf,
    ownerGithub: window.OMACCOUNT.ownerGithub || "OmHackz",
  };
})();
