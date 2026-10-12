-- ---------- OmAccount schema (Supabase / Postgres) ----------
-- Run this in Supabase Dashboard → SQL Editor (once).
-- Tables: public profiles, om_apps (app ids, owner-only writes),
-- om_authorizations (user approvals per app).

-- Profiles: one row per auth user. is_owner is NEVER set by clients.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  username text not null default '',
  avatar_url text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

-- Apps: app ids ONLY the OmHackz owner may register (see RLS below).
create table if not exists public.om_apps (
  app_id text primary key check (app_id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text not null,
  description text not null default '',
  redirect_uris text[] not null default '{}',
  owner_github text not null default 'OmHackz',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Authorizations: which user approved which app.
create table if not exists public.om_authorizations (
  user_id uuid not null references auth.users (id) on delete cascade,
  app_id text not null references public.om_apps (app_id) on delete cascade,
  scopes text[] not null default '{profile}',
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

-- Helper: is the caller the owner?
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_owner = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.om_apps enable row level security;
alter table public.om_authorizations enable row level security;

-- profiles: read own row; owner reads all; insert/update own row
-- (clients may never set is_owner — enforced by trigger below).
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_owner());

drop policy if exists "profiles upsert own" on public.profiles;
create policy "profiles upsert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- om_apps: every signed-in user can read (needed by authorize.html);
-- ONLY the owner can insert / update / delete.
drop policy if exists "apps read all" on public.om_apps;
create policy "apps read all" on public.om_apps
  for select to authenticated using (true);

drop policy if exists "apps owner write" on public.om_apps;
create policy "apps owner write" on public.om_apps
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- om_authorizations: users manage their OWN rows; owner reads all.
drop policy if exists "authz read own" on public.om_authorizations;
create policy "authz read own" on public.om_authorizations
  for select to authenticated using (user_id = auth.uid() or public.is_owner());

drop policy if exists "authz write own" on public.om_authorizations;
create policy "authz write own" on public.om_authorizations
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "authz update own" on public.om_authorizations;
create policy "authz update own" on public.om_authorizations
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "authz delete own" on public.om_authorizations;
create policy "authz delete own" on public.om_authorizations
  for delete to authenticated using (user_id = auth.uid() or public.is_owner());

-- Clients must never be able to grant themselves is_owner.
create or replace function public.protect_owner_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    new.is_owner := coalesce(old.is_owner, false);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_owner on public.profiles;
create trigger profiles_protect_owner
  before insert or update on public.profiles
  for each row execute function public.protect_owner_flag();

-- AFTER running this, make yourself owner once (Supabase → Authentication →
-- copy your user UUID, then run with your real id):
--   update public.profiles set is_owner = true where id = 'YOUR-USER-UUID';
-- (Sign in once first so your profile row exists.)
