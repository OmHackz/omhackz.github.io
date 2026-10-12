# OmAccount × Supabase setup

OmAccount is a universal account for every OmHackz app, backed by Supabase Auth.
App ids can **only** be registered by the `OmHackz` owner account (frontend gate
+ database RLS + trigger — see `schema.sql`).

## 1. Create the project

1. Go to <https://supabase.com> → New project. Save the **Project URL** and
   **anon public key** (Project Settings → API).
2. Apply the schema — either push to `main` and let the **Apply
   Supabase schema** workflow do it (see §4), or run it by hand:
   SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → sign in once on the site (creates your profile row), then
   promote yourself to owner in SQL Editor:
   `update public.profiles set is_owner = true where id = 'YOUR-USER-UUID';`
   (Find the UUID in Authentication → Users.)

## 2. Auth providers

- **Email + password / OTP:** Authentication → Providers → Email → enable.
  (OTP needs an SMTP sender for production; Supabase's default works for testing.)
- **Google:** Providers → Google → enable with your Google Cloud OAuth client id/secret.
- **GitHub:** Providers → GitHub → enable with your GitHub OAuth App id/secret.
- **Redirect URLs:** add your site URLs, e.g.
  `https://YOUR-SITE/account.html` (and `http://localhost:8000/account.html` for testing).

## 3. Wire the site

Edit `assets/js/omaccount-config.js`:

```js
window.OMACCOUNT = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-ANON-KEY",
  ownerGithub: "OmHackz",
  ownerEmail: "you@example.com", // optional extra owner check
};
```

That anon key is publishable (it ships in client JS by design). Never commit a
`service_role` key anywhere in this repo.

## 4. Env vars on static hosts

Static HTML cannot read dashboard env vars at runtime — keys must be
injected **at deploy time**.

### GitHub Pages (recommended)

1. Repo → Settings → Secrets and variables → Actions → **New repository
   secret**:
   - `SUPABASE_URL` — `https://YOUR-PROJECT.supabase.co`
   - `SUPABASE_ANON_KEY` — your public anon key
   - `OM_OWNER_GITHUB` (optional, default `OmHackz`)
   - `OM_OWNER_EMAIL` (optional)
   - `SUPABASE_ACCESS_TOKEN` — personal access token
     (Account → Access Tokens, used by the schema workflow)
   - `SUPABASE_PROJECT_REF` — your project ref (the short id in
     the project URL)
2. Push to `main`. Two workflows run automatically:
   - **Apply Supabase schema** (`.github/workflows/supabase.yml`) —
     runs whenever `supabase/schema.sql` changes: links the project
     with the Supabase CLI and `db push`es the schema as a
     timestamped migration. No manual SQL Editor step needed.
   - **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`) —
     runs `scripts/write-omaccount-config.js`, which bakes the
     secrets into `assets/js/omaccount-config.js` **only in the
     deployed artifact** — never in git. Without secrets the
     placeholder config deploys instead and the site shows a
     "not connected" banner.
3. Pages → Source → **GitHub Actions**. `.nojekyll` is already in the
   repo so `assets/js/*` is served.

**First time only:** after the schema workflow has run, sign in once
on the site (creates your profile row), then promote yourself to
owner in SQL Editor:
`update public.profiles set is_owner = true where id = 'YOUR-USER-UUID';`
(Find the UUID in Authentication → Users.)

### Vercel / Cloudflare Pages

Store the same vars as project env vars and inject at build time (e.g.
a deploy command like `SUPABASE_URL=$SUPABASE_URL node
scripts/write-omaccount-config.js`), or serve the config from a
same-origin Function endpoint (`/api/config`). Secrets
(`service_role`) must live in Functions only — never in served
HTML/JS.

## 5. App ids (owner only)

1. Sign in as the owner → `account.html` → **Register app**.
2. App id format: `^[a-z0-9][a-z0-9-]{1,40}$`, e.g. `mangoz-web`.
3. Add every allowed redirect URI (exact match, one per line).
4. Other apps authorize via:
   `authorize.html?app_id=APP&redirect_uri=HTTPS-CALLBACK&scope=profile&state=RANDOM`
   → user approves → redirect back with `#access_token=…&app_id=…&state=…`.
   The receiving app must validate the token server-side with Supabase Auth —
   never trust it client-side alone.
