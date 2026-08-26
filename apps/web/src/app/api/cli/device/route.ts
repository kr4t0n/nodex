import { NextResponse } from 'next/server';

import { startDeviceRequest, sweepExpired } from '@/lib/cli-auth.ts';
import { databaseConfigured } from '@/lib/db.ts';
import { siteUrl } from '@/lib/github.ts';

/**
 * Start a device authorization.
 *
 * Returns the pair: a device code the CLI keeps and polls with, and a user code
 * a person types into a browser. Field names follow RFC 8628 so the exchange is
 * recognisable to anyone who has implemented one before.
 */
export async function POST() {
  if (!databaseConfigured()) {
    return NextResponse.json(
      { error: 'unconfigured', error_description: 'accounts are not set up' },
      { status: 503 },
    );
  }

  try {
    // Cheap, and keeps a long-running server from accumulating dead rows
    // without needing a scheduled job for a table this small.
    await sweepExpired();

    const request = await startDeviceRequest();
    return NextResponse.json(
      {
        device_code: request.deviceCode,
        user_code: request.userCode,
        verification_uri: `${siteUrl()}/activate`,
        expires_in: request.expiresIn,
        interval: request.interval,
      },
      // Nothing about this response should be cached, by anything, ever.
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'server_error', error_description: 'could not start sign in' },
      { status: 500 },
    );
  }
}
