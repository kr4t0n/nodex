import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type { Density, NodexMeta } from '@nodex/core/schema';

/**
 * A registry is addressed by its ROOT, not by its manifest.
 *
 * Everything hangs off that root at a fixed shape:
 *   <root>/r/registry.json      the manifest
 *   <root>/r/languages.json     language metadata
 *   <root>/<item.files[].path>  component sources
 *
 * The root can be a local directory or an https base, and nothing else in the
 * CLI cares which. That is deliberate: it means the registry can move to a CDN
 * later without touching a single command.
 */

export interface Item {
  name: string;
  title: string;
  description?: string;
  dependencies?: string[];
  files?: Array<{ path: string; target?: string }>;
  meta: NodexMeta & { externalData?: string[] };
}

export interface Language {
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'restricted';
  density?: Density[];
  featured: string[];
  counts?: { expressive: number; primitives: number };
}

export interface Registry {
  root: string;
  isRemote: boolean;
  items: Item[];
  languages: Language[];
  /** Read any file addressed relative to the registry root. */
  read(relative: string): Promise<string>;
}

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

/**
 * Walk up from the cwd looking for a built manifest, so running inside the
 * nodex repo just works without configuration.
 */
async function findLocalRoot(from: string): Promise<string | undefined> {
  let dir = path.resolve(from);
  for (;;) {
    try {
      await readFile(path.join(dir, 'public', 'r', 'registry.json'), 'utf8');
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}

export async function resolveRegistry(explicit?: string): Promise<Registry> {
  const candidate =
    explicit ?? process.env.NODEX_REGISTRY ?? (await findLocalRoot(process.cwd()));

  if (!candidate) {
    throw new Error(
      'No registry found.\n' +
        '  Pass one with --registry <dir|url>, set NODEX_REGISTRY,\n' +
        '  or run inside a nodex checkout after `npm run build:registry`.',
    );
  }

  const remote = isUrl(candidate);
  const root = remote ? candidate.replace(/\/+$/, '') : path.resolve(candidate);

  /**
   * Served layout is canonical: `r/*` for the manifest, `registry/*` for
   * sources. A checkout does not match it exactly, because the manifest is
   * written into `public/` so a static host exposes it at `/r` while sources
   * stay at the repo root. One prefix rule reconciles the two, and keeping it
   * here means no command has to care which kind of registry it is talking to.
   */
  const localPath = (clean: string): string =>
    clean.startsWith('r/')
      ? path.join(root, 'public', clean)
      : path.join(root, clean);

  const read = async (relative: string): Promise<string> => {
    const clean = relative.replace(/^\/+/, '');
    if (remote) {
      const res = await fetch(`${root}/${clean}`);
      if (!res.ok) {
        throw new Error(`${root}/${clean} returned ${res.status}`);
      }
      return res.text();
    }
    return readFile(localPath(clean), 'utf8');
  };

  let manifest: { items?: Item[] };
  try {
    manifest = JSON.parse(await read('r/registry.json')) as { items?: Item[] };
  } catch (cause) {
    throw new Error(
      `Could not read the manifest for ${root}.\n` +
        (remote
          ? '  Check the URL is a registry root, not the manifest itself.'
          : '  Run `npm run build:registry` in the nodex checkout first.'),
      { cause },
    );
  }

  let languages: Language[];
  try {
    languages = JSON.parse(await read('r/languages.json')) as Language[];
  } catch {
    // Older registries may predate languages.json. Degrade to what the manifest
    // itself implies rather than failing outright.
    const slugs = [
      ...new Set(
        (manifest.items ?? [])
          .map((item) => item.meta.language)
          .filter((slug) => slug !== 'shared'),
      ),
    ];
    languages = slugs.map((slug) => ({
      slug,
      name: slug,
      description: '',
      visibility: 'public' as const,
      featured: [],
    }));
  }

  return {
    root,
    isRemote: remote,
    items: manifest.items ?? [],
    languages,
    read,
  };
}

export function findLanguage(
  registry: Registry,
  slug: string,
): Language | undefined {
  return registry.languages.find((l) => l.slug === slug);
}

/**
 * Resolve a component reference.
 *
 * Accepts `mono-editorial/barcode-lollipop` (language-qualified) or a bare
 * `button` plus `--design`, which is how shared primitives are addressed since
 * they belong to no single language.
 */
export function findItem(
  registry: Registry,
  ref: string,
  design?: string,
): { item: Item; language: string } | { error: string } {
  const slash = ref.indexOf('/');
  const language = slash === -1 ? design : ref.slice(0, slash);
  const name = slash === -1 ? ref : ref.slice(slash + 1);

  if (!language) {
    return {
      error:
        `"${ref}" does not say which design language it belongs to.\n` +
        `  Use nodex add <language>/${name}, or pass --design <language>.`,
    };
  }

  const exact = registry.items.find(
    (item) => item.name === name && item.meta.language === language,
  );
  if (exact) return { item: exact, language };

  // Primitives carry language "shared" but are requested per language.
  const shared = registry.items.find(
    (item) => item.name === name && item.meta.language === 'shared',
  );
  if (shared) return { item: shared, language };

  const near = registry.items
    .filter((item) => item.name.includes(name) || name.includes(item.name))
    .slice(0, 4)
    .map((item) => `${item.meta.language}/${item.name}`);

  return {
    error:
      `No component named "${name}" in "${language}".` +
      (near.length ? `\n  Close matches: ${near.join(', ')}` : ''),
  };
}
