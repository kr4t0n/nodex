import 'server-only';

import { createHash, randomBytes, randomInt } from 'node:crypto';

import { query } from './db.ts';

/**
 * Device authorization, server half.
 *
 * The CLI has no way to receive a redirect, so it takes two codes: a long one it
 * keeps and polls with, and a short one a person reads off the terminal and
 * types into a browser. What it ends up holding is a nodex session with
 * `origin = 'cli'`, not a GitHub token, so revoking it needs nothing but a
 * delete here.
 */

/**
 * No `0/O`, `1/I/L`, `U`, or `V`. Every one of those is read wrong off a
 * terminal or misheard when someone reads a code aloud, and this code is
 * typed by hand.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTWXYZ23456789';
const USER_CODE_LENGTH = 8;

/** Long enough to finish a browser sign-in, short enough to limit guessing. */
export const DEVICE_CODE_TTL_SECONDS = 900;

/** What the CLI is told to wait between polls, and what is enforced. */
export const POLL_INTERVAL_SECONDS = 5;

export interface DeviceRequest {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * `randomInt` rather than `randomBytes` modulo the alphabet length. The modulo
 * is biased whenever the alphabet does not divide 256, which 29 does not, and a
 * biased code is a smaller search space than it looks.
 */
function userCode(): string {
  let out = '';
  for (let i = 0; i < USER_CODE_LENGTH; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export async function startDeviceRequest(): Promise<DeviceRequest> {
  const deviceCode = randomBytes(32).toString('base64url');

  // Retried rather than assumed unique: the space is large, but a collision
  // would otherwise surface as an opaque constraint violation to the CLI.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = userCode();
    try {
      await query(
        `insert into cli_auth_requests (device_code_hash, user_code, expires_at)
         values ($1, $2, now() + make_interval(secs => $3))`,
        [fingerprint(deviceCode), code, DEVICE_CODE_TTL_SECONDS],
      );
      return {
        deviceCode,
        userCode: code,
        expiresIn: DEVICE_CODE_TTL_SECONDS,
        interval: POLL_INTERVAL_SECONDS,
      };
    } catch (cause) {
      const isCollision =
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        (cause as { code?: string }).code === '23505';
      if (!isCollision || attempt === 4) throw cause;
    }
  }
  throw new Error('could not allocate a user code');
}

export interface PendingApproval {
  userCode: string;
  expiresAt: Date;
}

/** Look up a request a person is about to approve. Never returns the device code. */
export async function findByUserCode(
  code: string,
): Promise<PendingApproval | undefined> {
  const rows = await query<{ user_code: string; expires_at: Date }>(
    `select user_code, expires_at
       from cli_auth_requests
      where user_code = $1
        and expires_at > now()
        and approved_at is null
        and denied_at is null`,
    [normalizeUserCode(code)],
  );
  const row = rows[0];
  return row ? { userCode: row.user_code, expiresAt: row.expires_at } : undefined;
}

/** Typed by hand, so accept lower case and a missing separator. */
export function normalizeUserCode(input: string): string {
  const bare = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return bare.length === USER_CODE_LENGTH
    ? `${bare.slice(0, 4)}-${bare.slice(4)}`
    : input.toUpperCase();
}

export async function approve(code: string, userId: string): Promise<boolean> {
  const rows = await query<{ user_code: string }>(
    `update cli_auth_requests
        set user_id = $2, approved_at = now()
      where user_code = $1
        and expires_at > now()
        and approved_at is null
        and denied_at is null
      returning user_code`,
    [normalizeUserCode(code), userId],
  );
  return rows.length > 0;
}

export async function deny(code: string): Promise<boolean> {
  const rows = await query<{ user_code: string }>(
    `update cli_auth_requests
        set denied_at = now()
      where user_code = $1
        and expires_at > now()
        and approved_at is null
        and denied_at is null
      returning user_code`,
    [normalizeUserCode(code)],
  );
  return rows.length > 0;
}

export type PollOutcome =
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'approved'; userId: string };

/**
 * One poll.
 *
 * An unknown device code is reported as expired rather than as unknown: telling
 * a caller which of the two it is turns polling into an oracle for whether a
 * code was ever valid.
 */
export async function poll(deviceCode: string): Promise<PollOutcome> {
  const hash = fingerprint(deviceCode);

  const rows = await query<{
    user_id: string | null;
    approved_at: Date | null;
    denied_at: Date | null;
    expired: boolean;
    too_soon: boolean;
  }>(
    `select user_id,
            approved_at,
            denied_at,
            expires_at <= now() as expired,
            (last_polled_at is not null
              and last_polled_at > now() - make_interval(secs => $2)) as too_soon
       from cli_auth_requests
      where device_code_hash = $1`,
    [hash, POLL_INTERVAL_SECONDS],
  );

  const row = rows[0];
  if (!row) return { status: 'expired' };

  if (row.expired) {
    await query('delete from cli_auth_requests where device_code_hash = $1', [
      hash,
    ]);
    return { status: 'expired' };
  }

  if (row.too_soon) return { status: 'slow_down' };

  await query(
    'update cli_auth_requests set last_polled_at = now() where device_code_hash = $1',
    [hash],
  );

  if (row.denied_at) {
    await query('delete from cli_auth_requests where device_code_hash = $1', [
      hash,
    ]);
    return { status: 'denied' };
  }

  if (row.approved_at && row.user_id) {
    // One exchange per request. Deleting here is what stops a replayed poll
    // minting a second session from the same approval.
    await query('delete from cli_auth_requests where device_code_hash = $1', [
      hash,
    ]);
    return { status: 'approved', userId: row.user_id };
  }

  return { status: 'pending' };
}

/** Housekeeping. Expired rows are dropped on read, but only the ones read. */
export async function sweepExpired(): Promise<void> {
  await query('delete from cli_auth_requests where expires_at <= now()');
}
