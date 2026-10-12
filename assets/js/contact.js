// ---------- Contact modes (assets/js/contact.js) ----------
// 1. Mailto  2. Discord link
(function contactModes() {
  const TO = "omhackz@outlook.com";
  const modeBtns = [...document.querySelectorAll("[data-contact-mode]")];
  if (!modeBtns.length) return;

  function $(id) {
    return document.getElementById(id);
  }
  function on(id, fn) {
    const el = $(id);
    if (el) el.addEventListener("click", fn);
  }
  function val(el) {
    return (el && el.value || "").trim();
  }

  const panels = { mailto: $("cmailto"), discord: $("cdiscord") };
  const fields = $("contactFields");
  const statusEl = $("contactStatus");
  const nameI = $("cName"), emailI = $("cEmail"), msgI = $("cMsg");
  let mode = "mailto";

  function setStatus(msg, state) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("ok", state === true);
    statusEl.classList.toggle("err", state === false);
  }

  const thumb = $("modeThumb");

  function moveThumb(animate) {
    const active = document.querySelector(".mode-opt.is-active");
    if (!thumb || !active) return;
    const parent = active.parentElement.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    if (!animate) thumb.style.transition = "none";
    thumb.style.left = (r.left - parent.left) + "px";
    thumb.style.width = r.width + "px";
    if (!animate) requestAnimationFrame(() => (thumb.style.transition = ""));
  }

  function setMode(m) {
    mode = m;
    modeBtns.forEach((b) => {
      const onState = b.dataset.contactMode === m;
      b.classList.toggle("is-active", onState);
      b.setAttribute("aria-selected", String(onState));
      b.setAttribute("aria-pressed", String(onState));
    });
    Object.keys(panels).forEach((k) => {
      if (panels[k]) panels[k].classList.toggle("is-active", k === m);
    });
    if (fields) fields.hidden = (m === "discord");
    setStatus("");
    moveThumb(true);
  }
  modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.contactMode)));
  window.addEventListener("resize", () => moveThumb(false));

  async function copyText(t, okMsg) {
    try {
      await navigator.clipboard.writeText(t);
      setStatus(okMsg || "Copied.", true);
      return;
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setStatus(okMsg || "Copied.", true);
    } catch {
      setStatus("Copy failed — long-press to copy manually.", false);
    }
  }

  // ---- 1. mailto ----
  on("copyMail", () => copyText(TO, "Email address copied."));
  on("mailtoSend", () => {
    const name = val(nameI), email = val(emailI), msg = val(msgI);
    if (!name || !msg) {
      setStatus("Add your name and a message first.", false);
      return;
    }
    const subject = "Portfolio contact — " + name;
    const body = "Name: " + name + "\r\n" + (email ? "Email: " + email + "\r\n" : "") + "\r\n" + msg;
    window.location.href = "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    setStatus("Opening your mail app…", true);
  });

  // ---- 2. discord link ----
  on("copyDiscord", () => copyText("omhackz", "Discord username copied."));

  setMode("mailto");
  moveThumb(false);
  window.addEventListener("load", () => moveThumb(false));
  setTimeout(() => moveThumb(false), 300);
})();
