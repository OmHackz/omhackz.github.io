# OmHackz

> Personal website, project hub, and interactive web apps.

<p align="center">
  <a href="https://omhackz.top">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fomhackz.top&label=omhackz.top&style=for-the-badge&up_message=online&down_message=offline&color=brightgreen" alt="omhackz.top status" />
  </a>
  <a href="https://github.com/OmHackz/omhackz.github.io/actions/workflows/deploy.yml">
    <img src="https://shieldcn.dev/github/ci/OmHackz/omhackz.github.io.svg?workflow=deploy.yml&mode=light" alt="GitHub Pages deploy" />
  </a>
  <img src="https://shieldcn.dev/badge/Vercel-Deployed-black.svg?logo=vercel&mode=light" alt="Vercel deployed" />
</p>

<p align="center">
  <img src="https://shieldcn.dev/github/stars/OmHackz/omhackz.github.io.svg?mode=light" alt="Stars" />
  <img src="https://shieldcn.dev/github/forks/OmHackz/omhackz.github.io.svg?mode=light" alt="Forks" />
  <img src="https://shieldcn.dev/github/contributors/OmHackz/omhackz.github.io.svg?mode=light" alt="Contributors" />
  <img src="https://shieldcn.dev/github/commits/OmHackz/omhackz.github.io.svg?mode=light" alt="Commits" />
  <img src="https://shieldcn.dev/github/last-commit/OmHackz/omhackz.github.io.svg?mode=light" alt="Last commit" />
  <img src="https://shieldcn.dev/github/open-issues/OmHackz/omhackz.github.io.svg?mode=light" alt="Open issues" />
  <img src="https://shieldcn.dev/github/open-prs/OmHackz/omhackz.github.io.svg?mode=light" alt="Open pull requests" />
</p>

## Overview

OmHackz is a static, zero-build personal site and project hub. It combines a polished landing
page with interactive browser-based apps, downloadable tools, and a project portfolio. Content
is served as static HTML, CSS, and JavaScript, with project metadata driven by `projects.json`.

**Live site:** [omhackz.top](https://omhackz.top) · **Repository:** [OmHackz/omhackz.github.io](https://github.com/OmHackz/omhackz.github.io)

## Features

- Project portfolio with GitHub-driven metadata
- Download catalog with package/installer listings
- Interactive web apps: arcade, Minecraft, Lunix, terminal, and more
- Redirect hub for social and package-platform profiles
- Responsive design with dark/light theme support
- Automated GitHub Pages deployment on every push to `main`

## Tech Stack

| Area | Technology |
|------|------------|
| Markup | HTML5 |
| Styling | Vanilla CSS (design tokens, glassmorphism) |
| Scripting | Vanilla JavaScript (ES2020+) |
| Hosting | GitHub Pages / Vercel |
| Data | Static JSON (`projects.json`, `downloads.json`) |
| CI/CD | GitHub Actions |

## Repository Stats

| Metric | Value |
|--------|------:|
| Total files | 44 |
| Total size | 461 KB |
| Total lines | 12,089 |

### File Breakdown

| Extension | Count | Size (KB) |
|-----------|------:|----------:|
| `.html` | 16 | 119.32 |
| `.js` | 10 | 198.85 |
| `.css` | 6 | 115.41 |
| `.json` | 4 | 6.69 |
| `.yml` | 2 | 1.36 |
| `.png` | 2 | 2.85 |
| `.htm` | 1 | 15.96 |
| `.gitignore` | 1 | 0.27 |
| `.nojekyll` | 1 | 0.07 |

### Largest Files

| File | Lines | Size (KB) |
|------|------:|----------:|
| `styles.css` | 1,804 | 49.61 |
| `assets/js/mc.js` | 1,626 | 55.28 |
| `assets/js/lunix.js` | 1,187 | 49.84 |
| `assets/css/lunix.css` | 1,009 | 24.88 |
| `assets/css/arcade.css` | 997 | 22.95 |

## Project Structure

```
.
├── index.html, about.html, contact.html, projects.html, ...
├── games.html, downloads.html, download.html, minecraft.html, lunix.html
├── script.js, downloads.js, projects.js
├── assets/
│   ├── css/          # Page and app stylesheets
│   └── js/           # Page and app scripts
├── r/                # Platform redirect pages
├── .github/workflows # CI and deployment automation
└── README.md
```

## CI/CD & Deployment

- `ci.yml` runs JavaScript syntax checks on every push and pull request.
- `deploy.yml` deploys the site to GitHub Pages on every push to `main`.
- Deployment is static: no build step, no bundler, no server-side runtime.
- `.nojekyll` disables Jekyll processing so all files are published as-is.

## Star History

<p align="center">
  <a href="https://github.com/OmHackz/omhackz.github.io/stargazers">
    <img src="https://shieldcn.dev/chart/github/stars/OmHackz/omhackz.github.io.svg?theme=violet" alt="Star history chart" />
  </a>
</p>

## Meta

- **Branch:** `main`
- **Remote:** `OmHackz/omhackz.github.io`
- **License:** Not specified
