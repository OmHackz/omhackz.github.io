// ---------- OmAccount dashboard (account.html) ----------
(function accountPage() {
  const status = document.getElementById("omStatus");
  if (!status) return;
  const OA = window.OmAccount;

  function say(msg, kind) {
    status.textContent = msg || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function setupBanner() {
    const banner = document.getElementById("omSetup");
    if (banner) banner.hidden = OA.configured();
  }

  async function boot() {
    setupBanner();
    const signedOut = document.getElementById("omSignedOut");
    const signedIn = document.getElementById("omSignedIn");
    if (!OA.configured()) {
      signedOut.hidden = false;
      signedIn.hidden = true;
      say("Supabase is not configured yet — connect a project to enable OmAccount.", "err");
      return;
    }
    let session = null;
    try {
      session = await OA.getSession();
    } catch (e) {
      signedOut.hidden = false;
      signedIn.hidden = true;
      say(String(e.message || e), "err");
      return;
    }
    if (!session) {
      signedOut.hidden = false;
      signedIn.hidden = true;
      say("You are signed out.");
      return;
    }
    signedOut.hidden = true;
    signedIn.hidden = false;
    const user = session.user;
    let profile = null;
    try {
      profile = await OA.ensureProfile(user);
    } catch (e) {
      say("Signed in, but profile sync failed: " + (e.message || e), "err");
    }
    renderProfile(user, profile);
    await renderAuthz();
    await renderOwner(user, profile);
  }

  function renderProfile(user, profile) {
    const meta = user.user_metadata || {};
    const name = (profile && profile.full_name) || meta.full_name || meta.name || "OmAccount user";
    const email = user.email || "";
    const avatar = (profile && profile.avatar_url) || meta.avatar_url || meta.picture || "";
    const av = document.getElementById("omAvatar");
    av.innerHTML = avatar
      ? `<img src="${esc(avatar)}" alt="" onerror="this.remove()" />`
      : esc(String(name).trim().charAt(0).toUpperCase() || "O");
    const owner = OA.isOwner(user, profile);
    document.getElementById("omName").innerHTML =
      esc(name) + (owner ? `<span class="om-badge">Owner</span>` : "");
    document.getElementById("omMail").textContent = email;
    document.getElementById("omUid").textContent = "id " + user.id.slice(0, 8) + "…";
    document.getElementById("editName").value = (profile && profile.full_name) || "";
  }

  async function renderAuthz() {
    const list = document.getElementById("omApps");
    list.innerHTML = "<li class=\"pj-hint\" style=\"padding:4px\">Loading…</li>";
    try {
      const rows = await OA.myAuthorizations();
      if (!rows.length) {
        list.innerHTML = "<li class=\"pj-hint\" style=\"padding:4px\">No apps authorized yet. Open an app and approve it to see it here.</li>";
        return;
      }
      list.innerHTML = "";
      for (const r of rows) {
        const li = document.createElement("li");
        li.className = "om-item";
        const appName = (r.om_apps && r.om_apps.name) || r.app_id;
        li.innerHTML = `<div class="t"><strong>${esc(appName)}</strong><span>${esc(r.app_id)} · ${(r.scopes || []).map(esc).join(", ")}</span></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-btn";
        btn.textContent = "Revoke";
        btn.addEventListener("click", async () => {
          try { await OA.revokeApp(r.app_id); renderAuthz(); }
          catch (e) { say(String(e.message || e), "err"); }
        });
        li.appendChild(btn);
        list.appendChild(li);
      }
    } catch (e) {
      list.innerHTML = "";
      say("Could not load authorizations: " + (e.message || e), "err");
    }
  }

  async function renderOwner(user, profile) {
    const wrap = document.getElementById("omOwner");
    if (!OA.isOwner(user, profile)) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const list = document.getElementById("omAllApps");
    list.innerHTML = "<li class=\"pj-hint\" style=\"padding:4px\">Loading apps…</li>";
    try {
      const apps = await OA.listApps();
      if (!apps.length) {
        list.innerHTML = "<li class=\"pj-hint\" style=\"padding:4px\">No apps registered yet.</li>";
      } else {
        list.innerHTML = "";
        for (const a of apps) {
          const li = document.createElement("li");
          li.className = "om-item";
          li.innerHTML = `<div class="t"><strong>${esc(a.name)} <span class="pj-hint">${esc(a.app_id)}</span></strong><span>${esc((a.redirect_uris || []).join(", "))}</span></div>`;
          const del = document.createElement("button");
          del.type = "button";
          del.className = "copy-btn";
          del.textContent = "Delete";
          del.addEventListener("click", async () => {
            if (!confirm(`Delete app "${a.app_id}"? Authorized users keep no access.`)) return;
            try { await OA.deleteApp(a.app_id); renderOwner(user, profile); }
            catch (e) { say(String(e.message || e), "err"); }
          });
          li.appendChild(del);
          list.appendChild(li);
        }
      }
    } catch (e) {
      list.innerHTML = "";
      say("Could not load apps: " + (e.message || e), "err");
    }
  }

  const saveBtn = document.getElementById("saveName");
  if (saveBtn) saveBtn.addEventListener("click", async () => {
    const name = (document.getElementById("editName").value || "").trim();
    if (!name) return say("Enter your full name.", "err");
    say("Saving…");
    try {
      const user = await OA.getUser();
      await OA.ensureProfile(user, name);
      say("Saved.", "ok");
      boot();
    } catch (e) { say(String(e.message || e), "err"); }
  });

  const outBtn = document.getElementById("omSignOut");
  if (outBtn) outBtn.addEventListener("click", async () => {
    try { await OA.signOut(); location.href = "login.html"; }
    catch (e) { say(String(e.message || e), "err"); }
  });

  const regBtn = document.getElementById("regApp");
  if (regBtn) regBtn.addEventListener("click", async () => {
    const app_id = (document.getElementById("regId").value || "").trim().toLowerCase();
    const name = (document.getElementById("regName").value || "").trim();
    const description = (document.getElementById("regDesc").value || "").trim();
    const redirect_uris = OA.parseUris(document.getElementById("regUris").value);
    say("Registering…");
    try {
      await OA.registerApp({ app_id, name, description, redirect_uris });
      say(`App "${app_id}" registered.`, "ok");
      document.getElementById("regId").value = "";
      document.getElementById("regName").value = "";
      document.getElementById("regDesc").value = "";
      document.getElementById("regUris").value = "";
      const user = await OA.getUser();
      const profile = await OA.getProfile(user.id);
      renderOwner(user, profile);
    } catch (e) { say(String(e.message || e), "err"); }
  });

  boot();
})();
