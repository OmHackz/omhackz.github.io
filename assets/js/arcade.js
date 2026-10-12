// ---------- Arcade (assets/js/arcade.js) ----------
const vault = {
  get(k, fb) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fb : v;
    } catch { return fb; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch {}
  },
};

function scoresChanged() {
  document.dispatchEvent(new CustomEvent("arcade:scores"));
}

// ---------- Arcade tabs ----------
(function tabs() {
  const tabBtns = [...document.querySelectorAll(".game-tab")];
  const panels = [...document.querySelectorAll(".game-panel")];
  if (!tabBtns.length) return;
  function activate(name, push) {
    const btn = tabBtns.find((b) => b.dataset.game === name);
    if (!btn) return;
    if (push) history.replaceState(null, "", "#" + name);
    btn.click();
  }
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", String(on));
      });
      panels.forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + btn.dataset.game));
      try { history.replaceState(null, "", "#" + btn.dataset.game); } catch {}
      document.dispatchEvent(new CustomEvent("arcade:switch", { detail: btn.dataset.game }));
    });
  });
  // deep-link: games.html#ttt / #mines / #n2048
  const first = (location.hash || "").replace("#", "");
  if (first) activate(first, false);
  window.addEventListener("hashchange", () => {
    activate((location.hash || "").replace("#", ""), false);
  });
})();

// shared swipe helper (touch)
function onSwipe(el, cb) {
  if (!el) return;
  let x0 = 0;
  let y0 = 0;
  el.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    x0 = t.clientX;
    y0 = t.clientY;
  }, { passive: true });
  el.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }, { passive: true });
}

function panelActive(id) {
  const p = document.getElementById(id);
  return p && p.classList.contains("is-active");
}

// ---------- Tic Tac Toe vs Robot ----------
(function ttt() {
  const grid = document.getElementById("tttGrid");
  if (!grid) return;
  const cells = [...grid.querySelectorAll("button")];
  const wrap = document.getElementById("tttWrap");
  const strike = document.getElementById("tttStrike");
  const strikeLine = document.getElementById("tttStrikeLine");
  const statusEl = document.getElementById("tttStatus");
  const youEl = document.getElementById("tttYou");
  const robotEl = document.getElementById("tttRobot");
  const drawsEl = document.getElementById("tttDraws");
  const chipYou = document.getElementById("tttChipYou");
  const chipRobot = document.getElementById("tttChipRobot");
  const turnYou = document.getElementById("tttTurnYou");
  const turnRobot = document.getElementById("tttTurnRobot");
  const restartBtn = document.getElementById("tttRestart");
  const diffBtns = [...document.querySelectorAll("[data-ttt-diff]")];

  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const DIFFS = {
    easy: { label: "Easy", delay: 320, note: "Easy mode — the robot is barely awake." },
    medium: { label: "Medium", delay: 430, note: "Medium mode — it blocks, but it blunders." },
    hard: { label: "Hard", delay: 560, note: "Hard mode — it never loses. Good luck." },
  };
  let record = { you: 0, robot: 0, draws: 0 };
  try {
    const raw = JSON.parse(vault.get("omhackz_ttt", '{"you":0,"robot":0,"draws":0}'));
    if (raw && typeof raw === "object") {
      record = { you: raw.you | 0, robot: raw.robot | 0, draws: raw.draws | 0 };
    }
  } catch {}
  let diff = vault.get("omhackz_ttt_diff", "medium");
  if (!DIFFS[diff]) diff = "medium";

  let board, over, lock, starter;

  function bump(el) {
    if (!el) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function badge() {
    const el = document.getElementById("pickBestTtt");
    if (el) el.textContent = record.you + "W \u2013 " + record.robot + "L \u00B7 " + DIFFS[diff].label;
  }

  function paint() {
    youEl.textContent = record.you;
    robotEl.textContent = record.robot;
    drawsEl.textContent = record.draws;
    vault.set("omhackz_ttt", JSON.stringify(record));
    badge();
  }

  function syncDiffUI() {
    diffBtns.forEach((b) => {
      const on = b.dataset.tttDiff === diff;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function setTurn(mark) {
    const yours = mark === "X";
    turnYou.classList.toggle("on", yours && !over);
    turnRobot.classList.toggle("on", !yours && !over);
    grid.classList.toggle("playable", yours && !over && !lock);
  }

  function xSVG() {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path class="draw" pathLength="1" d="M28 28 L72 72"/>' +
      '<path class="draw d2" pathLength="1" d="M72 28 L28 72"/></svg>';
  }

  function oSVG() {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="draw" pathLength="1" cx="50" cy="50" r="23"/></svg>';
  }

  function hideStrike() {
    if (strike) strike.classList.remove("show");
    if (strikeLine) {
      strikeLine.style.strokeDasharray = "none";
      strikeLine.style.strokeDashoffset = "0";
      strikeLine.setAttribute("x1", "0");
      strikeLine.setAttribute("y1", "0");
      strikeLine.setAttribute("x2", "0");
      strikeLine.setAttribute("y2", "0");
    }
  }

  function showStrike(line) {
    if (!strike || !strikeLine || !wrap) return;
    const c0 = cells[line[0]];
    const c2 = cells[line[2]];
    const x1 = c0.offsetLeft + c0.offsetWidth / 2;
    const y1 = c0.offsetTop + c0.offsetHeight / 2;
    const x2 = c2.offsetLeft + c2.offsetWidth / 2;
    const y2 = c2.offsetTop + c2.offsetHeight / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const pad = c0.offsetWidth * 0.42;
    strikeLine.setAttribute("x1", x1 - (dx / len) * pad);
    strikeLine.setAttribute("y1", y1 - (dy / len) * pad);
    strikeLine.setAttribute("x2", x2 + (dx / len) * pad);
    strikeLine.setAttribute("y2", y2 + (dy / len) * pad);
    const total = len + pad * 2;
    strikeLine.style.strokeDasharray = String(total);
    strikeLine.style.strokeDashoffset = String(total);
    strike.classList.remove("show");
    void strike.getBoundingClientRect();
    requestAnimationFrame(() => {
      strike.classList.add("show");
      strikeLine.style.strokeDashoffset = "0";
    });
  }

  function reset() {
    board = Array(9).fill("");
    over = false;
    lock = false;
    starter = starter === "X" ? "O" : "X";
    cells.forEach((c) => { c.innerHTML = ""; c.className = ""; });
    hideStrike();
    grid.classList.remove("fresh");
    void grid.offsetWidth;
    grid.classList.add("fresh");
    if (starter === "O") {
      setTurn("O");
      statusEl.textContent = "Robot opens this round…";
      lock = true;
      setTimeout(robot, 650);
    } else {
      setTurn("X");
      statusEl.textContent = "Your move, human. You open.";
    }
  }

  function winner(b) {
    for (const line of LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line };
    }
    return b.includes("") ? null : { who: "draw", line: [] };
  }

  function finish(result) {
    over = true;
    lock = false;
    setTurn(null);
    if (result.who === "draw") {
      record.draws++;
      statusEl.textContent = "Draw on " + DIFFS[diff].label + ". Nobody blinks.";
    } else {
      result.line.forEach((i) => cells[i].classList.add("win"));
      showStrike(result.line);
      if (result.who === "X") {
        record.you++;
        bump(chipYou);
        statusEl.textContent = diff === "hard"
          ? "You beat Hard mode. The robot is recalculating everything."
          : "You beat the robot. It demands a rematch.";
      } else {
        record.robot++;
        bump(chipRobot);
        statusEl.textContent = "Robot wins on " + DIFFS[diff].label + ". It has logged your defeat.";
      }
    }
    paint();
    scoresChanged();
  }

  function place(i, mark) {
    board[i] = mark;
    cells[i].innerHTML = mark === "X" ? xSVG() : oSVG();
    cells[i].classList.remove("placed");
    void cells[i].offsetWidth;
    cells[i].classList.add("placed");
    if (mark === "O") cells[i].classList.add("o");
  }

  function findMove(mark) {
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = mark;
      const w = winner(board);
      const wins = w && w.who === mark;
      board[i] = "";
      if (wins) return i;
    }
    return -1;
  }

  function minimax(b, isMax, depth) {
    const w = winner(b);
    if (w) {
      if (w.who === "O") return 10 - depth;
      if (w.who === "X") return depth - 10;
      return 0;
    }
    let v = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = isMax ? "O" : "X";
      const s = minimax(b, !isMax, depth + 1);
      b[i] = "";
      v = isMax ? Math.max(v, s) : Math.min(v, s);
    }
    return v;
  }

  function perfectMove() {
    let bi = -1;
    let bv = -Infinity;
    const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (const i of order) {
      if (board[i]) continue;
      board[i] = "O";
      const v = minimax(board, false, 0);
      board[i] = "";
      if (v > bv) { bv = v; bi = i; }
    }
    return bi;
  }

  function cleverMove() {
    let move = findMove("O");
    if (move < 0) move = findMove("X");
    if (move >= 0) return move;
    const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];
    if (Math.random() < 0.22) return pick(empty);
    if (board[4] === "") return 4;
    const corners = empty.filter((i) => [0, 2, 6, 8].includes(i));
    return corners.length ? pick(corners) : pick(empty);
  }

  function robot() {
    if (over) { lock = false; setTurn("X"); return; }
    const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    let move;
    if (diff === "easy") {
      move = empty[(Math.random() * empty.length) | 0];
    } else if (diff === "hard") {
      move = perfectMove();
    } else {
      move = cleverMove();
    }
    if (move < 0 || board[move]) { lock = false; setTurn("X"); return; }
    place(move, "O");
    lock = false;
    const result = winner(board);
    if (result) finish(result);
    else {
      setTurn("X");
      statusEl.textContent = "Your move, human.";
    }
  }

  function human(i) {
    if (board[i] || over || lock) return;
    place(i, "X");
    const result = winner(board);
    if (result) return finish(result);
    lock = true;
    setTurn("O");
    statusEl.textContent = "Robot is thinking…";
    setTimeout(robot, DIFFS[diff].delay);
  }

  cells.forEach((c) => {
    c.addEventListener("click", () => human(parseInt(c.dataset.i, 10)));
  });

  window.addEventListener("keydown", (e) => {
    if (!panelActive("panel-ttt")) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) human(n - 1);
  });

  diffBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.tttDiff;
      if (!DIFFS[next] || next === diff) return;
      diff = next;
      vault.set("omhackz_ttt_diff", diff);
      syncDiffUI();
      badge();
      statusEl.textContent = DIFFS[diff].note + " Fresh board.";
      reset();
    });
  });

  restartBtn.addEventListener("click", reset);
  starter = "O";
  syncDiffUI();
  reset();
  paint();
})();

// ---------- Minesweeper ----------
(function mines() {
  const grid = document.getElementById("minesGrid");
  if (!grid) return;
  const SIZE = 9;
  const COUNT = 10;
  const leftEl = document.getElementById("minesLeft");
  const winsEl = document.getElementById("minesWins");
  const statusEl = document.getElementById("minesStatus");
  const flagBtn = document.getElementById("minesFlag");
  const restartBtn = document.getElementById("minesRestart");

  let wins = parseInt(vault.get("omhackz_mines_wins", "0"), 10) || 0;
  let cells, placed, over, flagMode, opened;

  function neighbors(i) {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
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
    if (winsEl) winsEl.textContent = wins;
    flagBtn.textContent = "Flag: off";
    flagBtn.setAttribute("aria-pressed", "false");
    flagMode = false;
    statusEl.textContent = "Clear the field. Right-click (or Flag mode) to mark mines.";
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
    let put = 0;
    while (put < COUNT) {
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
    const flags = cells.filter((c) => c.flag).length;
    leftEl.textContent = Math.max(0, COUNT - flags);
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
      c.el.dataset.n = c.n;
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
      vault.set("omhackz_mines_wins", String(wins));
      if (winsEl) winsEl.textContent = wins;
      statusEl.textContent = "Field cleared. Impressive detective work.";
      scoresChanged();
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
    statusEl.textContent = "Boom. Press Restart to try again.";
  }

  flagBtn.addEventListener("click", () => {
    flagMode = !flagMode;
    flagBtn.textContent = "Flag: " + (flagMode ? "on" : "off");
    flagBtn.setAttribute("aria-pressed", String(flagMode));
  });

  restartBtn.addEventListener("click", build);
  build();
})();

// ---------- 2048 ----------
(function n2048() {
  const boardEl = document.getElementById("n2048Board");
  if (!boardEl) return;
  const S = 4;
  const scoreEl = document.getElementById("n2048Score");
  const bestEl = document.getElementById("n2048Best");
  const statusEl = document.getElementById("n2048Status");
  const startBtn = document.getElementById("n2048Start");

  let grid, score, over, won;
  let best = parseInt(vault.get("omhackz_2048_best", "0"), 10) || 0;
  bestEl.textContent = best;

  function spawn() {
    const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) return -1;
    const i = empty[Math.floor(Math.random() * empty.length)];
    grid[i] = Math.random() < 0.9 ? 2 : 4;
    return i;
  }

  function slide(line) {
    const compact = line.filter((v) => v);
    const out = [];
    const merged = [];
    let gained = 0;
    for (let i = 0; i < compact.length; i++) {
      if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
        const v = compact[i] * 2;
        out.push(v);
        merged.push(out.length - 1);
        gained += v;
        i++;
      } else {
        out.push(compact[i]);
      }
    }
    while (out.length < S) out.push(0);
    return { out, gained, merged };
  }

  function move(dir) {
    if (over) return;
    let gained = 0;
    let changed = false;
    const mergedIdx = new Set();
    for (let l = 0; l < S; l++) {
      let line = [];
      for (let k = 0; k < S; k++) {
        const i = dir === "left" ? l * S + k
          : dir === "right" ? l * S + (S - 1 - k)
          : dir === "up" ? k * S + l
          : (S - 1 - k) * S + l;
        line.push({ i, v: grid[i] });
      }
      const res = slide(line.map((c) => c.v));
      res.out.forEach((v, k) => {
        if (grid[line[k].i] !== v) changed = true;
        grid[line[k].i] = v;
        if (res.merged.includes(k)) mergedIdx.add(line[k].i);
      });
      gained += res.gained;
    }
    if (!changed) return;
    score += gained;
    if (score > best) {
      best = score;
      vault.set("omhackz_2048_best", String(best));
    }
    const spawned = spawn();
    render(spawned < 0 ? mergedIdx : new Set([spawned, ...mergedIdx]));
    scoresChanged();
    if (!won && grid.includes(2048)) {
      won = true;
      statusEl.textContent = "2048 reached — keep going, legend.";
    }
    if (!movesLeft()) {
      over = true;
      statusEl.textContent = "No moves left — press New game.";
    }
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

  function render(pop) {
    pop = pop || new Set();
    boardEl.innerHTML = "";
    grid.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = "tile" + (v ? " t" + (v <= 2048 ? v : "super") : "") + (pop.has(i) && v ? " pop" : "");
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
    won = false;
    const a = spawn();
    const b = spawn();
    render(new Set([a, b]));
    statusEl.textContent = "Arrows / WASD or swipe. Merge your way to 2048.";
  }

  startBtn.addEventListener("click", reset);

  window.addEventListener("keydown", (e) => {
    if (!panelActive("panel-n2048")) return;
    const k = e.key.toLowerCase();
    const map = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    if (map[k]) {
      e.preventDefault();
      move(map[k]);
    }
  });

  document.querySelectorAll('[data-dpad="n2048"] button').forEach((b) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); move(b.dataset.dir); });
  });

  onSwipe(boardEl, move);
  reset();
})();

// ---------- Lifetime stats strip + picker badges ----------
(function arcadeStats() {
  function num(key) {
    return parseInt(vault.get(key, "0"), 10) || 0;
  }
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function paint() {
    const b48 = num("omhackz_2048_best");
    const mw = num("omhackz_mines_wins");
    const mc = num("omhackz_mc_mined");
    let you = 0, robot = 0;
    try {
      const r = JSON.parse(vault.get("omhackz_ttt", '{"you":0,"robot":0,"draws":0}'));
      if (r && typeof r === "object") {
        you = r.you | 0;
        robot = r.robot | 0;
      }
    } catch {}
    setText("n2048Best", b48);
    setText("stat2048", b48);
    setText("pickBest2048", "Best " + b48);
    setText("statTtt", you + "–" + robot);
    setText("statMines", mw);
    setText("pickBestMines", mw + " cleared");
    setText("minesWins", mw);
    setText("statMc", mc);
    setText("pickBestMc", mc + " mined");
    setText("mcMined", mc);
  }
  document.addEventListener("arcade:scores", paint);
  document.addEventListener("arcade:switch", paint);
  paint();
})();
