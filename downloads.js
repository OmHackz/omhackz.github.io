// ---------- Downloads: live feed, search, filters, detail pages ----------
(function downloadsApp() {
  const API = "https://api.npoint.io/afd57df48806930591b9";
  const KNOWN_TYPES = ["minecraft", "app", "apk", "exe", "script", "other"];
  const TYPE_LABELS = { all: "All", minecraft: "Minecraft", app: "Apps", apk: "APK", exe: "EXE", script: "Scripts", other: "Other" };

  const STROKE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const TYPE_ICONS = {
    minecraft: `<svg ${STROKE} aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M12 22V12M3 7l9 5 9-5"/></svg>`,
    app: `<svg ${STROKE} aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`,
    apk: `<svg ${STROKE} aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18.5h2"/></svg>`,
    exe: `<svg ${STROKE} aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>`,
    script: `<svg ${STROKE} aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3M12.5 15H17"/></svg>`,
    other: `<svg ${STROKE} aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16"/></svg>`,
  };

  let feed = null; // normalized array or null (not loaded)
  let feedError = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normType(t) {
    t = String(t || "").toLowerCase().trim();
    return KNOWN_TYPES.includes(t) ? t : "other";
  }

  function extOf(file) {
    const m = String(file || "").match(/\.([a-z0-9]{1,5})$/i);
    return m ? "." + m[1].toLowerCase() : "";
  }

  function fmtDate(iso) {
    const d = new Date(String(iso) + "T00:00:00");
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dateVal(iso) {
    const d = new Date(String(iso) + "T00:00:00").getTime();
    return isNaN(d) ? 0 : d;
  }

  function safeUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\//i.test(u) ? u : "";
  }

  async function ensureFeed() {
    if (feed || feedError) return feed;
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error("bad status " + res.status);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : raw.items || raw.downloads || [];
    feed = arr
      .filter((x) => x && (x.name || x.id))
      .map((x, i) => ({
        id: String(x.id || ("item-" + i)),
        name: String(x.name || "Untitled"),
        tagline: String(x.tagline || ""),
        type: normType(x.type),
        file: String(x.file || ""),
        size: String(x.size || "—"),
        version: String(x.version || "—"),
        updated: String(x.updated || ""),
        downloads: parseInt(x.downloads, 10) || 0,
        featured: !!x.featured,
        description: String(x.description || ""),
        screenshots: Array.isArray(x.screenshots) ? x.screenshots.filter((s) => safeUrl(s)) : [],
        url: safeUrl(x.url),
      }));
    return feed;
  }

  // tiny markdown: headings, bold, italic, code, fences, lists, links, rules
  function md(src) {
    const lines = esc(src).split("\n");
    let html = "";
    let inList = false;
    let inCode = false;
    const inline = (t) =>
      t
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("```")) {
        if (inCode) html += "</code></pre>";
        else { closeList(); html += "<pre><code>"; }
        inCode = !inCode;
        continue;
      }
      if (inCode) { html += line + "\n"; continue; }
      if (/^#{1,3}\s/.test(t)) {
        closeList();
        const level = t.match(/^#+/)[0].length;
        html += `<h${level + 1}>${inline(t.replace(/^#+\s*/, ""))}</h${level + 1}>`;
      } else if (/^(-{3,}|\*{3,})$/.test(t)) {
        closeList();
        html += "<hr />";
      } else if (/^[-*]\s+/.test(t)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${inline(t.replace(/^[-*]\s+/, ""))}</li>`;
      } else if (/^\d+\.\s+/.test(t)) {
        closeList();
        html += `<p class="md-num">${inline(t)}</p>`;
      } else if (!t) {
        closeList();
      } else {
        closeList();
        html += `<p>${inline(t)}</p>`;
      }
    }
    closeList();
    if (inCode) html += "</code></pre>";
    return html || "<p>Nothing written yet.</p>";
  }

  // ---------- list page ----------
  (function listPage() {
    const grid = document.getElementById("dlGrid");
    if (!grid) return;
    const state = document.getElementById("dlState");
    const count = document.getElementById("dlCount");
    const search = document.getElementById("dlSearch");
    const sort = document.getElementById("dlSort");
    const filters = document.getElementById("dlFilters");
    let items = [];
    let activeType = "all";

    function showState(kind, title, sub, retry) {
      grid.innerHTML = "";
      count.textContent = "";
      state.hidden = false;
      state.innerHTML =
        `<div class="glass-card dl-state-card"><h3>${esc(title)}</h3><p>${esc(sub)}</p>` +
        (retry ? `<button class="btn btn-primary btn-sm" id="dlRetry">Retry</button>` : "") +
        `</div>`;
      if (retry) document.getElementById("dlRetry").addEventListener("click", () => { feed = null; feedError = false; boot(); });
    }

    function skeleton() {
      state.hidden = true;
      grid.innerHTML = Array.from({ length: 6 }, () => `<div class="glass-card dl-card skel"><div></div></div>`).join("");
      count.textContent = "Loading…";
    }

    function renderFilters() {
      const present = new Set(items.map((x) => x.type));
      filters.innerHTML = "";
      ["all", ...KNOWN_TYPES.filter((t) => present.has(t))].forEach((t) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "filter-chip" + (t === activeType ? " is-active" : "");
        b.textContent = TYPE_LABELS[t];
        b.setAttribute("role", "tab");
        b.addEventListener("click", () => { activeType = t; render(); });
        filters.appendChild(b);
      });
    }

    function current() {
      const q = search.value.trim().toLowerCase();
      let out = items.filter((x) => activeType === "all" || x.type === activeType);
      if (q) {
        out = out.filter((x) =>
          [x.name, x.tagline, x.description, x.file, x.version, TYPE_LABELS[x.type]]
            .join(" ").toLowerCase().includes(q)
        );
      }
      const by = sort.value;
      out.sort((a, b) =>
        by === "old" ? dateVal(a.updated) - dateVal(b.updated)
        : by === "name" ? a.name.localeCompare(b.name)
        : by === "count" ? b.downloads - a.downloads
        : dateVal(b.updated) - dateVal(a.updated)
      );
      return out;
    }

    function card(x) {
      const meta = [x.version !== "—" ? "v" + x.version : "", x.size !== "—" ? x.size : ""].filter(Boolean).join(" · ") || "—";
      return `<a class="glass-card dl-card" href="download.html?id=${encodeURIComponent(x.id)}">` +
        `<div class="dl-icon">${TYPE_ICONS[x.type]}</div>` +
        `<h3>${esc(x.name)}${x.featured ? ' <span class="feat" title="Featured">★</span>' : ""}</h3>` +
        `<p>${esc(x.tagline || "No description yet.")}</p>` +
        `<div class="dl-meta"><span>${esc(meta)}</span><span>${esc(fmtDate(x.updated))}</span></div>` +
        `<div class="dl-tags"><span class="type-badge">${esc(TYPE_LABELS[x.type])}</span>` +
        (extOf(x.file) ? `<span class="ext-badge">${esc(extOf(x.file))}</span>` : "") +
        `</div></a>`;
    }

    function render() {
      renderFilters();
      const out = current();
      state.hidden = true;
      count.textContent = out.length ? `${out.length} item${out.length === 1 ? "" : "s"}` : "";
      grid.innerHTML = out.length
        ? out.map(card).join("")
        : `<div class="glass-card dl-state-card"><h3>Nothing matches</h3><p>Try a different search or filter.</p></div>`;
    }

    async function boot() {
      skeleton();
      try {
        items = (await ensureFeed()) || [];
      } catch {
        feedError = true;
        return showState("error", "Shelf is unreachable", "The API didn't answer. Check your connection and retry.", true);
      }
      if (!items.length) return showState("empty", "Nothing here yet", "New uploads will appear on this shelf automatically.");
      render();
    }

    search.addEventListener("input", render);
    sort.addEventListener("change", render);
    boot();
  })();

  // ---------- detail page ----------
  (function detailPage() {
    const host = document.getElementById("detail");
    if (!host) return;
    const state = document.getElementById("detailState");
    const id = new URLSearchParams(location.search).get("id");

    function fail(title, sub) {
      state.hidden = false;
      state.innerHTML = `<div class="glass-card dl-state-card"><h3>${esc(title)}</h3><p>${esc(sub)}</p><a class="btn btn-primary btn-sm" href="downloads.html">Back to shelf</a></div>`;
    }

    (async function boot() {
      let items = [];
      try {
        items = (await ensureFeed()) || [];
      } catch {
        return fail("Shelf is unreachable", "The API didn't answer. Go back and retry from the shelf.");
      }
      const x = items.find((i) => i.id === id);
      if (!x) return fail("Item not found", "This link is stale — the item may have been removed.");
      document.title = x.name + " — OmHackz";

      const specs = [
        ["File", x.file || "—"],
        ["Size", x.size],
        ["Version", x.version],
        ["Updated", fmtDate(x.updated)],
        ["Downloads", x.downloads.toLocaleString("en-US")],
        ["Type", TYPE_LABELS[x.type]],
      ].map(([k, v]) => `<div class="spec"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("");

      host.innerHTML =
        `<div class="glass-card detail-head reveal in">` +
        `<div class="dl-icon xl">${TYPE_ICONS[x.type]}</div>` +
        `<div class="detail-title"><h2>${esc(x.name)}</h2><p>${esc(x.tagline || "")}</p></div>` +
        (x.url ? `<a class="btn btn-primary game-btn" href="${esc(x.url)}" download>Download${extOf(x.file) ? " " + esc(extOf(x.file)) : ""}</a>` : "") +
        `</div>` +
        `<div class="spec-grid">${specs}</div>` +
        (x.screenshots.length
          ? `<h3 class="detail-h">Screenshots</h3><div class="shot-grid">` +
            x.screenshots.map((s) => `<img src="${esc(s)}" alt="${esc(x.name)} screenshot" loading="lazy" onerror="this.remove()" />`).join("") +
            `</div>`
          : "") +
        `<h3 class="detail-h">About this ${x.type === "minecraft" ? "project" : "download"}</h3>` +
        `<div class="glass-card md">${md(x.description || x.tagline || "")}</div>`;
    })();
  })();
})();
