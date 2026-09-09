import type { NodexMeta, PublishedLanguage, RegistryItem } from '@nodex/core/schema';

/**
 * The app reads the built manifest at runtime rather than importing the
 * registry source. Everything it needs is already in `public/r/`, which keeps
 * the app a static client with no build-time coupling to the registry tree, and
 * means the registry could later move to a CDN without touching the app.
 */

export type Item = RegistryItem;
export type Language = PublishedLanguage;

/** The landing, account pages, and initial document share this language. */
export const OWN_LANGUAGE = 'mono-editorial';

export interface Catalog {
  languages: Language[];
  items: Item[];
}

/**
 * Where the registry is served from.
 *
 * Empty means same origin, which is how development works: the build copies the
 * registry into `public/`. Production can point at a CDN instead, since registry
 * content is static and needs no runtime. Keeping every URL in this file behind
 * one base is what makes that a config change rather than a code change.
 */
const BASE = (process.env.NEXT_PUBLIC_REGISTRY_URL ?? '').replace(/\/+$/, '');

/** Manifest addresses are relative to the same static registry root. */
export function registryFileUrl(path: string): string {
  return `${BASE}/${path}`;
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
      json<{ items: Item[] }>(registryFileUrl('r/registry.json')),
      json<Language[]>(registryFileUrl('r/languages.json')),
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

/**
 * Resolve a component within a language.
 *
 * Primitives carry `language: "shared"` because they are stored once, but they
 * are browsed under whichever language is being viewed. So a lookup that fails
 * against the language falls back to the shared set rather than 404ing on a
 * card the user just clicked.
 */
export function findItem(
  catalog: Catalog,
  language: string,
  name: string,
): Item | undefined {
  return (
    catalog.items.find(
      (item) => item.name === name && item.meta.language === language,
    ) ??
    catalog.items.find(
      (item) => item.name === name && item.meta.language === 'shared',
    )
  );
}

/** The whole React example, with a language selection for a shared primitive. */
export function previewUrl(item: Item, language?: string): string {
  const url = registryFileUrl(item.meta.preview.path);
  return item.meta.tier === 'primitive' && language
    ? `${url}?lang=${encodeURIComponent(language)}`
    : url;
}

export function designUrl(language: Language): string {
  return registryFileUrl(language.files.design);
}

export function tokensUrl(language: Language): string {
  return registryFileUrl(language.files.tokens);
}

export function tokensJsonUrl(language: Language): string {
  return registryFileUrl(language.files.tokensJson);
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
