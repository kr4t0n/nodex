import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type { Density, NodexMeta } from '@nodex/core/schema';

import { tokenFor } from './config.ts';

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

/**
 * Where the CLI looks when nothing else says otherwise.
 *
 * It is a plain registry root, so it is reached by exactly the path any other
 * root is: `r/registry.json` for the manifest, `<item.files[].path>` for
 * sources. No command knows it is the default, and moving it to a CDN later is
 * a change to this string alone.
 *
 * It is the last resort, and there is no longer anything between it and the
 * environment. The CLI used to walk up from the cwd looking for a built
 * manifest and prefer that, which meant running any command inside a nodex
 * checkout silently addressed the working tree instead of the deployment —
 * `login` reported there was nothing to sign in to, and a stray `nodex.json`
 * anywhere above the checkout flipped it back again. Both are confusing in a
 * way that is hard to attribute. A local root is still reachable, but only by
 * asking for it: `--registry .` or `NODEX_REGISTRY`.
 */
export const DEFAULT_REGISTRY = 'https://nodex.kubitnodes.com';

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

/**
 * Precedence: `--registry`, then `nodex.json`, then `NODEX_REGISTRY`, then the
 * hosted default.
 *
 * Every step is something someone wrote down. Nothing is inferred from where
 * the command happened to be run, which is what makes the resolved root
 * predictable from the arguments and the project alone.
 *
 * `nodex.json` outranks the environment so a project pinned to one registry
 * cannot be silently served by another. `init` records the root it used
 * whenever it is remote, which is what makes that pin exist at all.
 */
export async function resolveRegistry(explicit?: string): Promise<Registry> {
  const candidate =
    explicit ?? process.env.NODEX_REGISTRY ?? DEFAULT_REGISTRY;

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

  /**
   * Read a file addressed relative to the registry root.
   *
   * The token is attached ONLY to paths under `api/`, never to the static ones.
   * Public content is served straight off a CDN, and a bearer token sent there
   * is handed to a third party for nothing: those paths need no authorization at
   * all. The manifest decides which is which by where it points a file, so this
   * needs no per-language policy.
   */
  const read = async (relative: string): Promise<string> => {
    const clean = relative.replace(/^\/+/, '');
    if (remote) {
      const guarded = clean.startsWith('api/');
      const token = guarded ? await tokenFor(root) : undefined;

      const res = await fetch(`${root}/${clean}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `${root}/${clean} requires access you do not have.\n` +
            (token
              ? '  Your sign in may have expired. Try `nodex login` again.'
              : '  Run `nodex login` first.'),
        );
      }
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
          ? '  Check you are online, and that the URL is a registry root\n' +
            '  rather than the manifest itself.'
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
