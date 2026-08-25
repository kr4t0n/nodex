'use client';

import { useGSAP } from '@gsap/react';
import { ArrowRight } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { CommandRow } from '@/components/Chrome.tsx';
import { LanguageTheme } from '@/components/LanguageTheme.tsx';
import { Preview } from '@/components/Preview.tsx';
import { usePrefersReducedMotion } from '@/lib/hooks.ts';
import {
  loadCatalog,
  previewUrl,
  primitivePreviewUrl,
  tokensJsonUrl,
  type Catalog,
} from '@/lib/registry.ts';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The marketing surface.
 *
 * Two rules shape every decision here, and both come from the language this
 * page is written in rather than from landing-page convention:
 *
 * 1. `DESIGN.md` says motion is quiet: marks draw once on arrival, then hold
 *    still, and nothing loops or animates on hover. So this page reveals on
 *    scroll and then stops. No marquee, no parallax, no perpetual anything.
 * 2. `DESIGN.md` says variance is restrained: a predictable grid, with the
 *    interest in the marks. So the asymmetry is mild and the real visual
 *    interest is carried by live components rather than by layout tricks.
 *
 * Every visual on this page is a running component from the registry, not a
 * screenshot and not a drawing. That is the honest thing to show, and it is also
 * the strongest argument the product has.
 */

/** Reserved so the hero does not reflow when the catalog arrives. */
const HERO_PREVIEW_HEIGHT = 340;
const TILE_PREVIEW_HEIGHT = 210;

interface Tokens {
  ramp?: { steps?: string[] };
  stroke?: { scale?: string[] };
}

export function LandingView() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [tokens, setTokens] = useState<Tokens>();
  const reduced = usePrefersReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  const language = catalog?.languages[0];
  const featured = language?.featured ?? [];

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    if (!language) return;
    void fetch(tokensJsonUrl(language.slug))
      .then((res) => res.json() as Promise<Tokens>)
      .then(setTokens)
      .catch(() => undefined);
  }, [language]);

  useGSAP(
    () => {
      if (reduced) return;

      // Hero: `from` rather than `set` plus `to`, so the finished state is what
      // the markup already renders. If this never runs the hero is simply there.
      gsap.from('[data-hero]', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power2.out',
      });

      // Sections arrive as they are reached, which is the same rule the charts
      // themselves follow. Hidden from JS rather than from CSS, so no-JS and
      // reduced-motion readers get the full page rather than a blank one.
      const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      gsap.set(blocks, { opacity: 0, y: 20 });
      ScrollTrigger.batch(blocks, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
            overwrite: true,
          }),
      });
    },
    // Deliberately does NOT depend on the catalog. Every animated element is in
    // the first render; only the previews inside them arrive later. Re-running
    // on load would replay the hero from zero and re-hide sections the reader
    // has already seen.
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  // The previews change how tall the page is, and ScrollTrigger measured it
  // before they existed. Without this the reveal points drift down the page.
  useEffect(() => {
    if (!catalog) return;
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => window.clearTimeout(id);
  }, [catalog]);

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
        <Hero language={language?.slug} component={featured[0]} />
        <TheSplit language={language?.slug} component={featured[1]} />
        <WhatALanguageCarries
          tokens={tokens}
          language={language?.slug}
          component={featured[2]}
        />
        <ForYourAgent language={language?.slug} component={featured[0]} />
        <Close />
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

function Hero({
  language,
  component,
}: {
  language?: string;
  component?: string;
}) {
  return (
    <section className="grid grid-cols-1 gap-12 pt-14 pb-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16 lg:pt-24">
      <div className="min-w-0">
        <h1
          data-hero
          className="m-0 text-[38px] leading-[1.03] font-extrabold tracking-[-0.04em] sm:text-[48px] lg:text-[54px]"
        >
          A chart is not a button with a theme.
        </h1>
        <p
          data-hero
          className="mt-6 mb-0 max-w-[46ch] text-[14px] leading-[1.75]"
          style={{ color: 'var(--nx-muted, #8F8E88)' }}
        >
          Most libraries theme one set of components. nodex ships design
          languages: tokens, written rules, and the components built for them.
        </p>
        <div data-hero className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/login" className="nx-btn nx-btn--solid no-underline">
            Sign in
            <ArrowRight size={13} weight="bold" aria-hidden />
          </Link>
          <a href="#how" className="nx-btn nx-btn--quiet no-underline">
            How it works
          </a>
        </div>
      </div>

      {/* The product, running. Height is reserved so the arrival of the catalog
          does not shove the headline around. */}
      <div
        data-hero
        className="min-w-0"
        style={{ minHeight: HERO_PREVIEW_HEIGHT }}
      >
        {language && component ? (
          <Preview
            src={previewUrl(language, component, { bare: true })}
            title="A chart from the mono-editorial language"
            boxHeight={HERO_PREVIEW_HEIGHT}
          />
        ) : null}
      </div>
    </section>
  );
}

function TheSplit({
  language,
  component,
}: {
  language?: string;
  component?: string;
}) {
  return (
    <section id="how" className="scroll-mt-20 pt-8 pb-24">
      <hr className="nx-rule" />
      <div data-reveal className="max-w-[54ch] pt-12">
        <h2 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]">
          A button is a button everywhere. A chart is not.
        </h2>
        <p
          className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
          style={{ color: 'var(--nx-muted, #8F8E88)' }}
        >
          Paint can be re-themed. Geometry cannot. A hairline chart drawing one
          mark per record will not re-skin into a thick bar brutalist one,
          because the design language already decided its shape. So nodex splits
          the two: primitives are shared and wear your tokens, while charts
          belong to the language that drew them.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8">
        <figure data-reveal className="m-0 min-w-0">
          <div className="min-w-0" style={{ minHeight: TILE_PREVIEW_HEIGHT }}>
            {language ? (
              <Preview
                src={primitivePreviewUrl('button', language)}
                title="The button primitive"
                fluid
              />
            ) : null}
          </div>
          <figcaption
            className="mt-5 text-[12px] leading-[1.7]"
            style={{ color: 'var(--nx-muted, #8F8E88)' }}
          >
            <b style={{ color: 'var(--nx-ink, #1C1C1A)' }}>Primitive.</b> One
            implementation, shared by every language, wearing this one&apos;s
            tokens.
          </figcaption>
        </figure>

        <figure data-reveal className="m-0 min-w-0">
          <div className="min-w-0" style={{ minHeight: TILE_PREVIEW_HEIGHT }}>
            {language && component ? (
              <Preview
                src={previewUrl(language, component, { bare: true })}
                title="An expressive chart"
                boxHeight={TILE_PREVIEW_HEIGHT}
              />
            ) : null}
          </div>
          <figcaption
            className="mt-5 text-[12px] leading-[1.7]"
            style={{ color: 'var(--nx-muted, #8F8E88)' }}
          >
            <b style={{ color: 'var(--nx-ink, #1C1C1A)' }}>Expressive.</b> Owned
            by the language, because the language decided its geometry.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/**
 * Four cells for four things, in a 7/5 then 5/7 grid. Restrained asymmetry, per
 * the language: the grid stays predictable and the interest lives in the marks.
 */
function WhatALanguageCarries({
  tokens,
  language,
  component,
}: {
  tokens?: Tokens;
  language?: string;
  component?: string;
}) {
  const ramp = tokens?.ramp?.steps ?? [];
  const strokes = tokens?.stroke?.scale ?? [];

  return (
    <section className="pb-24">
      <hr className="nx-rule" />
      <h2
        data-reveal
        className="mt-12 mb-12 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]"
      >
        What a language carries.
      </h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <article
          data-reveal
          className="nx-card nx-card--plain min-w-0 lg:col-span-7"
        >
          <h3 className="nx-card__title">Tokens</h3>
          <p className="nx-card__sub">
            The values, as a stylesheet your project imports once.
          </p>
          <div className="mt-5 flex flex-wrap gap-[3px]">
            {ramp.map((hex) => (
              <span
                key={hex}
                title={hex}
                className="h-6 w-6 rounded-[3px]"
                style={{
                  background: hex,
                  border:
                    'var(--nx-hairline, 1px) solid color-mix(in oklab, var(--nx-grid, #DEDDD6) 70%, transparent)',
                }}
              />
            ))}
          </div>
          {strokes.length ? (
            <svg viewBox="0 0 300 40" className="mt-6 block w-full" aria-hidden>
              {strokes.map((value, i) => {
                const x = 14 + i * (272 / Math.max(strokes.length - 1, 1));
                return (
                  <line
                    key={value}
                    x1={x}
                    y1={4}
                    x2={x}
                    y2={32}
                    stroke="var(--nx-ink, #1C1C1A)"
                    strokeWidth={Number.parseFloat(value) * 3}
                  />
                );
              })}
            </svg>
          ) : null}
          {/* Only once the real count is known. A caption that says "0 greys"
              while the fetch is in flight is worse than no caption. */}
          {ramp.length ? (
            <p className="nx-card__caption">
              {ramp.length} greys and the hairline scale, drawn at 3x
            </p>
          ) : null}
        </article>

        <article
          data-reveal
          className="nx-card nx-card--invert min-w-0 lg:col-span-5"
        >
          <h3 className="nx-card__title">Written rules</h3>
          <p className="nx-card__sub">
            What the values cannot say, in prose your agent reads.
          </p>
          <blockquote className="mt-6 mb-0 text-[14px] leading-[1.6] font-semibold">
            Never introduce a hue. No blue, no accent, no semantic red or green.
          </blockquote>
          <p className="nx-card__caption">One of nine anti-patterns in DESIGN.md</p>
        </article>

        <article
          data-reveal
          className="nx-card nx-card--plain min-w-0 lg:col-span-5"
        >
          <h3 className="nx-card__title">Primitives</h3>
          <p className="nx-card__sub">
            Twenty-four of them, shared once and themed by tokens.
          </p>
          <div className="mt-4 min-w-0">
            {language ? (
              <Preview
                src={primitivePreviewUrl('badge', language)}
                title="The badge primitive"
                fluid
              />
            ) : null}
          </div>
        </article>

        <article
          data-reveal
          className="nx-card nx-card--plain min-w-0 lg:col-span-7"
        >
          <h3 className="nx-card__title">Components</h3>
          <p className="nx-card__sub">
            Sixty-four charts, drawn the way this language draws.
          </p>
          <div
            className="mt-4 min-w-0"
            style={{ minHeight: TILE_PREVIEW_HEIGHT }}
          >
            {language && component ? (
              <Preview
                src={previewUrl(language, component, { bare: true })}
                title="A chart from the registry"
                boxHeight={TILE_PREVIEW_HEIGHT}
              />
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function ForYourAgent({
  language,
  component,
}: {
  language?: string;
  component?: string;
}) {
  const slug = language ?? 'mono-editorial';

  return (
    <section className="pb-24">
      <hr className="nx-rule" />
      <div data-reveal className="max-w-[54ch] pt-12">
        <h2 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]">
          Your agent reads the rules before it writes.
        </h2>
        <p
          className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
          style={{ color: 'var(--nx-muted, #8F8E88)' }}
        >
          One command drops the tokens and the design rules into your project,
          then writes a note in your AGENTS.md so the agent knows they are there.
          After that it can pull components without being told the house style
          twice.
        </p>
      </div>

      <div data-reveal className="mt-10 grid max-w-[720px] gap-3">
        <CommandRow command={`nodex init ${slug}`} />
        <CommandRow command={`nodex add ${slug}/${component ?? 'barcode-lollipop'}`} />
      </div>

      {/* `muted`, not `faint`. DESIGN.md reserves faint for captions and the
          quietest rules, and it measures 1.5:1 on paper, which is nowhere near
          readable for a full sentence. */}
      <p
        data-reveal
        className="mt-6 mb-0 max-w-[54ch] text-[12px] leading-[1.7]"
        style={{ color: 'var(--nx-muted, #8F8E88)' }}
      >
        Components arrive as plain HTML, CSS, and JavaScript. No framework, no
        imports between them, nothing to update. They are yours to edit.
      </p>
    </section>
  );
}

function Close() {
  return (
    <section className="pb-28">
      <hr className="nx-rule" />
      <div data-reveal className="max-w-[46ch] pt-12">
        <h2 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[32px]">
          One language so far. The shelf is built for more.
        </h2>
        <p
          className="mt-5 mb-0 text-[13.5px] leading-[1.75]"
          style={{ color: 'var(--nx-muted, #8F8E88)' }}
        >
          Mono editorial is the first: hairline data drawing on warm paper, built
          for charts that reward reading rather than glancing.
        </p>
        <Link href="/login" className="nx-btn nx-btn--solid mt-9 no-underline">
          Sign in
          <ArrowRight size={13} weight="bold" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
