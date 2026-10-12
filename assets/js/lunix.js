// ---------- Lunix desktop (assets/js/lunix.js) ----------
(function lunix() {
  const desktop = document.getElementById("desktop");
  const winsBox = document.getElementById("wins");
  const dockEl = document.getElementById("dock");
  const diconsEl = document.getElementById("dicons");
  const mbApp = document.getElementById("mbApp");
  const mbLogo = document.getElementById("mbLogo");
  const mbMenu = document.getElementById("mbMenu");
  const mbClock = document.getElementById("mbClock");
  const mbBatt = document.getElementById("mbBatt");
  if (!desktop || !winsBox || !dockEl) return;

  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const IC = {
    files: '<svg viewBox="0 0 24 24" fill="none" stroke="#e8b64c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="rgba(232,182,76,0.25)" /></svg>',
    brave: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff6b1a" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.2 3.6 3.2 14.4 0 18M12 3c-3.2 3.6-3.2 14.4 0 18" /></svg>',
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" fill="rgba(0,0,0,0.4)" /><path d="m7 9 3 3-3 3M12.5 15H17" /></svg>',
    mine: '<svg viewBox="0 0 24 24" fill="none" stroke="#7fd4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" fill="rgba(127,212,255,0.15)" /><path d="M4 9.5h16M9.5 9.5V20" /></svg>',
    textedit: '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e2d6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.9 13a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.9-13" /></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" fill="rgba(61,220,132,0.15)" /><path d="M4 9.5h16M9.5 9.5V20" /></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e2d6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4" /></svg>',
  };

  // ----- fake fs (shared with TextEdit, persisted overrides) -----
  const LFS = {
    "about.txt": "Hi, I'm OmHackz — welcome to Lunix,\na tiny desktop inside a portfolio.\n\nDouble-click anything. Break nothing.",
    "contact.txt": "mail: omhackz@outlook.com\ndiscord: omhackz",
    "notes.txt": "TODO:\n- ship lunix 1.0\n- touch grass (later)",
    projects: {
      "portfolio.txt": "you are inside it. inception noise.",
      "arcade.txt": "tic-tac-toe vs the robot, minesweeper, 2048\nand a tiny infinite minecraft.",
      "terminal.txt": "triple-tap the Terminal tool on the homepage,\ntype `lunix`, and here you are.",
    },
    pictures: {
      "wallpaper.png": "[binary PNG data — use your imagination]",
      "skin.png": "[OmHackz. looking fresh.]",
    },
  };
  const LS_KEY = "omhackz_lunix_notes";
  function overrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveOverride(path, content) {
    try {
      const o = overrides();
      o[path.join("/")] = content;
      localStorage.setItem(LS_KEY, JSON.stringify(o));
    } catch {}
  }
  function nodeAt(path) {
    let n = LFS;
    for (const p of path) {
      if (!n || typeof n !== "object" || !(p in n)) return undefined;
      n = n[p];
    }
    return n;
  }
  function readFile(path) {
    const o = overrides();
    const k = path.join("/");
    if (k in o) return o[k];
    const n = nodeAt(path);
    return typeof n === "string" ? n : null;
  }

  // ----- window manager -----
  let zTop = 10, cascade = 0, focusedApp = "";
  const wins = new Map(); // appId -> { el }
  const lArc = { tab: "ttt", move2048: null }; // mini arcade state (single instance)

  function deskSize() {
    return { w: desktop.clientWidth || window.innerWidth, h: desktop.clientHeight || window.innerHeight - 100 };
  }
  function focusWin(el, name, id) {
    el.style.zIndex = String(++zTop);
    if (mbApp && name) mbApp.textContent = name;
    if (id) focusedApp = id;
  }
  function syncDock() {
    dockEl.querySelectorAll(".dock-btn").forEach((b) => {
      const w = wins.get(b.dataset.app);
      b.classList.toggle("run", !!w && w.el.style.display !== "none");
    });
  }
  function openApp(id, arg) {
    const app = APPS[id];
    if (!app) return;
    const ex = wins.get(id);
    if (ex) {
      ex.el.style.display = "flex";
      focusWin(ex.el, app.name, id);
      if (arg !== undefined && app.open) app.open(ex.api, arg);
      syncDock();
      return;
    }
    const d = deskSize();
    const w = Math.min(app.size[0], d.w - 16);
    const hh = Math.min(app.size[1], d.h - 16);
    const off = (cascade++ % 6) * 30;
    const el = h(
      '<section class="lwin" style="width:' + w + "px;height:" + hh +
      "px;left:" + Math.max(8, (d.w - w) / 2 + off - 75) +
      "px;top:" + Math.max(8, (d.h - hh) / 2 + off - 40) + 'px">' +
      '<header class="lwin-bar"><span class="lights">' +
      '<button data-act="close" aria-label="Close"></button>' +
      '<button data-act="min" aria-label="Minimize"></button>' +
      '<button data-act="max" aria-label="Maximize"></button></span>' +
      '<span class="lwin-title">' + esc(app.name) + "</span></header>" +
      '<div class="lwin-body"></div></section>'
    );
    const api = {
      el,
      close() {
        el.remove();
        wins.delete(id);
        if (focusedApp === id) focusedApp = "";
        syncDock();
      },
      setTitle(t) {
        const ti = el.querySelector(".lwin-title");
        if (ti) ti.textContent = t;
      },
    };
    el.querySelector('[data-act="close"]').addEventListener("click", (e) => { e.stopPropagation(); api.close(); });
    el.querySelector('[data-act="min"]').addEventListener("click", (e) => {
      e.stopPropagation();
      el.style.display = "none";
      syncDock();
    });
    el.querySelector('[data-act="max"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.classList.contains("max")) {
        el.classList.remove("max");
        el.style.left = el.dataset.x || el.style.left;
        el.style.top = el.dataset.y || el.style.top;
        el.style.width = el.dataset.w || el.style.width;
        el.style.height = el.dataset.hh || el.style.height;
      } else {
        el.dataset.x = el.style.left;
        el.dataset.y = el.style.top;
        el.dataset.w = el.style.width;
        el.dataset.hh = el.style.height;
        el.classList.add("max");
        el.style.left = "0px";
        el.style.top = "0px";
        el.style.width = "100%";
        el.style.height = "100%";
      }
    });
    el.addEventListener("pointerdown", () => focusWin(el, app.name, id));
    // drag
    const bar = el.querySelector(".lwin-bar");
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".lights") || el.classList.contains("max")) return;
      const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
      function mv(ev) {
        el.style.left = Math.max(-el.offsetWidth + 80, Math.min(deskSize().w - 80, ev.clientX - sx)) + "px";
        el.style.top = Math.max(0, Math.min(deskSize().h - 40, ev.clientY - sy)) + "px";
      }
      function up() {
        window.removeEventListener("pointermove", mv);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", up);
    });
    winsBox.appendChild(el);
    wins.set(id, { el, api });
    focusWin(el, app.name, id);
    app.render(el.querySelector(".lwin-body"), api, arg);
    syncDock();
  }

  // ----- mini arcade games (fully playable in-window) -----
  function buildMiniTTT(root) {
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let rec = { you: 0, robot: 0, draws: 0 };
    try {
      const r = JSON.parse(localStorage.getItem("omhackz_ttt") || "{}");
      rec = { you: r.you | 0, robot: r.robot | 0, draws: r.draws | 0 };
    } catch {}
    let board, over, lock, starter = "O";
    root.innerHTML = '<p class="larc-status"></p><div class="lttt"></div>' +
      '<div class="lrow"><button type="button" data-a="re">Restart</button></div><p class="larc-score"></p>';
    const status = root.querySelector(".larc-status");
    const grid = root.querySelector(".lttt");
    const score = root.querySelector(".larc-score");
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Cell " + (i + 1));
      b.addEventListener("click", () => human(i));
      grid.appendChild(b);
      cells.push(b);
    }
    function paint() {
      score.textContent = "You " + rec.you + " · Robot " + rec.robot + " · Draws " + rec.draws;
      try { localStorage.setItem("omhackz_ttt", JSON.stringify(rec)); } catch {}
    }
    function winner(b) {
      for (const L of LINES) {
        if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[0]] === b[L[2]]) return { who: b[L[0]], line: L };
      }
      return b.includes("") ? null : { who: "draw", line: [] };
    }
    function reset() {
      board = Array(9).fill("");
      over = false;
      lock = false;
      starter = starter === "X" ? "O" : "X";
      cells.forEach((c) => { c.textContent = ""; c.className = ""; });
      if (starter === "O") {
        lock = true;
        status.textContent = "Robot opens…";
        setTimeout(robot, 600);
      } else {
        status.textContent = "Your move — you are X.";
      }
    }
    function place(i, m) {
      board[i] = m;
      cells[i].textContent = m;
      cells[i].classList.add(m === "O" ? "o" : "x");
    }
    function finish(r) {
      over = true;
      lock = false;
      if (r.who === "draw") {
        rec.draws++;
        status.textContent = "Draw. Nobody blinks.";
      } else {
        r.line.forEach((i) => cells[i].classList.add("win"));
        if (r.who === "X") {
          rec.you++;
          status.textContent = "You beat the robot!";
        } else {
          rec.robot++;
          status.textContent = "Robot wins. Logged.";
        }
      }
      paint();
    }
    function findWin(m) {
      for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = m;
        const w = winner(board);
        board[i] = "";
        if (w && w.who === m) return i;
      }
      return -1;
    }
    function robot() {
      if (over) { lock = false; return; }
      let m = findWin("O");
      if (m < 0) m = findWin("X");
      if (m < 0) {
        const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        if (board[4] === "") m = 4;
        else {
          const corn = empty.filter((i) => [0, 2, 6, 8].includes(i));
          const pool = corn.length ? corn : empty;
          m = pool[(Math.random() * pool.length) | 0];
        }
      }
      if (m === undefined || m < 0 || board[m]) { lock = false; return; }
      place(m, "O");
      lock = false;
      const r = winner(board);
      if (r) finish(r);
      else status.textContent = "Your move.";
    }
    function human(i) {
      if (!board || board[i] || over || lock) return;
      place(i, "X");
      const r = winner(board);
      if (r) return finish(r);
      lock = true;
      status.textContent = "Robot is thinking…";
      setTimeout(robot, 380);
    }
    root.querySelector('[data-a="re"]').addEventListener("click", reset);
    reset();
    paint();
  }

  function buildMiniMines(root) {
    const SIZE = 8, COUNT = 10;
    let wins = 0;
    try { wins = parseInt(localStorage.getItem("omhackz_mines_wins") || "0", 10) || 0; } catch {}
    let cells, placed, over, flagMode, opened;
    root.innerHTML = '<p class="larc-status"></p>' +
      '<div class="lm-meta"><span>Mines <b class="lm-left">10</b></span><span>Cleared <b class="lm-wins"></b></span></div>' +
      '<div class="lmines"></div>' +
      '<div class="lrow"><button type="button" data-a="flag">Flag: off</button><button type="button" data-a="re">Restart</button></div>';
    const status = root.querySelector(".larc-status");
    const grid = root.querySelector(".lmines");
    const leftEl = root.querySelector(".lm-left");
    const winsEl = root.querySelector(".lm-wins");
    const flagBtn = root.querySelector('[data-a="flag"]');
    function neighbors(i) {
      const x = i % SIZE, y = Math.floor(i / SIZE), out = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push(ny * SIZE + nx);
        }
      }
      return out;
    }
    function build() {
      grid.innerHTML = "";
      cells = [];
      placed = false;
      over = false;
      opened = 0;
      leftEl.textContent = COUNT;
      winsEl.textContent = wins;
      flagBtn.textContent = "Flag: off";
      flagMode = false;
      status.textContent = "Clear the field. First click is safe.";
      for (let i = 0; i < SIZE * SIZE; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Cell " + (i + 1));
        b.addEventListener("click", () => activate(i));
        b.addEventListener("contextmenu", (e) => { e.preventDefault(); toggleFlag(i); });
        grid.appendChild(b);
        cells.push({ mine: false, n: 0, open: false, flag: false, el: b });
      }
    }
    function placeMines(safe) {
      const banned = new Set([safe, ...neighbors(safe)]);
      let put = 0, guard = 0;
      while (put < COUNT && guard++ < 2000) {
        const i = Math.floor(Math.random() * SIZE * SIZE);
        if (cells[i].mine || banned.has(i)) continue;
        cells[i].mine = true;
        put++;
      }
      cells.forEach((c, i) => {
        c.n = neighbors(i).filter((j) => cells[j].mine).length;
      });
      placed = true;
    }
    function paintCount() {
      leftEl.textContent = Math.max(0, COUNT - cells.filter((c) => c.flag).length);
    }
    function toggleFlag(i) {
      const c = cells[i];
      if (over || c.open) return;
      c.flag = !c.flag;
      c.el.classList.toggle("flagged", c.flag);
      c.el.textContent = c.flag ? "⚑" : "";
      paintCount();
    }
    function reveal(i) {
      const c = cells[i];
      if (c.open || c.flag) return;
      c.open = true;
      c.el.classList.add("open");
      opened++;
      if (c.n > 0) {
        c.el.textContent = c.n;
        c.el.classList.add("lm" + c.n);
      } else {
        neighbors(i).forEach(reveal);
      }
    }
    function activate(i) {
      if (over) return;
      const c = cells[i];
      if (flagMode) return toggleFlag(i);
      if (c.flag || c.open) return;
      if (!placed) placeMines(i);
      if (c.mine) return boom(i);
      reveal(i);
      if (opened === SIZE * SIZE - COUNT) {
        over = true;
        wins++;
        try { localStorage.setItem("omhackz_mines_wins", String(wins)); } catch {}
        winsEl.textContent = wins;
        status.textContent = "Field cleared. Detective work.";
      }
    }
    function boom(i) {
      over = true;
      cells.forEach((c) => {
        if (c.mine) {
          c.el.classList.add("open");
          c.el.textContent = "●";
        }
      });
      cells[i].el.classList.add("boom");
      status.textContent = "Boom. Restart to retry.";
    }
    flagBtn.addEventListener("click", () => {
      flagMode = !flagMode;
      flagBtn.textContent = "Flag: " + (flagMode ? "on" : "off");
    });
    root.querySelector('[data-a="re"]').addEventListener("click", build);
    build();
  }

  function buildMini2048(root) {
    const S = 4;
    let grid, score, over;
    let best = 0;
    try { best = parseInt(localStorage.getItem("omhackz_2048_best") || "0", 10) || 0; } catch {}
    root.innerHTML = '<p class="larc-status"></p>' +
      '<div class="lm-meta"><span>Score <b class="l48s">0</b></span><span>Best <b class="l48b"></b></span></div>' +
      '<div class="l2048"></div>' +
      '<div class="lrow"><button type="button" data-a="new">New game</button></div>' +
      '<div class="ldpad"><span></span><button type="button" data-d="up" aria-label="Up">▲</button><span></span>' +
      '<button type="button" data-d="left" aria-label="Left">◀</button><button type="button" data-d="down" aria-label="Down">▼</button><button type="button" data-d="right" aria-label="Right">▶</button></div>';
    const status = root.querySelector(".larc-status");
    const boardEl = root.querySelector(".l2048");
    const scoreEl = root.querySelector(".l48s");
    const bestEl = root.querySelector(".l48b");
    function spawn() {
      const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (!empty.length) return -1;
      const i = empty[(Math.random() * empty.length) | 0];
      grid[i] = Math.random() < 0.9 ? 2 : 4;
      return i;
    }
    function slide(line) {
      const compact = line.filter((v) => v);
      const out = [];
      let gained = 0;
      for (let i = 0; i < compact.length; i++) {
        if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
          const v = compact[i] * 2;
          out.push(v);
          gained += v;
          i++;
        } else {
          out.push(compact[i]);
        }
      }
      while (out.length < S) out.push(0);
      return { out, gained };
    }
    function movesLeft() {
      if (grid.includes(0)) return true;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const v = grid[y * S + x];
          if (x + 1 < S && grid[y * S + x + 1] === v) return true;
          if (y + 1 < S && grid[(y + 1) * S + x] === v) return true;
        }
      }
      return false;
    }
    function move(dir) {
      if (over) return;
      let gained = 0, changed = false;
      for (let l = 0; l < S; l++) {
        const idx = [];
        for (let k = 0; k < S; k++) {
          idx.push(dir === "left" ? l * S + k
            : dir === "right" ? l * S + (S - 1 - k)
            : dir === "up" ? k * S + l
            : (S - 1 - k) * S + l);
        }
        const res = slide(idx.map((i) => grid[i]));
        res.out.forEach((v, k) => {
          if (grid[idx[k]] !== v) changed = true;
          grid[idx[k]] = v;
        });
        gained += res.gained;
      }
      if (!changed) return;
      score += gained;
      if (score > best) {
        best = score;
        try { localStorage.setItem("omhackz_2048_best", String(best)); } catch {}
      }
      spawn();
      render();
      if (!movesLeft()) {
        over = true;
        status.textContent = "No moves left — New game.";
      }
    }
    function render() {
      boardEl.innerHTML = "";
      grid.forEach((v) => {
        const d = document.createElement("div");
        d.className = "ltile" + (v ? " t" + (v <= 2048 ? v : "super") : "");
        d.textContent = v || "";
        boardEl.appendChild(d);
      });
      scoreEl.textContent = score;
      bestEl.textContent = best;
    }
    function reset() {
      grid = Array(16).fill(0);
      score = 0;
      over = false;
      spawn();
      spawn();
      render();
      status.textContent = "Arrows / WASD or the pad.";
    }
    root.querySelector('[data-a="new"]').addEventListener("click", reset);
    root.querySelectorAll("[data-d]").forEach((b) => {
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); move(b.dataset.d); });
    });
    lArc.move2048 = move;
    reset();
  }

  // ----- apps -----
  function folderRow(name) {
    return '<div class="fitem" data-n="' + esc(name) + '">' + IC.files + "<span>" + esc(name) + "</span></div>";
  }
  function fileRow(name) {
    return '<div class="fitem" data-n="' + esc(name) + '">' + IC.file + "<span>" + esc(name) + "</span></div>";
  }

  const APPS = {
    files: {
      name: "Files", icon: "files", size: [640, 420],
      render(body) {
        let path = [];
        body.innerHTML =
          '<div class="files"><div class="files-side">' +
          '<button data-p="">Home</button><button data-p="projects">Projects</button><button data-p="pictures">Pictures</button>' +
          '</div><div class="files-main"><div class="files-path"></div><div class="files-grid"></div><div class="files-status"></div></div></div>';
        const grid = body.querySelector(".files-grid");
        const pathEl = body.querySelector(".files-path");
        const statusEl = body.querySelector(".files-status");
        function draw() {
          const n = nodeAt(path) || {};
          const names = Object.keys(n);
          pathEl.textContent = "/home/omhackz" + (path.length ? "/" + path.join("/") : "");
          statusEl.textContent = names.length + " items";
          grid.innerHTML = names.map((k) => (typeof n[k] === "object" ? folderRow(k) : fileRow(k))).join("") || '<p class="files-status">empty folder</p>';
          body.querySelectorAll(".files-side button").forEach((b) => {
            const p = b.dataset.p ? [b.dataset.p] : [];
            b.classList.toggle("on", p.join("/") === path.join("/"));
          });
          grid.querySelectorAll(".fitem").forEach((it) => {
            it.addEventListener("click", () => {
              grid.querySelectorAll(".fitem").forEach((x) => x.classList.remove("sel"));
              it.classList.add("sel");
            });
            it.addEventListener("dblclick", () => {
              const k = it.dataset.n;
              const v = nodeAt([...path, k]);
              if (v && typeof v === "object") {
                path = [...path, k];
                draw();
              } else {
                openApp("textedit", [...path, k]);
              }
            });
          });
        }
        body.querySelectorAll(".files-side button").forEach((b) => {
          b.addEventListener("click", () => {
            path = b.dataset.p ? [b.dataset.p] : [];
            draw();
          });
        });
        draw();
      },
    },
    textedit: {
      name: "TextEdit", icon: "textedit", size: [520, 380],
      open(api, path) {
        if (api && api.loadFile) api.loadFile(path);
      },
      render(body, api, arg) {
        const initial = Array.isArray(arg) && arg.length ? arg : ["notes.txt"];
        body.innerHTML =
          '<div class="tedit-bar"><span></span><button type="button">Save</button></div>' +
          "<textarea class='tedit' spellcheck='false'></textarea>";
        const ta = body.querySelector("textarea");
        const label = body.querySelector(".tedit-bar span");
        const btn = body.querySelector("button");
        let cur = initial;
        api.loadFile = function (path) {
          cur = path;
          const content = readFile(path) ?? "new file. type something worth keeping.";
          api.setTitle(path[path.length - 1] + " — TextEdit");
          if (label) label.textContent = path.join("/");
          ta.value = content;
        };
        btn.addEventListener("click", () => {
          saveOverride(cur, ta.value);
          btn.textContent = "Saved ✓";
          setTimeout(() => { btn.textContent = "Save"; }, 1200);
        });
        api.loadFile(initial);
      },
    },
    brave: {
      name: "Brave", icon: "brave", size: [860, 560],
      render(body) {
        const MARKS = [
          ["Home", "index.html"], ["Arcade", "games.html"], ["About", "about.html"],
          ["Contact", "contact.html"], ["Example", "https://example.com"], ["Brave", "https://brave.com"],
          ["Google ↗", "newtab:https://www.google.com"],
        ];
        const HOME_HTML =
          '<div class="brave-home"><h2>Brave <em>start</em></h2>' +
          '<div class="brave-tiles">' + MARKS.map((m) => "<button data-u='" + m[1] + "'>" + esc(m[0]) + "</button>").join("") + "</div>" +
          '<p class="brave-note">Fully working address bar, history and bookmarks. Heads-up: most big sites refuse to load inside other pages — that\'s their call, not a bug.</p></div>';
        body.innerHTML =
          '<div class="brave-bar">' +
          '<button data-b="back" aria-label="Back">←</button>' +
          '<button data-b="fwd" aria-label="Forward">→</button>' +
          '<button data-b="reload" aria-label="Reload">⟳</button>' +
          '<button data-b="home" aria-label="Home">⌂</button>' +
          '<button data-b="ext" aria-label="Open in new tab">↗</button>' +
          '<form class="brave-addr"><input placeholder="Search or enter address" aria-label="Address" /></form>' +
          "</div>" +
          '<div class="brave-marks">' + MARKS.map((m) => "<button data-u='" + m[1] + "'>" + esc(m[0]) + "</button>").join("") + "</div>" +
          '<div class="brave-view">' + HOME_HTML + "</div>";
        const view = body.querySelector(".brave-view");
        const input = body.querySelector("input");
        const form = body.querySelector("form");
        const hist = [];
        let hi = -1, searchSeq = 0;
        function norm(u) {
          u = (u || "").trim();
          if (!u) return "";
          if (/\.html?$/i.test(u) && !u.includes("://") && !u.includes(" ")) return u; // local page
          if (!u.includes("://")) return "https://" + u;
          return u;
        }
        function isSearch(s) {
          s = (s || "").trim();
          if (!s) return false;
          if (s.includes(" ")) return true;
          if (s.includes("://")) return false;
          if (/^localhost/i.test(s)) return false;
          return !s.includes(".");
        }
        function paintBtns() {
          body.querySelector('[data-b="back"]').disabled = hi <= 0;
          body.querySelector('[data-b="fwd"]').disabled = hi < 0 || hi >= hist.length - 1;
        }
        function go(raw, push) {
          const s = (raw || "").trim();
          if (!s) return;
          if (isSearch(s)) {
            searchGoogle(s, push);
            return;
          }
          openUrl(norm(s), push);
        }
        function openUrl(url, push) {
          if (!url) return;
          if (push !== false) {
            hist.length = hi + 1;
            hist.push(url);
            hi = hist.length - 1;
          }
          view.innerHTML = "";
          const f = document.createElement("iframe");
          f.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-same-origin");
          f.setAttribute("title", url);
          f.src = url;
          view.appendChild(f);
          input.value = url;
          paintBtns();
        }
        function gUrl(q) {
          return "https://www.google.com/search?q=" + encodeURIComponent(q) + "&num=10&hl=en";
        }
        function proxify(u) {
          return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u);
        }
        function parseGoogle(doc) {
          const out = [];
          doc.querySelectorAll("div.g").forEach((blk) => {
            if (out.length >= 10) return;
            const a = blk.querySelector('a[href*="/url?q="], a[href^="http"]');
            const t = blk.querySelector("h3");
            if (!a || !t || !t.textContent.trim()) return;
            const href = a.getAttribute("href") || "";
            const m = href.match(/\/url\?q=([^&]+)/);
            let url = href;
            if (m) {
              try { url = decodeURIComponent(m[1]); } catch {}
            }
            if (!/^https?:\/\//.test(url) || url.indexOf("google.com/url") >= 0) return;
            let snip = "";
            const sEl = blk.querySelector(".VwiC3b, .s3v9rd, .st");
            if (sEl) snip = (sEl.textContent || "").slice(0, 220);
            let host = "";
            try { host = new URL(url).hostname; } catch {}
            out.push({ title: t.textContent.trim(), url, host, snip });
          });
          return out;
        }
        function parseDDG(doc) {
          const out = [];
          doc.querySelectorAll("a.result__a, .result__title a, a[href*='uddg=']").forEach((a) => {
            if (out.length >= 10) return;
            const href = a.getAttribute("href") || "";
            let url = "";
            const m = href.match(/[?&]uddg=([^&]+)/);
            if (m) {
              try { url = decodeURIComponent(m[1]); } catch {}
            } else if (/^https?:\/\//.test(href)) {
              url = href;
            }
            if (!/^https?:\/\//.test(url)) return;
            if (out.some((r) => r.url === url)) return;
            const blk = (a.closest && a.closest(".result")) || a.parentElement;
            const sEl = blk ? blk.querySelector(".result__snippet") : null;
            let host = "";
            try { host = new URL(url).hostname; } catch {}
            out.push({ title: (a.textContent || "").trim() || host, url, host, snip: sEl ? (sEl.textContent || "").trim().slice(0, 220) : "" });
          });
          return out;
        }
        async function searchGoogle(q, push) {
          if (push !== false) {
            hist.length = hi + 1;
            hist.push("lunix://search:" + q);
            hi = hist.length - 1;
          }
          input.value = q;
          paintBtns();
          const my = ++searchSeq;
          view.innerHTML = '<div class="brave-home"><h2>Googling <em>' + esc(q) + "</em>…</h2></div>";
          let results = [];
          let source = "";
          const err = "Neither Google nor DuckDuckGo answered.";
          function fetchText(url, ms) {
            return new Promise((resolve, reject) => {
              let done = false;
              const to = setTimeout(() => {
                if (!done) {
                  done = true;
                  reject(new Error("timeout"));
                }
              }, ms);
              fetch(proxify(url)).then(
                (r) => {
                  if (done) return;
                  done = true;
                  clearTimeout(to);
                  if (!r.ok) reject(new Error("proxy " + r.status));
                  else resolve(r.text());
                },
                (e) => {
                  if (!done) {
                    done = true;
                    clearTimeout(to);
                    reject(e);
                  }
                }
              );
            });
          }
          function tryProvider(job, ms) {
            return fetchText(job.url, ms).then((html) => {
              const doc = new DOMParser().parseFromString(html, "text/html");
              return { r: job.parse(doc), source: job.name };
            });
          }
          if (typeof fetch === "function") {
            const winner = await new Promise((resolve) => {
              let dead = 0;
              function done(v) {
                if (v && v.r.length) resolve(v);
                else if (++dead === 2) resolve(null);
              }
              tryProvider({ name: "Google", url: gUrl(q), parse: parseGoogle }, 15000).then(done, () => done(null));
              tryProvider({ name: "DuckDuckGo", url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), parse: parseDDG }, 25000).then(done, () => done(null));
            });
            if (winner) {
              results = winner.r;
              source = winner.source;
            }
          }
          if (my !== searchSeq) return;
          if (!results.length) {
            view.innerHTML =
              '<div class="brave-home"><h2>No clean results</h2>' +
              '<p class="brave-note">' + esc(err || "No usable results this time.") + " Real Google is one click away though.</p>" +
              '<div class="brave-tiles"><button data-goto="' + esc(gUrl(q)) + '">Open Google ↗</button></div></div>';
          } else {
            view.innerHTML =
              '<div class="gres"><p class="gres-count">' + results.length + " results from " + esc(source) + " for “" + esc(q) + "”</p>" +
              results.map((r, i) =>
                "<div class='gcard'><img src='https://www.google.com/s2/favicons?domain=" + esc(r.host) + "&sz=32' alt='' onerror='this.remove()' />" +
                "<div class='gmain'><button class='gtitle' data-i='" + i + "'>" + esc(r.title) + "</button>" +
                "<span class='gurl'>" + esc(r.host) + "</span>" +
                (r.snip ? "<p>" + esc(r.snip) + "</p>" : "") +
                "<span class='gacts'><button data-i='" + i + "'>Open</button><button data-x='" + i + "'>↗</button></span></div></div>"
              ).join("") +
              '<button class="gres-more" data-goto="' + esc(gUrl(q)) + '">More on Google ↗</button></div>';
          }
          view.querySelectorAll("[data-i]").forEach((b) => {
            b.addEventListener("click", () => openUrl(results[+b.dataset.i].url));
          });
          view.querySelectorAll("[data-x]").forEach((b) => {
            b.addEventListener("click", () => window.open(results[+b.dataset.x].url, "_blank", "noopener"));
          });
          view.querySelectorAll("[data-goto]").forEach((b) => {
            b.addEventListener("click", () => window.open(b.dataset.goto, "_blank", "noopener"));
          });
        }
        function renderHome() {
          view.innerHTML = HOME_HTML;
          wireTiles(view);
          input.value = "";
          paintBtns();
        }
        function home(push) {
          if (push !== false) {
            hist.length = hi + 1;
            hist.push("lunix://home");
            hi = hist.length - 1;
          }
          renderHome();
        }
        function wireTiles(root) {
          root.querySelectorAll("[data-u]").forEach((b) => {
            b.addEventListener("click", () => {
              const u = b.dataset.u;
              if (u.indexOf("newtab:") === 0) window.open(u.slice(7), "_blank", "noopener");
              else go(u);
            });
          });
        }
        wireTiles(body);
        form.addEventListener("submit", (e) => { e.preventDefault(); go(input.value); });
        function stepBackFwd(dir) {
          const ni = hi + dir;
          if (ni < 0 || ni >= hist.length) return;
          hi = ni;
          const cur = hist[hi];
          if (cur === "lunix://home") renderHome();
          else if (cur.indexOf("lunix://search:") === 0) searchGoogle(cur.slice(15), false);
          else go(cur, false);
        }
        body.querySelector('[data-b="back"]').addEventListener("click", () => stepBackFwd(-1));
        body.querySelector('[data-b="fwd"]').addEventListener("click", () => stepBackFwd(1));
        body.querySelector('[data-b="reload"]').addEventListener("click", () => {
          const cur = hi >= 0 ? hist[hi] : "";
          if (!cur || cur === "lunix://home") renderHome();
          else if (cur.indexOf("lunix://search:") === 0) searchGoogle(cur.slice(15), false);
          else {
            const f = view.querySelector("iframe");
            if (f) f.src = f.src;
          }
        });
        body.querySelector('[data-b="ext"]').addEventListener("click", () => {
          const s = input.value.trim();
          if (!s) return;
          window.open(isSearch(s) ? gUrl(s) : norm(s), "_blank", "noopener");
        });
        body.querySelector('[data-b="home"]').addEventListener("click", home);
        paintBtns();
      },
    },
    terminal: {
      name: "Terminal", icon: "terminal", size: [620, 420],
      render(body, api) {
        body.innerHTML = '<div class="lterm"></div><form class="lterm-row"><span><b>omhackz@cachy-os</b>:<i>~</i>$</span><input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input" /></form>';
        const out = body.querySelector(".lterm");
        const form = body.querySelector("form");
        const inp = body.querySelector("input");
        const bootAt = Date.now() - (3 * 3600 + 42 * 60) * 1000;
        function uptime() {
          const s = Math.floor((Date.now() - bootAt) / 1000);
          const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
          return hh > 0 ? hh + " hours, " + mm + " mins" : mm + " mins";
        }
        const LOGO = [
          "           .-------------------------:",
          "          .+=========================.",
          "         :++===++==================-       :++-",
          "        :*++====+++++=============-        .==:",
          "       -*+++=====+***++==========:",
          "      =*++++========------------:",
          "     =*+++++=====-                     ...",
          "   .+*+++++=-===:                    .=+++=:",
          "  :++++=====-==:                     -*****+",
          " :++========-=.                      .=+**+.",
          ".+==========-.                          .",
          " :+++++++====-                                .--==-.",
          "  :++==========.                             :+++++++:",
          "   .-===========.                            =*****+*+",
          "    .-===========:                           .+*****+:",
          "      -=======++++:::::::::::::::::::::::::-:  .---:",
          "       :======++++====+++******************=.",
          "        :=====+++==========++++++++++++++*-",
          "         .====++==============++++++++++*-",
          "          .===+==================+++++++:",
          "           .-=======================+++:",
          "             ..........................",
        ];
        function say(t, cls) {
          const d = document.createElement("div");
          if (cls) d.className = cls;
          d.textContent = t;
          out.appendChild(d);
          out.scrollTop = out.scrollHeight;
        }
        function neofetch() {
          const pre = document.createElement("pre");
          pre.textContent = LOGO.join("\n");
          out.appendChild(pre);
          const rows = [
            ["OS", "CachyOS x86_64"], ["Kernel", "Linux 7.2.7-1-cachyos"],
            ["Uptime", uptime()], ["Shell", "bash 5.3.20"],
            ["DE", "Lunix 1.0 (macOS buttons edition)"],
            ["CPU", "Intel(R) Core(TM) i5-3570K (4) @ 3.80 GHz"],
            ["GPU", "Intel HD Graphics 4000 [Integrated]"],
            ["Memory", "3.54 GiB / 7.63 GiB (46%)"],
          ];
          rows.forEach(([k, v]) => {
            const d = document.createElement("div");
            d.innerHTML = "<span class='k'>" + esc(k) + ":</span> " + esc(v);
            out.appendChild(d);
          });
          out.scrollTop = out.scrollHeight;
        }
        let cwd = [];
        function at(p) {
          let n = LFS;
          for (const x of p) {
            if (!n || typeof n !== "object" || !(x in n)) return undefined;
            n = n[x];
          }
          return n;
        }
        const OPENABLE = { files: 1, brave: 1, terminal: 1, mine: 1, minicraft: 1, textedit: 1, trash: 1, about: 1 };
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const raw = inp.value;
          say("omhackz@cachy-os:" + (cwd.length ? cwd[cwd.length - 1] : "~") + "$ " + raw, "dim");
          inp.value = "";
          const parts = raw.trim().split(/\s+/).filter(Boolean);
          if (!parts.length) return;
          const [cmd, ...a] = parts;
          if (cmd === "help") say("commands: help neofetch open ls cd pwd cat echo whoami date clear", "acc");
          else if (cmd === "neofetch" || cmd === "fastfetch") neofetch();
          else if (cmd === "open") {
            const t = (a[0] || "").toLowerCase();
            if (OPENABLE[t]) { say("opening " + t + "…", "acc"); openApp(t); }
            else say("open what? try: files brave terminal mine minicraft textedit trash about", "err");
          } else if (cmd === "ls") {
            const n = at(cwd);
            say(typeof n === "object" && n !== null ? Object.keys(n).map((k) => (typeof n[k] === "object" ? k + "/" : k)).join("   ") : "(empty)");
          } else if (cmd === "cd") {
            const t = a[0] || "~";
            let np = t === "~" || t === "/" ? [] : t === ".." ? cwd.slice(0, -1) : [...cwd, t];
            const n = at(np);
            if (n && typeof n === "object") cwd = np;
            else say("bash: cd: " + t + ": No such directory", "err");
          } else if (cmd === "pwd") say("/home/omhackz" + (cwd.length ? "/" + cwd.join("/") : ""));
          else if (cmd === "cat") {
            const f = a[0] && !a[0].includes("/") ? (at(cwd) || {})[a[0]] : undefined;
            if (typeof f === "string") say(readFile([...cwd, a[0]]) ?? f);
            else say("cat: " + (a[0] || "") + ": No such file", "err");
          } else if (cmd === "echo") say(a.join(" ").replace(/^["']|["']$/g, ""));
          else if (cmd === "whoami") say("omhackz");
          else if (cmd === "date") say(new Date().toString());
          else if (cmd === "clear") out.innerHTML = "";
          else if (cmd === "sudo") say("[sudo] password for omhackz: this is a demo. breathe.", "err");
          else say("bash: " + cmd + ": command not found. try `help`", "err");
        });
        body.addEventListener("click", () => inp.focus());
        say("lunix terminal — type `help`. `open mine` is the fun one.", "dim");
        setTimeout(() => inp.focus(), 100);
      },
    },
    mine: {
      name: "Arcade", icon: "mine", size: [600, 620],
      render(body) {
        body.innerHTML =
          '<div class="larc"><div class="larc-tabs" role="tablist">' +
          '<button data-lt="ttt" class="on" role="tab">TicTacToe</button>' +
          '<button data-lt="mines" role="tab">Mines</button>' +
          '<button data-lt="n2048" role="tab">2048</button></div>' +
          '<div class="larc-body"><div data-lp="ttt"></div><div data-lp="mines" hidden></div><div data-lp="n2048" hidden></div></div></div>';
        buildMiniTTT(body.querySelector('[data-lp="ttt"]'));
        buildMiniMines(body.querySelector('[data-lp="mines"]'));
        buildMini2048(body.querySelector('[data-lp="n2048"]'));
        body.querySelectorAll("[data-lt]").forEach((b) => {
          b.addEventListener("click", () => {
            body.querySelectorAll("[data-lt]").forEach((x) => x.classList.toggle("on", x === b));
            body.querySelectorAll("[data-lp]").forEach((p) => { p.hidden = p.dataset.lp !== b.dataset.lt; });
            lArc.tab = b.dataset.lt;
          });
        });
      },
    },
    minicraft: {
      name: "Mini Minecraft", icon: "cube", size: [980, 660],
      render(body) {
        body.innerHTML = "";
        const f = document.createElement("iframe");
        f.setAttribute("title", "Mini Minecraft");
        f.setAttribute("allowfullscreen", "");
        f.style.cssText = "width:100%;height:100%;border:none;background:#000;";
        f.src = "minecraft.html";
        body.appendChild(f);
        f.addEventListener("load", () => {
          try { f.contentWindow.focus(); } catch {}
        });
      },
    },
    about: {
      name: "About", icon: "textedit", size: [420, 380],
      render(body, api) {
        body.innerHTML =
          '<div class="about-win">' +
          '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="38" height="38" rx="11" /><path d="m17 20 5 5-5 5M24 30h7" /></svg>' +
          "<h3>Lunix 1.0</h3><p>“Cachy” — a tiny desktop inside a portfolio.<br>Now with 100% more traffic lights.</p>" +
          '<div class="spec-list">' +
          "<div><span>OS</span><span>CachyOS x86_64</span></div>" +
          "<div><span>Kernel</span><span>7.2.7-1-cachyos</span></div>" +
          "<div><span>CPU</span><span>i5-3570K (4) @ 3.80 GHz</span></div>" +
          "<div><span>GPU</span><span>Intel HD 4000</span></div>" +
          "<div><span>Shell</span><span>bash 5.3.20</span></div>" +
          "</div></div>";
      },
    },
    trash: {
      name: "Trash", icon: "trash", size: [380, 260],
      render(body) {
        const jokes = [
          "Trash is empty. Like my inbox.",
          "Still empty. Suspiciously clean.",
          "Nothing here. The robot took it.",
        ];
        let i = 0;
        body.innerHTML =
          '<div class="trash-win">' + IC.trash +
          "<p>Trash is empty. Like my inbox.</p>" +
          '<button type="button">Empty Trash</button></div>';
        const p = body.querySelector("p");
        body.querySelector("button").addEventListener("click", () => {
          i = (i + 1) % jokes.length;
          p.textContent = jokes[i];
        });
      },
    },
  };

  // ----- dock + desktop icons -----
  const DOCK_ORDER = ["files", "brave", "terminal", "minicraft", "mine", "textedit", "trash"];
  const DESK_ORDER = ["files", "brave", "terminal", "minicraft"];
  function label(id) {
    return APPS[id].name;
  }
  DOCK_ORDER.forEach((id) => {
    const b = document.createElement("button");
    b.className = "dock-btn";
    b.dataset.app = id;
    b.setAttribute("aria-label", "Open " + label(id));
    b.innerHTML = IC[APPS[id].icon] + '<span class="dock-tip">' + esc(label(id)) + "</span>";
    b.addEventListener("click", () => {
      const w = wins.get(id);
      if (w && w.el.style.display !== "none" && w.el.style.zIndex === String(zTop)) {
        w.el.style.display = "none";
      } else {
        openApp(id);
      }
      syncDock();
    });
    dockEl.appendChild(b);
  });
  DESK_ORDER.forEach((id) => {
    const d = document.createElement("div");
    d.className = "dicon";
    d.tabIndex = 0;
    d.innerHTML = IC[APPS[id].icon] + "<span>" + esc(label(id)) + "</span>";
    d.addEventListener("click", () => {
      diconsEl.querySelectorAll(".dicon").forEach((x) => x.classList.remove("sel"));
      d.classList.add("sel");
    });
    d.addEventListener("dblclick", () => openApp(id));
    d.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openApp(id);
    });
    diconsEl.appendChild(d);
  });
  desktop.addEventListener("click", (e) => {
    if (e.target === desktop || e.target === winsBox) {
      diconsEl.querySelectorAll(".dicon").forEach((x) => x.classList.remove("sel"));
    }
    if (mbMenu && !mbMenu.hidden && !e.target.closest(".mb-menu") && !e.target.closest("#mbLogo")) {
      mbMenu.hidden = true;
      if (mbLogo) mbLogo.setAttribute("aria-expanded", "false");
    }
  });

  // ----- menu bar -----
  window.addEventListener("keydown", (e) => {
    if (focusedApp !== "mine" || lArc.tab !== "n2048") return;
    const w = wins.get("mine");
    if (!w || w.el.style.display === "none") return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = (e.key || "").toLowerCase();
    const map = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    if (map[k] && lArc.move2048) {
      e.preventDefault();
      lArc.move2048(map[k]);
    }
  });
  if (mbLogo && mbMenu) {
    mbLogo.addEventListener("click", (e) => {
      e.stopPropagation();
      mbMenu.hidden = !mbMenu.hidden;
      mbLogo.setAttribute("aria-expanded", String(!mbMenu.hidden));
    });
    mbMenu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        mbMenu.hidden = true;
        mbLogo.setAttribute("aria-expanded", "false");
        const k = b.dataset.mb;
        if (k === "about") openApp("about");
        else if (k === "back") window.location.href = "index.html";
        else if (k === "shut") {
          const s = document.getElementById("shut");
          if (s) s.hidden = false;
        }
      });
    });
  }
  function tickClock() {
    if (!mbClock) return;
    const d = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    mbClock.textContent = days[d.getDay()] + " " + mon[d.getMonth()] + " " + d.getDate() + "  " + hh + ":" + mm;
  }
  tickClock();
  setInterval(tickClock, 10000);
  try {
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        function paint() {
          if (mbBatt) {
            mbBatt.hidden = false;
            mbBatt.textContent = Math.round(b.level * 100) + "%" + (b.charging ? " ⚡" : "");
          }
        }
        paint();
        b.addEventListener("levelchange", paint);
        b.addEventListener("chargingchange", paint);
      }).catch(() => {});
    }
  } catch {}

  // ----- boot + shutdown -----
  window.addEventListener("load", () => {
    setTimeout(() => {
      const boot = document.getElementById("boot");
      if (boot) boot.classList.add("done");
    }, 1400);
  });
  setTimeout(() => {
    const boot = document.getElementById("boot");
    if (boot) boot.classList.add("done");
  }, 3500);
  const reboot = document.getElementById("shutReboot");
  if (reboot) reboot.addEventListener("click", () => window.location.reload());
})();
