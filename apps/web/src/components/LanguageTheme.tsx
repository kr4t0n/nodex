'use client';

import { useLanguageTokens } from '@/lib/hooks.ts';

/**
 * Applies a token layer from a server-rendered page.
 *
 * The three registry views theme themselves because they already load the
 * catalog. The landing and login pages have no catalog to load and no reason to
 * fetch one, so they mount this instead: a client island whose only job is to
 * attach the stylesheet.
 *
 * The default is the language nodex's own chrome is drawn in. That is not a
 * hardcoded palette, it is the same tokens.css the registry ships, so nodex's
 * marketing surface is themed by the product it sells.
 */
const OWN_LANGUAGE = 'mono-editorial';

export function LanguageTheme({ slug = OWN_LANGUAGE }: { slug?: string }) {
  useLanguageTokens(slug);
  return null;
}
