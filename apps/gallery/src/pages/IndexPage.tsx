import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Loading, PageShell, TopBar } from '../components/Chrome.tsx';
import { Preview } from '../components/Preview.tsx';
import { useLanguageTokens } from '../hooks.ts';
import { loadCatalog, previewUrl, type Catalog, type Language } from '../registry.ts';

/**
 * The index answers "which design language do I want", which is a judgment made
 * by looking. So a language is presented as a live composite of its own
 * components rather than a name and a paragraph.
 *
 * Deliberately thin while one language exists: there is nothing to compare yet.
 * It grows into a comparison surface when a second arrives.
 */
export function IndexPage() {
  const [catalog, setCatalog] = useState<Catalog>();
  const first = catalog?.languages[0]?.slug;
  const themed = useLanguageTokens(first);

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  if (!catalog || !themed) return <Loading label="Loading languages" />;

  return (
    <>
      <TopBar />
      <PageShell>
        <section className="max-w-[62ch] pt-16 pb-14 sm:pt-20">
          <h1 className="m-0 text-[38px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[52px]">
            Components that belong to a design language.
          </h1>
          <p className="mt-6 text-[14px] leading-[1.7]" style={{ color: 'var(--nx-muted)' }}>
            Most libraries give you one component and let you theme it. That works
            until the language changes the geometry rather than the paint. Pick a
            language here and get its tokens, its written rules, and the components
            built for it.
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

function LanguageTile({ language }: { language: Language }) {
  const featured = language.featured.slice(0, 4);

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

        <Link to={`/l/${language.slug}`} className="nx-btn nx-btn--solid no-underline">
          Open {language.name}
          <ArrowRight size={13} weight="bold" aria-hidden />
        </Link>
      </div>

      {/* The composite IS the description. A name and a paragraph cannot convey
          taste, and these are real running components rather than screenshots. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {featured.map((name) => (
          <Link
            key={name}
            to={`/l/${language.slug}/${name}`}
            className="no-underline"
            aria-label={`${name} in ${language.name}`}
          >
            <Preview
              src={previewUrl(language.slug, name)}
              title={`${name} in ${language.name}`}
              boxHeight={200}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
