import { execFile, spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { writablePath } from './safety.ts';

const exec = promisify(execFile);
const PLATFORM = new Set(['react', 'react-dom', 'typescript', 'tailwindcss', '@types/react', '@types/react-dom']);
const PIN = /^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[a-z0-9.-]+)?(?:\+[a-z0-9.-]+)?)$/i;
type Manager = 'npm' | 'pnpm' | 'yarn' | 'bun';

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface InstallPlan {
  manager: Manager;
  requested: string[];
  install: string[];
  args: string[];
}

export function dependencyPin(spec: string): { name: string; version: string } {
  const match = PIN.exec(spec);
  if (!match) throw new Error(`Dependency must be an exact package version, received ${JSON.stringify(spec)}.`);
  return { name: match[1]!, version: match[2]! };
}

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function managerFor(dir: string, pkg: PackageJson): Promise<Manager> {
  if (pkg.packageManager) {
    const declared = /^(npm|pnpm|yarn|bun)@/.exec(pkg.packageManager)?.[1];
    if (!declared) throw new Error(`Unsupported packageManager: ${pkg.packageManager}.`);
    return declared as Manager;
  }
  const managers = new Set<Manager>();
  for (const [file, manager] of [['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun']] as const) {
    if (await exists(path.join(dir, file))) managers.add(manager);
  }
  if (managers.size > 1) throw new Error('Several package-manager lockfiles exist. Set packageManager in package.json.');
  return [...managers][0] ?? 'npm';
}

/** Support common version declarations without changing the consumer's React setup. */
function includesVersion(range: string, version: string): boolean {
  if (range === version || range === '*') return true;
  const pin = /^(\^|~)?(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const target = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!pin || !target || !pin[1]) return false;
  const [major, minor, patch] = target.slice(1).map(Number) as [number, number, number];
  const [baseMajor, baseMinor, basePatch] = pin.slice(2).map(Number) as [number, number, number];
  if (major !== baseMajor || minor < baseMinor || (minor === baseMinor && patch < basePatch)) return false;
  if (pin[1] === '~' || major === 0) return minor === baseMinor;
  return true;
}

async function platformVersion(dir: string, name: string, declaration: string | undefined): Promise<string> {
  let current = dir;
  for (;;) {
    try {
      const installed = JSON.parse(await readFile(path.join(current, `node_modules/${name}/package.json`), 'utf8')) as { version: string };
      dependencyPin(`${name}@${installed.version}`);
      return installed.version;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (declaration && PIN.test(`${name}@${declaration}`)) return declaration;
  throw new Error(`Install your application dependencies first so nodex can verify the ${name} version and match its peers.`);
}

/** All resolution and conflicts are checked before invoking a package manager. */
export async function planInstall(dir: string, dependencies: string[], options: { force?: boolean; noInstall?: boolean }): Promise<InstallPlan> {
  const requested = new Map<string, string>();
  for (const dependency of dependencies) {
    const { name, version } = dependencyPin(dependency);
    if (PLATFORM.has(name)) throw new Error(`Registry items must not install the app platform package ${name}.`);
    if (requested.has(name) && requested.get(name) !== version) throw new Error(`Components require conflicting versions of ${name}.`);
    requested.set(name, version);
  }
  let pkg: PackageJson;
  try {
    const packageFile = await writablePath(dir, 'package.json');
    pkg = JSON.parse(await readFile(packageFile, 'utf8')) as PackageJson;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    throw new Error('Nodex components require an existing React 19 application with package.json. Nodex does not install the application platform.', { cause: error });
  }
  const manager = await managerFor(dir, pkg);
  for (const lock of ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
    await writablePath(dir, lock);
  }
  const present = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
  if (!present.react || !present['react-dom']) throw new Error('Nodex components require an existing React 19 and React DOM 19 app. Nodex does not install or replace the application platform.');
  const version = await platformVersion(dir, 'react', present.react);
  const domVersion = await platformVersion(dir, 'react-dom', present['react-dom']);
  if (Number(version.split('.')[0]) < 19 || Number(domVersion.split('.')[0]) < 19) {
    throw new Error('Nodex components require React 19 and React DOM 19 for ref-as-prop support. Upgrade the application platform before adding components; nodex leaves those dependencies unchanged.');
  }
  if (requested.has('recharts')) {
    requested.set('react-is', version);
  }
  const install: string[] = [];
  for (const [name, version] of requested) {
    const existing = present[name];
    if (existing === version) continue;
    if (existing && !includesVersion(existing, version) && !options.force) {
      throw new Error(`${name} is already declared as ${existing}, but these components require ${version}. Use --force to replace that dependency.`);
    }
    install.push(`${name}@${version}`);
  }
  const args = manager === 'npm' ? ['install', '--save-exact', ...install]
    : manager === 'yarn' ? ['add', '--exact', ...install]
      : ['add', '--save-exact', ...install];
  if (install.length && !options.noInstall) {
    try { await exec(manager, ['--version'], { cwd: dir }); }
    catch (cause) { throw new Error(`${manager} is required to install component dependencies. Install it or use --no-install.`, { cause }); }
  }
  return { manager, requested: [...requested].map(([name, version]) => `${name}@${version}`), install, args };
}

export async function installPackages(dir: string, plan: InstallPlan): Promise<void> {
  if (!plan.install.length) return;
  await new Promise<void>((resolve, reject) => {
    // Package-manager logs go to stderr so --json stdout stays parseable.
    const child = spawn(plan.manager, plan.args, { cwd: dir, stdio: ['inherit', 'pipe', 'pipe'], shell: false });
    child.stdout.on('data', (chunk: Buffer) => process.stderr.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${plan.manager} exited with ${code}; component source files have not been written.`)));
  });
}
