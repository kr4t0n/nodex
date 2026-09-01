'use client';

import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link, { type LinkProps } from 'next/link';

import { Loading, PageShell, TopBar } from '@/components/Chrome.tsx';
import { Preview } from '@/components/Preview.tsx';
import { useLanguageTokens, useScopedLanguageTokens } from '@/lib/hooks.ts';
import {
  loadCatalog,
  previewUrl,
  primitivePreviewUrl,
  type Catalog,
  type Item,
  type Language,
} from '@/lib/registry.ts';

/**
 * The index answers "which design language do I want", which is a judgment made
 * by looking. So a language is presented as a live composite of its own
 * components rather than a name and a paragraph.
 *
 * Deliberately thin while one language exists: there is nothing to compare yet.
 * It grows into a comparison surface when a second arrives.
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
 * Chosen for compatible natural height as well as for coverage. Primitives
 * render fluid, at true size, so the row is only as tidy as the components in
 * it: `stat` and `alert` are more characterful but measure 274px and 361px
 * against `badge`'s 63px, and a composite with a sixfold height spread reads as
 * broken rather than as varied. These four sit within 151px to 185px.
 */
const SAMPLE_PRIMITIVES = ['status', 'link', 'slider', 'progress'];

/**
 * One labelled tile: title, description, then the component.
 *
 * Three subgrid rows rather than a plain stack, because these descriptions are
 * a sentence long and wrap to different heights across a row — without shared
 * rows, one two-line description drops its own preview below its neighbours'
 * and the composite reads as misaligned rather than as varied.
 *
 * `min-w-0` on every level down to the Preview: a grid item's default minimum
 * is its content size, and a preview renders an iframe at a fixed wide logical
 * width, so without it the column is forced open and the inflated width is then
 * measured back as the one the scale is computed from.
 */
function TileCell<T>({
  href,
  title,
  description,
  children,
}: {
  // Next types its routes, so the prop borrows Link's own href type rather than
  // widening to string, which would drop the check at every call site. It is
  // generic because that type is parameterised by the route being linked to.
  href: LinkProps<T>['href'];
  title: string;
  description?: string;
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
        className="grid min-w-0 grid-rows-subgrid row-span-3 no-underline"
        style={{ color: 'inherit', rowGap: 6 }}
      >
        <h3 className="m-0 self-start text-[12.5px] leading-[1.4] font-bold tracking-[-0.01em]">
          {title}
        </h3>
        <p
          className="m-0 self-start text-[10.5px] leading-[1.6]"
          style={{ color: 'var(--nx-muted)' }}
        >
          {description ?? ''}
        </p>
        <div className="mt-2 min-w-0 self-start">{children}</div>
      </Link>
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
  const featured = language.featured.slice(0, 4);

  // A language under construction has tokens and primitives before it has a
  // single chart. Rendering nothing there makes a real language look broken.
  const showing = featured.length > 0 ? 'expressive' : 'primitives';

  /**
   * Label a tile from the manifest rather than from the component.
   *
   * The tiles used to show whatever the fragment labelled itself with, which
   * held only while one language existed: mono-editorial's card anatomy opens
   * with a title and a sentence, so its tiles read as labelled by accident.
   * Signal Console's opens with the current value instead — deliberately, and
   * its DESIGN.md says never to reorder it — so its tile arrived with no title
   * at all beside four that had one.
   *
   * The manifest carries a title and a description for every component in every
   * language, so reading them here is the only spelling that does not assume an
   * anatomy. It is also what the language page already does for its grid cells.
   */
  const describe = (name: string, tier: 'expressive' | 'primitive') => {
    const item = items.find(
      (i) =>
        i.name === name &&
        (tier === 'primitive'
          ? i.meta.tier === 'primitive'
          : i.meta.language === language.slug),
    );
    return { title: item?.title ?? name, description: item?.description };
  };

  return (
    /**
     * The tile wears the language it is showing, rather than the one the page
     * happens to be themed in.
     *
     * This is the claim the whole project makes — that a language is tokens,
     * not a palette we paint on — so the index is the one page that has to
     * demonstrate it with two at once. The badges, the button, and the rule
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
        border: '1px solid var(--nx-grid)',
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-6 pb-9">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.025em]">
            {language.name}
          </h2>
          <p
            className="mt-2.5 mb-0 max-w-[58ch] text-[12px] leading-[1.7]"
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
        {showing === 'expressive'
          ? featured.map((name) => {
              const { title, description } = describe(name, 'expressive');
              return (
                <TileCell
                  key={name}
                  href={`/l/${language.slug}/${name}`}
                  title={title}
                  description={description}
                >
                  {/* Bare: the heading above states the title, so a fragment
                      that carries its own would print it twice. */}
                  <Preview
                    src={previewUrl(language.slug, name, { bare: true })}
                    title={title}
                    boxHeight={TILE_HEIGHT}
                  />
                </TileCell>
              );
            })
          : SAMPLE_PRIMITIVES.map((name) => {
              const { title, description } = describe(name, 'primitive');
              return (
                <TileCell
                  key={name}
                  href={`/l/${language.slug}/${name}`}
                  title={title}
                  description={description}
                >
                  {/* Fluid, so the component is shown at the size it really is,
                      but inside the same box as every other tile. */}
                  <Preview
                    src={primitivePreviewUrl(name, language.slug)}
                    title={title}
                    boxHeight={TILE_HEIGHT}
                    fluid
                  />
                </TileCell>
              );
            })}
      </div>

      {showing === 'primitives' ? (
        <p
          className="mt-6 mb-0 text-[11.5px] leading-[1.7]"
          style={{ color: 'var(--nx-muted)' }}
        >
          No charts yet. These are shared primitives wearing this language&apos;s
          tokens, which is what it looks like before a chart is drawn.
        </p>
      ) : null}
    </section>
  );
}
