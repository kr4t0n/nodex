import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

import { build } from 'esbuild';

test('migration failures never print connection strings or raw driver errors', async (t) => {
  const cache = path.resolve('node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const dir = await mkdtemp(path.join(cache, 'migration-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, 'scripts');
  const migrations = path.join(dir, 'apps/web/migrations');
  await mkdir(scripts, { recursive: true });
  await mkdir(migrations, { recursive: true });
  await writeFile(path.join(migrations, '001-test.sql'), 'select 1');
  const outfile = path.join(scripts, 'migrate.mjs');
  await build({
    entryPoints: ['scripts/migrate.mjs'], bundle: true, platform: 'node', format: 'esm', outfile,
    plugins: [{ name: 'driver-errors', setup(builder) {
      builder.onResolve({ filter: /^pg$/ }, () => ({ path: 'pg', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
        import { EventEmitter } from 'node:events';
        function fail(phase) {
          if (process.env.TEST_PHASE === phase) throw new Error(process.env.TEST_SENTINEL);
        }
        export default { Client: class extends EventEmitter {
          constructor() { super(); fail('constructor'); }
          async connect() {
            fail('connect');
            if (process.env.TEST_PHASE === 'event') {
              queueMicrotask(() => this.emit('error', new Error(process.env.TEST_SENTINEL)));
            }
          }
          async query(sql) {
            if (sql.startsWith('select name')) return { rows: [] };
            if (sql.includes('create table')) fail('bookkeeping');
            if (sql === 'select 1') fail('migration');
            return { rows: [] };
          }
          async end() { fail('end'); }
        }};
      ` }));
    } }],
  });
  const sentinel = randomBytes(32).toString('hex');
  for (const phase of ['constructor', 'connect', 'bookkeeping', 'migration', 'end', 'event']) {
    const result = spawnSync(process.execPath, [outfile], {
      encoding: 'utf8', env: { ...process.env, DATABASE_URL: `postgresql://user:${sentinel}@localhost/test?application_name=${sentinel}`, TEST_SENTINEL: sentinel, TEST_PHASE: phase },
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Could not apply database migrations. Check database configuration, availability and migration SQL.');
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
  }
});
