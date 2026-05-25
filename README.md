# OMHACKZ Personal Website

Static personal developer site for **omhackz.github.io** — built with vanilla HTML, CSS, and JavaScript. No framework, no build step.

## Structure

```
omhackz/
├── index.html          # All four pages in one file (SPA routing)
├── css/
│   └── style.css       # All styles with CSS custom properties
├── js/
│   └── main.js         # Routing, GitHub API, project rendering
└── README.md
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero + live stats + featured projects |
| Portfolio | `#portfolio` | Skills, experience timeline, achievements |
| Projects | `#projects` | Live GitHub repo listing with `site.link` support |
| Info | `#info` | About, links, contact form |

## `site.link` Convention

Drop a file named `site.link` in any repo root. Two formats supported:

**JSON** (recommended):
```json
{
  "url": "https://your-live-site.com",
  "name": "Display Name",
  "description": "Shown instead of GitHub description",
  "tags": ["tool", "win32"]
}
```

**Plain text** (fallback):
```
https://your-live-site.com
Optional extra description text here
```

Repos with a valid `site.link` get the **LIVE** badge on the Projects page.

## Deploying to GitHub Pages

1. Create repo named `omhackz.github.io` (or any repo → Settings → Pages)
2. Push all files to `main` branch
3. Go to repo **Settings → Pages → Source → Deploy from branch → main / root**
4. Site will be live at `https://omhackz.github.io`

## Customization Checklist

- [ ] Update `GITHUB_USERNAME` in `js/main.js` if needed
- [ ] Edit hero tagline in `index.html`
- [ ] Fill in real experience/achievements in Portfolio section
- [ ] Add contact email or wire up Formspree in the contact form
- [ ] Update links in the Info page
- [ ] Add `site.link` files to your repos for enhanced cards

## GitHub API Rate Limits

Unauthenticated requests: 60/hour per IP. For higher limits, add a personal access token:

```js
// In js/main.js fetchRepos():
headers: { Authorization: 'token YOUR_PAT' }
```

> ⚠️ Never commit tokens to public repos. Use GitHub Actions secrets or environment variables for production.

## Tech

- HTML5 / CSS3 / Vanilla JS (ES2020+)
- Google Fonts: Share Tech Mono + Barlow
- GitHub REST API v3
- GitHub Pages hosting
