import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { databaseConfigured, query } from '@/lib/db.ts';

/**
 * Who a CLI token belongs to.
 *
 * Reads the bearer header rather than the cookie, because the CLI has no cookie
 * jar. Same table and the same hash comparison as a browser session; only the
 * carrier differs.
 */
export async function GET(request: NextRequest) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 });
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  try {
    const rows = await query<{ login: string; origin: string }>(
      `select u.login, s.origin
         from sessions s
         join users u on u.id = s.user_id
        where s.token_hash = $1
          and s.expires_at > now()`,
      [createHash('sha256').update(token).digest('hex')],
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return NextResponse.json(
      { login: row.login, origin: row.origin },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
