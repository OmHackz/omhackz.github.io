// ---------- OmAccount config ----------
// Fill these in after creating your Supabase project (see supabase/README.md).
// The anon key is publishable (safe in client JS). NEVER put service_role here.
window.OMACCOUNT = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-ANON-KEY",
  // Only this GitHub username may register apps (app ids). Enforced in the
  // database by RLS too — the frontend check is UX only.
  ownerGithub: "OmHackz",
  // Optional extra owner check: the login email of the owner.
  // Leave "" to only use the GitHub-username / is_owner checks.
  ownerEmail: "",
};
