/**
 * Copy the built registry into the web app's public directory.
 *
 * The registry lives at the repo root because it is the product; the web app is
 * one of three consumers. Next serves anything in `public/` natively with proper
 * caching and no runtime code, which is why this copies rather than adding a
 * route handler to stream files from outside the app. A route handler would also
 * tie registry serving to a Node runtime, and the whole point of the registry
 * being static is that it can sit on a CDN.
 *
 * In production the app can point at a CDN instead, via NEXT_PUBLIC_REGISTRY_URL.
 * This copy is what makes local development work without one.
 *
 * Runs automatically before dev and before build. The destination is gitignored.
 */

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'apps', 'web', 'public');

const SOURCES = [
  // The manifest and per-item JSON, served at /r/*
  [path.join(ROOT, 'public', 'r'), path.join(PUBLIC, 'r')],
  // Generated previews, tokens.css, and component fragments, served at /registry/*
  [path.join(ROOT, 'registry'), path.join(PUBLIC, 'registry')],
];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

let copied = 0;
for (const [from, to] of SOURCES) {
  if (!(await exists(from))) {
    console.error(
      `\nMissing ${path.relative(ROOT, from)}.\n` +
        '  Run `npm run build:registry` first: the app reads the built manifest\n' +
        '  and iframes the generated previews, neither of which is committed.\n',
    );
    process.exit(1);
  }
  await rm(to, { recursive: true, force: true });
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  copied += 1;
}

console.log(`synced ${copied} registry path(s) into apps/web/public`);
