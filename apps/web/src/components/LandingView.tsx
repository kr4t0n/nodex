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
/** Gap between the wordmark and the row beneath it, in the hero. */
const HERO_ROW_GAP = 44;
/** The bar's row starts this far above the wordmark, to share its baseline. */
const ROW_LIFT = 3;
/** Font size for drawing a glyph to find its ink, in px. 1px is 1/400 em. */
const INK_MEASURE_SIZE = 400;
/** Alpha above which a drawn pixel counts as ink, as in a screenshot. */
const INK_ALPHA = 64;

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
  const landingLanguage = useLandingLanguage(
    catalog?.languages ?? NO_LANGUAGES,
  );

  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const mark = useRef<HTMLHeadingElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const signIn = useRef<HTMLAnchorElement>(null);
  const barBg = useRef<HTMLDivElement>(null);

  const language = catalog?.languages.find(
    (entry) => entry.slug === landingLanguage.slug,
  );

  useEffect(() => {
    void loadCatalog()
      .then(setCatalog)
      .catch(() => setCatalogFailed(true));
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
      if (!hero.current || !mark.current || !row.current || !signIn.current)
        return;

      const markElement = mark.current;
      const rowElement = row.current;
      const signInElement = signIn.current;
      const canvas = document.createElement('canvas');
      canvas.width = INK_MEASURE_SIZE * 2;
      canvas.height = INK_MEASURE_SIZE * 2;
      const measure = canvas.getContext('2d', { willReadFrequently: true });
      /**
       * One glyph's painted extent and advance, in em from its origin.
       *
       * Drawn and scanned rather than read from `actualBoundingBox*`: at
       * large sizes Chromium reports Inter's n about 0.01em wider than it
       * paints, which shifted the hero and its tagline by several pixels.
       */
      const glyphInk = (context: CanvasRenderingContext2D, glyph: string) => {
        const size = INK_MEASURE_SIZE;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillText(glyph, size / 2, size * 1.5);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        const inked = (column: number) => {
          for (let row = 0; row < canvas.height; row++)
            if (pixels[(row * canvas.width + column) * 4 + 3]! > INK_ALPHA)
              return true;
          return false;
        };
        let left = 0;
        while (left < canvas.width && !inked(left)) left++;
        let right = canvas.width;
        while (right > left && !inked(right - 1)) right--;
        return {
          left: (left - size / 2) / size,
          right: (right - size / 2) / size,
          advance: context.measureText(glyph).width / size,
        };
      };

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

      /**
       * Where the glyphs actually paint at bar size, in px from the box's left.
       *
       * The hero magnifies the bar layout twenty to thirty times, so the box
       * is the wrong thing to centre: the leading n's side bearing sits inside
       * it and the x's ink runs past the trailing negative tracking, by amounts
       * that differ per language font. The box keeps the browser's real
       * advances; the canvas only supplies each end glyph's overhang.
       */
      // Every function value reads the ink, so draw only when the font changes.
      let inkCache:
        | {
            key: string;
            first: ReturnType<typeof glyphInk>;
            last: ReturnType<typeof glyphInk>;
          }
        | undefined;
      const markInk = () => {
        const style = getComputedStyle(markElement);
        const width = Number.parseFloat(style.width);
        const text = markElement.textContent ?? '';
        if (!measure || !text) return { left: 0, right: width };
        // Canvas rounds small text metrics to whole pixels too, so measure
        // large and scale back down.
        const em = Number.parseFloat(style.fontSize);
        const font = `${style.fontStyle} ${style.fontWeight} ${INK_MEASURE_SIZE}px ${style.fontFamily}`;
        // The same font string names the fallback until the webfont loads.
        const key = `${font}|${text}|${document.fonts.check(font, text)}`;
        if (inkCache?.key !== key) {
          measure.font = font;
          inkCache = {
            key,
            first: glyphInk(measure, text.at(0)!),
            last: glyphInk(measure, text.at(-1)!),
          };
        }
        const { first, last } = inkCache;
        const tracking = Number.parseFloat(style.letterSpacing) || 0;
        // The last glyph's ink beyond the box: its own overhang past its
        // advance, plus the trailing tracking the box already gave back.
        return {
          left: first.left * em,
          right: width + (last.right - last.advance) * em - tracking,
        };
      };
      // The header is laid out in the client width, which excludes a classic
      // scrollbar; innerWidth includes it and would push the x underneath one.
      const viewportWidth = () => document.documentElement.clientWidth;
      const gutter = () =>
        Number.parseFloat(
          getComputedStyle(markElement.parentElement!).paddingLeft,
        );
      // The mark's untransformed left edge on screen. Wide screens centre
      // the bar's container, so this is not always the gutter.
      const markOrigin = () =>
        markElement.parentElement!.getBoundingClientRect().left + gutter();
      // Below the wordmark: the gap, then the row, whose tagline and action can
      // overflow its fixed height in some languages.
      const heroRowExtent = () =>
        HERO_ROW_GAP - ROW_LIFT + rowElement.scrollHeight;
      const heroSize = () => {
        const ink = markInk();
        const byWidth =
          ((viewportWidth() - gutter() * 2) * NAV_FONT) /
          (ink.right - ink.left);
        // Short screens: the wordmark and its row must fit between the bar's
        // inset above and the same inset below.
        const byHeight =
          (window.innerHeight - NAV_TOP * 2 - heroRowExtent()) / MARK_LEADING;
        return Math.min(byWidth, 500, Math.max(64, byHeight));
      };
      const heroScale = () => heroSize() / NAV_FONT;
      // Centre the painted glyphs, not the box, in the visible width.
      const markX = () => {
        const ink = markInk();
        const scale = heroScale();
        return (
          (viewportWidth() - (ink.right - ink.left) * scale) / 2 -
          markOrigin() -
          ink.left * scale
        );
      };
      // The tagline and the sign-in hang from the wordmark's painted edges.
      const taglineX = () => markX() + markInk().left * heroScale();
      const barTaglineX = () => markInk().left;
      const signInX = () =>
        markX() + markInk().right * heroScale() - rowElement.clientWidth;
      // Centred, unless that would push the row below the bottom inset.
      const markTop = () => {
        const height = heroSize() * MARK_LEADING;
        return Math.min(
          (window.innerHeight - height) / 2,
          window.innerHeight - NAV_TOP - heroRowExtent() - height,
        );
      };
      const markY = () => markTop() - NAV_TOP;
      const rowY = () =>
        markTop() + heroSize() * MARK_LEADING + HERO_ROW_GAP - NAV_TOP;
      // Share a text baseline in the hero, then retain the action's original
      // navbar center regardless of its language's padding and font metrics.
      const barRowY = () => {
        const rowBounds = rowElement.getBoundingClientRect();
        const actionBounds = signInElement.getBoundingClientRect();
        return (
          rowBounds.top +
          rowBounds.height / 2 -
          actionBounds.top -
          actionBounds.height / 2
        );
      };

      const toHero = () => {
        gsap.set(mark.current, { x: markX(), y: markY(), scale: heroScale() });
        gsap.set(row.current, { y: rowY() });
        gsap.set(signIn.current, { x: signInX() });
        gsap.set(tagline.current, { x: taglineX(), opacity: 1 });
        gsap.set(barBg.current, { opacity: 0 });
      };
      const toBar = () => {
        gsap.set(mark.current, { x: 0, y: 0, scale: 1 });
        gsap.set(row.current, { y: barRowY() });
        gsap.set(signIn.current, { x: 0 });
        gsap.set(tagline.current, { x: barTaglineX(), opacity: 0 });
        gsap.set(barBg.current, { opacity: 1 });
      };

      // Font loading changes both the wordmark width and the action's metrics.
      // The row follows the client width, so a scrollbar appearing without a
      // window resize also re-measures the hero.
      const layoutObserver = new ResizeObserver(() => ScrollTrigger.refresh());
      layoutObserver.observe(markElement);
      layoutObserver.observe(signInElement);
      layoutObserver.observe(rowElement);

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
        return () => layoutObserver.disconnect();
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
        { x: markX, y: markY, scale: heroScale },
        { x: 0, y: 0, scale: 1, ease: 'none' },
        0,
      )
        .fromTo(row.current, { y: rowY }, { y: barRowY, ease: 'none' }, 0)
        .fromTo(signIn.current, { x: signInX }, { x: 0, ease: 'none' }, 0)
        .fromTo(
          tagline.current,
          { x: taglineX },
          { x: barTaglineX, ease: 'none' },
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

      return () => layoutObserver.disconnect();
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
            background: 'color-mix(in oklab, var(--nx-bg) 88%, transparent)',
          }}
        />

        <div
          className="relative mx-auto min-h-16 max-w-[1400px] px-6 lg:px-10"
          style={{ paddingTop: NAV_TOP }}
        >
          {/* Sized at rest and scaled up for the hero, so the travel is a pure
              transform. Setting a font size at each end and animating between
              them would relayout on every frame. Geometric precision keeps the
              16px layout's glyph advances fractional: hinted whole-pixel
              advances, magnified to hero size, put each letter up to a pixel
              times the scale away from where the font draws it. */}
          <h1
            ref={mark}
            className="pointer-events-auto m-0 inline-block font-[number:var(--nx-type-pageTitle-weight)] tracking-[-0.045em] [text-rendering:geometricPrecision]"
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
              viewports. Their first text baselines align even when the tagline
              wraps or the language gives the action different text metrics. */}
          <div
            ref={row}
            className="absolute inset-x-6 flex h-8 items-baseline justify-between gap-8 lg:inset-x-10"
            style={{ top: NAV_TOP - ROW_LIFT }}
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
function ComponentBelt({ items }: { items: Item[] }) {
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
    {
      scope: wrap,
      dependencies: [reduced, items.length, mounted],
      revertOnUpdate: true,
    },
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
      <div ref={wrap} className="overflow-hidden motion-reduce:overflow-x-auto">
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
                  {mounted && (
                    <Preview
                      item={item}
                      language={item.meta.language}
                      boxHeight={RUN_CARD_HEIGHT}
                    />
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
