import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { awaitApproval, startDevice, whoami } from '../packages/cli/src/device.ts';

const api = 'https://accounts.example.test';
const startBody = () => ({ device_code: randomBytes(32).toString('base64url'), user_code: 'ABCD-EFGH', verification_uri: `${api}/activate`, expires_in: 900, interval: 5 });
const grantBody = () => ({ access_token: randomBytes(32).toString('base64url'), token_type: 'bearer', login: 'test-user' });
const start = () => ({ deviceCode: randomBytes(32).toString('base64url'), userCode: 'ABCD-EFGH', verificationUri: `${api}/activate`, expiresIn: 900, interval: 0 });

test('device start validates JSON fields, finite timers and browser destinations', async (t) => {
  let body: unknown = startBody();
  t.mock.method(globalThis, 'fetch', async () => Response.json(body));
  const valid = await startDevice(api);
  assert.equal(valid.interval, 5);
  assert.equal(valid.verificationUri, `${api}/activate`);
  for (const invalid of [null, [], {}, { ...startBody(), device_code: 42 }, { ...startBody(), user_code: '\u001b[2J' }, { ...startBody(), verification_uri: 'javascript:alert(1)' }, { ...startBody(), verification_uri: 'http://remote.example.test' }, { ...startBody(), expires_in: '900' }, { ...startBody(), expires_in: -1 }, { ...startBody(), expires_in: 1e30 }, { ...startBody(), interval: 0 }, { ...startBody(), interval: 1.5 }, { ...startBody(), interval: 901 }]) {
    body = invalid;
    await assert.rejects(startDevice(api));
  }
});

test('device grants and whoami reject malformed data before saving or displaying it', async (t) => {
  const granted = grantBody();
  let body: unknown = granted;
  t.mock.method(globalThis, 'fetch', async () => Response.json(body));
  assert.deepEqual(await awaitApproval(api, start()), { token: granted.access_token, login: granted.login });
  body = { ...granted, login: null };
  assert.equal((await awaitApproval(api, start())).login, null);
  for (const invalid of [null, [], {}, { ...granted, access_token: [] }, { ...granted, access_token: '' }, { ...granted, access_token: 'has whitespace' }, { ...granted, login: {} }, { ...granted, login: '\u001b[2J' }, { ...granted, token_type: 'other' }]) {
    body = invalid;
    await assert.rejects(awaitApproval(api, start()), /invalid response/);
  }
  body = { login: 'test-user' };
  assert.deepEqual(await whoami(api, granted.access_token), body);
  for (const invalid of [null, [], {}, { login: 1 }, { login: '' }, { login: '\nforged output' }]) {
    body = invalid;
    await assert.rejects(whoami(api, granted.access_token), /invalid response/);
  }
});

test('unknown errors, invalid JSON and transport errors never echo upstream values', async (t) => {
  const sentinel = randomBytes(32).toString('hex');
  let response = () => Response.json({ error: sentinel }, { status: 400 });
  t.mock.method(globalThis, 'fetch', async () => response());
  const safeFailure = (error: unknown) => error instanceof Error && !error.message.includes(sentinel);
  await assert.rejects(awaitApproval(api, start()), safeFailure);
  response = () => new Response(sentinel, { status: 200 });
  await assert.rejects(startDevice(api), safeFailure);
  await assert.rejects(whoami(api, sentinel), safeFailure);
  await assert.rejects(awaitApproval(api, start()), safeFailure);
  response = () => { throw new Error(sentinel); };
  await assert.rejects(startDevice(api), safeFailure);
});

test('pending and slow-down responses retain polling semantics', async (t) => {
  const delays: number[] = [];
  t.mock.method(globalThis, 'setTimeout', (resolve: () => void, delay: number) => { delays.push(delay); queueMicrotask(resolve); });
  const granted = grantBody();
  const responses = [Response.json({ error: 'authorization_pending' }, { status: 400 }), Response.json({ error: 'slow_down' }, { status: 400 }), Response.json(granted)];
  t.mock.method(globalThis, 'fetch', async () => responses.shift()!);
  assert.equal((await awaitApproval(api, { ...start(), interval: 5 })).token, granted.access_token);
  assert.deepEqual(delays, [5000, 5000, 10000]);
  for (const error of ['access_denied', 'expired_token']) {
    responses.push(Response.json({ error }, { status: 400 }));
    await assert.rejects(awaitApproval(api, start()), /rejected|expired/);
  }
});
