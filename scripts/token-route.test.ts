import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { authHarness } from './lib/auth-harness.ts';

test('token route rejects malformed JSON and non-code values before database access', async (t) => {
  const auth = await authHarness(t);
  const query = t.mock.method(auth.db.database, 'query', async () => []);
  for (const body of ['{', 'null', '[]', 'true', '42', '"text"', '{}', ...[null, false, 42, {}, [], '', 'x'.repeat(44), 'x'.repeat(42), ' '.repeat(43), `${'x'.repeat(43)}\n`].map(device_code => JSON.stringify({ device_code }))]) {
    const response = await auth.token(new Request('https://app.example.test/api/cli/token', { method: 'POST', body }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'invalid_request' });
  }
  assert.equal(query.mock.callCount(), 0);
  const response = await auth.token(new Request('https://app.example.test/api/cli/token', { method: 'POST', body: JSON.stringify({ device_code: randomBytes(32).toString('base64url') }) }));
  assert.deepEqual(await response.json(), { error: 'expired_token' });
  assert.ok(query.mock.callCount() > 0);
});
