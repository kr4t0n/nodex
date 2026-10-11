import 'server-only';

import pg from 'pg';

// Keep one pool across Next's development module reloads.
declare global {
  var __nodexPool: pg.Pool | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env, then run ' +
        '`pnpm run db:up && pnpm run db:migrate`.',
    );
  }
  return url;
}

export function pool(): pg.Pool {
  globalThis.__nodexPool ??= new pg.Pool({
    connectionString: connectionString(),
    // Bound page waits when the database is unreachable.
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
