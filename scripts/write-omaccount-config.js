// ---------- OmAccount config generator (deploy-time) ----------
// GitHub Actions calls this with repo secrets so keys never land in git:
//   SUPABASE_URL, SUPABASE_ANON_KEY  (required)
//   OM_OWNER_GITHUB, OM_OWNER_EMAIL  (optional)
// Without secrets it keeps the committed placeholder config, so the site
// still deploys (and shows the "not connected" banner) instead of failing.
const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_ANON_KEY || "").trim();
const ownerGithub = (process.env.OM_OWNER_GITHUB || "OmHackz").trim() || "OmHackz";
const ownerEmail = (process.env.OM_OWNER_EMAIL || "").trim();

const ready = /^https:\/\/.+\.supabase\.co$/.test(url) && key.length > 20;

const content = `// ---------- OmAccount config ----------
// ${ready
  ? "Generated at deploy time from GitHub Actions secrets (SUPABASE_URL / SUPABASE_ANON_KEY)."
  : "PLACEHOLDER — connect via GitHub Actions secrets (SUPABASE_URL / SUPABASE_ANON_KEY) or edit manually. See supabase/README.md."}
// The anon key is publishable (safe in client JS). NEVER put service_role here.
window.OMACCOUNT = {
  supabaseUrl: ${JSON.stringify(ready ? url : "https://YOUR-PROJECT.supabase.co")},
  supabaseAnonKey: ${JSON.stringify(ready ? key : "YOUR-ANON-KEY")},
  // Only this GitHub username may register apps (app ids). Enforced in the
  // database by RLS too — the frontend check is UX only.
  ownerGithub: ${JSON.stringify(ownerGithub)},
  // Optional extra owner check: the login email of the owner.
  // Leave "" to only use the GitHub-username / is_owner checks.
  ownerEmail: ${JSON.stringify(ownerEmail)},
};
`;

const target = path.join(__dirname, "..", "assets", "js", "omaccount-config.js");
fs.writeFileSync(target, content);
console.log(
  ready
    ? "omaccount-config.js written from GitHub Secrets"
    : "No Supabase secrets found — placeholder config kept"
);
