import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { authHarness } from './lib/auth-harness.ts';

test('OAuth token exchange rejects malformed success and provider errors without echoing them', async (t) => {
  const { github } = await authHarness(t);
  const sentinel = randomBytes(32).toString('base64url');
  let body: unknown = { access_token: sentinel, token_type: 'bearer' };
  let status = 200;
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    assert.equal(init.redirect, 'error');
    return Response.json(body, { status });
  });
  assert.equal(await github.exchangeCode('test-code'), sentinel);
  for (const invalid of [null, [], {}, { access_token: 1 }, { access_token: [] }, { access_token: '' }, { access_token: sentinel, token_type: 'other' }, { access_token: sentinel, token_type: 'bearer', error: sentinel }, { error: sentinel, error_description: sentinel }]) {
    body = invalid;
    await assert.rejects(github.exchangeCode('test-code'), { message: 'GitHub token exchange failed.' });
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
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    assert.equal(init.redirect, 'error');
    return Response.json(body);
  });
  assert.deepEqual(await github.fetchUser('test-token'), valid);
  body = { ...valid, name: 'Test User', avatar_url: 'https://avatars.example.test/42' };
  assert.deepEqual(await github.fetchUser('test-token'), body);
  for (const invalid of [null, [], {}, { ...valid, id: '42' }, { ...valid, id: -1 }, { ...valid, id: 1.5 }, { ...valid, id: 1e30 }, { ...valid, login: {} }, { ...valid, login: '' }, { ...valid, login: '\u001b[2J' }, { ...valid, name: 1 }, { ...valid, avatar_url: 'javascript:alert(1)' }, { ...valid, avatar_url: 'http://avatars.example.test/42' }]) {
    body = invalid;
    await assert.rejects(github.fetchUser('test-token'), /invalid profile/);
  }
});
