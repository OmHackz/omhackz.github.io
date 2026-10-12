// ---------- OmAccount login page ----------
(function loginPage() {
  const status = document.getElementById("omStatus");
  if (!status) return;
  const OA = window.OmAccount;
  const next = new URLSearchParams(location.search).get("next") || "account.html";

  function say(msg, kind) {
    status.textContent = msg || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function setupBanner() {
    const banner = document.getElementById("omSetup");
    if (banner) banner.hidden = OA.configured();
  }

  // ---- view switching (methods / email / code) ----
  const views = {
    viewMethods: document.getElementById("viewMethods"),
    viewEmail: document.getElementById("viewEmail"),
    viewCode: document.getElementById("viewCode"),
  };

  function show(id) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      const on = key === id;
      el.classList.toggle("is-active", on);
      if (on) {
        // restart entrance animation
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      }
    });
    say("");
  }

  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      show(b.dataset.go);
    })
  );

  // ---- sign in / create account switch ----
  let mode = "signin";
  const swIn = document.getElementById("swIn");
  const swUp = document.getElementById("swUp");
  const nameWrap = document.getElementById("nameWrap");
  const pwGo = document.getElementById("pwGo");

  function setMode(m) {
    mode = m;
    swIn.classList.toggle("is-active", m === "signin");
    swUp.classList.toggle("is-active", m === "signup");
    swIn.setAttribute("aria-selected", String(m === "signin"));
    swUp.setAttribute("aria-selected", String(m === "signup"));
    nameWrap.hidden = m !== "signup";
    pwGo.querySelector("span").textContent = m === "signup" ? "Create OmAccount" : "Sign in";
  }
  swIn.addEventListener("click", () => setMode("signin"));
  swUp.addEventListener("click", () => setMode("signup"));

  // ---- password visibility ----
  const pwPass = document.getElementById("pwPass");
  const pwEye = document.getElementById("pwEye");
  pwEye.addEventListener("click", () => {
    const showIt = pwPass.type === "password";
    pwPass.type = showIt ? "text" : "password";
    pwEye.classList.toggle("is-on", showIt);
    pwEye.setAttribute("aria-label", showIt ? "Hide password" : "Show password");
  });

  // ---- helpers ----
  function val(id) {
    return (document.getElementById(id).value || "").trim();
  }

  function busy(btn, on) {
    btn.classList.toggle("is-loading", on);
    btn.disabled = on;
  }

  function goNext() {
    say("Signed in — continuing…", "ok");
    setTimeout(() => { location.href = next; }, 700);
  }

  // ---- email + password ----
  document.getElementById("viewEmail").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!OA.configured()) return say("Supabase is not configured yet.", "err");
    const email = val("pwEmail");
    const password = pwPass.value || "";
    const fullName = val("pwName");
    if (!email || !password) return say("Enter your email and password.", "err");
    if (mode === "signup" && !fullName) return say("Enter your full name to create an OmAccount.", "err");
    busy(pwGo, true);
    say("Working…");
    try {
      if (mode === "signup") {
        const r = await OA.signUpEmail({ fullName, email, password });
        if (r.needsConfirm) {
          say("OmAccount created — check your email to confirm, then sign in.", "ok");
          return;
        }
      } else {
        await OA.signInPassword({ email, password });
      }
      goNext();
    } catch (err) {
      say(String((err && err.message) || err), "err");
    } finally {
      busy(pwGo, false);
    }
  });

  // ---- email OTP ----
  document.getElementById("otpSend").addEventListener("click", async (e) => {
    if (!OA.configured()) return say("Supabase is not configured yet.", "err");
    const email = val("otpEmail");
    if (!email) return say("Enter your email first.", "err");
    const fullName = val("otpName");
    const btn = e.currentTarget;
    busy(btn, true);
    say("Sending code…");
    try {
      await OA.sendOtp(email, fullName);
      document.getElementById("otpStep2").hidden = false;
      say("Code sent — check your email.", "ok");
      document.getElementById("otpCode").focus();
    } catch (err) {
      say(String((err && err.message) || err), "err");
    } finally {
      busy(btn, false);
    }
  });

  document.getElementById("otpVerify").addEventListener("click", async (e) => {
    if (!OA.configured()) return say("Supabase is not configured yet.", "err");
    const email = val("otpEmail");
    const token = val("otpCode");
    if (!email || !token) return say("Enter your email and the 6-digit code.", "err");
    const btn = e.currentTarget;
    busy(btn, true);
    say("Verifying…");
    try {
      await OA.verifyOtp(email, token);
      goNext();
    } catch (err) {
      say(String((err && err.message) || err), "err");
    } finally {
      busy(btn, false);
    }
  });

  // ---- OAuth ----
  document.getElementById("oauthGoogle").addEventListener("click", async (e) => {
    if (!OA.configured()) return say("Supabase is not configured yet.", "err");
    busy(e.currentTarget, true);
    try { await OA.oauth("google"); }
    catch (err) { say(String((err && err.message) || err), "err"); }
    finally { busy(e.currentTarget, false); }
  });
  document.getElementById("oauthGithub").addEventListener("click", async (e) => {
    if (!OA.configured()) return say("Supabase is not configured yet.", "err");
    busy(e.currentTarget, true);
    try { await OA.oauth("github"); }
    catch (err) { say(String((err && err.message) || err), "err"); }
    finally { busy(e.currentTarget, false); }
  });

  // ---- boot ----
  (async function boot() {
    setupBanner();
    if (!OA.configured()) {
      say("Supabase is not configured yet — sign-in is disabled until the owner adds the project keys.", "err");
      return;
    }
    try {
      const session = await OA.getSession();
      if (session) {
        say("Already signed in — continuing…", "ok");
        setTimeout(() => { location.href = next; }, 700);
      }
    } catch (err) {
      say(String((err && err.message) || err), "err");
    }
  })();
})();
