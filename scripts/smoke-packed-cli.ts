/** Verify the publishable CLI in an npm consumer outside the workspace. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { modeRegistry } from './lib/mode-fixture.ts';

const root = path.resolve(import.meta.dirname, '..');
const destination = process.argv[2] && path.resolve(process.argv[2]);
assert(process.argv.length <= 3, 'Usage: smoke:pack [tarball-directory]');

if (destination) {
  await mkdir(destination, { recursive: true });
  assert.equal(
    (await readdir(destination)).length,
    0,
    'Tarball directory must be empty',
  );
}

const temp = await mkdtemp(path.join(tmpdir(), 'nodex-packed-cli-'));
try {
  const pack = path.join(temp, 'pack');
  const consumer = path.join(temp, 'consumer');
  await mkdir(pack);
  await mkdir(consumer);

  execFileSync('pnpm', ['run', 'build:cli'], { cwd: root, stdio: 'inherit' });
  execFileSync(
    'pnpm',
    ['--filter', '@kubitnodes/nodex', 'pack', '--pack-destination', pack],
    { cwd: root, stdio: 'inherit' },
  );
  const archives = (await readdir(pack)).filter((file) =>
    file.endsWith('.tgz'),
  );
  assert.equal(archives.length, 1, 'Expected exactly one CLI tarball');
  const archiveName = archives[0];
  assert(archiveName);
  const archive = path.join(pack, archiveName);

  execFileSync('npm', ['init', '-y'], { cwd: consumer, stdio: 'pipe' });
  execFileSync('npm', ['install', archive], {
    cwd: consumer,
    stdio: 'inherit',
  });
  // Invoke the installed bin directly: a missing bin must never fall back to npx.
  execFileSync(
    path.join(consumer, 'node_modules/.bin/nodex'),
    ['list', '--registry', path.join(root, 'public')],
    { cwd: consumer, stdio: 'inherit' },
  );

  const modeRoot = path.join(temp, 'mode-registry');
  const fixture = await modeRegistry(modeRoot);
  const command = (args: string[]) =>
    execFileSync(
      path.join(consumer, 'node_modules/.bin/nodex'),
      [...args, '--registry', modeRoot],
      { cwd: consumer, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    );
  command(['init', 'mono-editorial']);
  assert.equal(
    await readFile(path.join(consumer, 'src/styles/nodex-tokens.css'), 'utf8'),
    fixture.css,
  );
  assert.deepEqual(
    JSON.parse(command(['tokens', 'mono-editorial', '--json'])),
    fixture.tokens,
  );
  await writeFile(
    path.join(consumer, 'src/token-check.css'),
    '.heading { color: var(--nx-ink); }',
  );
  command(['lint', 'src/token-check.css']);

  // The release workflow publishes these tested bytes without repacking.
  if (destination) await copyFile(archive, path.join(destination, archiveName));
  console.log('Packed CLI consumer check passed.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
