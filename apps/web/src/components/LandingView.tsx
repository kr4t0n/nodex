'use client';

import { useGSAP } from '@gsap/react';
import { ArrowRight } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { LandingTerminal } from '@/components/LandingTerminal.tsx';
import { Preview } from '@/components/Preview.tsx';
import { usePrefersReducedMotion } from '@/lib/hooks.ts';
import { useLandingLanguage } from '@/lib/landing-language.ts';
import {
  expressiveFor,
  loadCatalog,
  type Catalog,
  type Item,
  type Language,
} from '@/lib/registry.ts';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The marketing surface: the name, then the CLI alongside its rendered work.
 *
 * Anything further belongs behind the sign-in, where
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
/** Optical inset of Inter ExtraBold's leading n, in em. */
const MARK_LEFT_INSET = 0.056;
/** Gap between the wordmark and the row beneath it, in the hero. */
const HERO_ROW_GAP = 44;

/** One card in the run. Fixed, so the loop distance is exact. */
const RUN_CARD_WIDTH = 340;
const RUN_CARD_HEIGHT = 200;
const RUN_LENGTH = 8;
/** Seconds per card. The whole belt takes this times the card count. */
const RUN_SECONDS_PER_CARD = 6;
const NO_LANGUAGES: Language[] = [];

export function LandingView() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [catalogFailed, setCatalogFailed] = useState(false);
  const reduced = usePrefersReducedMotion();
  const landingLanguage = useLandingLanguage(catalog?.languages ?? NO_LANGUAGES);

  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const mark = useRef<HTMLHeadingElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const signIn = useRef<HTMLAnchorElement>(null);
  const barBg = useRef<HTMLDivElement>(null);

  const language = catalog?.languages.find((entry) => entry.slug === landingLanguage.slug);

  useEffect(() => {
    void loadCatalog().then(setCatalog).catch(() => setCatalogFailed(true));
  }, []);

  // Spread a large catalog across the run; repeat a small catalog so each
  // eight-slot pass still covers a wide viewport before the loop seam arrives.
  const runItems = useMemo(() => {
    if (!catalog || !language) return [];
    const all = expressiveFor(catalog, language.slug);
    if (all.length === 0) return [];
    const step = Math.max(1, Math.floor(all.length / RUN_LENGTH));
    return Array.from(
      { length: RUN_LENGTH },
      (_, i) => all[(i * step) % all.length],
    ).filter((item): item is Item => item !== undefined);
  }, [catalog, language]);

  /**
   * Scene one folds into the bar.
   *
   * Both travelling elements are laid out in their FINAL positions and pushed
   * back out to the hero, rather than the reverse. That keeps one element per
   * role instead of crossfading a hero copy into a bar copy, and it means the
   * bar is what renders if this never runs.
   *
   * The sign-in starts at the scaled wordmark's right edge, then travels back
   * to the page gutter as the wordmark folds into the bar. All travel uses
   * transforms, including this horizontal correction.
   */
  useGSAP(
    () => {
      if (!hero.current || !mark.current || !row.current || !signIn.current) return;

      const markElement = mark.current;
      const rowElement = row.current;

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
      // Keep fractional font metrics independent of the animation transforms.
      // A guessed text width drifts from the actual font and can overflow mobile.
      const markWidth = () =>
        Number.parseFloat(getComputedStyle(markElement).width);
      const heroSize = () =>
        Math.min(
          500,
          Math.max(64, (window.innerWidth - gutter()) * NAV_FONT / markWidth()),
        );
      const heroScale = () => heroSize() / NAV_FONT;
      const taglineX = () => heroSize() * MARK_LEFT_INSET;
      const signInX = () => markWidth() * heroScale() - rowElement.clientWidth;
      const markTop = () => (window.innerHeight - heroSize() * MARK_LEADING) / 2;
      const markY = () => markTop() - NAV_TOP;
      const rowY = () =>
        markTop() + heroSize() * MARK_LEADING + HERO_ROW_GAP - NAV_TOP;

      const toHero = () => {
        gsap.set(mark.current, { y: markY(), scale: heroScale() });
        gsap.set(row.current, { y: rowY() });
        gsap.set(signIn.current, { x: signInX() });
        gsap.set(tagline.current, { x: taglineX(), opacity: 1 });
        gsap.set(barBg.current, { opacity: 0 });
      };
      const toBar = () => {
        gsap.set(mark.current, { y: 0, scale: 1 });
        gsap.set(row.current, { y: 0 });
        gsap.set(signIn.current, { x: 0 });
        gsap.set(tagline.current, { x: NAV_FONT * MARK_LEFT_INSET, opacity: 0 });
        gsap.set(barBg.current, { opacity: 1 });
      };

      // Font loading can change the wordmark's intrinsic width after mounting.
      const markObserver = new ResizeObserver(() => ScrollTrigger.refresh());
      markObserver.observe(markElement);

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
          onRefresh: (trigger) => {
            if (trigger.scroll() >= trigger.start) toBar();
            else toHero();
          },
        });
        return () => markObserver.disconnect();
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero.current,
          start: 'top top',
          // Finishes well before scene one is fully gone, so the bar is
          // assembled before the terminal comes into view.
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
        .fromTo(signIn.current, { x: signInX }, { x: 0, ease: 'none' }, 0)
        .fromTo(
          tagline.current,
          { x: taglineX },
          { x: NAV_FONT * MARK_LEFT_INSET, ease: 'none' },
          0,
        )
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

      return () => markObserver.disconnect();
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
              'color-mix(in oklab, var(--nx-bg) 88%, transparent)',
          }}
        />

        <div
          className="relative mx-auto min-h-16 max-w-[1400px] px-6 lg:px-10"
          style={{ paddingTop: NAV_TOP }}
        >
          {/* Sized at rest and scaled up for the hero, so the travel is a pure
              transform. Setting a font size at each end and animating between
              them would relayout on every frame. */}
          <h1
            ref={mark}
            className="pointer-events-auto m-0 inline-block font-[number:var(--nx-type-pageTitle-weight)] tracking-[-0.045em]"
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
              className="m-0 text-[length:var(--nx-type-body-taglineSize)] leading-[1.7] sm:whitespace-nowrap"
              style={{ color: 'var(--nx-muted)' }}
            >
              Components that belong to a design language.
            </p>
            <Link
              ref={signIn}
              href="/login"
              className="nx-btn nx-btn--solid pointer-events-auto ml-auto shrink-0 no-underline"
            >
              Sign in
              <ArrowRight size={13} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Scene one is empty on purpose: the bar above is drawn over it, and this
            is the scroll distance the fold happens across. */}
        <section ref={hero} className="min-h-[100dvh]" />

        <LandingTerminal
          languages={catalog?.languages ?? NO_LANGUAGES}
          activeLanguage={landingLanguage.slug}
          status={catalogFailed ? 'error' : landingLanguage.status}
          onLanguageChange={landingLanguage.select}
        >
          <ComponentBelt items={runItems} />
        </LandingTerminal>
      </main>

      <footer
        className="mx-auto max-w-[1400px] px-6 pb-14 lg:px-10"
        style={{ color: 'var(--nx-muted)' }}
      >
        <hr className="nx-rule nx-rule--faint" />
        <p className="mt-6 mb-0 text-[length:var(--nx-type-body-detailSize)]">
          nodex. A component registry organised by design language.
        </p>
      </footer>
    </div>
  );
}

/**
 * The selected language's collection travels beneath the terminal in scene two.
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
  items,
}: {
  items: Item[];
}) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!mounted) {
        // Wait until the belt itself is near so lazy example modules and their
        // chart runtime stay out of the opening hero.
        const trigger = ScrollTrigger.create({
          trigger: wrap.current,
          start: 'top 120%',
          once: true,
          onEnter: () => setMounted(true),
        });
        if (trigger.scroll() >= trigger.start) setMounted(true);
        return;
      }
      if (reduced || !track.current || items.length === 0) return;
      gsap.to(track.current, {
        xPercent: -50,
        ease: 'none',
        duration: items.length * RUN_SECONDS_PER_CARD,
        repeat: -1,
      });
    },
    { scope: wrap, dependencies: [reduced, items.length, mounted], revertOnUpdate: true },
  );

  /**
   * Each pass is its own flex row carrying a trailing gap, so both halves are
   * byte-for-byte the same width. Laying all the cards out in one row instead
   * would make the halves differ by exactly one gap, and the belt would jump
   * that much on every cycle.
   */
  const passes = [0, 1];

  return (
    <section aria-label="Component previews" className="w-full min-w-0">

      {/* The fallback is a CSS variant, not a JS branch: choosing it in
          JavaScript would make the server and client markup differ and trip
          hydration. */}
      <div
        ref={wrap}
        className="overflow-hidden motion-reduce:overflow-x-auto"
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
              {items.map((item, index) => (
                <figure
                  key={`${pass}-${index}-${item.name}`}
                  className="m-0 shrink-0"
                  style={{ width: RUN_CARD_WIDTH, height: RUN_CARD_HEIGHT }}
                >
                  {mounted && <Preview
                    item={item}
                    language={item.meta.language}
                    boxHeight={RUN_CARD_HEIGHT}
                  />}
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
