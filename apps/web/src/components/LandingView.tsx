'use client';

import { useGSAP } from '@gsap/react';
import { ArrowRight } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { Preview } from '@/components/Preview.tsx';
import { usePrefersReducedMotion } from '@/lib/hooks.ts';
import {
  expressiveFor,
  loadCatalog,
  previewUrl,
  type Catalog,
} from '@/lib/registry.ts';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The marketing surface. Two scenes, and deliberately nothing after them.
 *
 * The name, then the work. Anything further belongs behind the sign-in, where
 * someone has already decided they are interested.
 *
 * Both scenes are shaped by the language they are written in rather than by
 * landing-page convention:
 *
 * 1. `DESIGN.md` says motion is quiet: marks draw once on arrival and then hold
 *    still, and nothing loops. So the run is scrubbed rather than looping, and
 *    nothing else on the page moves by itself.
 * 2. `DESIGN.md` says variance is restrained. The composition is plain and the
 *    interest is carried by live components rather than by layout tricks.
 *
 * Every visual is a running component from the registry. Not a screenshot, not
 * a drawing, and not a div dressed up as a product shot.
 */

/** One card in the horizontal run. Fixed, so the travel can be measured. */
const RUN_CARD_WIDTH = 380;
const RUN_CARD_HEIGHT = 260;
const RUN_LENGTH = 10;

export function LandingView() {
  const [catalog, setCatalog] = useState<Catalog>();
  const reduced = usePrefersReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  const language = catalog?.languages[0];

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  // Spread across the collection rather than the first ten alphabetically, so
  // the run shows how much the language's range actually varies.
  const runNames = useMemo(() => {
    if (!catalog || !language) return [];
    const all = expressiveFor(catalog, language.slug);
    if (all.length <= RUN_LENGTH) return all.map((item) => item.name);
    const step = Math.floor(all.length / RUN_LENGTH);
    return Array.from(
      { length: RUN_LENGTH },
      (_, i) => all[i * step]?.name,
    ).filter((name): name is string => Boolean(name));
  }, [catalog, language]);

  useGSAP(
    () => {
      if (reduced) return;
      // `from` rather than `set` plus `to`, so the finished state is what the
      // markup already renders. If this never runs the hero is simply there.
      gsap.from('[data-hero]', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power2.out',
      });
    },
    // Deliberately does not depend on the catalog: re-running when it lands
    // would replay the hero from zero in front of someone already reading it.
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <LanguageTheme />

      <header
        className="sticky top-0 z-10 backdrop-blur-[6px]"
        style={{
          background: 'color-mix(in oklab, var(--nx-bg, #F0EFEB) 88%, transparent)',
          borderBottom: 'var(--nx-hairline, 1px) solid var(--nx-grid, #DEDDD6)',
        }}
      >
        <div className="mx-auto flex h-[64px] max-w-[1400px] items-center px-6 lg:px-10">
          <Link
            href="/"
            className="text-[13px] font-extrabold tracking-[0.1em] uppercase no-underline"
            style={{ color: 'var(--nx-ink, #1C1C1A)' }}
          >
            nodex
          </Link>
          <Link href="/login" className="nx-btn nx-btn--outline ml-auto no-underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <Hero />
        <ComponentRun language={language?.slug} names={runNames} />
      </main>

      <footer
        className="mx-auto max-w-[1400px] px-6 pb-14 lg:px-10"
        style={{ color: 'var(--nx-muted, #8F8E88)' }}
      >
        <hr className="nx-rule nx-rule--faint" />
        <p className="mt-6 mb-0 text-[11.5px]">
          nodex. A component registry organised by design language.
        </p>
      </footer>
    </div>
  );
}

/**
 * Scene one is the name and almost nothing else.
 *
 * The wordmark is the whole composition, so it is set as display type rather
 * than as a logo: same face and same negative tracking as every heading in the
 * language, just very large.
 */
function Hero() {
  return (
    <section className="flex min-h-[calc(100dvh-64px)] flex-col justify-center pb-16">
      {/* Sized to fill the measure rather than to a guessed step. At this weight
          and tracking the word renders 2.63x its font size, so dividing the
          content width by that lands it on the margins at any viewport. The cap
          holds it there once the container stops growing at 1400. */}
      <h1
        data-hero
        className="m-0 leading-[0.86] font-extrabold tracking-[-0.055em]"
        style={{ fontSize: 'clamp(64px, calc((100vw - 5rem) / 2.63), 500px)' }}
      >
        nodex
      </h1>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
        <p
          data-hero
          className="m-0 max-w-[34ch] text-[14px] leading-[1.7]"
          style={{ color: 'var(--nx-muted, #8F8E88)' }}
        >
          Components that belong to a design language.
        </p>
        <Link
          href="/login"
          data-hero
          className="nx-btn nx-btn--solid no-underline"
        >
          Sign in
          <ArrowRight size={13} weight="bold" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/**
 * Scene two: the collection travels right to left as you scroll.
 *
 * Scrubbed, not looped. `DESIGN.md` forbids looping animation, and an
 * auto-scrolling marquee is a loop: it moves whether or not anyone is reading.
 * Tying the travel to scroll position means the run advances under the reader's
 * own hand and holds still the moment they stop, which is the same contract the
 * charts keep when they draw once on arrival.
 *
 * Under reduced motion the section does not pin at all. It becomes an ordinary
 * horizontally scrollable strip, so the components stay reachable rather than
 * being clipped off the right edge.
 */
function ComponentRun({
  language,
  names,
}: {
  language?: string;
  names: string[];
}) {
  const reduced = usePrefersReducedMotion();
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced || !wrap.current || !track.current || names.length === 0) {
        return;
      }

      // Against the section's own width, not the viewport's. The run is clipped
      // by the page container, so measuring against `innerWidth` would stop the
      // travel short and leave the last cards permanently off the right edge.
      // In a function so a resize recomputes it instead of baking in whatever
      // the width happened to be on first paint.
      const distance = () =>
        Math.max(
          0,
          track.current!.scrollWidth - (wrap.current?.clientWidth ?? 0),
        );

      gsap.to(track.current, {
        x: () => -distance(),
        // Required. Any other ease breaks the one to one mapping between scroll
        // position and horizontal position.
        ease: 'none',
        scrollTrigger: {
          trigger: wrap.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: wrap, dependencies: [reduced, names.length], revertOnUpdate: true },
  );

  return (
    <section
      ref={wrap}
      className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden"
    >
      <div className="pb-10">
        <h2 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]">
          One language, drawn all the way through.
        </h2>
      </div>

      {/* The reduced-motion fallback is a CSS variant, not a JS branch. Deciding
          it in JavaScript would make the server and client markup differ and
          trip hydration. Without the pan the track becomes an ordinary
          horizontal scroller, so every card stays reachable. */}
      <div
        className="flex gap-6 will-change-transform motion-reduce:overflow-x-auto motion-reduce:pb-4 motion-reduce:will-change-auto"
        ref={track}
      >
        {names.map((name) => (
          <figure
            key={name}
            className="m-0 shrink-0"
            style={{ width: RUN_CARD_WIDTH }}
          >
            {language ? (
              <Preview
                src={previewUrl(language, name, { bare: true })}
                title={name}
                boxHeight={RUN_CARD_HEIGHT}
              />
            ) : (
              <div style={{ height: RUN_CARD_HEIGHT }} />
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
