import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type { Density, NodexMeta } from '@nodex/core/schema';

import { tokenFor } from './config.ts';
import { containedPath, registryPath } from './safety.ts';

export interface Item {
  name: string;
  title: string;
  description?: string;
  dependencies: string[];
  files: Array<{ path: string; target: string }>;
  meta: NodexMeta;
}

export interface Language {
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'restricted';
  density?: Density[];
  featured: string[];
  counts?: { expressive: number; primitives: number };
  files: { tokens: string; tokensJson: string; design: string };
}

export interface Registry {
  /** Canonical served root: a URL, or a built public directory. */
  root: string;
  isRemote: boolean;
  items: Item[];
  languages: Language[];
  read(relative: string): Promise<string>;
}

export const DEFAULT_REGISTRY = 'https://nodex.kubitnodes.com';

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid registry: ${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.length) {
    throw new Error(`Invalid registry: ${label} must be a non-empty string.`);
  }
}

function strings(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid registry: ${label} must be a string array.`);
  }
}

/** Validate the public wire contract without adding a runtime schema dependency. */
function readItems(value: unknown): Item[] {
  const manifest = record(value, 'manifest');
  if (!Array.isArray(manifest.items)) throw new Error('Invalid registry: items are required.');
  const refs = new Set<string>();
  for (const value of manifest.items) {
    const item = record(value, 'item');
    string(item.name, 'item.name');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name)) throw new Error('Invalid component slug.');
    string(item.title, 'item.title');
    strings(item.dependencies, 'item.dependencies');
    const meta = record(item.meta, 'item.meta');
    for (const key of ['language', 'component', 'entry']) string(meta[key], `meta.${key}`);
    if (meta.runtime !== 'react' || !['primitive', 'expressive'].includes(String(meta.tier))) {
      throw new Error('Invalid registry: components must declare the React contract.');
    }
    strings(meta.tags, 'meta.tags');
    strings(meta.exports, 'meta.exports');
    if (meta.externalData === undefined) meta.externalData = [];
    strings(meta.externalData, 'meta.externalData');
    if (!meta.exports.length || meta.exports.some((name) => !/^[A-Za-z_$][\w$]*$/.test(name))) {
      throw new Error('Invalid registry: explicit component exports are required.');
    }
    registryPath(meta.entry as string, 'component entry');
    const preview = record(meta.preview, 'meta.preview');
    string(preview.path, 'meta.preview.path');
    registryPath(preview.path, 'preview path');
    if (![preview.width, preview.height].every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) {
      throw new Error('Invalid registry: preview dimensions must be positive numbers.');
    }
    if (meta.props !== undefined) {
      if (!Array.isArray(meta.props)) throw new Error('Invalid registry: props must be an array.');
      for (const value of meta.props) {
        const prop = record(value, 'prop');
        string(prop.name, 'prop.name');
        string(prop.type, 'prop.type');
        if (prop.description !== undefined && typeof prop.description !== 'string') {
          throw new Error('Invalid registry: prop.description must be text.');
        }
        if (prop.required !== undefined && typeof prop.required !== 'boolean') {
          throw new Error('Invalid registry: prop.required must be boolean.');
        }
      }
    }
    if (!Array.isArray(item.files) || !item.files.length) throw new Error('Invalid registry: item files are required.');
    const targets = new Set<string>();
    for (const value of item.files) {
      const file = record(value, 'file');
      string(file.path, 'file.path');
      string(file.target, 'file.target');
      registryPath(file.path, 'source path');
      registryPath(file.target, 'target path');
      if (targets.has(file.target)) throw new Error(`Duplicate target ${file.target}.`);
      targets.add(file.target);
    }
    if (!targets.has(meta.entry as string)) throw new Error('Invalid registry: entry must name a delivered target.');
    const ref = `${meta.language}/${item.name}`;
    if (refs.has(ref)) throw new Error(`Duplicate registry component ${ref}.`);
    refs.add(ref);
  }
  return manifest.items as Item[];
}

function readLanguages(value: unknown): Language[] {
  if (!Array.isArray(value)) throw new Error('Invalid registry: languages.json must be an array.');
  const slugs = new Set<string>();
  for (const candidate of value) {
    const language = record(candidate, 'language');
    string(language.slug, 'language.slug');
    string(language.name, 'language.name');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(language.slug) || slugs.has(language.slug)) {
      throw new Error('Invalid or duplicate language slug.');
    }
    slugs.add(language.slug);
    if (typeof language.description !== 'string' || !['public', 'restricted'].includes(String(language.visibility))) {
      throw new Error('Invalid language description or visibility.');
    }
    strings(language.featured, 'language.featured');
    const files = record(language.files, 'language.files');
    for (const key of ['tokens', 'tokensJson', 'design']) {
      string(files[key], `language.files.${key}`);
      registryPath(files[key] as string, `language ${key} path`);
    }
  }
  return value as Language[];
}

async function exists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/** The caller resolves flag > project; environment > hosted default follow here. */
export async function resolveRegistry(explicit?: string): Promise<Registry> {
  const candidate = explicit ?? process.env.NODEX_REGISTRY ?? DEFAULT_REGISTRY;
  const remote = /^https?:\/\//.test(candidate);
  let root: string;
  if (remote) {
    const url = new URL(candidate);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !loopback) || url.username || url.password || url.search || url.hash) {
      throw new Error('A registry must use HTTPS (HTTP is allowed for localhost), without credentials, query or fragment.');
    }
    root = url.toString().replace(/\/+$/, '');
  } else {
    const local = path.resolve(candidate);
    const built = await exists(path.join(local, 'r/registry.json')) ? local : path.join(local, 'public');
    try {
      root = await realpath(built);
    } catch (cause) {
      throw new Error(`Could not read the built registry under ${local}. Run npm run build:registry first.`, { cause });
    }
  }

  const read = async (relative: string): Promise<string> => {
    const clean = registryPath(relative);
    if (!remote) {
      const file = await realpath(containedPath(root, clean));
      containedPath(root, path.relative(root, file));
      return readFile(file, 'utf8');
    }
    const target = new URL(`${root}/${clean}`);
    if (target.origin !== new URL(root).origin) throw new Error('Registry files must remain on their registry origin.');
    const token = clean.startsWith('api/') ? await tokenFor(root) : undefined;
    const response = await fetch(target, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      // A guarded file cannot redirect a bearer token to another route or host.
      redirect: 'error',
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${target} requires access. ${token ? 'Try nodex login again.' : 'Run nodex login first.'}`);
    }
    if (!response.ok) throw new Error(`${target} returned ${response.status}.`);
    return response.text();
  };

  const [manifest, languageList] = await Promise.all([
    read('r/registry.json'),
    read('r/languages.json'),
  ]);
  return { root, isRemote: remote, items: readItems(JSON.parse(manifest)), languages: readLanguages(JSON.parse(languageList)), read };
}

export function findLanguage(registry: Registry, slug: string): Language | undefined {
  return registry.languages.find((language) => language.slug === slug);
}

export function findItem(
  registry: Registry,
  ref: string,
  design?: string,
): { item: Item; language: string } | { error: string } {
  const slash = ref.indexOf('/');
  const language = slash === -1 ? design : ref.slice(0, slash);
  const name = slash === -1 ? ref : ref.slice(slash + 1);
  if (!language) return { error: `"${ref}" needs a design language. Use <language>/${name} or --design <language>.` };
  if (!findLanguage(registry, language)) return { error: `No design language named "${language}".` };
  const item = registry.items.find((item) => item.name === name && item.meta.language === language)
    ?? registry.items.find((item) => item.name === name && item.meta.language === 'shared');
  if (item) return { item, language };
  return { error: `No component named "${name}" in "${language}". Use nodex search to see available components.` };
}
