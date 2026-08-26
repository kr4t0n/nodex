-- Accounts and sessions.
--
-- Deliberately two tables and nothing else. Entitlements, teams, and billing all
-- belong to the tier that does not exist yet, and guessing their shape now would
-- mean migrating a guess later.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  -- GitHub's numeric id, not the login. Logins are renameable, so keying on one
  -- would silently create a second account the first time somebody renames.
  github_id bigint not null unique,
  login text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  -- The SHA-256 of the token, never the token. A leaked database read should not
  -- hand the reader a set of working sessions, and the server only ever needs to
  -- compare, never to reproduce.
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Coarse provenance, so a future account page can list "web" and "cli"
  -- sessions separately and revoke one without the other.
  origin text not null default 'web'
);

create index if not exists sessions_user_id_idx on sessions (user_id);

-- Expired rows are deleted on read, but only the ones being looked up. This
-- supports a periodic sweep of the rest.
create index if not exists sessions_expires_at_idx on sessions (expires_at);
