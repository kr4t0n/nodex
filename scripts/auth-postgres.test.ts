import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';

import { authHarness } from './lib/auth-harness.ts';

test('Postgres device lifecycle and concurrent exchange mint exactly one usable session', async (t) => {
  assert.ok(
    process.env.DATABASE_URL,
    'Set DATABASE_URL to a migrated, disposable test database.',
  );
  const auth = await authHarness(t, false);
  const pool = auth.db.pool();
  const hashes: string[] = [];
  const fixture: { userId?: string } = {};
  t.after(async () => {
    try {
      await auth.db.query(
        'delete from cli_auth_requests where device_code_hash = any($1)',
        [hashes],
      );
      if (fixture.userId)
        await auth.db.query('delete from users where id = $1', [
          fixture.userId,
        ]);
    } finally {
      await pool.end();
    }
  });
  const users = await auth.db.query<{ id: string }>(
    "insert into users (github_id, login) values (42, 'auth-test-user') returning id",
  );
  const userId = users[0]!.id;
  fixture.userId = userId;
  const start = async () => {
    const request = await auth.device.startDeviceRequest();
    const hash = createHash('sha256').update(request.deviceCode).digest('hex');
    hashes.push(hash);
    return { ...request, hash };
  };
  const request = await start();
  assert.equal(
    (await auth.device.findByUserCode(request.userCode))?.userCode,
    request.userCode,
  );
  assert.deepEqual(await auth.device.poll(request.deviceCode), {
    status: 'pending',
  });
  assert.deepEqual(await auth.device.poll(request.deviceCode), {
    status: 'slow_down',
  });
  assert.equal(
    await auth.device.approve(
      request.userCode.toLowerCase().replace('-', ''),
      userId,
    ),
    true,
  );
  assert.equal(await auth.device.approve(request.userCode, userId), false);
  assert.equal(await auth.device.deny(request.userCode), false);
  await auth.db.query(
    'update cli_auth_requests set last_polled_at = null where device_code_hash = $1',
    [request.hash],
  );

  const blocker = await pool.connect();
  await blocker.query('begin');
  await blocker.query(
    'select device_code_hash from cli_auth_requests where device_code_hash = $1 for update',
    [request.hash],
  );
  const polls = Array.from({ length: 6 }, () =>
    auth.token(
      new Request('https://app.example.test/api/cli/token', {
        method: 'POST',
        body: JSON.stringify({ device_code: request.deviceCode }),
      }),
    ),
  );
  try {
    // Hold the row until every poll has read the approval and reached its
    // update. A timing-only Promise.all can miss the old read/delete race.
    const deadline = Date.now() + 10000;
    for (;;) {
      const counts = await auth.db.query<{ count: number }>(
        `select count(*)::int as count from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'
            and query like 'update cli_auth_requests set last_polled_at%'`,
      );
      if (counts[0]!.count === polls.length) break;
      assert.ok(
        Date.now() < deadline,
        'all concurrent polls must reach the locked update',
      );
      await setTimeout(20);
    }
  } finally {
    await blocker.query('commit');
    blocker.release();
  }
  const responses = await Promise.all(polls);
  const granted = responses.filter((response) => response.status === 200);
  assert.equal(granted.length, 1);
  for (const response of responses.filter(
    (response) => response.status !== 200,
  )) {
    assert.deepEqual(await response.json(), { error: 'expired_token' });
  }
  const credential = (await granted[0]!.json()) as {
    access_token: string;
    login: string;
    token_type: string;
  };
  assert.equal(credential.login, 'auth-test-user');
  assert.equal(credential.token_type, 'bearer');
  assert.equal(granted[0]!.headers.get('cache-control'), 'no-store');
  const sessions = await auth.db.query<{ token_hash: string; origin: string }>(
    'select token_hash, origin from sessions where user_id = $1',
    [userId],
  );
  assert.deepEqual(sessions, [
    {
      token_hash: createHash('sha256')
        .update(credential.access_token)
        .digest('hex'),
      origin: 'cli',
    },
  ]);
  const who = await auth.whoami(
    new Request('https://app.example.test/api/cli/whoami', {
      headers: { authorization: `Bearer ${credential.access_token}` },
    }),
  );
  assert.deepEqual(await who.json(), {
    login: 'auth-test-user',
    origin: 'cli',
  });
  assert.deepEqual(await auth.device.poll(request.deviceCode), {
    status: 'expired',
  });

  const denied = await start();
  assert.equal(await auth.device.deny(denied.userCode), true);
  assert.equal(await auth.device.approve(denied.userCode, userId), false);
  assert.deepEqual(await auth.device.poll(denied.deviceCode), {
    status: 'denied',
  });
  assert.deepEqual(await auth.device.poll(denied.deviceCode), {
    status: 'expired',
  });
  const expired = await start();
  await auth.db.query(
    "update cli_auth_requests set expires_at = now() - interval '1 second' where device_code_hash = $1",
    [expired.hash],
  );
  assert.equal(await auth.device.approve(expired.userCode, userId), false);
  assert.deepEqual(await auth.device.poll(expired.deviceCode), {
    status: 'expired',
  });
});
