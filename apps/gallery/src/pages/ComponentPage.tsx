import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  CommandRow,
  EmptyState,
  Loading,
  PageShell,
  TopBar,
} from '../components/Chrome.tsx';
import { Preview } from '../components/Preview.tsx';
import { useLanguageTokens } from '../hooks.ts';
import {
  addCommand,
  findItem,
  loadCatalog,
  previewUrl,
  type Catalog,
} from '../registry.ts';

export function ComponentPage() {
  const { slug = '', name = '' } = useParams();
  const [catalog, setCatalog] = useState<Catalog>();
  const themed = useLanguageTokens(slug);

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  if (!catalog || !themed) return <Loading label="Loading component" />;

  const item = findItem(catalog, slug, name);
  const language = catalog.languages.find((l) => l.slug === slug);

  if (!item || !language) {
    return (
      <>
        <TopBar />
        <PageShell>
          <div className="pt-16">
            <EmptyState
              title="No such component"
              hint={`Nothing named "${name}" exists in ${slug}.`}
              action={
                <Link to={`/l/${slug}`} className="nx-btn nx-btn--outline no-underline">
                  Back to the language
                </Link>
              }
            />
          </div>
        </PageShell>
      </>
    );
  }

  const facts: Array<[string, string]> = [
    ['Type', item.meta.component],
    ['Runtime', item.meta.runtime],
  ];
  if (item.meta.density) facts.push(['Reading', item.meta.density]);
  if (item.dependencies?.length) {
    facts.push(['Dependencies', item.dependencies.join(', ')]);
  }
  if (item.meta.tags.length) facts.push(['Tags', item.meta.tags.join(', ')]);

  return (
    <>
      <TopBar
        language={language.name}
        back={{ to: `/l/${slug}`, label: language.name }}
      />
      <PageShell>
        <div className="grid grid-cols-1 gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <div>
            <h1 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.025em] sm:text-[32px]">
              {item.title}
            </h1>
            {item.description ? (
              <p
                className="mt-3 max-w-[60ch] text-[12.5px] leading-[1.7]"
                style={{ color: 'var(--nx-muted)' }}
              >
                {item.description}
              </p>
            ) : null}

            <div className="mt-9">
              <Preview
                src={previewUrl(slug, item.name)}
                title={item.title}
                aspectRatio={item.meta.aspectRatio}
                replayable
              />
            </div>
          </div>

          <aside className="lg:pt-3">
            <CommandRow command={addCommand(slug, item)} />
            <p
              className="mt-3 text-[10.5px] leading-[1.6]"
              style={{ color: 'var(--nx-muted)' }}
            >
              The CLI delivers the source. This page is for judging whether you want
              it.
            </p>

            <dl className="mt-9 grid grid-cols-[86px_minmax(0,1fr)] gap-x-4 gap-y-0">
              {facts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt
                    className="py-2.5 text-[9px] font-bold tracking-[0.08em] uppercase"
                    style={{
                      color: 'var(--nx-muted)',
                      borderTop: 'var(--nx-hairline) solid var(--nx-grid)',
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="m-0 py-2.5 text-[11.5px]"
                    style={{ borderTop: 'var(--nx-hairline) solid var(--nx-grid)' }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <a
              className="nx-btn nx-btn--quiet mt-6 no-underline"
              href={previewUrl(slug, item.name)}
              target="_blank"
              rel="noreferrer"
            >
              Open preview in a tab
            </a>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
