// ---------- Mini Minecraft demo (assets/js/mc.js) ----------
// 2D side-view infinite voxel demo: deterministic terrain, sprite-blitted
// rendering (only visible blocks drawn), survival / creative modes.
(function miniCraft() {
  const canvas = document.getElementById("mcCanvas");
  if (!canvas) return;
  const hudEl = document.getElementById("mcHud");
  const hotbarEl = document.getElementById("mcHotbar");
  const statusEl = document.getElementById("mcStatus");
  const fpsEl = document.getElementById("mcFps");
  const minedEl = document.getElementById("mcMined");
  const modeEl = document.getElementById("mcMode");
  const toolBtn = document.getElementById("mcToolBtn");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  // ----- block ids -----
  const AIR = 0;
  const BLOCKS = {
    1: { name: "Grass Block", tex: "grass_block_side", hard: 0.6 },
    2: { name: "Dirt", tex: "dirt", hard: 0.5 },
    3: { name: "Stone", tex: "stone", hard: 1.5 },
    4: { name: "Oak Log", tex: "oak_log", hard: 0.8 },
    5: { name: "Oak Leaves", tex: "oak_leaves", hard: 0.3 },
    6: { name: "Sand", tex: "sand", hard: 0.5 },
    7: { name: "Oak Planks", tex: "oak_planks", hard: 0.9 },
    8: { name: "Coal Ore", tex: "coal_ore", hard: 1.8, drop: 3 },
    9: { name: "Iron Ore", tex: "iron_ore", hard: 2.0, drop: 3 },
    10: { name: "Diamond Ore", tex: "diamond_ore", hard: 2.4 },
    11: { name: "Bedrock", tex: "bedrock", hard: Infinity },
    12: { name: "Glass", tex: "glass", hard: 0.5 },
    13: { name: "Cobblestone", tex: "cobblestone", hard: 1.6 },
    14: { name: "Sandstone", tex: "sandstone", hard: 1.2 },
    15: { name: "Gravel", tex: "gravel", hard: 0.5 },
    16: { name: "Clay", tex: "clay", hard: 0.6 },
    17: { name: "Bricks", tex: "bricks", hard: 1.8 },
    18: { name: "Stone Bricks", tex: "stone_bricks", hard: 1.8 },
    19: { name: "Bookshelf", tex: "bookshelf", hard: 1.0 },
    20: { name: "Pumpkin", tex: "pumpkin_side", hard: 0.6 },
    21: { name: "Melon", tex: "melon_side", hard: 0.6 },
    22: { name: "TNT", tex: "tnt_side", hard: 0.5 },
    23: { name: "Obsidian", tex: "obsidian", hard: 8 },
    24: { name: "Gold Ore", tex: "gold_ore", hard: 2.0, drop: 3 },
    25: { name: "Emerald Ore", tex: "emerald_ore", hard: 2.2, drop: 3 },
    26: { name: "Redstone Ore", tex: "redstone_ore", hard: 2.2, drop: 3 },
    27: { name: "Lapis Ore", tex: "lapis_ore", hard: 2.0, drop: 3 },
    28: { name: "Snow Block", tex: "snow_block", hard: 0.4 },
    29: { name: "Crafting Table", tex: "crafting_table_side", hard: 0.9 },
    30: { name: "Mossy Cobblestone", tex: "mossy_cobblestone", hard: 1.6 },
  };
  const GRASS = 1, DIRT = 2, STONE = 3, LOG = 4, LEAVES = 5,
    SAND = 6, PLANKS = 7, COAL = 8, IRON = 9, DIAMOND = 10, BEDROCK = 11, GLASS = 12,
    COBBLE = 13, SANDSTONE = 14, GRAVEL = 15, CLAY = 16, BRICKS = 17, SBRICK = 18,
    SHELF = 19, PUMPKIN = 20, MELON = 21, TNT = 22, OBSIDIAN = 23, GOLD = 24,
    EMERALD = 25, REDSTONE = 26, LAPIS = 27, SNOW = 28, CRAFT = 29, MOSSY = 30;
  const MAX_ID = 30;
  function nameOf(id) {
    return (BLOCKS[id] && BLOCKS[id].name) || "Block";
  }
  function hardOf(id) {
    return (BLOCKS[id] && BLOCKS[id].hard) || 1;
  }
  const DEFAULT_HOTBAR = [GRASS, DIRT, STONE, PLANKS, LOG, LEAVES, SAND, GLASS, DIAMOND];
  let HOTBAR = DEFAULT_HOTBAR.slice();
  // real vanilla textures: mcasset.cloud CDN (CORS-enabled) + embedded fallback
  const TEX_BASE = "https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/block/";
  const EMBED_MISSING = { grass_block_side: 1, pumpkin_side: 1, melon_side: 1, tnt_side: 1, crafting_table_side: 1 };

  const TILE = 26, WORLD_H = 72;
  let SAVE_KEY = "omhackz_mc";
  const MINED_KEY = "omhackz_mc_mined";
  try {
    const ns = localStorage.getItem("omhackz_mc_active");
    if (ns) SAVE_KEY = "omhackz_mc_" + ns;
  } catch {}
  const ZOOMS = [1.3, 1.0, 0.75, 0.55];
  const DIST_NAMES = ["Cozy", "Normal", "Far", "Ultra"];

  // ----- tiny storage (self-contained) -----
  const store = {
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

  // ----- state -----
  let seed = (Math.random() * 1e9) | 0;
  let mode = "survival", sel = 0, dist = 1;
  let inv = {};
  const edits = new Map();
  let mined = parseInt(store.get(MINED_KEY, "0"), 10) || 0;

  const P_W = 16, P_H = 46;
  const player = { x: 0, y: 0, vx: 0, vy: 0, onGround: false, face: 1, walk: 0 };
  let camX = 0, camY = 0, camInit = false;
  let hp = 20, fallPeak = 0, regenT = 0, shakeT = 0, shX = 0, shY = 0;
  const fuses = [];
  const fuseKeys = new Set();
  const parts = [];

  // ----- deterministic rng / noise -----
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h1(n) {
    let h = Math.imul((n | 0) ^ (seed | 0), 2654435761);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  function h2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 974711);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function v1(x) {
    const xi = Math.floor(x), f = x - xi, u = f * f * (3 - 2 * f);
    return h1(xi) * (1 - u) + h1(xi + 1) * u;
  }
  function v2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  // surface height cache (cleared each frame)
  const hCache = new Map();
  function surfH(x) {
    return Math.round(
      20 + (v1(x * 0.018) - 0.5) * 14 + (v1(x * 0.055 + 57) - 0.5) * 6 + (v1(x * 0.16 + 131) - 0.5) * 3
    );
  }
  function surfHC(x) {
    let v = hCache.get(x);
    if (v === undefined) {
      v = surfH(x);
      hCache.set(x, v);
    }
    return v;
  }
  function treeAt(tx) {
    if (h1(tx * 11 + 5) >= 0.10) return null;
    if (h1((tx - 1) * 11 + 5) < 0.10 || h1((tx + 1) * 11 + 5) < 0.10) return null;
    const g = surfHC(tx);
    if (g >= 25) return null; // no trees on beaches
    return { g, th: 4 + Math.floor(h1(tx * 17 + 3) * 2) };
  }
  function treeBlock(x, y) {
    for (let tx = x - 2; tx <= x + 2; tx++) {
      const t = treeAt(tx);
      if (!t) continue;
      const dx = x - tx, top = t.g - t.th;
      if (dx === 0 && y >= top && y < t.g) return LOG;
      if (y === top - 2 && Math.abs(dx) <= 1) return LEAVES;
      if (y === top - 1 && Math.abs(dx) <= 2 && !(Math.abs(dx) === 2 && h2(x, y) < 0.4)) return LEAVES;
      if (y === top && Math.abs(dx) <= 2 && dx !== 0) return LEAVES;
      if (y === top + 1 && Math.abs(dx) <= 1) return LEAVES;
    }
    return AIR;
  }
  function getBase(x, y) {
    if (y < 0) return AIR;
    if (y >= WORLD_H) return BEDROCK;
    const g = surfHC(x);
    if (y < g) {
      if (y >= g - 9) {
        const tb = treeBlock(x, y);
        if (tb) return tb;
      }
      if (y === g - 1 && g < 25 && g > 13) {
        const pr = h2(x * 13 + 7, 3);
        if (pr < 0.012) return PUMPKIN;
        if (pr < 0.024) return MELON;
      }
      return AIR;
    }
    if (y === WORLD_H - 1) return BEDROCK;
    if (y > g + 5 && y < WORLD_H - 2 && v2(x * 0.09, y * 0.09) > 0.74) return AIR; // caves
    if (y === g) return g >= 25 ? SAND : g <= 13 ? SNOW : GRASS;
    if (y <= g + 3) return g >= 25 ? SAND : DIRT;
    if (g >= 25 && y <= g + 6) return SANDSTONE;
    const r = h2(x, y * 3 + 1);
    const r2 = h2(x + 99, y * 3 + 1);
    if (y > g + 3 && y <= g + 12 && r >= 0.02 && r < 0.035) return CLAY;
    if (y > g + 3 && r < 0.02) return GRAVEL;
    if (y > g + 38 && r2 < 0.010) return OBSIDIAN;
    if (y > g + 30 && r2 < 0.022) return GOLD;
    if (y > g + 28 && r < 0.010) return DIAMOND;
    if (y > g + 22 && r2 < 0.038) return REDSTONE;
    if (y > g + 20 && r2 < 0.052) return EMERALD;
    if (y > g + 16 && r < 0.022) return IRON;
    if (y > g + 14 && r2 < 0.066) return LAPIS;
    if (y > g + 7 && r < 0.035) return COAL;
    return STONE;
  }
  function getBlock(x, y) {
    const k = x + "," + y;
    if (edits.has(k)) return edits.get(k);
    return getBase(x, y);
  }
  function setBlock(x, y, v) {
    edits.set(x + "," + y, v);
    if (edits.size > 6000) edits.delete(edits.keys().next().value);
    save();
  }
  function solid(id) {
    return id !== AIR;
  }

  // ----- save / load -----
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(saveNow, 600);
  }
  function saveNow() {
    try {
      const arr = [];
      let i = 0;
      for (const entry of edits) {
        if (i++ >= 4000) break;
        const parts = entry[0].split(",");
        arr.push([parseInt(parts[0], 10), parseInt(parts[1], 10), entry[1]]);
      }
      store.set(SAVE_KEY, JSON.stringify({
        seed, mode, sel, dist, hp,
        px: Math.round(player.x), py: Math.round(player.y),
        inv, edits: arr, hotbar: HOTBAR,
      }));
    } catch {}
  }
  function load() {
    try {
      const raw = store.get(SAVE_KEY, null);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object") return false;
      if (typeof d.seed === "number") seed = d.seed | 0;
      if (d.mode === "creative" || d.mode === "survival") mode = d.mode;
      if (Number.isInteger(d.sel)) sel = Math.min(8, Math.max(0, d.sel));
      if (Number.isInteger(d.dist)) dist = Math.min(3, Math.max(0, d.dist));
      if (d.inv && typeof d.inv === "object") inv = d.inv;
      if (typeof d.hp === "number") hp = Math.min(20, Math.max(1, Math.round(d.hp)));
      if (Array.isArray(d.hotbar)) {
        const hb = d.hotbar.filter(function (v) { return Number.isInteger(v) && v >= 1 && v <= MAX_ID; });
        if (hb.length === 9) HOTBAR = hb;
      }
      if (Array.isArray(d.edits)) {
        d.edits.slice(0, 4000).forEach(function (e) {
          if (Array.isArray(e) && Number.isInteger(e[0]) && Number.isInteger(e[1]) && e[2] >= 0 && e[2] <= MAX_ID) {
            edits.set(e[0] + "," + e[1], e[2]);
          }
        });
      }
      if (typeof d.px === "number" && typeof d.py === "number") {
        player.x = d.px;
        player.y = d.py;
        return true;
      }
    } catch {}
    return false;
  }

  // ----- block sprites (painted once, blitted per frame) -----
  const SPR = {};
  function buildSprites() {
    const S = 32, P = 4, N = 8;
    function mk(type, c) {
      const cv = document.createElement("canvas");
      cv.width = S; cv.height = S;
      const g = cv.getContext("2d");
      g.fillStyle = c;
      g.fillRect(0, 0, S, S);
      SPR[type] = { cv, g };
      return g;
    }
    function speckle(g, rnd, n, colors) {
      for (let i = 0; i < n; i++) {
        g.fillStyle = colors[(rnd() * colors.length) | 0];
        g.fillRect(((rnd() * N) | 0) * P, ((rnd() * N) | 0) * P, P, P);
      }
    }
    function blob(g, rnd, c) {
      g.fillStyle = c;
      for (let i = 0; i < 4; i++) {
        g.fillRect((1 + ((rnd() * 6) | 0)) * P, (1 + ((rnd() * 6) | 0)) * P, P * 2, P * 2);
      }
    }
    let rnd, g, i;

    // dirt (also the base of grass)
    rnd = mulberry(2 * 7919 + 13);
    g = mk(DIRT, "#7a5230");
    speckle(g, rnd, 14, ["#5f3f24", "#93704a", "#6b4a2c"]);

    // grass
    rnd = mulberry(1 * 7919 + 13);
    g = mk(GRASS, "#7a5230");
    speckle(g, rnd, 12, ["#5f3f24", "#93704a"]);
    for (i = 0; i < N; i++) {
      const depth = 2 + (rnd() < 0.5 ? 1 : 0);
      g.fillStyle = i % 2 ? "#4c9a44" : "#5cb85c";
      g.fillRect(i * P, 0, P, depth * P);
    }

    // stone
    rnd = mulberry(3 * 7919 + 13);
    g = mk(STONE, "#8a8d91");
    speckle(g, rnd, 14, ["#6f7276", "#a3a6aa", "#7d8085"]);

    // log
    rnd = mulberry(4 * 7919 + 13);
    g = mk(LOG, "#6b4a2b");
    g.fillStyle = "#4e3420";
    [1, 4, 6].forEach(function (c) { g.fillRect(c * P, 0, P, S); });
    g.fillStyle = "#8a6238";
    g.fillRect(3 * P, 0, P, S);
    speckle(g, rnd, 5, ["#4e3420"]);

    // leaves
    rnd = mulberry(5 * 7919 + 13);
    g = mk(LEAVES, "#2f7d32");
    speckle(g, rnd, 16, ["#1d5220", "#46a04a", "#256b28"]);

    // sand
    rnd = mulberry(6 * 7919 + 13);
    g = mk(SAND, "#dcc88f");
    speckle(g, rnd, 14, ["#c9b377", "#efe0b3"]);

    // planks
    rnd = mulberry(7 * 7919 + 13);
    g = mk(PLANKS, "#a97c4f");
    g.fillStyle = "#7d5a36";
    g.fillRect(0, 2 * P, S, 2);
    g.fillRect(0, 5 * P, S, 2);
    g.fillRect(4 * P, 0, 2, 2 * P);
    g.fillRect(2 * P, 5 * P + 2, 2, 3 * P - 2);
    speckle(g, rnd, 6, ["#bd8f5e"]);

    // ores (stone base + blobs)
    [[COAL, "#2b2b2e"], [IRON, "#d8a07a"], [DIAMOND, "#7ff3ef"]].forEach(function (pair) {
      const r2 = mulberry(pair[0] * 7919 + 13);
      const g2 = mk(pair[0], "#8a8d91");
      speckle(g2, r2, 10, ["#6f7276", "#a3a6aa"]);
      blob(g2, r2, pair[1]);
    });

    // bedrock
    rnd = mulberry(11 * 7919 + 13);
    g = mk(BEDROCK, "#3a3a3f");
    for (i = 0; i < 6; i++) {
      g.fillStyle = rnd() < 0.5 ? "#232326" : "#55555c";
      g.fillRect(((rnd() * 6) | 0) * P, ((rnd() * 6) | 0) * P, P * 2, P * 2);
    }

    // glass
    g = mk(GLASS, "rgba(0,0,0,0)");
    g.clearRect(0, 0, S, S);
    g.fillStyle = "rgba(191,230,242,0.9)";
    g.fillRect(0, 0, S, 3);
    g.fillRect(0, S - 3, S, 3);
    g.fillRect(0, 0, 3, S);
    g.fillRect(S - 3, 0, 3, S);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(6, 18, 4, 8);
    g.fillRect(10, 10, 4, 8);

    // more blocks: simple speckled fallbacks (CDN textures upgrade these live)
    const EXTRA = {
      13: ["#7d7d7d", ["#5f5f5f", "#959595"]],
      14: ["#d6c08a", ["#c2a972", "#e8d6a4"]],
      15: ["#8a7f72", ["#6b6259", "#a89c8d", "#5d564d"]],
      16: ["#9aa4b5", ["#7e8a9e", "#b3bccd"]],
      17: ["#96543f", ["#a86a4e"]],
      18: ["#757575", ["#5c5c5c", "#8f8f8f"]],
      19: ["#8a6238", ["#9c7043"]],
      20: ["#c8821e", ["#a86a14", "#e0a53c"]],
      21: ["#5da244", ["#4a8034", "#77b95c"]],
      22: ["#c93a26", ["#a02c1c", "#e05a40"]],
      23: ["#1a1226", ["#2c2140", "#0d0916"]],
      24: ["#8a8d91", ["#6f7276"]],
      25: ["#8a8d91", ["#6f7276"]],
      26: ["#8a8d91", ["#6f7276"]],
      27: ["#8a8d91", ["#6f7276"]],
      28: ["#eef4f4", ["#d9e6e6", "#ffffff"]],
      29: ["#a97c4f", ["#bd8f5e"]],
      30: ["#6f7a68", ["#59634f", "#828d77"]],
    };
    Object.keys(EXTRA).forEach(function (k) {
      const r3 = mulberry(k * 7919 + 13);
      const gg = mk(+k, EXTRA[k][0]);
      speckle(gg, r3, 12, EXTRA[k][1]);
    });
    // bricks mortar lines
    g = SPR[BRICKS].g;
    g.fillStyle = "#c9bda8";
    g.fillRect(0, 10, S, 3);
    g.fillRect(0, 22, S, 3);
    g.fillRect(14, 0, 3, 10);
    g.fillRect(6, 13, 3, 9);
    g.fillRect(22, 13, 3, 9);
    g.fillRect(14, 25, 3, 7);
    // stone bricks border
    g = SPR[SBRICK].g;
    g.fillStyle = "#4a4a4a";
    g.fillRect(0, 0, S, 2);
    g.fillRect(0, S - 2, S, 2);
    g.fillRect(0, 0, 2, S);
    g.fillRect(S - 2, 0, 2, S);
    g.fillRect(0, 15, S, 2);
    // bookshelf shelves + books
    g = SPR[SHELF].g;
    g.fillStyle = "#4e3420";
    g.fillRect(0, 0, S, 4);
    g.fillRect(0, 14, S, 4);
    g.fillRect(0, 28, S, 4);
    rnd = mulberry(1913);
    for (i = 0; i < 8; i++) {
      g.fillStyle = ["#b03a2e", "#2e6fb0", "#3aa655", "#d9c53a"][i % 4];
      g.fillRect(2 + i * 4, 5 + (rnd() < 0.5 ? 0 : 1), 3, 9);
      g.fillRect(2 + i * 4, 19, 3, 9);
    }
    // ore blobs on stone base
    const ORE_C = { 24: "#f5d020", 25: "#3fd44f", 26: "#e02a1a", 27: "#2a4fe0" };
    Object.keys(ORE_C).forEach(function (k) {
      blob(SPR[+k].g, mulberry(k * 331 + 7), ORE_C[k]);
    });
    // crafting table grid
    g = SPR[CRAFT].g;
    g.fillStyle = "#5d4227";
    g.fillRect(0, 0, S, 3);
    g.fillRect(0, S - 3, S, 3);
    g.fillStyle = "#3d2c18";
    for (i = 1; i < 4; i++) {
      g.fillRect(i * 8, 3, 2, S - 6);
      g.fillRect(3, i * 8, S - 6, 2);
    }
    tintLeaves();
  }

  // ----- biome-tinted leaves (plains / lush / dry / snowy) -----
  const LEAF_TINTS = ["#c2ffa6", "#93e87e", "#ffe98f", "#dcefff"];
  let leafVariants = [];
  function biomeAt(x) {
    const g = surfHC(x);
    if (g <= 13) return 3; // snowy peaks
    if (g >= 25) return 2; // dry beaches
    const m = v1(x * 0.011 + 900);
    if (m < 0.35) return 2; // dry savanna
    if (m > 0.68) return 1; // lush forest
    return 0; // plains
  }
  function tintLeaves() {
    const src = SPR[LEAVES] && SPR[LEAVES].cv;
    if (!src) return;
    leafVariants = LEAF_TINTS.map(function (tint) {
      const cv = document.createElement("canvas");
      cv.width = 32;
      cv.height = 32;
      const gg = cv.getContext("2d");
      gg.imageSmoothingEnabled = false;
      gg.drawImage(src, 0, 0);
      gg.globalCompositeOperation = "multiply";
      gg.fillStyle = tint;
      gg.fillRect(0, 0, 32, 32);
      gg.globalCompositeOperation = "destination-in";
      gg.drawImage(src, 0, 0);
      gg.globalCompositeOperation = "source-over";
      return cv;
    });
    SPR[LEAVES] = { cv: leafVariants[0], g: leafVariants[0].getContext("2d") };
  }

  // ----- real vanilla textures via CDN (mcasset.cloud, CORS-enabled) -----
  function loadImg(src) {
    return new Promise(function (res) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function applyTex(id, img) {
    try {
      const cv = document.createElement("canvas");
      cv.width = 32;
      cv.height = 32;
      const gg = cv.getContext("2d");
      gg.imageSmoothingEnabled = false;
      gg.clearRect(0, 0, 32, 32);
      gg.drawImage(img, 0, 0, 32, 32);
      SPR[id] = { cv, g: gg };
    } catch {}
  }
  let texJSONPromise = null;
  function getTexJSON() {
    if (!texJSONPromise) {
      const urls = [
        "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4/texture_content.json",
        "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.4/texture_content.json",
      ];
      texJSONPromise = (async function () {
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (!r.ok) continue;
            const arr = await r.json();
            const m = {};
            arr.forEach(function (e) {
              if (e && e.name && e.texture && !m[e.name]) m[e.name] = e.texture;
            });
            return m;
          } catch {}
        }
        return null;
      })();
    }
    return texJSONPromise;
  }
  async function embeddedTex(id) {
    const key = BLOCKS[id].tex;
    if (EMBED_MISSING[key]) return null;
    try {
      const map = await getTexJSON();
      if (!map || !map[key]) return null;
      return await loadImg(map[key]);
    } catch {
      return null;
    }
  }
  async function upgradeTextures() {
    const ids = Object.keys(BLOCKS).map(Number);
    let ok = 0;
    await Promise.all(ids.map(async function (id) {
      const img = await loadImg(TEX_BASE + BLOCKS[id].tex + ".png");
      if (img && img.naturalWidth > 0) {
        applyTex(id, img);
        ok++;
        return;
      }
      const emb = await embeddedTex(id);
      if (emb && emb.naturalWidth > 0) {
        applyTex(id, emb);
        ok++;
      }
    }));
    tintLeaves();
    refreshHotbar();
    refreshInv();
    flashStatus(ok > 0 ? "HD textures on (" + ok + "/" + ids.length + ")" : "Texture CDN offline — classic look");
  }

  // ----- canvas sizing -----
  let dpr = 1, viewW = 600, viewH = 440, skyGrad = null;
  function resize() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 440;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(w * dpr));
    canvas.height = Math.max(2, Math.round(h * dpr));
    viewW = w;
    viewH = h;
    skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#6db9f2");
    skyGrad.addColorStop(0.6, "#a5dcf7");
    skyGrad.addColorStop(1, "#d8f3e3");
  }

  // ----- input -----
  const keys = { left: false, right: false, jump: false, up: false, down: false };
  function panelOn() {
    const p = document.getElementById("panel-mc");
    if (!p) return true; // standalone page (minecraft.html): always on
    return p.classList.contains("is-active");
  }
  window.addEventListener("keydown", function (e) {
    if (!panelOn() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    switch (e.code) {
      case "KeyA": case "ArrowLeft": keys.left = true; e.preventDefault(); break;
      case "KeyD": case "ArrowRight": keys.right = true; e.preventDefault(); break;
      case "Space": case "KeyW": case "ArrowUp":
        keys.jump = true; keys.up = true; e.preventDefault(); break;
      case "ShiftLeft": case "ShiftRight": case "KeyS": case "ArrowDown":
        keys.down = true; e.preventDefault(); break;
      case "KeyN":
        setMode(mode === "creative" ? "survival" : "creative");
        e.preventDefault(); break;
      case "KeyT":
        openChat(); e.preventDefault(); break;
      case "KeyE":
        toggleInv(); e.preventDefault(); break;
      case "KeyF":
        toggleFS(); e.preventDefault(); break;
      case "Escape":
        closeChat(); closeInv(); break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          sel = parseInt(e.code.slice(5), 10) - 1;
          syncHotbar();
          save();
        }
    }
  });
  window.addEventListener("keyup", function (e) {
    switch (e.code) {
      case "KeyA": case "ArrowLeft": keys.left = false; break;
      case "KeyD": case "ArrowRight": keys.right = false; break;
      case "Space": case "KeyW": case "ArrowUp": keys.jump = false; keys.up = false; break;
      case "ShiftLeft": case "ShiftRight": case "KeyS": case "ArrowDown": keys.down = false; break;
    }
  });

  let mx = 0, my = 0, inCanvas = false, mouseMode = false;
  const mine = { on: false, bx: 0, by: 0, prog: 0 };
  const placeR = { on: false, t: 0 };
  function cellAt(px, py) {
    const bp = TILE * ZOOMS[dist];
    return { bx: Math.floor((px + camX) / bp), by: Math.floor((py + camY) / bp) };
  }
  function inReach(bx, by) {
    const bp = TILE * ZOOMS[dist];
    const cx = (bx + 0.5) * bp - camX, cy = (by + 0.5) * bp - camY;
    const px = (player.x + P_W / 2) * ZOOMS[dist] - camX;
    const py = (player.y + P_H / 2) * ZOOMS[dist] - camY;
    const r = (mode === "creative" ? 8 : 6) * bp;
    return (cx - px) * (cx - px) + (cy - py) * (cy - py) <= r * r;
  }
  canvas.addEventListener("mousemove", function (e) {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    inCanvas = true;
    mouseMode = true;
  });
  canvas.addEventListener("mouseleave", function () {
    inCanvas = false;
    mine.on = false;
  });
  canvas.addEventListener("mousedown", function (e) {
    if (!panelOn()) return;
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    inCanvas = true;
    mouseMode = true;
    if (e.button === 0) {
      const c = cellAt(mx, my);
      if (mine.bx !== c.bx || mine.by !== c.by) mine.prog = 0;
      mine.on = true;
      mine.bx = c.bx;
      mine.by = c.by;
    } else if (e.button === 2) {
      placeR.on = true;
      placeR.t = tryPlace() ? 0.22 : 0.08;
    }
  });
  window.addEventListener("mouseup", function (e) {
    if (e.button === 0) mine.on = false;
    if (e.button === 2) placeR.on = false;
  });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("wheel", function (e) {
    if (!panelOn()) return;
    e.preventDefault();
    sel = (sel + (e.deltaY > 0 ? 1 : 8)) % 9;
    syncHotbar();
    save();
  }, { passive: false });

  // ----- touch -----
  let tool = "mine", touchMineId = null;
  canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    const c = cellAt(t.clientX - r.left, t.clientY - r.top);
    mouseMode = false;
    if (tool === "mine") {
      mine.on = true;
      mine.bx = c.bx;
      mine.by = c.by;
      mine.prog = 0;
      touchMineId = t.identifier;
    } else {
      tryPlaceAt(c);
    }
  }, { passive: false });
  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.identifier !== touchMineId) continue;
      const c = cellAt(t.clientX - r.left, t.clientY - r.top);
      if (c.bx !== mine.bx || c.by !== mine.by) {
        mine.bx = c.bx;
        mine.by = c.by;
        mine.prog = 0;
      }
    }
  }, { passive: false });
  function touchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchMineId) {
        mine.on = false;
        touchMineId = null;
      }
    }
  }
  canvas.addEventListener("touchend", touchEnd);
  canvas.addEventListener("touchcancel", touchEnd);
  document.querySelectorAll("#mcTouch [data-m]").forEach(function (b) {
    const k = b.dataset.m;
    function on(e) {
      e.preventDefault();
      if (k === "tool") {
        tool = tool === "mine" ? "place" : "mine";
        b.textContent = tool === "mine" ? "⛏" : "🧱";
        return;
      }
      b.classList.add("held");
      if (k === "left") keys.left = true;
      if (k === "right") keys.right = true;
      if (k === "jump") { keys.jump = true; keys.up = true; }
    }
    function off(e) {
      if (e) e.preventDefault();
      b.classList.remove("held");
      if (k === "left") keys.left = false;
      if (k === "right") keys.right = false;
      if (k === "jump") { keys.jump = false; keys.up = false; }
    }
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
  });

  // ----- mining / placing -----
  function updateMining(dt) {
    if (!mine.on) {
      mine.prog = 0;
      return;
    }
    if (mouseMode && inCanvas) {
      const c = cellAt(mx, my);
      if (c.bx !== mine.bx || c.by !== mine.by) {
        mine.bx = c.bx;
        mine.by = c.by;
        mine.prog = 0;
      }
    }
    const id = getBlock(mine.bx, mine.by);
    if (id === AIR || id === BEDROCK || !inReach(mine.bx, mine.by)) {
      mine.prog = 0;
      return;
    }
    const need = mode === "creative" ? 0.12 : hardOf(id);
    mine.prog += dt / need;
    if (mine.prog >= 1) {
      mine.prog = 0;
      breakBlock(mine.bx, mine.by, id);
    }
  }
  function breakBlock(bx, by, id) {
    if (id === TNT) {
      setBlock(bx, by, AIR);
      ignite(bx, by, 0.6);
      save();
      return;
    }
    setBlock(bx, by, AIR);
    mined += 1;
    store.set(MINED_KEY, String(mined));
    if (minedEl) minedEl.textContent = mined;
    if (mode === "survival") {
      const b = BLOCKS[id];
      const drop = (b && b.drop) || (id === STONE ? COBBLE : id);
      inv[drop] = (inv[drop] || 0) + 1;
      updateCounts();
    }
    document.dispatchEvent(new CustomEvent("arcade:scores"));
    save();
  }
  function tryPlaceAt(c) {
    if (!c || !inReach(c.bx, c.by)) return false;
    if (getBlock(c.bx, c.by) !== AIR) return false;
    const id = HOTBAR[sel];
    const px = c.bx * TILE, py = c.by * TILE;
    if (px < player.x + P_W && px + TILE > player.x && py < player.y + P_H && py + TILE > player.y) return false;
    if (mode === "survival") {
      if ((inv[id] || 0) <= 0) {
        flashStatus("No " + nameOf(id) + " left — mine some first!");
        return false;
      }
      inv[id]--;
      updateCounts();
    }
    setBlock(c.bx, c.by, id);
    save();
    return true;
  }
  function tryPlace() {
    if (!inCanvas && mouseMode) return false;
    return tryPlaceAt(cellAt(mx, my));
  }
  function updatePlacing(dt) {
    if (!placeR.on) return;
    placeR.t -= dt;
    if (placeR.t <= 0) {
      placeR.t = tryPlace() ? 0.22 : 0.08;
    }
  }

  // ----- TNT explosions -----
  function ignite(bx, by, t) {
    const k = bx + "," + by;
    if (fuseKeys.has(k)) return;
    fuseKeys.add(k);
    fuses.push({ bx, by, t });
  }
  function updateFuses(dt) {
    for (let i = fuses.length - 1; i >= 0; i--) {
      fuses[i].t -= dt;
      if (fuses[i].t <= 0) {
        const f = fuses.splice(i, 1)[0];
        fuseKeys.delete(f.bx + "," + f.by);
        boomAt(f.bx, f.by);
      }
    }
  }
  function boomAt(bx, by) {
    const R = 4;
    const cxp = (bx + 0.5) * TILE, cyp = (by + 0.5) * TILE;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const x = bx + dx, y = by + dy;
        const id = getBlock(x, y);
        if (id === AIR || id === BEDROCK) continue;
        if (id === OBSIDIAN && dx * dx + dy * dy > 2.25) continue;
        if (id === TNT) {
          ignite(x, y, 0.25 + Math.random() * 0.3);
          continue;
        }
        setBlock(x, y, AIR);
      }
    }
    for (let i = 0; i < 42; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260;
      parts.push({
        x: cxp, y: cyp,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        life: 0.5 + Math.random() * 0.4, max: 0.9,
        c: ["#8a8d91", "#5f5f5f", "#ff9a3c", "#ff5a2a", "#3a3a3a"][(Math.random() * 5) | 0],
      });
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    shakeT = 0.4;
    const px = player.x + P_W / 2, py = player.y + P_H / 2;
    const d = Math.hypot(px - cxp, py - cyp);
    if (d < (R + 1) * TILE) {
      hurt(Math.round((1 - d / ((R + 1) * TILE)) * 14), "boom");
    }
    flashStatus("Boom!");
    save();
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  let statusT = null;
  function modeStatus() {
    return mode === "creative"
      ? "Creative — fly with Space / Shift, infinite blocks."
      : "Survival — break blocks to collect them.";
  }
  function flashStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(statusT);
    statusT = setTimeout(function () {
      if (statusEl) statusEl.textContent = modeStatus();
    }, 1800);
  }

  // ----- hearts + damage -----
  function updateHearts() {
    const el = document.getElementById("mcHearts");
    if (!el) return;
    el.style.display = mode === "creative" ? "none" : "flex";
    let html = "";
    for (let i = 0; i < 10; i++) {
      const v = hp - i * 2;
      html += v >= 2
        ? "<span class='hp-full'>♥</span>"
        : v === 1
          ? "<span class='hp-half'>♥</span>"
          : "<span class='hp-empty'>♥</span>";
    }
    el.innerHTML = html;
  }
  let dmgT = null;
  function flashDmg() {
    const el = document.getElementById("mcFlash");
    if (!el) return;
    el.classList.add("hit");
    clearTimeout(dmgT);
    dmgT = setTimeout(function () { el.classList.remove("hit"); }, 140);
  }
  function hurt(n, cause) {
    if (mode === "creative" || !(n > 0)) return;
    hp -= Math.round(n);
    flashDmg();
    if (hp <= 0) die(cause);
    else updateHearts();
  }
  function die(cause) {
    hp = 20;
    updateHearts();
    respawn(true);
    fallPeak = player.y;
    chatPrint("Robot", cause === "void" ? "you fell into the void. respawned." : "you died. respawned with full hearts.", "robot sys");
    flashStatus("You died! Fresh hearts, fresh start.");
    save();
  }

  // ----- physics -----
  function rectHit(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
    const hits = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (solid(getBlock(cx, cy))) hits.push({ cx, cy });
      }
    }
    return hits;
  }
  function moveX(dt) {
    if (!player.vx) return;
    player.x += player.vx * dt;
    const hits = rectHit(player.x, player.y, P_W, P_H);
    if (!hits.length) return;
    if (player.vx > 0) {
      let edge = Infinity;
      hits.forEach(function (c) { edge = Math.min(edge, c.cx * TILE - P_W - 0.01); });
      player.x = edge;
    } else {
      let edge = -Infinity;
      hits.forEach(function (c) { edge = Math.max(edge, (c.cx + 1) * TILE + 0.01); });
      player.x = edge;
    }
    player.vx = 0;
  }
  function moveY(dt) {
    player.y += player.vy * dt;
    player.onGround = false;
    const hits = rectHit(player.x, player.y, P_W, P_H);
    if (!hits.length) return;
    if (player.vy > 0) {
      let edge = Infinity;
      hits.forEach(function (c) { edge = Math.min(edge, c.cy * TILE - P_H - 0.01); });
      player.y = edge;
      player.onGround = true;
    } else if (player.vy < 0) {
      let edge = -Infinity;
      hits.forEach(function (c) { edge = Math.max(edge, (c.cy + 1) * TILE + 0.01); });
      player.y = edge;
    }
    player.vy = 0;
  }
  function step(dt) {
    const crea = mode === "creative";
    const speed = crea ? 215 : 135;
    let dir = 0;
    if (keys.left) dir--;
    if (keys.right) dir++;
    if (dir !== 0) {
      player.face = dir;
      player.walk += dt * 10;
    }
    player.vx = dir * speed;
    if (crea) {
      player.vy = 0;
      if (keys.jump || keys.up) player.vy = -215;
      if (keys.down) player.vy = 215;
    } else {
      player.vy = Math.min(player.vy + 1250 * dt, 650);
      if (keys.jump && player.onGround) {
        player.vy = -320;
        player.onGround = false;
      }
    }
    moveX(dt);
    const wasGround = player.onGround;
    moveY(dt);
    if (player.onGround) {
      if (!wasGround && mode === "survival") {
        const fall = player.y - fallPeak;
        if (fall > 3.2 * TILE) hurt(Math.floor(fall / TILE - 3), "fall");
      }
      fallPeak = player.y;
    }
    const tx = player.x + P_W / 2 - viewW / 2;
    const ty = player.y + P_H / 2 - viewH * 0.55;
    const k = Math.min(1, dt * 5);
    if (!camInit) {
      camX = tx;
      camY = ty;
      camInit = true;
    } else {
      camX += (tx - camX) * k;
      camY += (ty - camY) * k;
    }
    if (player.y > (WORLD_H + 4) * TILE) die("void");
  }
  function findSpawn() {
    const order = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10, 14, -14];
    for (const dx of order) {
      if (!treeAt(dx)) return dx;
    }
    return 0;
  }
  function respawn(snap) {
    const sx = findSpawn();
    player.x = sx * TILE + TILE / 2 - P_W / 2;
    player.y = surfHC(sx) * TILE - P_H - 1;
    player.vx = 0;
    player.vy = 0;
    let guard = 0;
    while (rectHit(player.x, player.y, P_W, P_H).length && guard++ < 60) {
      player.y -= TILE;
    }
    fallPeak = player.y;
    if (snap) camInit = false;
  }

  // ----- clouds -----
  const clouds = [];
  (function () {
    const r = mulberry(1234);
    for (let i = 0; i < 9; i++) {
      clouds.push({ o: r() * 1400, y: 0.06 + r() * 0.3, s: 0.7 + r() * 1.1, v: 6 + r() * 10 });
    }
  })();
  let cloudT = 0;

  // ----- render -----
  function render() {
    const zoom = ZOOMS[dist], bp = TILE * zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    // sun
    const sunX = viewW - 90, sunY = 72;
    ctx.fillStyle = "rgba(255, 236, 170, 0.35)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffdf6b";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const span = viewW + 360;
    for (const c of clouds) {
      const x = ((((c.o + cloudT * c.v) % span) + span) % span) - 180;
      const y = c.y * viewH * 0.6 + 8;
      const s = c.s;
      ctx.beginPath();
      ctx.ellipse(x, y, 46 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 28 * s, y + 5 * s, 26 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 28 * s, y + 5 * s, 28 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // blocks (visible range only, camera + blast shake)
    shX = shakeT > 0 ? (Math.random() - 0.5) * shakeT * 30 : 0;
    shY = shakeT > 0 ? (Math.random() - 0.5) * shakeT * 30 : 0;
    const cx = camX + shX, cy = camY + shY;
    const x0 = Math.floor(cx / bp) - 1, x1 = Math.ceil((cx + viewW) / bp) + 1;
    const y0 = Math.floor(cy / bp) - 1, y1 = Math.ceil((cy + viewH) / bp) + 1;
    const s = bp + 1;
    const fuseBlink = 0.35 + 0.3 * Math.sin(performance.now() / 70);
    for (let by = y0; by <= y1; by++) {
      const dy = Math.round(by * bp - cy);
      for (let bx = x0; bx <= x1; bx++) {
        const id = getBlock(bx, by);
        if (id === AIR) continue;
        const dx = Math.round(bx * bp - cx);
        if (id === LEAVES && leafVariants.length === 4) {
          ctx.drawImage(leafVariants[biomeAt(bx)], dx, dy, s, s);
        } else {
          ctx.drawImage(SPR[id].cv, dx, dy, s, s);
        }
        if (fuseKeys.has(bx + "," + by)) {
          ctx.fillStyle = "rgba(255,255,255," + fuseBlink.toFixed(3) + ")";
          ctx.fillRect(dx, dy, s, s);
        }
      }
    }

    // hover highlight
    if (inCanvas && mouseMode) {
      const c = cellAt(mx, my);
      if (inReach(c.bx, c.by)) {
        ctx.strokeStyle = getBlock(c.bx, c.by) === AIR ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.round(c.bx * bp - cx) + 0.5, Math.round(c.by * bp - cy) + 0.5, bp - 1, bp - 1);
      }
    }

    // mining cracks
    if (mine.on && mine.prog > 0.02) {
      const id = getBlock(mine.bx, mine.by);
      if (id !== AIR && id !== BEDROCK) {
        const dx = Math.round(mine.bx * bp - cx), dy2 = Math.round(mine.by * bp - cy);
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = Math.max(1.5, bp * 0.06);
        const n = 1 + Math.floor(mine.prog * 4);
        for (let i = 0; i < n; i++) {
          const ax = dx + h2(mine.bx * 5 + i, mine.by * 5) * bp;
          const ay = dy2 + h2(mine.bx * 7, mine.by * 7 + i) * bp;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (h2(i, mine.bx) - 0.5) * bp * 0.8, ay + (h2(i, mine.by) - 0.5) * bp * 0.8);
          ctx.stroke();
        }
      }
    }

    drawPlayer(zoom);

    // blast particles
    for (const pt of parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.max));
      ctx.fillStyle = pt.c;
      const ps = Math.max(2, Math.round(4 * zoom));
      ctx.fillRect(Math.round(pt.x * zoom - cx), Math.round(pt.y * zoom - cy), ps, ps);
    }
    ctx.globalAlpha = 1;
  }
  function drawPlayer(zoom) {
    const sx = Math.round(player.x * zoom - camX - shX);
    const sy = Math.round(player.y * zoom - camY - shY);
    const w = Math.max(3, Math.round(P_W * zoom));
    const legH = Math.round(13 * zoom), torsoH = Math.round(16 * zoom), headS = Math.round(13 * zoom);
    const swing = player.walk % (Math.PI * 2);
    const step = Math.round(Math.sin(swing) * 2 * zoom);
    // legs
    ctx.fillStyle = "#3a4a8f";
    ctx.fillRect(sx + 1, sy + P_H * zoom - legH, Math.max(2, w / 2 - 1), legH + (step > 0 ? step : 0));
    ctx.fillRect(sx + w / 2, sy + P_H * zoom - legH, Math.max(2, w / 2 - 1), legH + (step < 0 ? -step : 0));
    // torso
    ctx.fillStyle = "#1f9d7a";
    ctx.fillRect(sx, sy + P_H * zoom - legH - torsoH, w, torsoH);
    // arm (front)
    ctx.fillStyle = "#d9a066";
    const ax = player.face >= 0 ? sx + w - Math.max(2, w / 4) : sx;
    ctx.fillRect(Math.round(ax), Math.round(sy + P_H * zoom - legH - torsoH + 2), Math.max(2, Math.round(w / 4)), Math.round(torsoH * 0.7));
    // head
    const hx = Math.round(sx + (w - headS) / 2), hy = Math.round(sy + P_H * zoom - legH - torsoH - headS);
    ctx.fillStyle = "#d9a066";
    ctx.fillRect(hx, hy, headS, headS);
    ctx.fillStyle = "#4a3220";
    ctx.fillRect(hx, hy, headS, Math.max(2, Math.round(headS * 0.3)));
    ctx.fillStyle = "#fff";
    const ex = player.face >= 0 ? hx + headS - Math.round(headS * 0.35) : hx + Math.round(headS * 0.12);
    ctx.fillRect(ex, hy + Math.round(headS * 0.45), Math.max(2, Math.round(headS * 0.22)), Math.max(2, Math.round(headS * 0.22)));
  }

  // ----- hud / controls -----
  function updateCounts() {
    HOTBAR.forEach(function (id, i) {
      const el = document.getElementById("mcCount" + i);
      if (el) el.textContent = mode === "creative" ? "∞" : (inv[id] || 0);
    });
    for (let id = 1; id <= MAX_ID; id++) {
      const el = document.getElementById("mcInvCount" + id);
      if (el) el.textContent = mode === "creative" ? "∞" : (inv[id] || 0);
    }
    const sub = document.getElementById("mcInvSub");
    if (sub) sub.textContent = "→ hotbar slot " + (sel + 1) + " (" + nameOf(HOTBAR[sel]) + ")";
  }
  function syncHotbar() {
    if (!hotbarEl) return;
    Array.prototype.forEach.call(hotbarEl.children, function (s, i) {
      s.classList.toggle("sel", i === sel);
    });
    const sub = document.getElementById("mcInvSub");
    if (sub) sub.textContent = "→ hotbar slot " + (sel + 1) + " (" + nameOf(HOTBAR[sel]) + ")";
  }
  function refreshHotbar() {
    if (!hotbarEl) return;
    hotbarEl.innerHTML = "";
    HOTBAR.forEach(function (id, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mc-slot" + (i === sel ? " sel" : "");
      b.style.backgroundImage = "url(" + SPR[id].cv.toDataURL() + ")";
      b.title = nameOf(id);
      b.setAttribute("aria-label", nameOf(id));
      const c = document.createElement("b");
      c.id = "mcCount" + i;
      b.appendChild(c);
      b.addEventListener("click", function () {
        sel = i;
        syncHotbar();
        save();
      });
      hotbarEl.appendChild(b);
    });
    updateCounts();
  }
  function setMode(m) {
    mode = m === "creative" ? "creative" : "survival";
    if (mode === "creative") hp = 20;
    updateHearts();
    document.querySelectorAll("[data-mc-mode]").forEach(function (b) {
      const on = b.dataset.mcMode === mode;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (modeEl) modeEl.textContent = mode === "creative" ? "Creative" : "Survival";
    if (statusEl) statusEl.textContent = modeStatus();
    updateCounts();
    save();
  }
  function setDist(d) {
    dist = Math.min(3, Math.max(0, d | 0));
    document.querySelectorAll("[data-mc-dist]").forEach(function (b) {
      const on = parseInt(b.dataset.mcDist, 10) === dist;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    save();
  }
  function updateHud() {
    if (fpsEl) fpsEl.textContent = Math.round(fps);
    if (hudEl) {
      const bx = Math.floor((player.x + P_W / 2) / TILE);
      const by = Math.floor((player.y + P_H) / TILE);
      hudEl.textContent = "x " + bx + " · y " + by + " · " + DIST_NAMES[dist] + " · seed " + seed;
    }
    if (minedEl) minedEl.textContent = mined;
  }

  // ----- full inventory -----
  let invOpen = false;
  function invElements() {
    return {
      box: document.getElementById("mcInv"),
      grid: document.getElementById("mcInvGrid"),
    };
  }
  function toggleInv(force) {
    const els = invElements();
    if (!els.box || !els.grid) return;
    invOpen = typeof force === "boolean" ? force : !invOpen;
    els.box.hidden = !invOpen;
    if (invOpen) refreshInv();
  }
  function closeInv() {
    if (invOpen) toggleInv(false);
  }
  function refreshInv() {
    const els = invElements();
    if (!els.box || !els.grid) return;
    els.grid.innerHTML = "";
    for (let id = 1; id <= MAX_ID; id++) {
      (function (bid) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mc-inv-slot" + (HOTBAR.indexOf(bid) >= 0 ? " in-hotbar" : "");
        b.style.backgroundImage = "url(" + SPR[bid].cv.toDataURL() + ")";
        b.title = nameOf(bid);
        b.setAttribute("aria-label", nameOf(bid));
        const n = document.createElement("b");
        n.id = "mcInvCount" + bid;
        const tag = document.createElement("i");
        tag.textContent = bid;
        b.appendChild(tag);
        b.appendChild(n);
        b.addEventListener("click", function () {
          HOTBAR[sel] = bid;
          syncHotbar();
          refreshHotbar();
          refreshInv();
          save();
        });
        els.grid.appendChild(b);
      })(id);
    }
    updateCounts();
  }

  // ----- fullscreen -----
  function toggleFS() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        const el = document.getElementById("mcScreen");
        if (el && el.requestFullscreen) el.requestFullscreen();
        else flashStatus("Fullscreen not supported here.");
      }
    } catch {}
  }
  function syncFSLabel() {
    const b = document.getElementById("mcFSBtn");
    if (b) b.textContent = document.fullscreenElement ? "Exit full (F)" : "Fullscreen (F)";
  }
  document.addEventListener("fullscreenchange", syncFSLabel);

  // ----- chat -----
  const QUIPS = [
    "noted. the robot nods approvingly.",
    "bold strategy. the robot respects it.",
    "hmm. the robot pretends to understand.",
    "copy that, human.",
    "the robot files that under: interesting.",
    "fascinating. the robot takes notes.",
    "the robot was winning tic-tac-toe while you typed that.",
    "request logged in triplicate.",
  ];
  let quipI = 0, chatBooted = false;
  function chatLog() {
    return document.getElementById("mcChatLog");
  }
  function chatRow() {
    return document.getElementById("mcChatRow");
  }
  function chatInput() {
    return document.getElementById("mcChatInput");
  }
  function chatPrint(who, text, cls) {
    const log = chatLog();
    if (!log) return;
    const d = document.createElement("div");
    d.className = "mc-chat-msg" + (cls ? " " + cls : "");
    const w = document.createElement("b");
    w.textContent = "<" + who + "> ";
    const s = document.createElement("span");
    s.textContent = text;
    d.appendChild(w);
    d.appendChild(s);
    log.appendChild(d);
    while (log.children.length > 12) log.removeChild(log.firstChild);
    setTimeout(function () { d.classList.add("fade"); }, 9000);
  }
  function openChat() {
    const row = chatRow(), input = chatInput();
    if (!row || !input) return;
    row.hidden = false;
    input.value = "";
    setTimeout(function () { input.focus(); }, 0);
  }
  function closeChat() {
    const row = chatRow(), input = chatInput();
    if (row) row.hidden = true;
    if (input && document.activeElement === input) input.blur();
  }
  function chatOpen() {
    const row = chatRow();
    return !!row && !row.hidden;
  }
  function blockAlias(q) {
    q = String(q).toLowerCase().replace(/^minecraft:/, "").trim();
    if (!q) return 0;
    if (/^\d+$/.test(q)) {
      const id = parseInt(q, 10);
      return BLOCKS[id] ? id : 0;
    }
    const norm = q.replace(/[\s_\-]+/g, "");
    for (const k of Object.keys(BLOCKS)) {
      const b = BLOCKS[k];
      const n1 = b.name.toLowerCase().replace(/[\s_\-]+/g, "");
      const n2 = b.tex.toLowerCase().replace(/[\s_\-]+/g, "");
      if (n1 === norm || n2 === norm) return +k;
    }
    const SHORT = {
      cobble: 13, tnt: 22, craft: 29, table: 29, mossy: 30, planks: 7,
      leaves: 5, log: 4, wood: 4, glass: 12, snow: 28, dia: 10, diamond: 10,
      gold: 24, iron: 9, coal: 8, red: 26, redstone: 26, lapis: 27,
      emerald: 25, stone: 3, dirt: 2, grass: 1, sand: 6, brick: 17,
      shelf: 19, book: 19, melon: 21, pumpkin: 20, obsidian: 23,
    };
    return SHORT[norm] || 0;
  }
  function chatCommand(line) {
    const parts = line.trim().split(/\s+/);
    const cmd = (parts.shift() || "").toLowerCase();
    if (cmd === "help") {
      chatPrint("Robot", "/gamemode <survival|creative> · /seed · /give <block> [n] · /tp <x> [y] · /clear", "robot");
    } else if (cmd === "gamemode" || cmd === "gm") {
      const a = (parts[0] || "").toLowerCase();
      if (a[0] === "c") setMode("creative");
      else if (a[0] === "s") setMode("survival");
      else setMode(mode === "creative" ? "survival" : "creative");
      chatPrint("Robot", "gamemode → " + mode, "robot");
    } else if (cmd === "seed") {
      chatPrint("Robot", "seed: " + seed, "robot");
    } else if (cmd === "give") {
      let n = parseInt(parts[parts.length - 1], 10);
      if (Number.isInteger(n)) parts.pop();
      else n = 1;
      n = Math.min(64, Math.max(1, n));
      const id = blockAlias(parts.join(" "));
      if (!id) {
        chatPrint("Robot", "unknown block. try /give diamond 5", "robot");
        return;
      }
      if (mode === "survival") {
        inv[id] = (inv[id] || 0) + n;
        updateCounts();
        save();
      }
      chatPrint("Robot", "gave " + n + " × " + nameOf(id) + (mode === "creative" ? " (infinite anyway)" : ""), "robot");
    } else if (cmd === "tp") {
      const x = parseInt(parts[0], 10), y = parseInt(parts[1], 10);
      if (!Number.isInteger(x)) {
        chatPrint("Robot", "usage: /tp <x> [y]", "robot");
        return;
      }
      player.x = Math.min(100000, Math.max(-100000, x)) * TILE;
      player.y = Number.isInteger(y)
        ? Math.min(WORLD_H, Math.max(-4, y)) * TILE
        : surfHC(x) * TILE - P_H - 1;
      player.vx = 0;
      player.vy = 0;
      camInit = false;
      chatPrint("Robot", "teleported to x " + x, "robot");
    } else if (cmd === "clear") {
      const log = chatLog();
      if (log) log.innerHTML = "";
    } else {
      chatPrint("Robot", "unknown command. /help lists tricks.", "robot");
    }
  }
  function chatSend(raw) {
    const msg = String(raw).trim();
    if (!msg) {
      closeChat();
      return;
    }
    chatPrint("You", msg);
    if (msg[0] === "/") chatCommand(msg.slice(1));
    else {
      chatPrint("Robot", QUIPS[quipI % QUIPS.length], "robot");
      quipI++;
    }
  }

  // ----- main loop -----
  let running = false, last = 0, fps = 60, hudT = 0;
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    const p = document.getElementById("panel-mc");
    if ((p && !p.classList.contains("is-active")) || document.hidden) {
      stop();
      return;
    }
    if (window.__mcPaused) {
      last = t;
      return;
    }
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) return;
    if (fps <= 0) fps = 60;
    fps = fps * 0.92 + (1 / dt) * 0.08;
    hCache.clear();
    step(dt);
    updateMining(dt);
    updatePlacing(dt);
    updateFuses(dt);
    updateParts(dt);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (mode === "survival" && hp < 20) {
      regenT += dt;
      if (regenT >= 5) {
        regenT = 0;
        hp++;
        updateHearts();
      }
    } else {
      regenT = 0;
    }
    cloudT += dt;
    render();
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.25;
      updateHud();
    }
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    mine.on = false;
    placeR.on = false;
    keys.left = keys.right = keys.jump = keys.up = keys.down = false;
    const ci = chatInput();
    if (ci && document.activeElement === ci) ci.blur();
  }
  document.addEventListener("arcade:switch", function () {
    if (panelOn() && !document.hidden) start();
    else stop();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      saveNow();
      stop();
    } else if (panelOn()) start();
  });
  window.addEventListener("pagehide", saveNow);

  // ----- init -----
  buildSprites();
  const hadPos = load();
  refreshHotbar();
  setMode(mode);
  setDist(dist);
  if (minedEl) minedEl.textContent = mined;
  if (toolBtn) toolBtn.textContent = "⛏";
  resize();
  if ("ResizeObserver" in window) {
    try { new ResizeObserver(resize).observe(canvas); } catch {}
  }
  window.addEventListener("resize", resize);
  if (!hadPos) {
    respawn(true);
  } else {
    let guard = 0;
    hCache.clear();
    while (rectHit(player.x, player.y, P_W, P_H).length && guard++ < 60) {
      player.y -= TILE;
    }
    camInit = false;
  }
  fallPeak = player.y;
  updateHearts();
  const respawnBtn = document.getElementById("mcRespawn");
  if (respawnBtn) respawnBtn.addEventListener("click", function () {
    respawn(false);
    flashStatus("Respawned at spawn.");
  });
  const newBtn = document.getElementById("mcNewWorld");
  if (newBtn) newBtn.addEventListener("click", function () {
    seed = (Math.random() * 1e9) | 0;
    edits.clear();
    inv = {};
    hCache.clear();
    respawn(true);
    updateCounts();
    saveNow();
    if (statusEl) statusEl.textContent = "New world generated — seed " + seed + ".";
  });
  document.querySelectorAll("[data-mc-mode]").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.dataset.mcMode); });
  });
  document.querySelectorAll("[data-mc-dist]").forEach(function (b) {
    b.addEventListener("click", function () { setDist(parseInt(b.dataset.mcDist, 10)); });
  });
  const invBtn = document.getElementById("mcInvBtn");
  if (invBtn) invBtn.addEventListener("click", function () { toggleInv(); });
  const invClose = document.getElementById("mcInvClose");
  if (invClose) invClose.addEventListener("click", function () { closeInv(); });
  const fsBtn = document.getElementById("mcFSBtn");
  if (fsBtn) fsBtn.addEventListener("click", function () { toggleFS(); });
  const cInput = chatInput();
  if (cInput) {
    cInput.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") {
        chatSend(cInput.value);
        cInput.value = "";
      } else if (e.key === "Escape") {
        closeChat();
      }
    });
  }
  upgradeTextures();
  if (!chatBooted) {
    chatBooted = true;
    chatPrint("Robot", "press T to chat · /help for tricks", "robot sys");
  }
  try { window.__mcSave = saveNow; } catch {}
  if (panelOn()) start();
})();
