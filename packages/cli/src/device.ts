import process from 'node:process';

/**
 * NODEX_API separates account requests from static registry hosting on a CDN.
 */

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export function apiBase(registryRoot: string): string {
  return apiUrl(process.env.NODEX_API ?? registryRoot)
    .toString()
    .replace(/\/+$/, '');
}

export class DeviceError extends Error {}

function apiUrl(value: string): URL {
  try {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /[\s\\?#]/.test(value)
    )
      throw new Error();
    return url;
  } catch {
    throw new DeviceError(
      'The API must use HTTPS (HTTP is allowed for loopback), without credentials, query or fragment.',
    );
  }
}

async function apiFetch(
  api: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = apiUrl(api).toString().replace(/\/+$/, '');
  try {
    return await fetch(`${base}${path}`, { ...options, redirect: 'error' });
  } catch {
    throw new DeviceError(
      'Could not reach the sign-in API. Redirects are not allowed.',
    );
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 4096 &&
    !/[\p{Cc}\p{Cf}]/u.test(value)
  );
}

function token(value: unknown): value is string {
  return text(value) && /^[A-Za-z0-9._~+/-]+=*$/.test(value);
}

function seconds(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 86400
  );
}

async function responseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new DeviceError('The sign-in API returned an invalid response.');
  }
}

export async function startDevice(api: string): Promise<DeviceStart> {
  const res = await apiFetch(api, '/api/cli/device', { method: 'POST' });
  if (!res.ok) {
    const detail =
      res.status === 503
        ? 'accounts are not configured there'
        : `HTTP ${res.status}`;
    throw new DeviceError(`Could not start a sign in (${detail}).`);
  }
  const body = await responseJson(res);
  if (
    !record(body) ||
    !token(body.device_code) ||
    !text(body.user_code) ||
    !text(body.verification_uri) ||
    !seconds(body.expires_in) ||
    !seconds(body.interval) ||
    body.interval > body.expires_in
  )
    throw new DeviceError('The sign-in API returned an invalid response.');
  const verificationUri = apiUrl(body.verification_uri).toString();
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
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
 * Keep the increased interval after slow_down for all subsequent polls.
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

    await sleep(
      Math.min(interval, Math.max(0, (deadline - Date.now()) / 1000)),
    );
    onTick?.(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    if (Date.now() >= deadline) continue;

    const res = await apiFetch(api, '/api/cli/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ device_code: start.deviceCode }),
    });

    if (res.ok) {
      const body = await responseJson(res);
      if (
        !record(body) ||
        !token(body.access_token) ||
        typeof body.token_type !== 'string' ||
        body.token_type.toLowerCase() !== 'bearer' ||
        !(body.login === null || text(body.login))
      )
        throw new DeviceError('The sign-in API returned an invalid response.');
      return { token: body.access_token, login: body.login };
    }

    const body = await responseJson(res);
    switch (
      record(body) && typeof body.error === 'string' ? body.error : undefined
    ) {
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
        throw new DeviceError('Sign in failed. Run `nodex login` again.');
    }
  }
}

/** Who a token belongs to, or undefined if it is no longer valid. */
export async function whoami(
  api: string,
  token: string,
): Promise<{ login: string } | undefined> {
  const res = await apiFetch(api, '/api/cli/whoami', {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const body = await responseJson(res);
  if (!record(body) || !text(body.login)) {
    throw new DeviceError('The sign-in API returned an invalid response.');
  }
  return { login: body.login };
}
