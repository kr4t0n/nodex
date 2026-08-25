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
 * Scene one has no navigation. The wordmark and the sign-in ARE the navigation:
 * they start as the composition and travel into the corners as the scene is
 * pushed away, so the bar is assembled out of the hero rather than fading in
 * over it. There is only ever one of each element on the page.
 */

/** The wordmark at rest, in the bar. Everything else is derived from it. */
const NAV_FONT = 16;
const NAV_TOP = 20;
/** Matches the h1 line-height, so the hero centring maths knows the box. */
const MARK_LEADING = 0.86;
/** Gap between the wordmark and the row beneath it, in the hero. */
const HERO_ROW_GAP = 44;

/** One card in the run. Fixed, so the loop distance is exact. */
const RUN_CARD_WIDTH = 380;
const RUN_CARD_HEIGHT = 260;
const RUN_LENGTH = 8;
/** Seconds per card. The whole belt takes this times the card count. */
const RUN_SECONDS_PER_CARD = 6;

export function LandingView() {
  const [catalog, setCatalog] = useState<Catalog>();
  const reduced = usePrefersReducedMotion();

  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const mark = useRef<HTMLHeadingElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const barBg = useRef<HTMLDivElement>(null);

  const language = catalog?.languages[0];

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  // Spread across the collection rather than the first few alphabetically, so
  // the belt shows how much the language's range actually varies.
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

  /**
   * Scene one folds into the bar.
   *
   * Both travelling elements are laid out in their FINAL positions and pushed
   * back out to the hero, rather than the reverse. That keeps one element per
   * role instead of crossfading a hero copy into a bar copy, and it means the
   * bar is what renders if this never runs.
   *
   * Only y and scale change. The wordmark is left-aligned and the sign-in is
   * right-aligned to the same page gutter in both states, so there is no
   * horizontal travel to get wrong at any viewport.
   */
  useGSAP(
    () => {
      if (!hero.current || !mark.current || !row.current) return;

      /**
       * How far scene one is pushed before the bar is assembled. Shared by both
       * paths so the reduced-motion jump cut lands at exactly the point the
       * scrub would have finished.
       *
       * Capped in absolute pixels as well as scaled to the viewport: on a tall
       * screen two thirds of the viewport can exceed the page's whole
       * scrollable height, and the fold would then never reach its end state.
       */
      const foldDistance = () =>
        Math.round(Math.min(560, window.innerHeight * 0.66));

      const gutter = () => (window.innerWidth >= 1024 ? 80 : 48);
      const heroSize = () =>
        Math.min(500, Math.max(64, (window.innerWidth - gutter()) / 2.63));
      const heroScale = () => heroSize() / NAV_FONT;
      const markTop = () => (window.innerHeight - heroSize() * MARK_LEADING) / 2;
      const markY = () => markTop() - NAV_TOP;
      const rowY = () =>
        markTop() + heroSize() * MARK_LEADING + HERO_ROW_GAP - NAV_TOP;

      const toHero = () => {
        gsap.set(mark.current, { y: markY(), scale: heroScale() });
        gsap.set(row.current, { y: rowY() });
        gsap.set(tagline.current, { opacity: 1 });
        gsap.set(barBg.current, { opacity: 0 });
      };
      const toBar = () => {
        gsap.set(mark.current, { y: 0, scale: 1 });
        gsap.set(row.current, { y: 0 });
        gsap.set(tagline.current, { opacity: 0 });
        gsap.set(barBg.current, { opacity: 1 });
      };

      if (reduced) {
        // A jump cut rather than a scrub. The layout still has to change, or the
        // wordmark would sit at display size over scene two, but nothing about
        // it is continuous.
        toHero();
        ScrollTrigger.create({
          // A scroll position rather than an element edge, so it fires exactly
          // where the scrub would have completed.
          start: foldDistance,
          end: 'max',
          onEnter: toBar,
          onLeaveBack: toHero,
        });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero.current,
          start: 'top top',
          // Finishes well before scene one is fully gone, so the bar is
          // assembled before the belt rises into view.
          end: () => `+=${foldDistance()}`,
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      // Function values, so a resize re-resolves them rather than keeping
      // whatever the viewport happened to be on first paint.
      tl.fromTo(
        mark.current,
        { y: markY, scale: heroScale },
        { y: 0, scale: 1, ease: 'none' },
        0,
      )
        .fromTo(row.current, { y: rowY }, { y: 0, ease: 'none' }, 0)
        .fromTo(
          tagline.current,
          { opacity: 1 },
          { opacity: 0, ease: 'none', duration: 0.45 },
          0,
        )
        .fromTo(
          barBg.current,
          { opacity: 0 },
          { opacity: 1, ease: 'none', duration: 0.35 },
          0.55,
        );
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <LanguageTheme />

      {/*
        No border, at any point. The bar is separated from the page by the
        backdrop that fades in behind it, not by a rule.
      */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20">
        <div
          ref={barBg}
          className="absolute inset-0 backdrop-blur-[6px]"
          style={{
            background:
              'color-mix(in oklab, var(--nx-bg, #F0EFEB) 88%, transparent)',
          }}
        />

        <div
          className="relative mx-auto max-w-[1400px] px-6 lg:px-10"
          style={{ paddingTop: NAV_TOP }}
        >
          {/* Sized at rest and scaled up for the hero, so the travel is a pure
              transform. Setting a font size at each end and animating between
              them would relayout on every frame. */}
          <h1
            ref={mark}
            className="pointer-events-auto m-0 inline-block font-extrabold tracking-[-0.045em]"
            style={{
              fontSize: NAV_FONT,
              lineHeight: MARK_LEADING,
              transformOrigin: 'left top',
            }}
          >
            nodex
          </h1>

          {/* Fixed height on purpose. Letting the tagline size this row would
              make the sign-in's resting position depend on whether the tagline
              wrapped to two lines, so the bar would sit differently at different
              viewports. The tagline overflows the row instead, which is
              invisible: nothing sits under it in the hero. */}
          <div
            ref={row}
            className="absolute inset-x-6 flex h-8 items-center justify-between gap-8 lg:inset-x-10"
            style={{ top: NAV_TOP - 3 }}
          >
            <p
              ref={tagline}
              className="m-0 max-w-[34ch] text-[14px] leading-[1.7]"
              style={{ color: 'var(--nx-muted, #8F8E88)' }}
            >
              Components that belong to a design language.
            </p>
            <Link
              href="/login"
              className="nx-btn nx-btn--solid pointer-events-auto ml-auto no-underline"
            >
              Sign in
              <ArrowRight size={13} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* Scene one is empty on purpose: the bar above is drawn over it, and this
          is the scroll distance the fold happens across. */}
      <section ref={hero} className="min-h-[100dvh]" />

      <ComponentBelt language={language?.slug} names={runNames} />

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
 * Scene two: the collection travels right to left on its own.
 *
 * This loops, which `DESIGN.md` forbids for components in the language. It is a
 * deliberate, owner-approved exception scoped to this page: the rule governs
 * what the registry ships, and nothing here is shipped to anyone. Do not take it
 * as licence to loop anything inside `registry/`.
 *
 * The belt renders the set twice and travels exactly half its width, so the
 * second copy is under the cursor at the moment the first would run out and the
 * seam never shows. Under reduced motion it does not move at all and becomes an
 * ordinary horizontal scroller.
 */
function ComponentBelt({
  language,
  names,
}: {
  language?: string;
  names: string[];
}) {
  const reduced = usePrefersReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced || !track.current || names.length === 0) return;
      gsap.to(track.current, {
        xPercent: -50,
        ease: 'none',
        duration: names.length * RUN_SECONDS_PER_CARD,
        repeat: -1,
      });
    },
    { scope: wrap, dependencies: [reduced, names.length], revertOnUpdate: true },
  );

  /**
   * Each pass is its own flex row carrying a trailing gap, so both halves are
   * byte-for-byte the same width. Laying all the cards out in one row instead
   * would make the halves differ by exactly one gap, and the belt would jump
   * that much on every cycle.
   */
  const passes = [0, 1];

  return (
    // A full scene, not a strip. It also guarantees the page is long enough for
    // the fold above to reach its end state.
    <section className="flex min-h-[100dvh] flex-col justify-center overflow-hidden py-24">
      <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <h2 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]">
          One language, drawn all the way through.
        </h2>
      </div>

      {/* The fallback is a CSS variant, not a JS branch: choosing it in
          JavaScript would make the server and client markup differ and trip
          hydration. */}
      <div
        ref={wrap}
        className="mt-12 overflow-hidden motion-reduce:overflow-x-auto"
      >
        <div ref={track} className="flex w-max">
          {passes.map((pass) => (
            <div
              key={pass}
              className="flex gap-6 pr-6"
              // The second pass is duplication for the seam, not content.
              // Announcing every chart twice only makes the page longer to
              // listen to.
              aria-hidden={pass === 1}
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
          ))}
        </div>
      </div>
    </section>
  );
}
