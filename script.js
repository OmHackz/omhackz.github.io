// Theme: init from storage or system preference
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const indicator = document.getElementById("navIndicator");
const links = [...document.querySelectorAll("#navLinks .nav-link")];
const mobilePanel = document.getElementById("mobilePanel");
const mobileLinks = [...mobilePanel.querySelectorAll(".nav-link")];
const menuBtn = document.getElementById("menuBtn");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  try { localStorage.setItem("theme", theme); } catch {}
  toggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}

(function init() {
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));
  syncActiveFromPage();
  requestAnimationFrame(() => moveIndicator(false));
  // re-seat indicator after fonts/layout settle
  window.addEventListener("load", () => moveIndicator(false));
  setTimeout(() => moveIndicator(false), 300);
})();

toggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  toggle.classList.remove("switching");
  void toggle.offsetWidth; // restart animation
  toggle.classList.add("switching");
  applyTheme(next);
  setTimeout(() => toggle.classList.remove("switching"), 600);
});

// ---------- Sliding pill indicator (hover + active) ----------
function moveTo(el, animate = true) {
  if (!el || !indicator) return;
  const parent = el.parentElement.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  indicator.style.opacity = "1";
  if (!animate) indicator.style.transition = "none";
  indicator.style.left = r.left - parent.left + "px";
  indicator.style.width = r.width + "px";
  if (!animate) requestAnimationFrame(() => (indicator.style.transition = ""));
}

function moveIndicator(animate = true) {
  const active = document.querySelector("#navLinks .nav-link.is-active");
  moveTo(active, animate);
}

links.forEach((link) => {
  link.addEventListener("mouseenter", () => moveTo(link));
  link.addEventListener("mouseleave", () => moveIndicator());
});

// ---------- Active page from <body data-page> (multi-file nav) ----------
function syncActiveFromPage() {
  const page = document.body.dataset.page || "home";
  links.forEach((l) => l.classList.toggle("is-active", l.dataset.page === page));
  // mobile links have no data-page; match by href
  mobileLinks.forEach((l) => {
    const href = (l.getAttribute("href") || "").toLowerCase();
    const isMatch =
      (page === "home" && href.includes("index")) ||
      href.includes(page);
    l.classList.toggle("is-active", isMatch);
  });
}

window.addEventListener("resize", () => moveIndicator(false));
mobileLinks.forEach((l) => l.addEventListener("click", closeMenu));

// ---------- Mobile menu ----------
function closeMenu() {
  mobilePanel.classList.remove("open");
  menuBtn.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", () => {
  const open = mobilePanel.classList.toggle("open");
  menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
});

// ---------- Hero word shuffler (verbs x targets) ----------
(function wordShuffler() {
  const verbEl = document.getElementById("verbShuffle");
  const nounEl = document.getElementById("nounShuffle");
  if (!verbEl && !nounEl) return;

  const verbs = ["build", "ship", "publish", "prototype"];
  const nouns = ["web", "mobile", "desktop"];
  const glyphs = "!<>-_\\/[]{}=+*^?#";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let vi = 0;
  let ni = 0;

  function scrambleTo(el, word) {
    if (!el) return;
    if (reduceMotion) { el.textContent = word; return; }
    el.classList.remove("shuffling");
    void el.offsetWidth;
    el.classList.add("shuffling");
    // text-scramble during the blur-out half
    const original = word;
    let frame = 0;
    const total = 9;
    clearInterval(el.__scramble);
    el.__scramble = setInterval(() => {
      frame++;
      el.textContent = original
        .split("")
        .map((c, i) => (i < (frame / total) * original.length ? c : glyphs[Math.floor(Math.random() * glyphs.length)]))
        .join("");
      if (frame >= total) {
        clearInterval(el.__scramble);
        el.textContent = original;
      }
    }, 45);
    setTimeout(() => el.classList.remove("shuffling"), 500);
  }

  if (verbEl) {
    setInterval(() => {
      vi = (vi + 1) % verbs.length;
      scrambleTo(verbEl, verbs[vi]);
    }, 2600);
  }
  if (nounEl) {
    setTimeout(() => {
      setInterval(() => {
        ni = (ni + 1) % nouns.length;
        scrambleTo(nounEl, nouns[ni]);
      }, 2600);
    }, 1300); // offset so both words never swap together
  }
})();

// ---------- Scroll reveal ----------
(function scrollReveal() {
  const items = document.querySelectorAll(".scroll-reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((el) => io.observe(el));
})();

// ---------- Scroll progress ----------
(function scrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;
  let ticking = false;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();

// ---------- Cursor-reactive grid spotlight ----------
const stage = document.querySelector(".stage");

window.addEventListener("pointermove", (e) => {
  if (!stage) return;
  stage.style.setProperty("--gx", e.clientX + "px");
  stage.style.setProperty("--gy", e.clientY + "px");
}, { passive: true });

// ---------- Minecraft character (skinview3d, head looks at cursor) ----------
(function skinViewer() {
  const canvas = document.getElementById("skinViewer");
  const tilt = document.getElementById("skinTilt");
  if (!canvas || !tilt) return;

  let tYaw = 0; // radians, + = look screen-right
  let tPitch = 0; // radians, + = look down
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));

  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (r.top + r.height / 3)) / window.innerHeight;
    tYaw = clamp1(dx * 2) * 0.55;
    tPitch = clamp1(dy * 2) * 0.35;
  }, { passive: true });

  // 2D fallback: flat head crop + CSS tilt (CDN blocked, no WebGL, texture CORS, …)
  function flatFallback() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    c.id = "skinViewer";
    c.classList.add("flat-head");
    c.setAttribute("aria-label", "OmHackz Minecraft head");
    canvas.replaceWith(c);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const img = new Image();
    img.src = "assets/skin.png";
    img.onload = () => {
      ctx.clearRect(0, 0, 256, 256);
      if (img.width === 64 && (img.height === 64 || img.height === 32)) {
        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 256, 256); // head base
        if (img.height === 64) ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 256, 256); // overlay
      } else {
        const s = Math.max(256 / img.width, 256 / img.height);
        ctx.drawImage(img, (256 - img.width * s) / 2, (256 - img.height * s) / 2, img.width * s, img.height * s);
      }
    };
    let cx = 0;
    let cy = 0;
    (function loop() {
      cx += (tYaw * 43 - cx) * 0.12;
      cy += (tPitch * 45 - cy) * 0.12;
      tilt.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${(-cy).toFixed(2)}deg)`;
      requestAnimationFrame(loop);
    })();
  }

  try {
    if (typeof window.skinview3d === "undefined") throw new Error("skinview3d CDN unavailable");
    const stage = canvas.closest(".skin-stage");
    const viewer = new window.skinview3d.SkinViewer({
      canvas,
      model: "auto-detect",
      animation: new window.skinview3d.IdleAnimation(),
      enableControls: true,
    });
    const fit = () => {
      const w = Math.max(180, Math.min(250, (stage ? stage.clientWidth : 250) - 44));
      viewer.setSize(w, 330);
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
    // head look-at, driven inside the viewer's own render loop
    let yaw = 0;
    let pitch = 0;
    viewer.animation.addAnimation(() => {
      yaw += (tYaw - yaw) * 0.08;
      pitch += (tPitch - pitch) * 0.08;
      const head = viewer.playerObject.skin.head;
      head.rotation.y = yaw;
      head.rotation.x = pitch;
    });
    viewer.loadSkin("assets/skin.png", { model: "auto-detect" }).catch(() => {
      try { viewer.dispose(); } catch {}
      flatFallback();
    });
  } catch {
    flatFallback();
  }
})();

// ---------- Drag-to-scroll (tool strip) ----------
(function dragScroll() {
  const el = document.getElementById("toolScroller");
  if (!el) return;
  let down = false;
  let startX = 0;
  let startLeft = 0;

  el.addEventListener("pointerdown", (e) => {
    down = true;
    startX = e.clientX;
    startLeft = el.scrollLeft;
    el.classList.add("dragging");
  });

  window.addEventListener("pointermove", (e) => {
    if (!down) return;
    el.scrollLeft = startLeft - (e.clientX - startX);
  });

  window.addEventListener("pointerup", () => {
    down = false;
    el.classList.remove("dragging");
  });
  window.addEventListener("pointercancel", () => {
    down = false;
    el.classList.remove("dragging");
  });
})();

// ---------- Wheel scrolls the tool strip sideways ----------
(function wheelScroll() {
  const el = document.getElementById("toolScroller");
  if (!el) return;
  el.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
    if (atStart || atEnd) return; // let the page keep scrolling
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, { passive: false });
})();

// ---------- Secret: tap ARSENAL 5 times ----------
(function arsenalEgg() {
  const btn = document.getElementById("arsenalEgg");
  if (!btn) return;
  let taps = 0;
  let timer = null;
  btn.addEventListener("click", () => {
    taps++;
    btn.style.setProperty("--charge", Math.min(taps / 5, 1).toFixed(2));
    btn.classList.remove("tapped");
    void btn.offsetWidth;
    btn.classList.add("tapped");
    clearTimeout(timer);
    timer = setTimeout(() => {
      taps = 0;
      btn.style.setProperty("--charge", 0);
    }, 8000);
    if (taps >= 5) {
      taps = 0;
      clearTimeout(timer);
      btn.classList.add("unlocked");
      setTimeout(() => { window.location.href = "games.html"; }, 450);
    }
  });

  // quiet ambient shine at random intervals — same look, just alive
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    (function shine() {
      setTimeout(() => {
        btn.classList.add("shine");
        setTimeout(() => btn.classList.remove("shine"), 950);
        shine();
      }, 4000 + Math.random() * 5000);
    })();
  }
})();

// ---------- Secret: tap the Linux tool 3 times to boot Lunix ----------
// NOTE: can't rely on `click` here — the toolbox scroller adds
// `.dragging` (pointer-events:none) on every press, which retargets
// the click away from the tool. Window-level pointerup bypasses that.
(function lunixEgg() {
  const btn = document.getElementById("lunixEgg");
  if (!btn) return;
  let taps = 0;
  let tapTimer = null;
  let press = null;

  btn.addEventListener("pointerdown", (e) => {
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now() };
  });

  function registerTap() {
    taps++;
    btn.classList.remove("tapped");
    void btn.offsetWidth;
    btn.classList.add("tapped");
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 2000);
    if (taps >= 3) {
      taps = 0;
      clearTimeout(tapTimer);
      window.location.href = "lunix.html";
    }
  }

  window.addEventListener("pointerup", (e) => {
    if (!press || e.pointerId !== press.id) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    const held = Date.now() - press.t;
    press = null;
    if (moved > 12 || held > 600) return; // was a drag / long-press
    // press started on the Lunix tool (pointerup target may have been
    // retargeted by the scroller's .dragging), so this counts as a tap.
    registerTap();
  });
  window.addEventListener("pointercancel", () => { press = null; });

  // keyboard access: Enter/Space triple-press
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      registerTap();
    }
  });
})();
