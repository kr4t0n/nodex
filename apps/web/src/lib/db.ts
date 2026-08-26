import 'server-only';

import pg from 'pg';

/**
 * The one connection pool.
 *
 * Cached on `globalThis` because Next replaces module instances on every hot
 * reload in development. Without this, a morning's editing leaves dozens of
 * orphaned pools open and Postgres starts refusing connections, which reads as a
 * database problem rather than a dev-server one.
 *
 * `server-only` above is not decoration: importing this from a client component
 * would try to bundle a database driver and the connection string into the
 * browser. This turns that mistake into a build error.
 */

declare global {
  var __nodexPool: pg.Pool | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env, then run ' +
        '`npm run db:up && npm run db:migrate`.',
    );
  }
  return url;
}

export function pool(): pg.Pool {
  globalThis.__nodexPool ??= new pg.Pool({
    connectionString: connectionString(),
    // A dev machine and a small server both want a modest ceiling. The default
    // of 10 per pool is fine; the timeout is what stops a page hanging forever
    // on a database that is down.
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });
  return globalThis.__nodexPool;
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, values);
  return result.rows;
}

/** True when the accounts layer is configured at all. */
export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
