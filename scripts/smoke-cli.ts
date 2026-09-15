/** Exercise source delivery, package-manager arguments and hostile registry inputs. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { lintRendered, lintSource, rulesFromTokens } from '../packages/cli/src/lint.ts';
import { dependencyPin, planInstall } from '../packages/cli/src/install.ts';
import type { Item } from '../packages/cli/src/registry.ts';
import { loadSource } from '../packages/core/src/index.ts';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, 'packages/cli/src/index.ts');
const temp = await mkdtemp(path.join(tmpdir(), 'nodex-cli-'));
const logs: Array<{ path: string; token: string | undefined }> = [];
const env = { ...process.env, NO_COLOR: '1', NODEX_TOKEN: 'nodex-smoke-token', NODEX_CONFIG_DIR: path.join(temp, 'credentials') };
let checks = 0;

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

async function json<T = Record<string, unknown>>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function write(file: string, contents: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
}

async function cli(cwd: string, args: string[], registry?: string, extra: Record<string, string> = {}): Promise<string> {
  const result = await run(process.execPath, [CLI, ...args, ...(registry ? ['--registry', registry] : [])], { cwd, env: { ...env, ...extra }, maxBuffer: 4 * 1024 * 1024 });
  return result.stdout;
}

async function refuses(cwd: string, args: string[], message: RegExp, registry?: string): Promise<void> {
  await assert.rejects(cli(cwd, args, registry), (error: { stdout?: string; stderr?: string }) => message.test(`${error.stdout ?? ''}${error.stderr ?? ''}`));
  checks++;
}

async function newProject(name: string, registry: string): Promise<string> {
  const dir = path.join(temp, name);
  await mkdir(dir, { recursive: true });
  await write(path.join(dir, 'package.json'), JSON.stringify({ name, private: true, type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } }));
  await cli(dir, ['init', 'mono-editorial'], registry);
  return dir;
}

async function newWorkspace(name: string): Promise<{ root: string; app: string }> {
  const root = path.join(temp, name);
  const app = path.join(root, 'apps/web');
  await write(path.join(root, 'package.json'), JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'] }));
  await mkdir(path.join(root, '.git'));
  await write(path.join(app, 'package.json'), JSON.stringify({ name: '@consumer/web', private: true, dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } }));
  return { root, app };
}

async function checkWorkspaceDetection(): Promise<void> {
  for (const [file, manager] of [
    ['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm'],
    ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['pnpm-workspace.yaml', 'pnpm'],
  ] as const) {
    const workspace = await newWorkspace(`workspace-${file}`);
    await write(path.join(workspace.root, file), file === 'pnpm-workspace.yaml' ? "packages:\n  - 'apps/*'\n" : '{}');
    assert.equal((await planInstall(workspace.app, ['recharts@3.10.1'], { noInstall: true })).manager, manager, `Inherit ${file} through the apps directory`);
    checks++;
  }

  const local = await newWorkspace('workspace-local-override');
  await write(path.join(local.root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.0.0', workspaces: ['apps/*'] }));
  const appPackage = await json(path.join(local.app, 'package.json'));
  await write(path.join(local.app, 'package.json'), JSON.stringify({ ...appPackage, packageManager: 'yarn@4.0.0' }));
  await write(path.join(local.app, 'bun.lock'), '{}');
  assert.equal((await planInstall(local.app, [], { noInstall: true })).manager, 'yarn', 'Local declaration takes precedence over local and parent lockfiles');
  await write(path.join(local.app, 'package.json'), JSON.stringify(appPackage));
  assert.equal((await planInstall(local.app, [], { noInstall: true })).manager, 'bun', 'Local lockfile takes precedence over parent settings');
  await rm(path.join(local.app, 'bun.lock'));
  assert.equal((await planInstall(local.app, [], { noInstall: true })).manager, 'pnpm');
  checks += 3;

  const conflict = await newWorkspace('workspace-conflict');
  await write(path.join(conflict.root, 'pnpm-lock.yaml'), '{}');
  await write(path.join(conflict.root, 'yarn.lock'), '{}');
  await cli(conflict.app, ['init', 'mono-editorial'], ROOT);
  await refuses(conflict.app, ['add', 'hairline-line', '--no-install'], /Conflicting package-manager files in .*workspace-conflict/);
  assert.equal(await exists(path.join(conflict.app, 'src/components/nodex')), false);
  await write(path.join(conflict.root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.0.0' }));
  assert.equal((await planInstall(conflict.app, [], { noInstall: true })).manager, 'pnpm', 'An explicit declaration resolves conflicting lockfiles');
  await write(path.join(conflict.root, 'package.json'), JSON.stringify({ packageManager: 'unknown@1.0.0' }));
  await assert.rejects(planInstall(conflict.app, [], { noInstall: true }), /Unsupported packageManager in .*workspace-conflict/);
  checks += 3;

  // Repositories and worktrees nested under another project must not inherit it.
  for (const marker of ['directory', 'file']) {
    const nested = await newWorkspace(`workspace-local-override/nested-${marker}`);
    if (marker === 'file') {
      await rm(path.join(nested.root, '.git'), { recursive: true });
      await write(path.join(nested.root, '.git'), 'gitdir: /unused/worktree\n');
    }
    assert.equal((await planInstall(nested.app, [], { noInstall: true })).manager, 'npm');
    checks++;
  }

  const unsafe = await newWorkspace('workspace-unsafe-lock');
  const outside = path.join(temp, 'outside-workspace-lock');
  await write(outside, 'Unchanged.\n');
  await symlink(outside, path.join(unsafe.root, 'pnpm-lock.yaml'));
  await assert.rejects(planInstall(unsafe.app, ['recharts@3.10.1'], { noInstall: true }), /symbolic link/);
  assert.equal(await readFile(outside, 'utf8'), 'Unchanged.\n');
  await rm(outside);
  await assert.rejects(planInstall(unsafe.app, ['recharts@3.10.1'], { noInstall: true }), /symbolic link/, 'Broken parent lockfile symlinks must also be rejected');
  checks += 3;
}

async function checkNewLanguage(): Promise<void> {
  const checkout = path.join(temp, 'authoring-checkout');
  const sourceTokens = await json(path.join(ROOT, 'registry/languages/mono-editorial/tokens.json'));
  // A checkout-specific value proves the scaffold follows the selected source,
  // including future role additions, instead of a bundled copy of its defaults.
  (sourceTokens.space as Record<string, unknown>).fieldGap = '13px';
  await write(path.join(checkout, 'package.json'), JSON.stringify({ name: 'nodex', private: true }));
  await write(path.join(checkout, 'registry/languages/mono-editorial/tokens.json'), JSON.stringify(sourceTokens));
  await cli(temp, ['new-language', 'neutral-starter'], checkout);
  const starter = await json<{
    color: Record<string, string>;
    font: { sans: string; mono: string; weight: Record<string, number>; faces?: unknown };
    radius: Record<string, string>;
    space: Record<string, string>;
    type: Record<string, Record<string, unknown>>;
    motion: Record<string, Record<string, unknown>>;
  }>(path.join(checkout, 'registry/languages/neutral-starter/tokens.json'));
  assert.deepEqual(starter.color, { bg: '#FFFFFF', ink: '#000000', muted: '#000000', faint: '#000000', grid: '#000000', onDarkFaint: '#000000' });
  assert.equal(starter.font.sans, 'system-ui, sans-serif');
  assert.equal(starter.font.mono, 'ui-monospace, monospace');
  assert.equal(starter.font.faces, undefined, 'The neutral starter must not inherit downloadable language fonts');
  assert.equal(starter.space.fieldGap, '13px', 'Shared roles must come from the selected source checkout');
  assert.equal(starter.space.cardPadding, '20px', 'Preserve the neutral starter spacing');
  assert.equal(starter.radius.card, '0px');
  assert.equal(starter.radius.pill, '0px');
  assert.equal(starter.type.cardTitle?.size, '16px');
  assert.equal(starter.motion.draw?.duration, '0.3s');
  checks += 10;

  const rules = rulesFromTokens(starter);
  const primitives = (await readdir(path.join(ROOT, 'registry/primitives'), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.equal(primitives.length, 24);
  for (const primitive of primitives) {
    const css = await readFile(path.join(ROOT, 'registry/primitives', primitive.name, 'component.css'), 'utf8');
    assert.deepEqual(lintSource({ css }, rules), [], `New language lacks the delivered ${primitive.name} primitive's token contract`);
    checks++;
  }
  await refuses(temp, ['new-language', 'neutral-starter'], /already exists/, checkout);

  const missingTemplate = path.join(temp, 'missing-authoring-template');
  await write(path.join(missingTemplate, 'package.json'), JSON.stringify({ name: 'nodex', private: true }));
  await refuses(temp, ['new-language', 'incomplete'], /must contain registry\/languages\/mono-editorial\/tokens\.json/, missingTemplate);
  assert.equal(await exists(path.join(missingTemplate, 'registry/languages/incomplete')), false, 'Missing canonical roles must fail before creating an incomplete language');
  checks++;
}

const served = path.join(temp, 'served');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    logs.push({ path: pathname, token: request.headers.authorization });
    if (pathname === '/api/redirect.tsx') {
      response.writeHead(302, { location: '/registry/redirect-target.tsx' });
      response.end();
      return;
    }
    const file = path.join(served, pathname);
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('missing');
  }
});

try {
  await checkNewLanguage();
  await checkWorkspaceDetection();
  // The real registry is the end-to-end contract. Tests never modify its output.
  const manifest = await json<{ items: Item[] }>(path.join(ROOT, 'public/r/registry.json'));
  const source = await loadSource(path.join(ROOT, 'registry'));
  const charts = manifest.items.filter((item) => item.meta.tier === 'expressive');
  const chartNames = charts.map((item) => `${item.meta.language}/${item.name}`);
  assert.deepEqual([...chartNames].sort(), source.languages.flatMap((language) => language.expressive.map((item) => `${language.meta.slug}/${item.meta.slug}`)).sort(), 'The built catalogue must contain every authored chart');
  assert.equal(manifest.items.filter((item) => item.meta.tier === 'primitive').length, 24);
  const blank = path.join(temp, 'blank');
  await mkdir(blank);
  await refuses(blank, ['add', 'mono-editorial/hairline-line', '--no-install'], /nodex init/, ROOT);
  const project = await newProject('consumer', ROOT);
  const config = await json<{ language: string; registry: string; paths: { components: string; tokens: string; design: string } }>(path.join(project, 'nodex.json'));
  assert.equal(config.registry, path.join(ROOT, 'public'));
  const before = await readFile(path.join(project, 'AGENTS.md'), 'utf8');
  await writeFile(path.join(project, 'AGENTS.md'), `# Existing instructions\n\nRetain these instructions.\n\n${before}`);
  await cli(project, ['init', 'mono-editorial']);
  await cli(project, ['init', 'mono-editorial']);
  const agents = await readFile(path.join(project, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Retain these instructions/);
  assert.equal(agents.split('<!-- nodex:start -->').length, 2);
  await refuses(project, ['init', 'signal-console'], /already uses another/);
  checks += 4;

  const show = JSON.parse(await cli(project, ['show', 'hairline-line', '--json'])) as { entry: string; exports: string[]; props: { name: string }[]; files: Record<string, unknown>[]; mounts?: unknown; data?: unknown };
  assert.equal(show.entry, 'hairline-line/component.tsx');
  assert.ok(show.exports.includes('HairlineLine'));
  assert.ok(show.props.some((prop) => prop.name === 'data'));
  assert.equal(show.mounts, undefined);
  assert.equal(show.data, undefined);
  const typed = JSON.parse(await cli(project, ['search', '--type', 'bar', '--json'])) as { name: string }[];
  assert.ok(typed.some((item) => item.name === 'endpoint-latency'));
  assert.ok(!typed.some((item) => item.name === 'hairline-line'));
  checks += 7;

  const discovery = JSON.parse(await cli(project, ['search', '--design', 'mono-editorial', '--json'])) as { name: string; files: Record<string, unknown>[] }[];
  assert.deepEqual(discovery.map((item) => item.name).sort(), manifest.items.filter((item) => item.meta.language === 'mono-editorial' || item.meta.language === 'shared').map((item) => item.name).sort());
  assert.ok([show, ...discovery].every((item) => item.files.length > 0 && item.files.every((file) =>
    typeof file.path === 'string' && typeof file.target === 'string' && Object.keys(file).length === 2)),
  'Discovery JSON must expose file addresses without embedded source or extra manifest fields');
  checks += 2;
  await refuses(project, ['lint'], /Lint target does not exist: .*nodex/);

  const report = JSON.parse(await cli(project, ['add', ...chartNames, 'button', '--no-install', '--json'])) as {
    added: { name: string; files: string[] }[]; files: string[]; dependencies: string[]; installed: string[];
  };
  assert.equal(report.added.length, chartNames.length + 1);
  assert.deepEqual(report.installed, []);
  assert.ok(report.dependencies.includes('recharts@3.10.1'));
  assert.equal(new Set(report.files).size, report.files.length);
  assert.ok(report.files.some((file) => file.includes('/_shared/')));
  for (const file of report.files) {
    assert.ok(await exists(path.join(project, file)), `${file} must exist`);
    assert.ok(!/(?:example|meta|preview)\./.test(file), 'examples, metadata and previews must stay in the registry');
  }
  const component = path.join(project, config.paths.components, 'hairline-line/component.tsx');
  const original = await readFile(component, 'utf8');
  const second = JSON.parse(await cli(project, ['add', ...chartNames, '--no-install', '--json'])) as { written: string[] };
  assert.deepEqual(second.written, []);
  await writeFile(component, `${original}\n// Consumer edit.\n`);
  await refuses(project, ['add', 'hairline-line', '--no-install'], /different content/);
  assert.match(await readFile(component, 'utf8'), /Consumer edit/);
  await cli(project, ['add', 'hairline-line', '--no-install', '--force']);
  assert.equal(await readFile(component, 'utf8'), original);
  await refuses(project, ['add', 'alert', 'not-a-component', '--no-install'], /No component named/);
  assert.ok(!await exists(path.join(project, config.paths.components, 'alert')));
  await cli(project, ['add', 'arc-matrix', '--to', 'src/charts', '--no-install']);
  assert.ok(await exists(path.join(project, 'src/charts/arc-matrix/component.tsx')));
  assert.ok(await exists(path.join(project, 'src/charts/_shared')));
  await refuses(project, ['add', 'button', '--to', '../outside', '--no-install'], /stay inside/);
  checks += 12;

  // Init preflight must leave every file alone when even one destination conflicts.
  const tokensFile = path.join(project, config.paths.tokens);
  const tokenContent = await readFile(tokensFile, 'utf8');
  await writeFile(tokensFile, `${tokenContent}\n/* Application override. */\n`);
  await refuses(project, ['init', 'mono-editorial'], /different content/);
  assert.match(await readFile(tokensFile, 'utf8'), /Application override/);
  await cli(project, ['init', 'mono-editorial', '--force']);
  assert.equal(await readFile(tokensFile, 'utf8'), tokenContent);
  const monoCharts = charts.filter((item) => item.meta.language === 'mono-editorial').map((item) => item.name);
  const linted = await cli(project, ['lint', ...[...monoCharts, 'button', '_shared'].map((slug) => `${config.paths.components}/${slug}`)]);
  assert.match(linted, /0 errors/);
  assert.match(await cli(project, ['lint', `${config.paths.components}/endpoint-latency`, '--design', 'signal-console']), /0 errors/);
  checks += 3;

  // Custom destinations must be checked explicitly, including from subdirectories.
  assert.match(await cli(path.join(project, 'src'), ['lint', 'src/charts']), /[1-9]\d* source files checked; 0 errors/);
  const singleSource = `${config.paths.components}/hairline-line/component.tsx`;
  assert.match(await cli(project, ['lint', singleSource, singleSource]), /1 source files checked; 0 errors/);
  checks += 2;
  await refuses(project, ['lint', 'src/charts/misspelled'], /Lint target does not exist: .*misspelled/);
  await refuses(project, ['lint', 'src/charts/missing.tsx'], /Lint target does not exist: .*missing\.tsx/);
  await refuses(project, ['lint', 'src/charts', 'src/charts/misspelled'], /Lint target does not exist: .*misspelled/);
  await mkdir(path.join(project, 'src/empty'));
  await refuses(project, ['lint', 'src/empty'], /No \.ts, \.tsx or \.css source files found in lint target: .*empty/);
  await write(path.join(project, 'src/empty/README.md'), 'No source here.\n');
  await write(path.join(project, 'src/empty/.hidden/ignored.ts'), 'export {};\n');
  await write(path.join(project, 'src/empty/node_modules/ignored/index.ts'), 'export {};\n');
  await refuses(project, ['lint', 'src/empty'], /No \.ts, \.tsx or \.css source files found/);
  await refuses(project, ['lint', 'src/empty/README.md'], /Lint target must be a directory or a \.ts, \.tsx or \.css file/);

  // Direct public roots and served roots use exactly the same file addresses.
  assert.ok(JSON.parse(await cli(blank, ['list', '--json'], path.join(ROOT, 'public'))).length >= 2);
  await cp(path.join(ROOT, 'public'), served, { recursive: true });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const remote = await newProject('remote-consumer', url);
  await cli(remote, ['add', 'hairline-line', 'button', '--no-install']);
  assert.ok(logs.length > 4 && logs.every((entry) => entry.token === undefined));
  checks += 2;

  // Language addresses come from languages.json, including access-controlled files.
  const languagesFile = path.join(served, 'r/languages.json');
  const languages = await json<Array<{ slug: string; files: { tokens: string; tokensJson: string; design: string } }>>(languagesFile);
  const mono = languages.find((language) => language.slug === 'mono-editorial')!;
  for (const [key, source] of Object.entries(mono.files)) {
    const target = `api/assets/${key}.txt`;
    await write(path.join(served, target), await readFile(path.join(served, source), 'utf8'));
    mono.files[key as keyof typeof mono.files] = target;
  }
  await writeFile(languagesFile, JSON.stringify(languages));
  await cli(remote, ['tokens', 'mono-editorial']);
  await cli(remote, ['tokens', 'mono-editorial', '--json']);
  await cli(remote, ['design', 'mono-editorial']);
  assert.ok(logs.filter((entry) => entry.path.startsWith('/api/assets/')).every((entry) => entry.token === 'Bearer nodex-smoke-token'));
  assert.ok(logs.filter((entry) => !entry.path.startsWith('/api/')).every((entry) => entry.token === undefined));
  checks += 2;

  const manifestFile = path.join(served, 'r/registry.json');
  const servedManifest = await json<{ items: Item[] }>(manifestFile);
  const baseManifest = JSON.stringify(servedManifest);
  for (const bad of ['../outside.tsx', '/absolute.tsx', 'nested/../../outside.tsx', 'a\\b.tsx', 'https://example.com/file.tsx', '%2e%2e/out.tsx']) {
    const badManifest = JSON.parse(baseManifest) as { items: Item[] };
    badManifest.items[0]!.files[0]!.target = bad;
    await writeFile(manifestFile, JSON.stringify(badManifest));
    await refuses(remote, ['add', 'button', '--no-install'], /Unsafe .*path/);
    badManifest.items[0]!.files[0]!.target = servedManifest.items[0]!.files[0]!.target;
    badManifest.items[0]!.files[0]!.path = bad;
    await writeFile(manifestFile, JSON.stringify(badManifest));
    await refuses(remote, ['add', 'button', '--no-install'], /Unsafe .*path/);
  }
  await writeFile(manifestFile, baseManifest);

  const missingFiles = languages.map((language) => ({ ...language, files: undefined }));
  await writeFile(languagesFile, JSON.stringify(missingFiles));
  await refuses(remote, ['list'], /language.files/);
  await writeFile(languagesFile, JSON.stringify(languages));
  const badDependencies = JSON.parse(baseManifest) as { items: Item[] };
  const hairline = badDependencies.items.find((item) => item.name === 'hairline-line')!;
  hairline.dependencies = ['recharts@latest'];
  await writeFile(manifestFile, JSON.stringify(badDependencies));
  await refuses(remote, ['add', 'hairline-line', '--no-install'], /exact package version/);
  await writeFile(manifestFile, baseManifest);
  const redirected = JSON.parse(baseManifest) as { items: Item[] };
  const button = redirected.items.find((item) => item.name === 'button')!;
  button.files[0]!.path = 'api/redirect.tsx';
  await writeFile(manifestFile, JSON.stringify(redirected));
  await refuses(remote, ['add', 'button', '--no-install', '--force'], /fetch failed/);
  assert.ok(!logs.some((entry) => entry.path === '/registry/redirect-target.tsx'));
  await writeFile(manifestFile, baseManifest);
  checks++;

  // Local source and destination symlinks must not escape their roots.
  const unsafeProject = await newProject('unsafe-project', ROOT);
  const outside = path.join(temp, 'outside');
  await mkdir(outside);
  await mkdir(path.join(unsafeProject, 'src/components'), { recursive: true });
  await symlink(outside, path.join(unsafeProject, 'src/components/nodex'));
  await refuses(unsafeProject, ['add', 'button', '--no-install'], /symbolic link/);
  assert.deepEqual(await readdir(outside), []);
  const localSource = path.join(served, servedManifest.items[0]!.files[0]!.path);
  const savedSource = await readFile(localSource);
  await rm(localSource);
  await writeFile(path.join(outside, 'source.tsx'), 'Never read me.');
  await symlink(path.join(outside, 'source.tsx'), localSource);
  const firstItem = servedManifest.items[0]!;
  const firstRef = firstItem.meta.language === 'shared' ? `mono-editorial/${firstItem.name}` : `${firstItem.meta.language}/${firstItem.name}`;
  await refuses(project, ['add', firstRef, '--no-install'], /stay inside/, served);
  await rm(localSource);
  await writeFile(localSource, savedSource);
  checks++;

  // Capture real CLI -> package-manager arguments without hitting npm in this smoke.
  const bin = path.join(temp, 'bin');
  await mkdir(bin);
  const managerLog = path.join(temp, 'manager.log');
  const expectedCalls: Array<{ manager: string; cwd: string }> = [];
  for (const manager of ['npm', 'pnpm', 'yarn', 'bun']) {
    const file = path.join(bin, manager);
    await writeFile(file, `#!${process.execPath}\nconst fs = require('node:fs');\nif (process.argv[2] === '--version') { process.stdout.write('1.0.0\\n'); process.exit(0); }\nfs.appendFileSync(process.env.NODEX_SMOKE_MANAGER_LOG, JSON.stringify({manager: '${manager}', cwd: process.cwd(), args: process.argv.slice(2)}) + '\\n');\nconst p = JSON.parse(fs.readFileSync('package.json', 'utf8'));\np.dependencies ||= {};\nfor (const spec of process.argv.slice(3)) { if (spec.startsWith('--')) continue; const i = spec.lastIndexOf('@'); p.dependencies[spec.slice(0, i)] = spec.slice(i + 1); }\nfs.writeFileSync('package.json', JSON.stringify(p));\nfs.writeFileSync('${manager === 'npm' ? 'package-lock.json' : manager === 'pnpm' ? 'pnpm-lock.yaml' : manager === 'yarn' ? 'yarn.lock' : 'bun.lock'}', '{}');\nconsole.log('package-manager log');\n`);
    await chmod(file, 0o755);
    const target = await newProject(`manager-${manager}`, ROOT);
    const pkg = await json<Record<string, unknown>>(path.join(target, 'package.json'));
    pkg.packageManager = `${manager}@1.0.0`;
    await writeFile(path.join(target, 'package.json'), JSON.stringify(pkg));
    const installed = JSON.parse(await cli(target, ['add', 'hairline-line', '--json'], undefined, { PATH: `${bin}${path.delimiter}${process.env.PATH}`, NODEX_SMOKE_MANAGER_LOG: managerLog })) as { installed: string[]; packageManager: string };
    assert.equal(installed.packageManager, manager);
    assert.ok(installed.installed.includes('recharts@3.10.1'));
    assert.ok(installed.installed.includes('react-is@19.2.8'));
    const after = await json<{ dependencies: Record<string, string> }>(path.join(target, 'package.json'));
    assert.equal(after.dependencies.react, '19.2.8');
    assert.equal(after.dependencies['react-dom'], '19.2.8');
    assert.equal(after.dependencies.recharts, '3.10.1');
    assert.equal(after.dependencies['react-is'], '19.2.8');
    checks += 7;
    expectedCalls.push({ manager, cwd: target });

    const workspace = await newWorkspace(`manager-workspace-${manager}`);
    const rootPackage = JSON.stringify({ name: 'workspace', private: true, workspaces: ['apps/*'], packageManager: `${manager}@1.0.0`, devDependencies: { recharts: '3.9.0' } });
    await write(path.join(workspace.root, 'package.json'), rootPackage);
    if (manager === 'pnpm') await write(path.join(workspace.root, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    await cli(workspace.app, ['init', 'mono-editorial'], ROOT);
    const skipped = JSON.parse(await cli(workspace.app, ['add', 'hairline-line', '--no-install', '--json'])) as { packageManager: string; installed: string[] };
    assert.equal(skipped.packageManager, manager);
    assert.deepEqual(skipped.installed, []);
    assert.equal((await json<{ dependencies: Record<string, string> }>(path.join(workspace.app, 'package.json'))).dependencies.recharts, undefined);
    const workspaceInstall = JSON.parse(await cli(path.join(workspace.app, 'src'), ['add', 'hairline-line', '--json'], undefined, { PATH: `${bin}${path.delimiter}${process.env.PATH}`, NODEX_SMOKE_MANAGER_LOG: managerLog })) as { packageManager: string; installed: string[] };
    assert.equal(workspaceInstall.packageManager, manager);
    assert.ok(workspaceInstall.installed.includes('react-is@19.2.8'));
    assert.equal((await json<{ dependencies: Record<string, string> }>(path.join(workspace.app, 'package.json'))).dependencies.recharts, '3.10.1');
    assert.equal(await readFile(path.join(workspace.root, 'package.json'), 'utf8'), rootPackage, 'The app owns the new dependency; preserve the workspace root manifest');
    expectedCalls.push({ manager, cwd: workspace.app });
    checks += 7;
  }
  const calls = (await readFile(managerLog, 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { manager: string; cwd: string; args: string[] });
  assert.deepEqual(calls.map(({ manager, cwd }) => ({ manager, cwd })), expectedCalls);
  assert.ok(calls.every((call) => call.args.includes(call.manager === 'yarn' ? '--exact' : '--save-exact')));
  const peerRange = await newProject('peer-range', ROOT);
  await writeFile(path.join(peerRange, 'package.json'), JSON.stringify({ dependencies: { react: '19.2.8', 'react-dom': '19.2.8', 'react-is': '^19.0.0' } }));
  const pinnedPeer = await planInstall(peerRange, ['recharts@3.10.1'], { noInstall: true });
  assert.ok(pinnedPeer.install.includes('react-is@19.2.8'));
  checks++;
  const oldReact = await newProject('old-react', ROOT);
  await writeFile(path.join(oldReact, 'package.json'), JSON.stringify({ dependencies: { react: '18.3.1', 'react-dom': '18.3.1', 'react-is': '18.3.1' } }));
  await assert.rejects(planInstall(oldReact, ['recharts@3.10.1'], { noInstall: true }), /require React 19/);
  const noInstallBefore = await readFile(path.join(oldReact, 'package.json'), 'utf8');
  await refuses(oldReact, ['add', 'button', '--no-install'], /require React 19/);
  assert.equal(await readFile(path.join(oldReact, 'package.json'), 'utf8'), noInstallBefore);
  assert.throws(() => dependencyPin('--global'), /exact package version/);
  await assert.rejects(planInstall(oldReact, ['react@19.2.8'], { noInstall: true }), /platform/);
  await assert.rejects(planInstall(oldReact, ['recharts@3.10.1', 'recharts@3.9.0'], { noInstall: true }), /conflicting versions/);
  checks += 7;

  const rules = rulesFromTokens({ color: { ink: '#1C1C1A', bg: '#F0EFEB' }, stroke: { lineMax: '1.4px', hairline: '0.7px' }, motion: { draw: { duration: '1s' } } });
  assert.equal(lintSource({ tsx: '<Line stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-hairline)" isAnimationActive={false} />' }, rules).length, 0);
  assert.ok(lintSource({ tsx: '<Line stroke="#1C1C1A" />' }, rules).some((finding) => finding.rule === 'palette'));
  assert.ok(lintSource({ css: '.chart { stroke:red; color: blue; }' }, rules).some((finding) => finding.rule === 'palette'));
  assert.ok(lintSource({ css: '.chart { --nx-custom: 1px; width: var(--nx-custom); }' }, rules).some((finding) => finding.rule === 'tokens'));
  assert.ok(lintSource({ tsx: '<Line stroke="var(--nx-missing)" />' }, rules).some((finding) => finding.rule === 'tokens'));
  assert.ok(lintSource({ tsx: 'const data = Math.random();' }, rules).some((finding) => finding.rule === 'determinism'));
  assert.ok(lintSource({ tsx: '<Line isAnimationActive={true} />' }, rules).some((finding) => finding.rule === 'motion'));
  assert.ok(lintSource({ tsx: '<Tooltip isAnimationActive={false} /><Line isAnimationActive={true} />' }, rules).some((finding) => finding.rule === 'motion'));
  assert.equal(lintSource({ tsx: 'useChartMotion(); <Line isAnimationActive={motion.active} />' }, rules).length, 0);
  assert.equal(lintRendered([{ fill: 'none', stroke: 'rgb(28, 28, 26)', strokeWidth: 1.4 }], rules).length, 0);
  assert.ok(lintRendered([{ fill: 'none', stroke: 'rgb(28, 28, 26)', strokeWidth: 2 }], rules).some((finding) => finding.rule === 'stroke'));
  assert.ok(lintRendered([{ fill: 'rgb(0, 0, 0)', stroke: 'none', strokeWidth: 0 }], rules).some((finding) => finding.rule === 'palette'));
  checks += 12;
  console.log(`CLI smoke: ${checks} checks passed (delivery, tokens, local/HTTP roots, package managers and path safety).`);
} finally {
  if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(temp, { recursive: true, force: true });
}
