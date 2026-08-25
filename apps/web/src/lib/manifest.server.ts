import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Build-time reads of the manifest, for prerendering routes.
 *
 * Server-only, and deliberately separate from lib/registry.ts: that module
 * fetches over HTTP so it works in the browser and against a CDN, while route
 * generation runs at build time when there is no server to fetch from.
 *
 * Reads the copy under public/ rather than the repo root because the copy is
 * inside the app, so it survives a standalone deployment build.
 */
const PUBLIC = path.join(process.cwd(), 'public', 'r');

interface ManifestItem {
  name: string;
  meta: { language: string; tier: string };
}

async function readManifest<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(PUBLIC, file), 'utf8');
  return JSON.parse(raw) as T;
}

export async function languageSlugs(): Promise<string[]> {
  const languages = await readManifest<{ slug: string }[]>('languages.json');
  return languages.map((language) => language.slug);
}

/**
 * Every component page, which is a language crossed with the components visible
 * to it: the ones it owns, plus every shared primitive.
 */
export async function componentParams(): Promise<
  { slug: string; name: string }[]
> {
  const [{ items }, slugs] = await Promise.all([
    readManifest<{ items: ManifestItem[] }>('registry.json'),
    languageSlugs(),
  ]);

  const primitives = items
    .filter((item) => item.meta.tier === 'primitive')
    .map((item) => item.name);

  return slugs.flatMap((slug) => {
    const owned = items
      .filter((item) => item.meta.language === slug)
      .map((item) => item.name);

    return [...new Set([...owned, ...primitives])].map((name) => ({
      slug,
      name,
    }));
  });
}
