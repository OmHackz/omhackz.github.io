// ---------- Terminal emulator easter egg (assets/js/terminal.js) ----------
// Triple-tap the Terminal tool in the toolbox to open.
// Specs + CachyOS ASCII below were captured from a real fastfetch run.
(function terminalEgg() {
  const tool = document.getElementById("termEgg");
  const overlay = document.getElementById("termOverlay");
  const body = document.getElementById("termBody");
  const form = document.getElementById("termForm");
  const input = document.getElementById("termInput");
  const closeBtn = document.getElementById("termClose");
  const bootBtn = document.getElementById("termBoot");
  const pathEl = document.getElementById("termPath");
  if (!tool || !overlay || !body || !form || !input) return;

  // ----- triple-tap trigger -----
  // NOTE: can't rely on `click` here — the toolbox scroller adds
  // `.dragging` (pointer-events:none) on every press, which retargets
  // the click away from the tool. Window-level pointerup bypasses that.
  let taps = 0, tapTimer = null, press = null;
  tool.addEventListener("pointerdown", (e) => {
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now() };
  });
  window.addEventListener("pointerup", (e) => {
    if (!press || e.pointerId !== press.id) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    const held = Date.now() - press.t;
    press = null;
    if (moved > 12 || held > 600) return; // was a drag / long-press
    taps++;
    tool.classList.remove("tapped");
    void tool.offsetWidth;
    tool.classList.add("tapped");
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 2000);
    if (taps >= 3) {
      taps = 0;
      clearTimeout(tapTimer);
      openTerm();
    }
  });
  window.addEventListener("pointercancel", () => { press = null; });

  // ----- exact CachyOS ASCII, captured from fastfetch -----
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

  // uptime ticks from page load (starts away from the captured value)
  const bootAt = Date.now() - (3 * 3600 + 42 * 60) * 1000;
  function uptime() {
    const s = Math.floor((Date.now() - bootAt) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? h + " hours, " + m + " mins" : m + " mins";
  }

  // [label, value] — exact specs from the fastfetch run (uptime is live)
  function specLines() {
    return [
      ["t", "omhackz@cachy-os"],
      ["t", "----------------"],
      ["OS", "CachyOS x86_64"],
      ["Kernel", "Linux 7.2.7-1-cachyos"],
      ["Uptime", uptime()],
      ["Packages", "5 (flatpak), 1234 (pacman)"],
      ["Shell", "bash 5.3.20"],
      ["Display (XXX 20\")", '1600x900 in 20", 60 Hz [External]'],
      ["Desktop Environment", "GNOME 50.5"],
      ["Window Manager", "Mutter (Wayland)"],
      ["WM Theme", "adw-gtk3-dark"],
      ["Theme", "adw-gtk3-dark [GTK2/3/4]"],
      ["Icons", "Adwaita [GTK2/3/4]"],
      ["Font", "Adwaita Sans (11pt) [GTK2/3/4]"],
      ["Cursor", "Adwaita (24px)"],
      ["Terminal", "opencode"],
      ["CPU", "Intel(R) Core(TM) i5-3570K (4) @ 3.80 GHz"],
      ["GPU", "Intel HD Graphics 4000 @ 1.15 GHz [Integrated]"],
      ["Memory", "3.54 GiB / 7.63 GiB (46%)"],
      ["Swap", "117.00 MiB / 15.64 GiB (1%)"],
      ["Disk (/)", "39.72 GiB / 89.36 GiB (44%) - btrfs"],
      ["Disk (/mnt/code)", "319.75 MiB / 3.99 GiB (8%) - vfat"],
      ["Disk (/mnt/fast_code)", "377.36 MiB / 47.68 GiB (1%) - ntfs3 [Read-only]"],
      ["Local IP (enp2s0)", "192.168.89.163/24"],
      ["Locale", "en_GB.UTF-8"],
    ];
  }
  const PALETTES = [
    ["#1a1a1a", "#cc0000", "#4e9a06", "#c4a000", "#3465a4", "#75507b", "#06989a", "#d3d7cf"],
    ["#555753", "#ef2929", "#8ae234", "#fce94f", "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec"],
  ];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function print(text, cls) {
    const d = document.createElement("div");
    d.className = "term-line" + (cls ? " " + cls : "");
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }
  function printHTML(html) {
    const d = document.createElement("div");
    d.className = "term-line";
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }
  function printNeofetch() {
    const wrap = document.createElement("div");
    wrap.className = "term-line nf";
    const pre = document.createElement("pre");
    pre.className = "nf-logo";
    pre.textContent = LOGO.join("\n");
    const info = document.createElement("div");
    info.className = "nf-info";
    info.innerHTML = specLines().map(([k, v]) =>
      k === "t" ? "<div class='t'>" + esc(v) + "</div>" : "<div><span class='k'>" + esc(k) + ":</span> " + esc(v) + "</div>"
    ).join("") + PALETTES.map((row) =>
      "<div class='nf-pal'>" + row.map((c) => "<i style='background:" + c + "'></i>").join("") + "</div>"
    ).join("");
    wrap.appendChild(pre);
    wrap.appendChild(info);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  // ----- tiny fake fs -----
  const FS = {
    "about.txt": "Hi, I'm OmHackz — developer, tinkerer, professional tab-hoarder.",
    "contact.txt": "mail: omhackz@outlook.com\ndiscord: omhackz",
    "secret.txt": "the robot says hi. it also never loses at tic-tac-toe on hard.",
    projects: {
      "portfolio.txt": "you are looking at it.",
      "arcade.txt": "tic-tac-toe vs the robot, minesweeper, 2048 + a tiny infinite minecraft.",
    },
  };
  let cwd = [];
  function nodeAt(path) {
    let n = FS;
    for (const p of path) {
      if (!n || typeof n !== "object" || Array.isArray(n) || !(p in n)) return undefined;
      n = n[p];
    }
    return n;
  }
  function resolveDir(arg) {
    if (!arg || arg === "~" || arg === "/") return arg === "/" ? [] : [];
    if (arg === "..") return cwd.slice(0, -1);
    if (arg.startsWith("~/")) return arg.slice(2).split("/").filter(Boolean);
    if (arg.startsWith("/")) return arg.split("/").filter(Boolean).slice(2); // /home/omhackz/...
    if (arg.startsWith("~")) return [];
    const parts = arg.split("/").filter(Boolean);
    const out = cwd.slice();
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") out.pop();
      else out.push(p);
    }
    return out;
  }
  function pwd() {
    return "/home/omhackz" + (cwd.length ? "/" + cwd.join("/") : "");
  }
  function shortPath() {
    return cwd.length ? cwd[cwd.length - 1] : "~";
  }

  function run(cmdline) {
    const parts = cmdline.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    const [cmd, ...args] = parts;
    switch (cmd) {
      case "help":
        print("commands: help neofetch ls cd pwd cat echo whoami uname date clear exit", "acc");
        print("also try: fastfetch, sudo, vim, lunix", "dim");
        break;
      case "neofetch":
      case "fastfetch":
        printNeofetch();
        break;
      case "ls": {
        const n = nodeAt(cwd);
        if (typeof n !== "object" || n === null) { print("ls: confused.", "err"); break; }
        print(Object.keys(n).map((k) => (typeof n[k] === "object" ? k + "/" : k)).join("   ") || "(empty)");
        break;
      }
      case "cd": {
        const target = resolveDir(args[0]);
        const n = nodeAt(target);
        if (typeof n === "object" && n !== null) {
          cwd = target;
          if (pathEl) pathEl.textContent = shortPath();
        } else {
          print("bash: cd: " + (args[0] || "") + ": No such directory", "err");
        }
        break;
      }
      case "pwd":
        print(pwd());
        break;
      case "cat": {
        if (!args[0]) { print("usage: cat <file>", "err"); break; }
        const base = nodeAt(cwd);
        const f = args[0].includes("/") ? undefined : base && base[args[0]];
        if (typeof f === "string") print(f);
        else if (typeof f === "object" && f !== null) print("cat: " + args[0] + ": Is a directory", "err");
        else print("cat: " + args[0] + ": No such file", "err");
        break;
      }
      case "echo":
        print(args.join(" ").replace(/^["']|["']$/g, ""));
        break;
      case "whoami":
        print("omhackz");
        break;
      case "uname":
        print(args[0] === "-a" ? "Linux cachy-os 7.2.7-1-cachyos #1 SMP PREEMPT x86_64 GNU/Linux" : "Linux");
        break;
      case "date":
        print(new Date().toString());
        break;
      case "sudo":
        print("[sudo] password for omhackz: nice try.", "err");
        break;
      case "vim":
      case "nano":
      case "emacs":
        print("just use the website — it's already open.", "dim");
        break;
      case "clear":
        body.innerHTML = "";
        break;
      case "exit":
      case "quit":
      case "logout":
        closeTerm();
        break;
      case "lunix":
      case "boot":
        print("booting lunix…", "acc");
        setTimeout(() => { window.location.href = "lunix.html"; }, 600);
        break;
      default:
        print("bash: " + cmd + ": command not found", "err");
    }
  }

  // ----- open / close -----
  let booted = false;
  function openTerm() {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    if (!booted) {
      booted = true;
      print("Last login: " + new Date().toString().slice(0, 24) + " on pts/0", "dim");
      printNeofetch();
      print("tip: type `lunix` to boot the secret desktop", "dim");
    }
    setTimeout(() => input.focus(), 60);
  }
  function closeTerm() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    input.blur();
  }
  if (closeBtn) closeBtn.addEventListener("click", closeTerm);
  if (bootBtn) bootBtn.addEventListener("click", () => { window.location.href = "lunix.html"; });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeTerm();
    else if (!window.getSelection() || window.getSelection().toString() === "") input.focus();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeTerm();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const cmd = input.value;
    print("omhackz@cachy-os:" + shortPath() + "$ " + cmd, "dim");
    input.value = "";
    run(cmd);
  });
})();
