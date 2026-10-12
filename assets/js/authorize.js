// ---------- OmAccount authorize flow (authorize.html) ----------
// Prototype "Sign in with OmAccount" for static hosting:
//   authorize.html?app_id=demo&redirect_uri=https://example.com/cb&scope=profile&state=xyz
// The user signs in, approves the app, and is sent back to redirect_uri with the
// Supabase access token in the URL fragment. The receiving app MUST validate the
// token server-side (Supabase Auth getUser) — never trust it blindly, and prefer
// a backend code-exchange for production.
(function authorizePage() {
  const status = document.getElementById("omStatus");
  if (!status) return;
  const OA = window.OmAccount;
  const q = new URLSearchParams(location.search);
  const appId = (q.get("app_id") || "").toLowerCase();
  const redirectUri = q.get("redirect_uri") || "";
  const scopes = (q.get("scope") || "profile").split(/[,\s]+/).filter(Boolean);
  const state = q.get("state") || "";

  function say(msg, kind) {
    status.textContent = msg || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function backWith(params) {
    try {
      const u = new URL(redirectUri);
      u.hash = new URLSearchParams(params).toString();
      location.href = u.toString();
    } catch {
      say("Bad redirect_uri — cannot send you back.", "err");
    }
  }

  async function boot() {
    const box = document.getElementById("omAuthBox");
    if (!appId || !redirectUri) {
      box.hidden = true;
      say("Missing app_id or redirect_uri. Apps authorize via authorize.html?app_id=…&redirect_uri=…", "err");
      return;
    }
    if (!OA.configured()) {
      box.hidden = true;
      say("Supabase is not configured yet.", "err");
      return;
    }
    let app = null;
    try {
      app = await OA.getApp(appId);
    } catch (e) {
      box.hidden = true;
      say(String(e.message || e), "err");
      return;
    }
    if (!app) {
      box.hidden = true;
      say(`Unknown app "${appId}". App ids are registered by the OmHackz owner only.`, "err");
      return;
    }
    if (!(app.redirect_uris || []).includes(redirectUri)) {
      box.hidden = true;
      say(`redirect_uri is not registered for "${appId}".`, "err");
      return;
    }
    const session = await OA.getSession().catch(() => null);
    if (!session) {
      location.href = OA.loginUrl("authorize.html?" + q.toString());
      return;
    }
    document.getElementById("omAppName").textContent = app.name || app.app_id;
    document.getElementById("omAppId").textContent = app.app_id;
    document.getElementById("omRedirect").textContent = redirectUri;
    document.getElementById("omScopes").innerHTML =
      scopes.map((s) => `<span class="type-badge">${esc(s)}</span>`).join("");
    try {
      const user = await OA.getUser();
      const profile = user ? await OA.getProfile(user.id) : null;
      const name = (profile && profile.full_name) || (user && user.email) || "you";
      document.getElementById("omUser").textContent = name;
    } catch { /* non-fatal */ }
    box.hidden = false;
  }

  document.getElementById("omApprove").addEventListener("click", async () => {
    say("Authorizing…");
    try {
      const session = await OA.authorizeApp(appId, scopes);
      backWith({
        access_token: session.access_token,
        token_type: "Bearer",
        app_id: appId,
        scope: scopes.join(" "),
        state,
      });
    } catch (e) {
      say(String(e.message || e), "err");
    }
  });

  document.getElementById("omDeny").addEventListener("click", () => {
    backWith({ error: "access_denied", state });
  });

  boot();
})();
