'use client';

import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Loading, PageShell, TopBar } from '@/components/Chrome.tsx';
import { Preview } from '@/components/Preview.tsx';
import { useLanguageTokens } from '@/lib/hooks.ts';
import {
  loadCatalog,
  previewUrl,
  primitivePreviewUrl,
  type Catalog,
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

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  if (!catalog || !themed) return <Loading label="Loading languages" />;

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

        <div className="flex flex-col gap-20">
          {catalog.languages.map((language) => (
            <LanguageTile key={language.slug} language={language} />
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
 * One box height for every tile on this page, charts and primitives alike.
 *
 * Charts scale to fit, so any value works for them. Primitives do not: they
 * render at true size and are clipped by a box smaller than they are. 260px
 * clears the tallest of the four at every column width the grid produces, with
 * the widest column being the tightest case because the narrow ones let a
 * primitive wrap taller.
 */
const TILE_HEIGHT = 260;

function LanguageTile({ language }: { language: Language }) {
  const featured = language.featured.slice(0, 4);

  // A language under construction has tokens and primitives before it has a
  // single chart. Rendering nothing there makes a real language look broken.
  const showing = featured.length > 0 ? 'expressive' : 'primitives';

  return (
    <section>
      <hr className="nx-rule" />
      <div className="flex flex-wrap items-end justify-between gap-6 pt-7 pb-9">
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
              {language.counts.expressive} components
            </span>
            <span className="nx-badge nx-badge--dashed">
              {language.counts.primitives} primitives
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
          taste, and these are real running components rather than screenshots. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {showing === 'expressive'
          ? featured.map((name) => (
              <Link
                key={name}
                href={`/l/${language.slug}/${name}`}
                className="min-w-0 no-underline"
                aria-label={`${name} in ${language.name}`}
              >
                <Preview
                  src={previewUrl(language.slug, name)}
                  title={`${name} in ${language.name}`}
                  boxHeight={TILE_HEIGHT}
                />
              </Link>
            ))
          : SAMPLE_PRIMITIVES.map((name) => (
              <Link
                key={name}
                href={`/l/${language.slug}/${name}`}
                className="min-w-0 no-underline"
                aria-label={`${name} in ${language.name}`}
              >
                {/* Fluid, so the component is shown at the size it really is,
                    but inside the same box as every other tile. */}
                <Preview
                  src={primitivePreviewUrl(name, language.slug)}
                  title={`${name} in ${language.name}`}
                  boxHeight={TILE_HEIGHT}
                  fluid
                />
              </Link>
            ))}
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
