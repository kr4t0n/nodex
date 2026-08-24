import type { Density, NodexMeta } from '@nodex/core/schema';

/**
 * The gallery reads the built manifest at runtime rather than importing the
 * registry source. Everything it needs is already in `public/r/`, which keeps
 * the app a static client with no build-time coupling to the registry tree, and
 * means the registry could later move to a CDN without touching the app.
 */

export interface Item {
  name: string;
  title: string;
  description?: string;
  dependencies?: string[];
  files?: Array<{ path: string; target?: string }>;
  meta: NodexMeta;
}

export interface Language {
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'restricted';
  density?: Density[];
  featured: string[];
  counts: { expressive: number; primitives: number };
}

export interface Catalog {
  languages: Language[];
  items: Item[];
}

let cache: Promise<Catalog> | undefined;

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

export function loadCatalog(): Promise<Catalog> {
  cache ??= (async () => {
    const [registry, languages] = await Promise.all([
      json<{ items: Item[] }>('/r/registry.json'),
      json<Language[]>('/r/languages.json'),
    ]);
    return { languages, items: registry.items };
  })();
  return cache;
}

export function expressiveFor(catalog: Catalog, language: string): Item[] {
  return catalog.items.filter(
    (item) => item.meta.language === language && item.meta.tier === 'expressive',
  );
}

export function primitivesFor(catalog: Catalog): Item[] {
  return catalog.items.filter((item) => item.meta.tier === 'primitive');
}

export function findItem(
  catalog: Catalog,
  language: string,
  name: string,
): Item | undefined {
  return catalog.items.find(
    (item) => item.name === name && item.meta.language === language,
  );
}

/** URL of a component's generated standalone preview document. */
export function previewUrl(language: string, name: string): string {
  return `/registry/languages/${language}/expressive/${name}/index.html`;
}

export function designUrl(language: string): string {
  return `/registry/languages/${language}/DESIGN.md`;
}

export function tokensUrl(language: string): string {
  return `/registry/languages/${language}/tokens.css`;
}

export function tokensJsonUrl(language: string): string {
  return `/registry/languages/${language}/tokens.json`;
}

/**
 * A primitive's preview takes its token layer from the query parameter, so one
 * generated file serves every design language.
 */
export function primitivePreviewUrl(name: string, language: string): string {
  return `/registry/primitives/${name}/index.html?lang=${encodeURIComponent(language)}`;
}

export function addCommand(language: string, item: Item): string {
  return item.meta.tier === 'primitive'
    ? `nodex add ${item.name} --design ${language}`
    : `nodex add ${language}/${item.name}`;
}

/** Distinct values of one meta field across a set, for building filters. */
export function facetValues<K extends keyof NodexMeta>(
  items: Item[],
  key: K,
): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const value = item.meta[key];
    if (typeof value === 'string' && value) seen.add(value);
  }
  return [...seen].sort();
}
