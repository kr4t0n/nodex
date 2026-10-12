'use client';

import { useEffect, useState } from 'react';

import { loadCatalog, tokensUrl } from './registry.ts';
import {
  scopeTokenCss,
  type TokenMode,
} from '../../../../packages/cli/src/tokens.ts';

/**
 * Applies several languages' token layers at once, each scoped to its own
 * subtree, so more than one can be shown honestly on the same page.
 *
 * `useLanguageTokens` swaps the token layer for the whole document. That
 * is right on a page showing one language and impossible on the index, where
 * several sit on screen together and the last one loaded would win.
 *
 * Retarget all generated mode rules together, keeping embedded font faces.
 * No browser-side flattening or independently maintained token stylesheet.
 *
 * Custom properties inherit, but inherited *values* do not re-resolve. An
 * element inside the scope still shows the document's colour unless it declares
 * `color: var(--nx-ink)` itself, because `body` already resolved that var
 * against `:root`. Scoped subtrees must restate the properties they want.
 */
export function useScopedLanguageTokens(slugs: string[]): boolean {
  const [ready, setReady] = useState(false);
  // Joined, so the effect keys on the contents rather than the array identity.
  const key = slugs.join(',');

  useEffect(() => {
    if (!key) return;
    let live = true;
    const ID = 'nx-scoped-language-tokens';

    void loadCatalog()
      .then((catalog) =>
        Promise.all(
          key.split(',').map(async (slug) => {
            try {
              const language = catalog.languages.find(
                (entry) => entry.slug === slug,
              );
              if (!language) return '';
              const res = await fetch(tokensUrl(language));
              if (!res.ok) return '';
              const css = await res.text();
              return scopeTokenCss(css, slug, `[data-nx-scope="${slug}"]`);
            } catch {
              return '';
            }
          }),
        ),
      )
      .then((sheets) => {
        if (!live) return;
        let style = document.getElementById(ID);
        if (!style) {
          style = document.createElement('style');
          style.id = ID;
          document.head.appendChild(style);
        }
        style.textContent = sheets.filter(Boolean).join('\n');
        // Ready even when every fetch failed. This decides whether the page
        // renders at all, and a tile with no scoped layer inherits the document's
        // instead — the old behaviour, which is a far better outcome than an
        // index stuck on its loading state.
        setReady(true);
      });

    return () => {
      live = false;
      // Index-only scopes must not reset dark specimens after navigation.
      document.getElementById(ID)?.remove();
    };
  }, [key]);

  return ready;
}

export function useLanguageTokens(
  slug: string | undefined,
  mode: TokenMode = 'light',
): boolean {
  const [readySlug, setReadySlug] = useState<string>();

  useEffect(() => {
    if (!slug) return;
    let live = true;
    let link: HTMLLinkElement | null = null;
    let supportedMode: TokenMode = 'light';
    const onLoad = () => {
      if (!live) return;
      document.documentElement.dataset.nxLanguage = slug;
      document.documentElement.dataset.nxMode = supportedMode;
      setReadySlug(slug);
    };

    void loadCatalog().then((catalog) => {
      if (!live) return;
      const language = catalog.languages.find((entry) => entry.slug === slug);
      // Let the view report an unknown language instead of waiting on a token
      // URL that does not exist in the manifest.
      if (!language) {
        setReadySlug(slug);
        return;
      }
      const id = 'nx-language-tokens';
      link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      const href = tokensUrl(language);
      supportedMode = language.modes?.some((entry) => entry === mode)
        ? mode
        : 'light';
      if (link.getAttribute('href') === href && link.sheet) {
        onLoad();
        return;
      }
      link.addEventListener('load', onLoad, { once: true });
      link.setAttribute('href', href);
    });

    return () => {
      live = false;
      link?.removeEventListener('load', onLoad);
    };
  }, [slug, mode]);

  return slug !== undefined && readySlug === slug;
}

/** Route-local selection; changing it never keys or replaces a specimen tree. */
export function useLanguageMode(slug: string) {
  const [selection, setSelection] = useState<{ slug: string; mode: TokenMode }>(
    { slug, mode: 'light' },
  );
  const mode = selection.slug === slug ? selection.mode : 'light';
  const selectMode = (next: TokenMode) => {
    document.documentElement.dataset.nxMode = next;
    setSelection({ slug, mode: next });
  };
  return { mode, selectMode };
}

/** Fetch text once per URL, with loading and error states surfaced. */
export function useText(url: string | undefined): {
  text: string | undefined;
  error: string | undefined;
} {
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!url) return;
    let live = true;
    setText(undefined);
    setError(undefined);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      })
      .then((value) => {
        if (live) setText(value);
      })
      .catch((cause: unknown) => {
        if (live) setError(cause instanceof Error ? cause.message : 'failed');
      });
    return () => {
      live = false;
    };
  }, [url]);

  return { text, error };
}

/**
 * Starts `false` on both server and client, then corrects in an effect.
 *
 * Reading `matchMedia` in the initial state looks better but is a server and
 * client branch: the server has no media query and renders `false`, a reader who
 * asked for less motion hydrates as `true`, and React reports a hydration
 * mismatch. Correcting after mount costs one frame and keeps the two renders
 * identical.
 *
 * Anything whose MARKUP differs under reduced motion should use the CSS
 * `motion-reduce:` variant instead of this hook, for the same reason.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
