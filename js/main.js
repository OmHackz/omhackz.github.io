/* ── OMHACKZ MAIN JS ─────────────────────────────── */
const GITHUB_USERNAME = 'omhackz';
const MAX_REPO_CHECK = 25;
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Kotlin: '#A97BFF', C: '#555555', 'C++': '#f34b7d',
  'C#': '#178600', HTML: '#e34c26', CSS: '#563d7c', Rust: '#dea584',
  Go: '#00ADD8', Shell: '#89e051', Ruby: '#701516', Lua: '#000080',
  Vue: '#41b883', Svelte: '#ff3e00', Zig: '#ec915c',
};

/* ── ROUTING ─────────────────────────────────────── */
const pages = ['home', 'portfolio', 'projects', 'info'];

function navigate(id) {
  pages.forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle('active', p === id);
  });
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === id);
  });
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'projects') initProjects();
  history.replaceState({}, '', id === 'home' ? '/' : `#${id}`);
}

function routeFromHash() {
  const hash = location.hash.replace('#', '');
  navigate(pages.includes(hash) ? hash : 'home');
}

/* ── NAV ─────────────────────────────────────────── */
document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

// scroll shadow
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', scrollY > 20);
}, { passive: true });

// hamburger
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('nav-mobile');

function closeMobileMenu() {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
}
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

/* ── GITHUB API ──────────────────────────────────── */
let reposCache = null;
let projectsInitialized = false;

async function fetchRepos() {
  if (reposCache) return reposCache;
  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('GitHub API error: 403 (rate limit or blocked request). Please try again later.');
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }
  reposCache = await res.json();
  return reposCache;
}

async function fetchSiteFile(repo) {
  const filenames = ['site.live', 'site.link'];
  for (const filename of filenames) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${repo.name}/${repo.default_branch}/${filename}`;
      const res = await fetch(rawUrl);
      if (!res.ok) continue;
      const text = await res.text();
      const site = parseSiteLink(text.trim());
      if (site?.url) return site;
    } catch {
      continue;
    }
  }
  return null;
}

function parseSiteLink(text) {
  // Try JSON first
  try {
    const j = JSON.parse(text);
    return { url: j.url || j.link || j.site, name: j.name, description: j.description, tags: j.tags || [] };
  } catch {}
  // Fall back: first line as URL, rest as description
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const url = lines.find(l => l.startsWith('http'));
  return url ? { url, name: null, description: lines.filter(l => l !== url).join(' ') || null, tags: [] } : null;
}

/* ── PROJECTS RENDER ──────────────────────────────── */
async function initProjects() {
  if (projectsInitialized) return;
  projectsInitialized = true;

  const container = document.getElementById('projects-container');
  container.innerHTML = `
    <div class="projects-state">
      <div class="spinner"></div>
      fetching repositories…
    </div>`;

  try {
    const repos = await fetchRepos();
    const filtered = repos
      .filter(r => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, MAX_REPO_CHECK);

    const liveRepos = [];
    for (const repo of filtered) {
      const siteLink = await fetchSiteFile(repo);
      if (siteLink) liveRepos.push({ repo, siteLink });
      if (liveRepos.length >= 6) break;
    }

    container.innerHTML = '';

    if (liveRepos.length === 0) {
      container.innerHTML = '<div class="projects-state">no live repositories found.</div>';
      updateStats([]);
      return;
    }

    liveRepos.forEach(item => {
      container.appendChild(buildCard(item.repo, item.siteLink));
    });

    const reposForStats = liveRepos.map(item => item.repo);
    updateFeatured(reposForStats, liveRepos.map(item => item.siteLink));
    updateStats(reposForStats);

  } catch (err) {
    container.innerHTML = `<div class="projects-state error">
      error loading repositories.<br><small>${err.message}</small>
    </div>`;
  }
}

function buildCard(repo, siteLink) {
  const card = document.createElement('div');
  card.className = `project-card${siteLink ? ' enhanced' : ''}`;

  const color = LANG_COLORS[repo.language] || '#666';
  const desc = siteLink?.description || repo.description || 'No description provided.';
  const name = siteLink?.name || repo.name;

  card.innerHTML = `
    <div class="pc-top">
      <div class="pc-name">
        <a href="${repo.html_url}" target="_blank" rel="noopener">${escHtml(name)}</a>
      </div>
      ${repo.fork ? '<span class="pc-fork">fork</span>' : ''}
    </div>
    <div class="pc-desc">${escHtml(desc)}</div>
    <div class="pc-footer">
      ${repo.language ? `
        <span class="pc-lang">
          <span class="lang-dot" style="background:${color}"></span>
          ${escHtml(repo.language)}
        </span>` : ''}
      ${repo.stargazers_count > 0 ? `
        <span class="pc-stars">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${repo.stargazers_count}
        </span>` : ''}
      ${siteLink?.url ? `<a class="pc-link" href="${siteLink.url}" target="_blank" rel="noopener">View</a>` : ''}
    </div>`;
  return card;
}

function updateFeatured(repos, siteLinks) {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const top = repos.slice(0, 3);
  grid.innerHTML = '';
  top.forEach((repo, i) => {
    const sl = siteLinks[i];
    const color = LANG_COLORS[repo.language] || '#666';
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.innerHTML = `
      <div class="fc-lang">${repo.language || 'misc'}</div>
      <div class="fc-name">${escHtml(sl?.name || repo.name)}</div>
      <div class="fc-desc">${escHtml(sl?.description || repo.description || '')}</div>
      <div class="fc-meta">
        <span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${repo.stargazers_count}
        </span>
        <span>updated ${timeAgo(repo.pushed_at)}</span>
        ${sl?.url ? `<a href="${sl.url}" target="_blank" rel="noopener" style="color:var(--accent);margin-left:auto">View ↗</a>` : ''}
      </div>`;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => navigate('projects'));
    grid.appendChild(card);
  });
}

/* ── UTILS ───────────────────────────────────────── */
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateStats(repos) {
  const repoCount = repos.length;
  const starCount = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const languages = [...new Set(repos.filter(repo => repo.language).map(repo => repo.language))];

  document.getElementById('stat-repos').textContent = repoCount;
  document.getElementById('stat-stars').textContent = starCount;
  document.getElementById('stat-langs').textContent = languages.length;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}y ago`;
}

/* ── BOOT ────────────────────────────────────────── */
window.addEventListener('popstate', routeFromHash);
routeFromHash();

// Load repo stats and featured cards on first visit, even if user stays on home
initProjects().catch(() => {});

// Prefetch repos in background after a short delay
setTimeout(() => {
  fetchRepos().catch(() => {});
}, 2000);
