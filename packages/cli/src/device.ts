import process from 'node:process';

/**
 * Device authorization, client half.
 *
 * The API lives at the registry root, which is true whenever the registry is
 * served by the nodex app. When the registry is a CDN the two are different
 * hosts, and `NODEX_API` points at the app.
 */

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export function apiBase(registryRoot: string): string {
  return (process.env.NODEX_API ?? registryRoot).replace(/\/+$/, '');
}

export class DeviceError extends Error {}

export async function startDevice(api: string): Promise<DeviceStart> {
  const res = await fetch(`${api}/api/cli/device`, { method: 'POST' });
  if (!res.ok) {
    const detail = res.status === 503 ? 'accounts are not configured there' : `HTTP ${res.status}`;
    throw new DeviceError(`${api} could not start a sign in (${detail}).`);
  }
  const body = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    expiresIn: body.expires_in,
    interval: body.interval,
  };
}

export interface Granted {
  token: string;
  login: string | null;
}

const sleep = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/**
 * Poll until approved, rejected, or expired.
 *
 * Honours `slow_down` by widening the interval permanently rather than for one
 * round, which is what the server is asking for: a client that speeds back up
 * immediately just gets told again.
 */
export async function awaitApproval(
  api: string,
  start: DeviceStart,
  onTick?: (secondsLeft: number) => void,
): Promise<Granted> {
  let interval = start.interval;
  const deadline = Date.now() + start.expiresIn * 1000;

  for (;;) {
    if (Date.now() >= deadline) {
      throw new DeviceError('The code expired. Run `nodex login` again.');
    }

    await sleep(interval);
    onTick?.(Math.max(0, Math.round((deadline - Date.now()) / 1000)));

    const res = await fetch(`${api}/api/cli/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ device_code: start.deviceCode }),
    });

    if (res.ok) {
      const body = (await res.json()) as {
        access_token: string;
        login: string | null;
      };
      return { token: body.access_token, login: body.login };
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    switch (body.error) {
      case 'authorization_pending':
        continue;
      case 'slow_down':
        interval += 5;
        continue;
      case 'access_denied':
        throw new DeviceError('The request was rejected in the browser.');
      case 'expired_token':
        throw new DeviceError('The code expired. Run `nodex login` again.');
      default:
        throw new DeviceError(
          `Sign in failed (${body.error ?? `HTTP ${res.status}`}).`,
        );
    }
  }
}

/** Who a token belongs to, or undefined if it is no longer valid. */
export async function whoami(
  api: string,
  token: string,
): Promise<{ login: string } | undefined> {
  const res = await fetch(`${api}/api/cli/whoami`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  return (await res.json()) as { login: string };
}
