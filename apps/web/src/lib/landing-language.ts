'use client';

import { useCallback, useEffect, useState } from 'react';

import { OWN_LANGUAGE, tokensUrl, type Language } from './registry.ts';

/** Preload the demo's real token sheets and fonts before any command runs. */
export function useLandingLanguage(languages: readonly Language[]) {
  const [slug, setSlug] = useState(OWN_LANGUAGE);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!languages.length) return;
    const controller = new AbortController();
    const style = document.createElement('style');
    style.dataset.nxLandingTokens = '';
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
    probe.setAttribute('aria-hidden', 'true');
    probe.textContent = 'nodex';

    async function prepare() {
      const sheets = await Promise.all(languages.map(async (language) => {
        const response = await fetch(tokensUrl(language), { signal: controller.signal });
        if (!response.ok) throw new Error('Language stylesheet unavailable');
        const css = await response.text();
        if (!css.includes(':root')) throw new Error('Language stylesheet has no token scope');
        // As on the language index, only rename the generated root selector.
        // A page-owned scope lets every switch happen in one paint and avoids
        // replacing the navigation's stylesheet while it is still downloading.
        return css.replace(':root', `[data-nx-landing-language="${language.slug}"]`);
      }));
      if (controller.signal.aborted) return;
      style.textContent = sheets.join('\n');
      document.head.appendChild(style);
      document.body.appendChild(probe);
      const fonts = new Set<string>();
      for (const language of languages) {
        probe.dataset.nxLandingLanguage = language.slug;
        for (const role of ['sans', 'mono', 'heading', 'ui']) {
          probe.style.fontFamily = `var(--nx-font-${role})`;
          for (const weight of [400, 700]) fonts.add(`${weight} 16px ${getComputedStyle(probe).fontFamily}`);
        }
      }
      await Promise.all([...fonts].map((font) => document.fonts.load(font, 'nodex')));
      if (!controller.signal.aborted) setStatus('ready');
    }

    void prepare().catch(() => {
      if (!controller.signal.aborted) setStatus('error');
    }).finally(() => probe.remove());

    return () => {
      controller.abort();
      probe.remove();
      style.remove();
      delete document.documentElement.dataset.nxLandingLanguage;
      document.documentElement.dataset.nxLanguage = OWN_LANGUAGE;
    };
  }, [languages]);

  const select = useCallback((next: string) => {
    if (status !== 'ready' || !languages.some((language) => language.slug === next)) return;
    document.documentElement.dataset.nxLandingLanguage = next;
    document.documentElement.dataset.nxLanguage = next;
    setSlug(next);
  }, [languages, status]);

  return { slug, status, select };
}
