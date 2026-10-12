// ---------- Navbar login button (lightweight, no Supabase CDN needed) ----------
// Reads the Supabase v2 session straight from localStorage so EVERY page can
// show Login vs. your avatar without loading the full client.
// Full auth lives in assets/js/omaccount.js (login/account/authorize pages).
(function navAuth() {
  const btn = document.getElementById("navAuth");
  if (!btn) return;

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg><span>Login</span>';

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isAuthPage = page === "login.html" || page === "account.html" || page === "authorize.html";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Supabase JS v2 persists the session as JSON under sb-<ref>-auth-token.
  function readSession() {
    try {
      const cfg = window.OMACCOUNT || {};
      const m = String(cfg.supabaseUrl || "").match(/^https:\/\/([^.]+)\.supabase\.co/);
      if (!m) return null;
      const raw = localStorage.getItem("sb-" + m[1] + "-auth-token");
      if (!raw) return null;
      const data = JSON.parse(raw);
      const session = data.session || data;
      if (!session || !session.access_token || !session.user) return null;
      if (session.expires_at && session.expires_at * 1000 < Date.now() - 60000) return null;
      return session;
    } catch {
      return null;
    }
  }

  function render() {
    const session = readSession();
    if (!session) {
      btn.classList.remove("signed-in");
      btn.setAttribute("aria-label", "Sign in");
      btn.href = isAuthPage ? "login.html" : "login.html?next=" + encodeURIComponent(page || "index.html");
      btn.innerHTML = ICON;
      return;
    }
    const meta = session.user.user_metadata || {};
    const name = meta.full_name || meta.name || session.user.email || "U";
    const avatar = meta.avatar_url || meta.picture || "";
    const initial = String(name).trim().charAt(0).toUpperCase() || "U";
    btn.classList.add("signed-in");
    btn.setAttribute("aria-label", "Your account");
    btn.href = "account.html";
    btn.innerHTML = avatar
      ? `<img src="${esc(avatar)}" alt="" onerror="this.remove()" /><span>${esc(initial)}</span>`
      : `<span class="login-initial">${esc(initial)}</span>`;
  }

  render();
  window.addEventListener("storage", render);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
})();
