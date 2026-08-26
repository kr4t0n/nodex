import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

/**
 * User-level config, at `~/.nodex`.
 *
 * Separate from the project's `nodex.json`, which records which language a
 * project uses and belongs in the repository. This holds credentials, which
 * belong to the person and must never be committed.
 *
 * Keyed by registry root, because one machine can talk to several registries and
 * a token for one is not a token for another. Sending a company registry's token
 * to a public one would be a leak with no upside.
 */

export interface HostCredentials {
  token: string;
  login?: string;
}

interface AuthFile {
  hosts: Record<string, HostCredentials>;
}

export function configDir(): string {
  return process.env.NODEX_CONFIG_DIR ?? path.join(homedir(), '.nodex');
}

export function authPath(): string {
  return path.join(configDir(), 'auth.json');
}

/** Trailing slashes and case in the host must not create a second entry. */
export function hostKey(registry: string): string {
  try {
    const url = new URL(registry);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return registry.replace(/\/+$/, '');
  }
}

async function readAuth(): Promise<AuthFile> {
  try {
    const raw = await readFile(authPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthFile>;
    return { hosts: parsed.hosts ?? {} };
  } catch {
    // Missing or unreadable is simply "not signed in". A corrupt file should not
    // stop every other command from working.
    return { hosts: {} };
  }
}

async function writeAuth(file: AuthFile): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const target = authPath();
  await writeFile(target, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
  // Set explicitly as well as at create time: `writeFile` honours the mode only
  // when it creates the file, so an existing 0644 from an older version would
  // otherwise survive forever.
  await chmod(target, 0o600);
}

/**
 * The token for a registry, if any.
 *
 * `NODEX_TOKEN` wins, so CI and agents can be provisioned without an
 * interactive login and without writing anything to disk.
 */
export async function tokenFor(registry: string): Promise<string | undefined> {
  const fromEnv = process.env.NODEX_TOKEN;
  if (fromEnv) return fromEnv;
  const file = await readAuth();
  return file.hosts[hostKey(registry)]?.token;
}

export async function credentialsFor(
  registry: string,
): Promise<HostCredentials | undefined> {
  if (process.env.NODEX_TOKEN) {
    return { token: process.env.NODEX_TOKEN, login: 'NODEX_TOKEN' };
  }
  const file = await readAuth();
  return file.hosts[hostKey(registry)];
}

export async function saveToken(
  registry: string,
  credentials: HostCredentials,
): Promise<string> {
  const file = await readAuth();
  file.hosts[hostKey(registry)] = credentials;
  await writeAuth(file);
  return authPath();
}

/** Returns whether anything was actually removed. */
export async function clearToken(registry: string): Promise<boolean> {
  const file = await readAuth();
  const key = hostKey(registry);
  if (!file.hosts[key]) return false;
  delete file.hosts[key];
  if (Object.keys(file.hosts).length === 0) {
    await rm(authPath(), { force: true });
  } else {
    await writeAuth(file);
  }
  return true;
}
