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
 * Gating solely on the observer means those environments show an empty gallery
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

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
