'use client';

import { useEffect, useRef, useState } from 'react';

import { tokensUrl } from './registry.ts';

/**
 * Swap the active language's token layer.
 *
 * This is what makes the shell re-theme: every colour, face, radius, and
 * hairline in the app resolves through `--nx-*`, so replacing one stylesheet
 * restyles the entire interface. It also dogfoods the token system, since a
 * broken primitive is immediately visible in the app's own chrome.
 */
/**
 * Applies several languages' token layers at once, each scoped to its own
 * subtree, so more than one can be shown honestly on the same page.
 *
 * `useLanguageTokens` swaps a single `:root` layer for the whole document. That
 * is right on a page showing one language and impossible on the index, where
 * several sit on screen together and the last one loaded would win.
 *
 * The generated `tokens.css` is one `:root` block and nothing else, so
 * re-pointing that selector at an attribute produces the same values bound to
 * an element instead of the document. Deliberately a rename of the build's own
 * output rather than a second artifact or a client-side reimplementation of its
 * flattening: there is no third place for the two to drift apart.
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

    void Promise.all(
      key.split(',').map(async (slug) => {
        try {
          const res = await fetch(tokensUrl(slug));
          if (!res.ok) return '';
          const css = await res.text();
          // Skip rather than inject. A template that stopped emitting `:root`
          // would otherwise ship one language unscoped, and it would silently
          // override every other language on the page.
          if (!css.includes(':root')) return '';
          return css.replace(':root', `[data-nx-scope="${slug}"]`);
        } catch {
          return '';
        }
      }),
    ).then((sheets) => {
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
    };
  }, [key]);

  return ready;
}

export function useLanguageTokens(slug: string | undefined): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const ID = 'nx-language-tokens';
    let link = document.getElementById(ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const href = tokensUrl(slug);
    if (link.getAttribute('href') === href) {
      setReady(true);
      return;
    }
    setReady(false);
    const onLoad = () => setReady(true);
    link.addEventListener('load', onLoad, { once: true });
    link.setAttribute('href', href);
    document.documentElement.dataset.nxLanguage = slug;
    return () => link?.removeEventListener('load', onLoad);
  }, [slug]);

  return ready;
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
 * Mount only once the element is near the viewport.
 *
 * Seventy live iframes at once would be untenable, and each preview loads its
 * own fonts and possibly ECharts.
 *
 * The timeout is not belt-and-braces, it is load-bearing. IntersectionObserver
 * callbacks do not fire in a tab that is never painted, which includes
 * background tabs, some headless and embedded contexts, and screenshot tooling.
 * Gating solely on the observer means those environments show an empty page
 * forever, with no error to explain it. The fallback mounts anyway, and the
 * iframes' native `loading="lazy"` still defers the actual network work, so
 * nothing is lost by being less clever here.
 */
export function useNearViewport<T extends Element>(
  rootMargin = '300px',
  fallbackMs = 1500,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);

    const timer = window.setTimeout(() => setNear(true), fallbackMs);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [near, rootMargin, fallbackMs]);

  return [ref, near];
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
