// ---------- Projects: curated GitHub repos + in-page file browser ----------
(function projectsApp() {
  const grid = document.getElementById("pjGrid");
  if (!grid) return;
  const state = document.getElementById("pjState");
  const count = document.getElementById("pjCount");
  const search = document.getElementById("pjSearch");
  const sort = document.getElementById("pjSort");
  const filters = document.getElementById("pjFilters");

  const GH = "https://api.github.com";
  const LANG_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    HTML: "#e34c26", CSS: "#563d7c", Dart: "#00B4AB", Java: "#b07219",
    Go: "#00ADD8", Rust: "#dea584", Shell: "#89e051", "C++": "#f34b7d",
    C: "#555555", "C#": "#178600", PHP: "#4F5D95", Ruby: "#701516",
    Swift: "#F05138", Kotlin: "#A97BFF", Vue: "#41b883", Dockerfile: "#384d54",
  };

  let items = []; // merged curated + live
  let activeLang = "all";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }
  function langDot(lang) {
    const c = LANG_COLORS[lang] || "var(--accent)";
    return `<i aria-hidden="true" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(c)};margin-right:6px;vertical-align:baseline"></i>`;
  }

  // ----- curated list -----
  function normEntry(e, fallbackUser) {
    if (typeof e === "string") e = { repo: e };
    if (!e || typeof e !== "object") return null;
    let full = String(e.repo || e.full || e.name || "").trim();
    if (!full) return null;
    let owner = e.owner ? String(e.owner).trim() : "";
    let repo = "";
    if (full.includes("/")) {
      const parts = full.split("/").filter(Boolean);
      if (parts.length >= 2) { owner = owner || parts[0]; repo = parts[1]; }
      else repo = parts[0];
    } else repo = full;
    owner = owner || fallbackUser || "OmHackz";
    if (!owner || !repo) return null;
    return {
      owner, repo,
      full: owner + "/" + repo,
      tagline: e.tagline != null ? String(e.tagline) : null,
      featured: !!e.featured,
      homepage: e.homepage != null ? String(e.homepage) : null,
    };
  }

  async function loadList() {
    const res = await fetch("projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error("projects.json missing (HTTP " + res.status + ")");
    const raw = await res.json();
    let fallbackUser = "OmHackz";
    let arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && Array.isArray(raw.repos)) { arr = raw.repos; if (raw.user) fallbackUser = String(raw.user); }
    else if (raw && Array.isArray(raw.items)) arr = raw.items;
    else throw new Error("projects.json must be an array or {user, repos[]}");
    const out = [];
    const seen = new Set();
    for (const e of arr) {
      const n = normEntry(e, fallbackUser);
      if (!n || seen.has(n.full.toLowerCase())) continue;
      seen.add(n.full.toLowerCase());
      out.push(n);
    }
    return out;
  }

  async function fetchRepo(entry) {
    const res = await fetch(`${GH}/repos/${entry.owner}/${entry.repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 403) {
      const reset = res.headers.get("X-RateLimit-Reset");
      const when = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : "later";
      throw new Error(`GitHub rate limit hit — try again after ${when}.`);
    }
    if (res.status === 404) {
      const err = new Error("Not found on GitHub (private, renamed or removed).");
      err.code = 404;
      throw err;
    }
    if (!res.ok) throw new Error("GitHub error " + res.status);
    return res.json();
  }

  // ----- cards -----
  function skeleton() {
    state.hidden = true;
    grid.innerHTML = Array.from({ length: 6 }, () => `<div class="glass-card pj-card skel"><div></div></div>`).join("");
    count.textContent = "Loading curated repos…";
  }
  function showState(title, sub, retry) {
    grid.innerHTML = "";
    count.textContent = "";
    state.hidden = false;
    state.innerHTML =
      `<div class="glass-card dl-state-card"><h3>${esc(title)}</h3><p>${esc(sub)}</p>` +
      (retry ? `<button class="btn btn-primary btn-sm" id="pjRetry">Retry</button>` : "") + `</div>`;
    if (retry) document.getElementById("pjRetry").addEventListener("click", boot);
  }

  function renderFilters() {
    const langs = [...new Set(items.filter((x) => !x._error).map((x) => x.language).filter(Boolean))].sort();
    filters.innerHTML = "";
    ["all", ...langs].forEach((l) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "filter-chip" + (l === activeLang ? " is-active" : "");
      b.textContent = l === "all" ? "All languages" : l;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => { activeLang = l; render(); });
      filters.appendChild(b);
    });
    if (!langs.length) filters.innerHTML = "";
  }

  function current() {
    const q = (search.value || "").trim().toLowerCase();
    let out = items.filter((x) => activeLang === "all" || x.language === activeLang);
    if (q) out = out.filter((x) => [x.full, x.name, x.description, x.tagline, x.language, (x.topics || []).join(" ")].join(" ").toLowerCase().includes(q));
    const by = sort.value;
    out = out.slice().sort((a, b) =>
      by === "stars" ? (b.stars - a.stars) || a.name.localeCompare(b.name)
      : by === "name" ? a.name.localeCompare(b.name)
      : new Date(b.pushed || 0) - new Date(a.pushed || 0)
    );
    return out;
  }

  function card(x) {
    if (x._error) {
      return `<article class="glass-card pj-card is-error">` +
        `<div class="pj-top"><div class="dl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" stroke="none" fill="currentColor"/></svg></div>` +
        `<div class="pj-title"><h3>${esc(x.full)}</h3><p>curated</p></div></div>` +
        `<p>${esc(x._error)}</p>` +
        `<div class="pj-actions"><a class="pj-btn pj-btn-glass" href="https://github.com/${esc(x.full)}" target="_blank" rel="noopener">Open on GitHub</a></div></article>`;
    }
    const desc = x.tagline || x.description || "No description yet.";
    const meta = `★ ${x.stars} · ⑂ ${x.forks} · ${x.language || "—"}`;
    return `<article class="glass-card pj-card">` +
      `<div class="pj-top"><div class="dl-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></div>` +
      `<div class="pj-title"><h3>${esc(x.name)}${x.featured ? ' <span class="feat" title="Featured">★</span>' : ""}</h3><p>${esc(x.full)}</p></div></div>` +
      `<p>${esc(desc)}</p>` +
      `<div class="pj-meta"><span>${esc(meta)}</span><span>${esc(fmtDate(x.pushed))}</span></div>` +
      `<div class="pj-tags"><span class="type-badge">${x.language ? langDot(x.language) + esc(x.language) : "No language"}</span>` +
      (x.license ? `<span class="ext-badge">${esc(x.license)}</span>` : "") + `</div>` +
      `<div class="pj-actions">` +
      `<button type="button" class="pj-btn pj-btn-primary" data-browse="${esc(x.full)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>Browse files</button>` +
      `<a class="pj-btn pj-btn-glass" href="${esc(x.html)}" target="_blank" rel="noopener">GitHub</a>` +
      (x.homepage ? `<a class="pj-btn pj-btn-glass" href="${esc(x.homepage)}" target="_blank" rel="noopener">Live</a>` : "") +
      `</div></article>`;
  }

  function render() {
    renderFilters();
    const out = current();
    state.hidden = true;
    count.textContent = out.length ? `${out.length} curated repo${out.length === 1 ? "" : "s"} — from projects.json` : "";
    grid.innerHTML = out.length
      ? out.map(card).join("")
      : `<div class="glass-card dl-state-card"><h3>Nothing matches</h3><p>Try a different search or language.</p></div>`;
    grid.querySelectorAll("[data-browse]").forEach((b) =>
      b.addEventListener("click", () => {
        const [o, r] = b.getAttribute("data-browse").split("/");
        openBrowser(o, r);
      })
    );
  }

  async function boot() {
    skeleton();
    let list = [];
    try {
      list = await loadList();
    } catch (e) {
      return showState("No curated list", String(e.message || e) + " — add repos to projects.json.", true);
    }
    if (!list.length) return showState("No repos listed", "projects.json has an empty list. Add \"owner/repo\" entries to show them here.");
    const settled = await Promise.allSettled(list.map(fetchRepo));
    items = settled.map((s, i) => {
      const base = list[i];
      if (s.status === "fulfilled") {
        const g = s.value;
        return {
          ...base,
          name: g.name, description: g.description, language: g.language,
          stars: g.stargazers_count || 0, forks: g.forks_count || 0,
          pushed: g.pushed_at, html: g.html_url,
          homepage: base.homepage || g.homepage || "",
          license: g.license ? g.license.spdx_id : "",
          topics: g.topics || [], defaultBranch: g.default_branch || "main",
          openIssues: g.open_issues_count || 0,
        };
      }
      return { ...base, name: base.repo, language: "", stars: 0, forks: 0, pushed: "", html: `https://github.com/${base.full}`, description: "", topics: [], defaultBranch: "main", _error: s.reason && s.reason.message ? s.reason.message : "Failed to load." };
    });
    render();
    routeFromHash();
  }

  // ---------- file browser ----------
  const overlay = document.getElementById("pjBrowser");
  const repoEl = document.getElementById("pjRepoName");
  const branchEl = document.getElementById("pjBranch");
  const crumbsEl = document.getElementById("pjCrumbs");
  const filesEl = document.getElementById("pjFiles");
  const prevEl = document.getElementById("pjPreview");
  const statusEl = document.getElementById("pjStatus");
  const closeBtn = document.getElementById("pjClose");
  const ghBtn = document.getElementById("pjOpenGh");
  const zipBtn = document.getElementById("pjZip");
  const copyBtn = document.getElementById("pjCopyClone");

  let cur = null; // {owner, repo, branch, path:[], branches:[]}
  const dirCache = new Map();

  const FOLDER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>`;
  const FILE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>`;

  function setStatus(t) { statusEl.textContent = t || ""; }
  function ghContents(path) {
    const p = path.length ? "/" + path.map(encodeURIComponent).join("/") : "";
    return `${GH}/repos/${cur.owner}/${cur.repo}/contents${p}?ref=${encodeURIComponent(cur.branch)}`;
  }
  function b64ToText(b64) {
    const bin = atob(b64.replace(/\n/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  function md(src) {
    const lines = esc(src).split("\n");
    let html = "", inList = false, inCode = false;
    const inline = (t) => t
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const close = () => { if (inList) { html += "</ul>"; inList = false; } };
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("```")) { if (inCode) html += "</code></pre>"; else { close(); html += "<pre><code>"; } inCode = !inCode; continue; }
      if (inCode) { html += line + "\n"; continue; }
      if (/^#{1,3}\s/.test(t)) { close(); const lv = t.match(/^#+/)[0].length; html += `<h${lv + 1}>${inline(t.replace(/^#+\s*/, ""))}</h${lv + 1}>`; }
      else if (/^(-{3,}|\*{3,})$/.test(t)) { close(); html += "<hr />"; }
      else if (/^[-*]\s+/.test(t)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(t.replace(/^[-*]\s+/, ""))}</li>`; }
      else if (!t) close();
      else { close(); html += `<p>${inline(t)}</p>`; }
    }
    close();
    if (inCode) html += "</code></pre>";
    return `<div class="pj-readme">${html}</div>`;
  }
  function isImage(name) { return /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(name); }
  function isMarkdown(name) { return /\.md$/i.test(name) || /^readme$/i.test(name); }

  function syncHash() {
    const p = cur.path.length ? "/" + cur.path.join("/") : "";
    location.hash = `#/${cur.owner}/${cur.repo}/tree/${cur.branch}${p}`;
  }
  function routeFromHash() {
    const m = (location.hash || "").match(/^#\/([^/]+)\/([^/]+)\/tree\/([^/]+)(\/.*)?$/);
    if (!m) return;
    const [, o, r, b, rest] = m;
    if (items.some((x) => x.full.toLowerCase() === `${o}/${r}`.toLowerCase())) {
      openBrowser(o, r, b, (rest || "").split("/").filter(Boolean));
    }
  }

  async function loadBranches() {
    branchEl.innerHTML = `<option>${esc(cur.branch)}</option>`;
    try {
      const res = await fetch(`${GH}/repos/${cur.owner}/${cur.repo}/branches?per_page=100`, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return;
      const bs = await res.json();
      const names = bs.map((b) => b.name).filter(Boolean);
      if (!names.length) return;
      if (!names.includes(cur.branch)) names.unshift(cur.branch);
      branchEl.innerHTML = names.map((n) => `<option value="${esc(n)}"${n === cur.branch ? " selected" : ""}>${esc(n)}</option>`).join("");
    } catch { /* keep default */ }
  }

  function renderCrumbs() {
    crumbsEl.innerHTML = "";
    const root = document.createElement("button");
    root.type = "button";
    root.textContent = cur.repo;
    root.className = cur.path.length ? "" : "is-here";
    root.addEventListener("click", () => navTo([]));
    crumbsEl.appendChild(root);
    cur.path.forEach((seg, i) => {
      const s = document.createElement("span");
      s.className = "sep";
      s.textContent = "/";
      crumbsEl.appendChild(s);
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = seg;
      b.className = i === cur.path.length - 1 ? "is-here" : "";
      b.addEventListener("click", () => navTo(cur.path.slice(0, i + 1)));
      crumbsEl.appendChild(b);
    });
    const treeUrl = `https://github.com/${cur.owner}/${cur.repo}/tree/${encodeURIComponent(cur.branch)}${cur.path.length ? "/" + cur.path.map(encodeURIComponent).join("/") : ""}`;
    ghBtn.href = treeUrl;
    zipBtn.href = `https://github.com/${cur.owner}/${cur.repo}/archive/refs/heads/${encodeURIComponent(cur.branch)}.zip`;
  }

  async function navTo(path) {
    cur.path = path;
    dirCache.delete("__sel");
    renderCrumbs();
    syncHash();
    await loadDir();
  }

  async function loadDir() {
    const key = `${cur.owner}/${cur.repo}@${cur.branch}:${cur.path.join("/")}`;
    setStatus("Loading…");
    filesEl.innerHTML = "";
    prevEl.innerHTML = `<p class="pj-hint">Select a file to preview it here.</p>`;
    try {
      let entries = dirCache.get(key);
      if (!entries) {
        const res = await fetch(ghContents(cur.path), { headers: { Accept: "application/vnd.github+json" } });
        if (res.status === 403) throw new Error("GitHub rate limit hit — wait a minute and retry.");
        if (!res.ok) throw new Error("Failed to list files (HTTP " + res.status + ").");
        const data = await res.json();
        entries = Array.isArray(data) ? data : [data];
        dirCache.set(key, entries);
      }
      if (entries.length === 1 && entries[0].type === "file") return loadFile(entries[0]);
      entries = entries.slice().sort((a, b) =>
        (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1)
      );
      if (!entries.length) filesEl.innerHTML = `<p class="pj-hint" style="padding:10px">Empty directory.</p>`;
      for (const e of entries) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pj-file-row";
        b.innerHTML = `${e.type === "dir" ? FOLDER_SVG : FILE_SVG}<span class="nm">${esc(e.name)}</span><span class="sz">${e.type === "dir" ? "—" : fmtSize(e.size)}</span>`;
        b.addEventListener("click", () => {
          filesEl.querySelectorAll(".pj-file-row").forEach((r) => r.classList.remove("is-active"));
          b.classList.add("is-active");
          if (e.type === "dir") navTo([...cur.path, e.name]);
          else loadFile(e);
        });
        if (e.type === "dir") b.addEventListener("dblclick", () => navTo([...cur.path, e.name]));
        filesEl.appendChild(b);
      }
      setStatus(`${entries.length} item${entries.length === 1 ? "" : "s"} · ${cur.branch}`);
      // auto-preview README at root-ish levels
      const readme = entries.find((e) => e.type === "file" && /^readme(\.md)?$/i.test(e.name));
      if (readme && cur.path.length <= 1) loadFile(readme, true);
    } catch (e) {
      filesEl.innerHTML = "";
      prevEl.innerHTML = `<p class="pj-err">${esc(e.message || String(e))}</p>`;
      setStatus("Failed to load.");
    }
  }

  async function loadFile(entry, quiet) {
    const fullPath = entry.path != null ? entry.path : [...cur.path, entry.name].join("/");
    if (!quiet) setStatus("Loading " + entry.name + "…");
    try {
      if (isImage(entry.name)) {
        const raw = entry.download_url || `https://raw.githubusercontent.com/${cur.owner}/${cur.repo}/${encodeURIComponent(cur.branch)}/${fullPath.split("/").map(encodeURIComponent).join("/")}`;
        prevEl.innerHTML = `<div class="pj-preview-head"><strong>${esc(entry.name)}</strong><span class="pj-hint">${esc(fmtSize(entry.size))}</span><a class="pj-btn pj-btn-glass" href="${esc(raw)}" target="_blank" rel="noopener">Raw</a></div><img src="${esc(raw)}" alt="${esc(entry.name)}" loading="lazy" />`;
        setStatus(entry.name + " · " + fmtSize(entry.size));
        return;
      }
      if (entry.size > 512 * 1024) {
        const raw = entry.download_url || entry.html_url;
        prevEl.innerHTML = `<div class="pj-preview-head"><strong>${esc(entry.name)}</strong></div><p class="pj-hint">Too large to preview (${esc(fmtSize(entry.size))}).</p><p><a class="pj-btn pj-btn-glass" href="${esc(raw)}" target="_blank" rel="noopener">Open raw</a></p>`;
        setStatus(entry.name + " · too large to preview");
        return;
      }
      let text = null;
      if (entry.content && entry.encoding === "base64") {
        try { text = b64ToText(entry.content); } catch { text = null; }
      }
      if (text == null) {
        const url = entry.download_url || entry.url;
        if (!url) throw new Error("No downloadable content.");
        const r = await fetch(entry.download_url || entry.url, { headers: { Accept: "application/vnd.github.raw" } });
        if (!r.ok) throw new Error("Failed to fetch file (HTTP " + r.status + ").");
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("json") && (entry.download_url == null)) {
          const j = await r.json();
          if (j.content && j.encoding === "base64") text = b64ToText(j.content);
          else throw new Error("Unexpected file payload.");
        } else text = await r.text();
      }
      if (/[\0]/.test(text.slice(0, 8000))) {
        prevEl.innerHTML = `<div class="pj-preview-head"><strong>${esc(entry.name)}</strong></div><p class="pj-hint">Binary file — preview not available.</p><p><a class="pj-btn pj-btn-glass" href="${esc(entry.download_url || entry.html_url)}" target="_blank" rel="noopener">Download</a></p>`;
      } else if (isMarkdown(entry.name)) {
        prevEl.innerHTML = `<div class="pj-preview-head"><strong>${esc(entry.name)}</strong><span class="pj-hint">${esc(fmtSize(entry.size))}</span></div>` + md(text);
      } else {
        const lines = text.split("\n").length;
        prevEl.innerHTML = `<div class="pj-preview-head"><strong>${esc(entry.name)}</strong><span class="pj-hint">${esc(fmtSize(entry.size))} · ${lines} lines</span><a class="pj-btn pj-btn-glass" href="${esc(entry.download_url || entry.html_url)}" target="_blank" rel="noopener">Raw</a></div><pre class="code"><code>${esc(text.slice(0, 200000))}</code></pre>`;
      }
      setStatus(entry.name + " · " + fmtSize(entry.size));
    } catch (e) {
      if (!quiet) prevEl.innerHTML = `<p class="pj-err">${esc(e.message || String(e))}</p>`;
      setStatus("Preview failed.");
    }
  }

  async function openBrowser(owner, repo, branch, path) {
    const known = items.find((x) => x.full.toLowerCase() === `${owner}/${repo}`.toLowerCase());
    cur = { owner, repo, branch: branch || (known && known.defaultBranch) || "main", path: path || [], branches: [] };
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    repoEl.textContent = `${owner}/${repo}`;
    copyBtn.setAttribute("data-clone", `https://github.com/${owner}/${repo}.git`);
    renderCrumbs();
    syncHash();
    prevEl.innerHTML = `<p class="pj-hint">Loading…</p>`;
    filesEl.innerHTML = "";
    await loadBranches();
    renderCrumbs();
    await loadDir();
  }
  function closeBrowser() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    cur = null;
    try { history.replaceState(null, "", location.pathname + location.search); } catch { location.hash = ""; }
  }

  if (closeBtn) closeBtn.addEventListener("click", closeBrowser);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeBrowser(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeBrowser(); });
  if (branchEl) branchEl.addEventListener("change", () => {
    if (!cur) return;
    cur.branch = branchEl.value;
    cur.path = [];
    renderCrumbs(); syncHash(); loadDir();
  });
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    const t = copyBtn.getAttribute("data-clone") || "";
    try { await navigator.clipboard.writeText(t); copyBtn.textContent = "Copied!"; }
    catch { copyBtn.textContent = t; }
    setTimeout(() => { copyBtn.textContent = "Copy clone URL"; }, 1600);
  });

  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  window.addEventListener("hashchange", () => { if (!location.hash && cur) closeBrowser(); });

  boot();
})();
