/**
 * Fail if the web app uses a primitive's classes without loading its stylesheet.
 *
 * `app/layout.tsx` links a curated set of primitives, because the app is built
 * from them. The set is curated rather than "all of them" so the landing page is
 * not held up by two dozen render-blocking stylesheets it does not use.
 *
 * That curation is the hazard: a view added later can write `.nx-slider`, get no
 * styles, and fail silently with nothing in the console to explain it. Nobody
 * remembers to update a list like this by hand.
 *
 * So this records reality and freezes it, the same pattern the registry's own
 * palette and stroke lints use. It passes today and fails the moment a view
 * reaches for a primitive the shell does not load.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PRIMITIVES = path.join(ROOT, 'registry', 'primitives');
const APP = path.join(ROOT, 'apps', 'web', 'src');
const LAYOUT = path.join(APP, 'app', 'layout.tsx');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Class name to the set of primitives whose stylesheet defines it. */
async function classOwners() {
  const owners = new Map();
  for (const entry of await readdir(PRIMITIVES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const css = await readFile(
      path.join(PRIMITIVES, entry.name, 'component.css'),
      'utf8',
    );
    for (const [, name] of css.matchAll(/\.(nx-[a-z0-9-]+(?:__[a-z-]+)?)/g)) {
      if (!owners.has(name)) owners.set(name, new Set());
      owners.get(name).add(entry.name);
    }
  }
  return owners;
}

/**
 * Classes the app's own markup writes.
 *
 * Comments are stripped first, or this file's own prose about `.nx-table` would
 * register as a use. Custom properties are excluded too: `--nx-muted` is a token
 * reference, not a class.
 */
async function usedClasses() {
  const used = new Map();
  for (const file of await walk(APP)) {
    const source = (await readFile(file, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');
    for (const [, name] of source.matchAll(
      /(?<!-)\b(nx-[a-z0-9-]+(?:__[a-z-]+)?)/g,
    )) {
      if (!used.has(name)) used.set(name, path.relative(ROOT, file));
    }
  }
  return used;
}

async function shellPrimitives() {
  const source = await readFile(LAYOUT, 'utf8');
  const match = source.match(/SHELL_PRIMITIVES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error('Could not find SHELL_PRIMITIVES in app/layout.tsx.');
  }
  return new Set([...match[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));
}

const [owners, used, shell] = await Promise.all([
  classOwners(),
  usedClasses(),
  shellPrimitives(),
]);

const missing = [];
for (const [name, file] of used) {
  const defining = owners.get(name);
  // Not a primitive class at all: app-local, like `.nx-frame`.
  if (!defining) continue;
  if ([...defining].some((primitive) => shell.has(primitive))) continue;
  missing.push({ name, file, defining: [...defining].sort().join(' or ') });
}

// The other direction is a warning, not a failure: an unused stylesheet costs a
// request, while a missing one costs a broken page.
const unused = [...shell].filter(
  (primitive) =>
    ![...used.keys()].some((name) => owners.get(name)?.has(primitive)),
);

if (missing.length) {
  console.error('\nThe app uses primitives its layout does not load:\n');
  for (const { name, file, defining } of missing) {
    console.error(`  .${name}  (${defining})  used in ${file}`);
  }
  console.error(
    '\n  Add the primitive to SHELL_PRIMITIVES in apps/web/src/app/layout.tsx,\n' +
      '  or the markup renders unstyled with nothing to explain why.\n',
  );
  process.exit(1);
}

if (unused.length) {
  console.log(`shell primitives: ${shell.size} loaded, all used`);
  console.log(`  loaded but unused: ${unused.join(', ')}`);
} else {
  console.log(`shell primitives: ${shell.size} loaded, all used`);
}
