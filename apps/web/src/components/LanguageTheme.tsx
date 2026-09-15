'use client';

import { useLanguageTokens } from '@/lib/hooks.ts';
import { OWN_LANGUAGE } from '@/lib/registry.ts';

/**
 * Applies a token layer from a server-rendered page.
 *
 * Registry views select their viewed language. Landing and account pages use
 * this client island to restore the default language after navigation. The
 * shared catalog supplies the stylesheet's explicit address.
 *
 * The default is the language nodex's own chrome is drawn in. That is not a
 * hardcoded palette, it is the same tokens.css the registry ships, so nodex's
 * marketing surface is themed by the product it sells.
 */
export function LanguageTheme({ slug = OWN_LANGUAGE }: { slug?: string }) {
  useLanguageTokens(slug);
  return null;
}
