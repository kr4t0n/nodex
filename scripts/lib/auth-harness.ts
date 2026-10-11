import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { TestContext } from 'node:test';

import { build } from 'esbuild';
import type * as GitHub from '../../apps/web/src/lib/github.ts';
import type * as Device from '../../apps/web/src/lib/cli-auth.ts';
import type * as Database from '../../apps/web/src/lib/db.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');

/** Bundle the real server modules, replacing only Next's request context. */
export async function authHarness(t: TestContext, stubDatabase = true) {
  const cache = path.join(ROOT, 'apps/web/node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const dir = await mkdtemp(path.join(cache, 'auth-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const outfile = path.join(dir, 'auth.cjs');
  await build({
    stdin: {
      contents: `
        export * as github from './src/lib/github.ts';
        export * as device from './src/lib/cli-auth.ts';
        export * as db from './src/lib/db.ts';
        export { POST as token } from './src/app/api/cli/token/route.ts';
        export { GET as callback } from './src/app/api/auth/github/callback/route.ts';
        export { GET as beginOAuth } from './src/app/api/auth/github/route.ts';
        export { GET as whoami } from './src/app/api/cli/whoami/route.ts';
        export { NextRequest } from 'next/server';
        export { store } from 'next/headers';
      `,
      resolveDir: path.join(ROOT, 'apps/web'),
    },
    tsconfig: path.join(ROOT, 'apps/web/tsconfig.json'),
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile,
    plugins: [{
      name: 'auth-context',
      setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'auth-test' }));
        builder.onResolve({ filter: /^next\/headers$/ }, () => ({ path: 'cookies', namespace: 'auth-test' }));
        if (stubDatabase) builder.onResolve({ filter: /(?:^|\/)db\.ts$/ }, () => ({ path: 'db', namespace: 'auth-test' }));
        builder.onLoad({ filter: /.*/, namespace: 'auth-test' }, ({ path: name }) => ({
          contents: name === 'server-only' ? '' : name === 'cookies' ? `
            export const store = new Map();
            export async function cookies() { return store; }
          ` : `
            export const database = { query: async () => [] };
            export function query(...args) { return database.query(...args); }
            export function databaseConfigured() { return true; }
          `,
        }));
      },
    }],
  });
  return createRequire(import.meta.url)(outfile) as {
    github: typeof GitHub;
    device: typeof Device;
    db: typeof Database & { database: { query: (sql: string, values?: unknown[]) => Promise<unknown[]> } };
    token: (request: Request) => Promise<Response>;
    callback: (request: Request) => Promise<Response>;
    beginOAuth: (request: Request) => Promise<Response>;
    whoami: (request: Request) => Promise<Response>;
    NextRequest: new (url: string, init?: RequestInit) => Request;
    store: Map<string, { value: string } | string>;
  };
}
