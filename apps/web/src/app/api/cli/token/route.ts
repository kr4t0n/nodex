import { NextResponse, type NextRequest } from 'next/server';

import { poll } from '@/lib/cli-auth.ts';
import { databaseConfigured, query } from '@/lib/db.ts';
import { createSession, newSessionToken } from '@/lib/session.ts';

/**
 * The CLI's poll.
 *
 * Error codes are RFC 8628's, including the deliberate choice that
 * `authorization_pending` is an "error" while the user has not approved yet.
 * That reads oddly but is the contract every device-flow client already expects.
 */
function fail(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured()) return fail('unconfigured', 503);

  let deviceCode: string | undefined;
  try {
    const body = (await request.json()) as { device_code?: string };
    deviceCode = body.device_code;
  } catch {
    return fail('invalid_request');
  }

  if (!deviceCode) return fail('invalid_request');

  let outcome;
  try {
    outcome = await poll(deviceCode);
  } catch {
    return fail('server_error', 500);
  }

  switch (outcome.status) {
    case 'pending':
      return fail('authorization_pending');
    case 'slow_down':
      return fail('slow_down');
    case 'denied':
      return fail('access_denied');
    case 'expired':
      return fail('expired_token');
    case 'approved':
      break;
  }

  try {
    const token = newSessionToken();
    await createSession(outcome.userId, token, 'cli');

    const rows = await query<{ login: string }>(
      'select login from users where id = $1',
      [outcome.userId],
    );

    return NextResponse.json(
      {
        access_token: token,
        token_type: 'bearer',
        login: rows[0]?.login ?? null,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    // The request row is already gone at this point, so the CLI must start
    // over rather than poll into a row that no longer exists.
    return fail('server_error', 500);
  }
}
