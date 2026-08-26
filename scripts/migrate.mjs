/**
 * Apply SQL migrations in order, once each.
 *
 * Plain numbered `.sql` files and a table recording what ran. No ORM and no
 * migration framework, for the same reason the registry ships plain HTML: the
 * whole thing is legible in one sitting, and there is no schema DSL sitting
 * between what you write and what the database gets.
 *
 * Safe to run repeatedly. Applied files are skipped, and each file runs inside a
 * transaction with its bookkeeping row, so a failure halfway leaves nothing
 * behind to reconcile by hand.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import pg from 'pg';

const DIR = path.resolve(import.meta.dirname, '..', 'apps', 'web', 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
      '  Copy .env.example to .env, then: npm run db:up && npm run db:migrate\n',
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
} catch (cause) {
  console.error(
    `\nCould not connect to ${redact(url)}.\n` +
      '  Is the database running? `npm run db:up`\n',
  );
  console.error(`  ${cause.message}\n`);
  process.exit(1);
}

await client.query(`
  create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await client.query('select name from schema_migrations');
const applied = new Set(rows.map((row) => row.name));

const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();

let ran = 0;
for (const name of files) {
  if (applied.has(name)) continue;
  const sql = await readFile(path.join(DIR, name), 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations (name) values ($1)', [
      name,
    ]);
    await client.query('commit');
  } catch (cause) {
    await client.query('rollback');
    console.error(`\n${name} failed, and was rolled back:\n  ${cause.message}\n`);
    await client.end();
    process.exit(1);
  }
  console.log(`  applied ${name}`);
  ran += 1;
}

console.log(
  ran === 0
    ? `schema up to date (${files.length} migration(s))`
    : `applied ${ran} migration(s)`,
);

await client.end();

/** Never print a password, even in an error path. */
function redact(value) {
  return value.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
}
