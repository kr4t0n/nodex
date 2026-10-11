import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { authHarness } from './lib/auth-harness.ts';

test('OAuth token exchange rejects malformed success and provider errors without echoing them', async (t) => {
  const { github } = await authHarness(t);
  const sentinel = randomBytes(32).toString('base64url');
  let body: unknown = { access_token: sentinel, token_type: 'bearer' };
  let status = 200;
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, init: RequestInit) => {
      assert.equal(init.redirect, 'error');
      return Response.json(body, { status });
    },
  );
  assert.equal(await github.exchangeCode('test-code'), sentinel);
  for (const invalid of [
    null,
    [],
    {},
    { access_token: 1 },
    { access_token: [] },
    { access_token: '' },
    { access_token: sentinel, token_type: 'other' },
    { access_token: sentinel, token_type: 'bearer', error: sentinel },
    { error: sentinel, error_description: sentinel },
  ]) {
    body = invalid;
    await assert.rejects(github.exchangeCode('test-code'), {
      message: 'GitHub token exchange failed.',
    });
  }
  body = { access_token: sentinel, token_type: 'bearer' };
  status = 401;
  await assert.rejects(github.exchangeCode('test-code'));
  assert.ok(fetch.mock.callCount() > 0);
});

test('OAuth profile validation retains valid nullable fields and rejects unsafe identities', async (t) => {
  const { github } = await authHarness(t);
  const valid = { id: 42, login: 'test-user', name: null, avatar_url: null };
  let body: unknown = valid;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, init: RequestInit) => {
      assert.equal(init.redirect, 'error');
      return Response.json(body);
    },
  );
  assert.deepEqual(await github.fetchUser('test-token'), valid);
  body = {
    ...valid,
    name: 'Test User',
    avatar_url: 'https://avatars.example.test/42',
  };
  assert.deepEqual(await github.fetchUser('test-token'), body);
  for (const invalid of [
    null,
    [],
    {},
    { ...valid, id: '42' },
    { ...valid, id: -1 },
    { ...valid, id: 1.5 },
    { ...valid, id: 1e30 },
    { ...valid, login: {} },
    { ...valid, login: '' },
    { ...valid, login: '\u001b[2J' },
    { ...valid, name: 1 },
    { ...valid, avatar_url: 'javascript:alert(1)' },
    { ...valid, avatar_url: 'http://avatars.example.test/42' },
  ]) {
    body = invalid;
    await assert.rejects(github.fetchUser('test-token'), /invalid profile/);
  }
});

test('OAuth callback consumes state, creates a session and redirects only to local paths', async (t) => {
  const auth = await authHarness(t);
  const previous = {
    id: process.env.GITHUB_CLIENT_ID,
    secret: process.env.GITHUB_CLIENT_SECRET,
    site: process.env.NEXT_PUBLIC_SITE_URL,
  };
  t.after(() => {
    for (const [key, value] of [
      ['GITHUB_CLIENT_ID', previous.id],
      ['GITHUB_CLIENT_SECRET', previous.secret],
      ['NEXT_PUBLIC_SITE_URL', previous.site],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  process.env.GITHUB_CLIENT_ID = randomBytes(8).toString('hex');
  process.env.GITHUB_CLIENT_SECRET = randomBytes(32).toString('hex');
  process.env.NEXT_PUBLIC_SITE_URL = 'https://other.example.test';
  const query = t.mock.method(auth.db.database, 'query', async (sql: string) =>
    sql.includes('returning id') ? [{ id: 'test-user-id' }] : [],
  );
  const accessToken = randomBytes(32).toString('base64url');
  const fetch = t.mock.method(globalThis, 'fetch', async (url: string) =>
    Response.json(
      url.includes('access_token')
        ? { access_token: accessToken, token_type: 'bearer' }
        : { id: 42, login: 'test-user', name: null, avatar_url: null },
    ),
  );
  const state = randomBytes(16).toString('base64url');
  auth.store.set('nx_oauth_state', { value: state });
  const request = new auth.NextRequest(
    `https://app.example.test/api/auth/github/callback?code=test-code&state=${state}&next=https://other.example.test`,
  );
  const response = await auth.callback(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), '/languages');
  assert.equal(auth.store.has('nx_oauth_state'), false);
  assert.equal(typeof auth.store.get('nx_session'), 'string');
  assert.ok(
    query.mock.calls.some((call) =>
      call.arguments[0].includes('insert into sessions'),
    ),
  );
  const replay = await auth.callback(request);
  assert.equal(replay.headers.get('location'), '/login?error=state');
  assert.equal(fetch.mock.callCount(), 2);
  delete process.env.GITHUB_CLIENT_SECRET;
  assert.equal(
    (await auth.beginOAuth(request)).headers.get('location'),
    '/login?error=unconfigured',
  );
  assert.equal(
    (await auth.callback(request)).headers.get('location'),
    '/login?error=unconfigured',
  );
});

test('invalid OAuth profiles fail before any account or session is written', async (t) => {
  const auth = await authHarness(t);
  const priorId = process.env.GITHUB_CLIENT_ID;
  const priorSecret = process.env.GITHUB_CLIENT_SECRET;
  t.after(() => {
    if (priorId === undefined) delete process.env.GITHUB_CLIENT_ID;
    else process.env.GITHUB_CLIENT_ID = priorId;
    if (priorSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = priorSecret;
  });
  process.env.GITHUB_CLIENT_ID = randomBytes(8).toString('hex');
  process.env.GITHUB_CLIENT_SECRET = randomBytes(32).toString('hex');
  const sentinel = randomBytes(32).toString('base64url');
  t.mock.method(globalThis, 'fetch', async (url: string) =>
    Response.json(
      url.includes('access_token')
        ? { access_token: sentinel, token_type: 'bearer' }
        : { id: sentinel, login: sentinel },
    ),
  );
  const query = t.mock.method(auth.db.database, 'query', async () => []);
  auth.store.set('nx_oauth_state', { value: 'test-state' });
  const response = await auth.callback(
    new auth.NextRequest(
      'https://app.example.test/api/auth/github/callback?code=test-code&state=test-state',
    ),
  );
  assert.equal(response.headers.get('location'), '/login?error=exchange');
  assert.equal(query.mock.callCount(), 0);
  assert.equal(auth.store.has('nx_session'), false);
  assert.equal(auth.store.has('nx_oauth_state'), false);
});
