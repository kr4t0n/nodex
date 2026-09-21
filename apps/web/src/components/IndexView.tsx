'use client';

import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link, { type LinkProps } from 'next/link';

import { Loading, PageShell, TopBar } from '@/components/Chrome.tsx';
import { Preview } from '@/components/Preview.tsx';
import { useLanguageTokens, useScopedLanguageTokens } from '@/lib/hooks.ts';
import {
  loadCatalog,
  type Catalog,
  type Item,
  type Language,
} from '@/lib/registry.ts';

/**
 * The index answers "which design language do I want", which is a judgment made
 * by looking. So a language is presented as a live composite of its own
 * components rather than a name and a paragraph.
 *
 * Scoped token layers let several languages appear together without changing
 * the identity of neighboring tiles.
 */
export function IndexView({
  user,
}: {
  user?: { login: string; avatarUrl: string | null };
}) {
  const [catalog, setCatalog] = useState<Catalog>();
  const first = catalog?.languages[0]?.slug;
  const themed = useLanguageTokens(first);

  // The page chrome wears the first language; each tile then wears its own.
  const slugs = useMemo(
    () => catalog?.languages.map((l) => l.slug) ?? [],
    [catalog],
  );
  const scoped = useScopedLanguageTokens(slugs);

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  if (!catalog || !themed || !scoped) return <Loading label="Loading languages" />;

  return (
    <>
      <TopBar user={user} />
      <PageShell>
        {/* The pitch lives on the landing page. This is the app index, so it
            states what is here and gets out of the way. */}
        <section className="max-w-[62ch] pt-16 pb-14 sm:pt-20">
          <h1 className="m-0 text-[38px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[52px]">
            Design languages
          </h1>
          <p className="mt-6 text-[14px] leading-[1.7]" style={{ color: 'var(--nx-muted)' }}>
            Each one brings its own tokens, its own written rules, and the
            components built for it. Open one to read it.
          </p>
        </section>

        <div className="flex flex-col gap-10">
          {catalog.languages.map((language) => (
            <LanguageTile
              key={language.slug}
              language={language}
              items={catalog.items}
            />
          ))}
        </div>
      </PageShell>
    </>
  );
}

/**
 * Shown for a language with no charts yet.
 *
 * Between them these carry the four things a language decides that a still
 * image can show: how colour is used (status), the type face (link), shape and
 * radius (slider), and mark weight (progress).
 *
 * These examples have compatible compositions for an unscaled tile. Their
 * authored dimensions reserve space until each example reports its height.
 */
const SAMPLE_PRIMITIVES = ['status', 'link', 'slider', 'progress'];

/**
 * One labelled tile: title, description, then the component.
 *
 * Three subgrid rows rather than a plain stack, because a title that wraps to
 * two lines would otherwise drop its own preview below its neighbours' and the
 * composite would read as misaligned rather than as varied.
 *
 * `min-w-0` on every level down to the Preview: a grid item's default minimum
 * is its content size, and a preview renders at a fixed wide logical
 * width, so without it the column is forced open and the inflated width is then
 * measured back as the one the scale is computed from.
 */
function TileCell<T>({
  href,
  title,
  kind,
  children,
}: {
  // Next types its routes, so the prop borrows Link's own href type rather than
  // widening to string, which would drop the check at every call site. It is
  // generic because that type is parameterised by the route being linked to.
  href: LinkProps<T>['href'];
  title: string;
  kind: string;
  children: ReactNode;
}) {
  return (
    // Both levels restate rowGap. A subgrid adopts its parent's gap along the
    // axis it inherits, and the tile grid sets 20px to separate whole cells —
    // left alone, that 20px would also open up between a title, its description
    // and its chart, so each cell would read as three loose parts.
    <article
      className="grid min-w-0 grid-rows-subgrid row-span-3"
      style={{ rowGap: 6 }}
    >
      <Link
        href={href}
        className="grid min-w-0 grid-rows-subgrid row-span-2 no-underline"
        style={{ color: 'inherit', rowGap: 6 }}
      >
        <h3 className="m-0 self-start text-[12.5px] leading-[1.4] font-bold tracking-[-0.01em]">
          {title}
        </h3>
        <p
          className="m-0 self-start text-[length:var(--nx-type-body-supportingSize)] tracking-[0.06em] uppercase"
          style={{ color: 'var(--nx-faint)' }}
        >
          {kind}
        </p>
      </Link>
      <div className="mt-2 min-w-0 self-start">{children}</div>
    </article>
  );
}

/**
 * One box height for every tile on this page, charts and primitives alike.
 *
 * Charts scale to fit, so any value works for them. Primitives do not: they
 * render at true size and are clipped by a box smaller than they are. 260px
 * clears the tallest of the four at every column width the grid produces, with
 * the widest column being the tightest case because the narrow ones let a
 * primitive wrap taller.
 */
const TILE_HEIGHT = 260;

function LanguageTile({
  language,
  items,
}: {
  language: Language;
  items: Item[];
}) {
  const featured = language.featured.slice(0, 4).map((name) => items.find(
    (item) => item.name === name && item.meta.language === language.slug,
  )).filter((item): item is Item => item !== undefined);

  // A language under construction has tokens and primitives before it has a
  // single chart. Rendering nothing there makes a real language look broken.
  const showing = featured.length > 0 ? 'expressive' : 'primitives';

  const visibleItems = showing === 'expressive' ? featured : SAMPLE_PRIMITIVES.map(
    (name) => items.find((item) => item.name === name && item.meta.tier === 'primitive'),
  ).filter((item): item is Item => item !== undefined);

  return (
    /**
     * The tile wears the language it is showing, rather than the one the page
     * happens to be themed in.
     *
     * This is the claim the whole project makes — that a language is tokens,
     * not a palette we paint on — so the index is the one page that has to
     * demonstrate several at once. The badges, the button, and the rule
     * inside are shared primitives and re-theme for free; that they do is the
     * evidence.
     *
     * The four properties are restated because inherited values do not
     * re-resolve: `body` already resolved `--nx-ink` against `:root`, so
     * descendants carry that colour until something in scope asks again.
     */
    <section
      data-nx-scope={language.slug}
      className="overflow-hidden p-8 sm:p-10"
      style={{
        background: 'var(--nx-bg)',
        color: 'var(--nx-ink)',
        fontFamily: 'var(--nx-font-sans)',
        borderRadius: 'var(--nx-radius-card)',
        // A language whose ground matches the page would otherwise have no
        // edge at all, and the two tiles would read as different kinds of
        // thing rather than as the same thing wearing different paint.
        border: 'var(--nx-stroke-hairline) solid var(--nx-border)',
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-6 pb-9">
        <div>
          <h2 className="m-0 text-[24px] [font-family:var(--nx-font-heading)] font-[number:var(--nx-type-pageTitle-weight)] tracking-[-0.025em]">
            {language.name}
          </h2>
          <p
            className="mt-2.5 mb-0 max-w-[58ch] text-[length:var(--nx-type-body-summarySize)] leading-[1.7]"
            style={{ color: 'var(--nx-muted)' }}
          >
            {language.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="nx-badge nx-badge--dashed">
              {language.counts.expressive}{' '}
              {language.counts.expressive === 1 ? 'component' : 'components'}
            </span>
            <span className="nx-badge nx-badge--dashed">
              {language.counts.primitives}{' '}
              {language.counts.primitives === 1 ? 'primitive' : 'primitives'}
            </span>
            {language.visibility === 'restricted' ? (
              <span className="nx-badge nx-badge--solid">Restricted</span>
            ) : null}
          </div>
        </div>

        <Link href={`/l/${language.slug}`} className="nx-btn nx-btn--solid no-underline">
          Open {language.name}
          <ArrowRight size={13} weight="bold" aria-hidden />
        </Link>
      </div>

      {/* The composite IS the description. A name and a paragraph cannot convey
          taste, and these are real running components rather than screenshots.

          Subgrid, so a title or description that wraps to an extra line moves
          its own text and not its neighbours' previews out of line. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {visibleItems.map((item) => (
          <TileCell
            key={item.name}
            href={`/l/${language.slug}/${item.name}`}
            title={item.title}
            kind={item.meta.component}
          >
            <Preview
              item={item}
              language={language.slug}
              boxHeight={TILE_HEIGHT}
            />
          </TileCell>
        ))}
      </div>

      {showing === 'primitives' ? (
        <p
          className="mt-6 mb-0 text-[length:var(--nx-type-body-detailSize)] leading-[1.7]"
          style={{ color: 'var(--nx-muted)' }}
        >
          No charts yet. These are shared primitives wearing this language&apos;s
          tokens, which is what it looks like before a chart is drawn.
        </p>
      ) : null}
    </section>
  );
}
