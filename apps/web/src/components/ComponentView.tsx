'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  CommandRow,
  EmptyState,
  Loading,
  PageShell,
  TopBar,
} from '@/components/Chrome.tsx';
import { Preview } from '@/components/Preview.tsx';
import { useLanguageTokens } from '@/lib/hooks.ts';
import {
  addCommand,
  findItem,
  loadCatalog,
  type Catalog,
} from '@/lib/registry.ts';

export function ComponentView({ slug, name }: { slug: string; name: string }) {
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
                <Link href={`/l/${slug}`} className="nx-btn nx-btn--outline no-underline">
                  Back to the language
                </Link>
              }
            />
          </div>
        </PageShell>
      </>
    );
  }

  // Shared primitives use the viewed language and render at their natural size.
  // Charts preserve the specimen's composition and scale to the available width.
  const isPrimitive = item.meta.tier === 'primitive';

  const facts: Array<[string, string]> = [
    ['Type', item.meta.component],
    ['Runtime', item.meta.runtime],
    ['Tier', isPrimitive ? 'primitive, shared by every language' : 'expressive'],
  ];
  if (item.dependencies?.length) {
    facts.push(['Dependencies', item.dependencies.join(', ')]);
  }
  if (item.meta.tags.length) facts.push(['Tags', item.meta.tags.join(', ')]);

  return (
    <>
      <TopBar
        language={language.name}
        back={{ href: `/l/${slug}`, label: language.name }}
      />
      <PageShell>
        <div className="grid grid-cols-1 gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <div>
            <h1 className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.025em] sm:text-[32px]">
              {item.title}
            </h1>
            {/* The type, not the description. Every surface that names a
                component names it the same way — title, then type — so the
                grid, the index and this page read as one thing. The
                description is still in the manifest, where `nodex show` and
                `nodex search` use it. */}
            <p
              className="mt-3 text-[10.5px] tracking-[0.06em] uppercase"
              style={{ color: 'var(--nx-faint)' }}
            >
              {item.meta.component}
            </p>

            <div className="mt-9">
              <Preview
                item={item}
                language={slug}
              />
            </div>
          </div>

          <aside className="lg:pt-3">
            <CommandRow command={addCommand(slug, item)} />

            <dl className="mt-9 grid grid-cols-[86px_minmax(0,1fr)] gap-x-4 gap-y-0">
              {facts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt
                    className="py-2.5 text-[9px] font-bold tracking-[0.08em] uppercase"
                    style={{
                      color: 'var(--nx-muted)',
                      borderTop: 'var(--nx-stroke-hairline) solid var(--nx-grid)',
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="m-0 py-2.5 text-[11.5px]"
                    style={{ borderTop: 'var(--nx-stroke-hairline) solid var(--nx-grid)' }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
