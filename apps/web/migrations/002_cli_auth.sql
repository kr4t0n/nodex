-- Device authorization for the CLI.
--
-- The CLI cannot receive a browser redirect, so it asks for a pair of codes: one
-- it keeps and polls with, one short enough for a person to read off a terminal
-- and type into a browser. This is the shape of RFC 8628, against nodex rather
-- than against GitHub: the CLI ends up holding a nodex session, not a GitHub
-- token, so revoking it here is enough.

create table if not exists cli_auth_requests (
  -- Hashed for the same reason session tokens are: this row is the credential
  -- until it is exchanged, and a database read should not yield a usable one.
  device_code_hash text primary key,

  -- Typed by a human, so it is short and drawn from an alphabet without
  -- characters that are read wrong out loud or off a screen. Unique because the
  -- approval page looks a request up by it.
  user_code text not null unique,

  -- Null until somebody approves. Set to the approver, so the session the CLI
  -- receives belongs to the person who authorised it and not to whoever started
  -- the request.
  user_id uuid references users (id) on delete cascade,

  approved_at timestamptz,
  denied_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),

  -- Enforces the polling interval. A client that polls faster than it was told
  -- to gets told to slow down rather than being served.
  last_polled_at timestamptz
);

create index if not exists cli_auth_requests_user_code_idx
  on cli_auth_requests (user_code);

create index if not exists cli_auth_requests_expires_at_idx
  on cli_auth_requests (expires_at);
