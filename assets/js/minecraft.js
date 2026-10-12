// ---------- Mini Minecraft standalone flow (assets/js/minecraft.js) ----------
// Boot splash -> main menu -> world select -> game (+ pause).
// The engine (mc.js) runs the world; this file runs the screens.
(function flow() {
  function $(id) {
    return document.getElementById(id);
  }
  const boot = $("mcBoot"), menu = $("mcMenu"), worlds = $("mcWorlds"),
    game = $("mcGame"), pause = $("mcPause"), list = $("worldList");
  if (!boot || !menu || !worlds || !game) return;

  try { window.__mcPaused = true; } catch {}

  const REG = "omhackz_mc_worlds", ACT = "omhackz_mc_active", AUTO = "omhackz_mc_auto";

  function getWorlds() {
    try {
      const w = JSON.parse(localStorage.getItem(REG) || "[]");
      return Array.isArray(w) ? w : [];
    } catch { return []; }
  }
  function saveWorlds(w) {
    try { localStorage.setItem(REG, JSON.stringify(w)); } catch {}
  }
  function ago(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function parseSeed(s) {
    s = (s || "").trim();
    if (!s) return (Math.random() * 1e9) | 0;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10) | 0;
    let hh = 0;
    for (const c of s) hh = (Math.imul(hh, 31) + c.codePointAt(0)) | 0;
    return hh;
  }
  function show(el) {
    [menu, worlds, game].forEach((s) => {
      if (s) s.hidden = s !== el;
    });
    if (pause) pause.hidden = true;
  }
  function enterGame() {
    show(game);
    try { window.__mcPaused = false; } catch {}
  }
  function playWorld(id) {
    try {
      localStorage.setItem(ACT, id);
      sessionStorage.setItem(AUTO, "1");
    } catch {}
    window.location.reload();
  }

  // ----- world list -----
  function drawWorlds() {
    if (!list) return;
    const w = getWorlds();
    if (!w.length) {
      list.innerHTML = '<p class="world-empty">No worlds yet — create one below.</p>';
      return;
    }
    list.innerHTML = "";
    w.slice().reverse().forEach((entry) => {
      const row = document.createElement("div");
      row.className = "world-row";
      const main = document.createElement("div");
      main.className = "wmain";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const meta = document.createElement("span");
      meta.textContent = "seed " + entry.seed + " · " + ago(entry.updated || Date.now());
      main.appendChild(name);
      main.appendChild(meta);
      const play = document.createElement("button");
      play.type = "button";
      play.textContent = "Play";
      play.addEventListener("click", () => playWorld(entry.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete " + entry.name);
      del.addEventListener("click", () => {
        if (!window.confirm("Delete '" + entry.name + "' forever?")) return;
        try { localStorage.removeItem("omhackz_mc_" + entry.id); } catch {}
        saveWorlds(getWorlds().filter((x) => x.id !== entry.id));
        drawWorlds();
      });
      row.appendChild(main);
      row.appendChild(play);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  // ----- menu wiring -----
  const single = $("mcSingle");
  if (single) single.addEventListener("click", () => {
    drawWorlds();
    show(worlds);
  });
  const multi = $("mcMulti");
  if (multi) multi.addEventListener("click", () => {
    try { window.alert("Multiplayer is two people sharing one keyboard. Cozy up."); } catch {}
  });
  const backTop = $("mcBackTop");
  if (backTop) backTop.addEventListener("click", () => { window.location.href = "lunix.html"; });
  const worldBack = $("worldBack");
  if (worldBack) worldBack.addEventListener("click", () => show(menu));
  const create = $("worldCreate");
  if (create) create.addEventListener("click", () => {
    const nameI = $("worldName"), seedI = $("worldSeed");
    const w = getWorlds();
    const name = ((nameI && nameI.value || "").trim() || "World " + (w.length + 1)).slice(0, 24);
    const seed = parseSeed(seedI && seedI.value);
    const id = "w" + Date.now().toString(36);
    try {
      localStorage.setItem("omhackz_mc_" + id, JSON.stringify({
        seed, mode: "survival", sel: 0, dist: 1, inv: {}, edits: [],
      }));
    } catch {}
    w.push({ id, name, seed, updated: Date.now() });
    saveWorlds(w);
    playWorld(id);
  });

  // ----- pause -----
  function setPaused(on) {
    if (!pause) return;
    pause.hidden = !on;
    try { window.__mcPaused = on; } catch {}
  }
  function inGame() {
    return game && !game.hidden;
  }
  const pauseBtn = $("mcPauseBtn");
  if (pauseBtn) pauseBtn.addEventListener("click", () => setPaused(true));
  const resume = $("mcResume");
  if (resume) resume.addEventListener("click", () => setPaused(false));
  const quit = $("mcQuit");
  if (quit) quit.addEventListener("click", () => {
    try { if (window.__mcSave) window.__mcSave(); } catch {}
    try { window.__mcPaused = true; } catch {}
    drawWorlds();
    show(menu);
  });
  window.addEventListener("keydown", (e) => {
    if (!inGame()) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.code === "Escape" || e.code === "KeyP") {
      const chatRow = document.getElementById("mcChatRow");
      const inv = document.getElementById("mcInv");
      if ((chatRow && !chatRow.hidden) || (inv && !inv.hidden)) return; // let those close first
      e.preventDefault();
      setPaused(!pause || pause.hidden);
    }
  });

  // ----- world name chip + updated stamp -----
  function syncChip() {
    try {
      const id = localStorage.getItem(ACT);
      const w = getWorlds().find((x) => x.id === id);
      const chip = document.getElementById("mcWorldName");
      if (chip) chip.textContent = w ? w.name : "World";
    } catch {}
  }
  window.addEventListener("pagehide", () => {
    try {
      const id = localStorage.getItem(ACT);
      if (id) {
        const w = getWorlds();
        const e = w.find((x) => x.id === id);
        if (e) {
          e.updated = Date.now();
          saveWorlds(w);
        }
      }
      if (window.__mcSave) window.__mcSave();
    } catch {}
  });

  // ----- boot -----
  syncChip();
  setTimeout(() => {
    if (boot) boot.classList.add("done");
    let auto = false;
    try { auto = sessionStorage.getItem(AUTO) === "1"; sessionStorage.removeItem(AUTO); } catch {}
    if (auto && localStorage.getItem(ACT)) enterGame();
    else show(menu);
  }, 1900);
})();
