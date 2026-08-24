import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { marked } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CommandRow, EmptyState, Loading, PageShell, TopBar } from '../components/Chrome.tsx';
import { Preview } from '../components/Preview.tsx';
import { useLanguageTokens, usePrefersReducedMotion, useText } from '../hooks.ts';
import {
  addCommand,
  designUrl,
  expressiveFor,
  facetValues,
  loadCatalog,
  previewUrl,
  primitiveMarkupUrl,
  primitivesFor,
  tokensJsonUrl,
  type Catalog,
  type Item,
} from '../registry.ts';

gsap.registerPlugin(useGSAP);

interface Tokens {
  color?: Record<string, string>;
  ramp?: { steps?: string[] };
  stroke?: { scale?: string[]; lineMax?: string };
  type?: Record<string, { size?: string; weight?: number }>;
}

/** Fixed thumbnail height, so grid titles stay on a common baseline. */
const THUMB_HEIGHT = 250;

export function LanguagePage() {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<Catalog>();
  const themed = useLanguageTokens(slug);
  const design = useText(designUrl(slug));
  const tokensRaw = useText(tokensJsonUrl(slug));

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, []);

  const language = catalog?.languages.find((l) => l.slug === slug);

  if (!catalog || !themed) return <Loading label="Loading registry" />;
  if (!language) {
    return (
      <>
        <TopBar />
        <PageShell>
          <div className="pt-16">
            <EmptyState
              title="No such design language"
              hint={`Nothing in the registry is named "${slug}".`}
              action={
                <Link to="/" className="nx-btn nx-btn--outline no-underline">
                  Back to languages
                </Link>
              }
            />
          </div>
        </PageShell>
      </>
    );
  }

  const expressive = expressiveFor(catalog, slug);
  const primitives = primitivesFor(catalog);
  const tokens: Tokens | undefined = tokensRaw.text
    ? (JSON.parse(tokensRaw.text) as Tokens)
    : undefined;

  return (
    <>
      <TopBar language={language.name} />
      <PageShell>
        <section className="grid grid-cols-1 gap-10 pt-14 pb-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
          <div>
            <h1 className="m-0 text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[42px]">
              {language.name}
            </h1>
            <p
              className="mt-4 max-w-[54ch] text-[13px] leading-[1.7]"
              style={{ color: 'var(--nx-muted)' }}
            >
              {language.description}
            </p>
            <div className="mt-7 max-w-[440px]">
              <CommandRow command={`nodex init ${language.slug}`} />
            </div>
          </div>

          {tokens ? <TokenPanel tokens={tokens} /> : null}
        </section>

        <ComponentGrid
          items={expressive}
          language={slug}
          declaredDensity={language.density}
        />

        <PrimitiveStrip items={primitives} language={slug} />

        {design.text ? <DesignDoc markdown={design.text} /> : null}
      </PageShell>
    </>
  );
}

/** Values a reader can judge at a glance: palette, hairline scale, type scale. */
function TokenPanel({ tokens }: { tokens: Tokens }) {
  const ramp = tokens.ramp?.steps ?? [];
  const strokes = tokens.stroke?.scale ?? [];

  return (
    <aside className="nx-card nx-card--plain gap-6 p-0">
      <div>
        <p className="nx-badge nx-badge--quiet m-0">Palette</p>
        <div className="mt-2 flex flex-wrap gap-[3px]">
          {ramp.map((hex) => (
            <span
              key={hex}
              title={hex}
              className="h-7 w-7 rounded-[3px]"
              style={{
                background: hex,
                border: 'var(--nx-hairline) solid color-mix(in oklab, var(--nx-grid) 70%, transparent)',
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: 'var(--nx-muted)' }}>
          {ramp.length} steps, warm grey only. No hue anywhere in the language.
        </p>
      </div>

      <div>
        <p className="nx-badge nx-badge--quiet m-0">Stroke scale</p>
        <svg viewBox="0 0 300 46" className="mt-2 block w-full" aria-hidden>
          {strokes.map((value, i) => {
            const stroke = Number.parseFloat(value);
            const x = 14 + i * (272 / Math.max(strokes.length - 1, 1));
            return (
              <g key={value}>
                <line
                  x1={x}
                  y1={4}
                  x2={x}
                  y2={30}
                  stroke="var(--nx-ink)"
                  strokeWidth={stroke * 3}
                />
                <text
                  x={x}
                  y={42}
                  fontSize={7}
                  textAnchor="middle"
                  fill="var(--nx-muted)"
                  fontFamily="var(--nx-font-sans)"
                >
                  {value.replace('px', '')}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-[10.5px]" style={{ color: 'var(--nx-muted)' }}>
          Drawn at 3x so sub-pixel widths are visible. Data marks never exceed the
          line maximum.
        </p>
      </div>
    </aside>
  );
}

function ComponentGrid({
  items,
  language,
  declaredDensity,
}: {
  items: Item[];
  language: string;
  declaredDensity?: string[];
}) {
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const types = useMemo(() => facetValues(items, 'component'), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (density && item.meta.density !== density) return false;
      if (type && item.meta.component !== type) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.name.includes(q) ||
        item.meta.component.includes(q) ||
        item.meta.tags.some((tag) => tag.includes(q))
      );
    });
  }, [items, query, density, type]);

  // Motivated motion: the set changed, so the new set announces itself. A
  // stagger reads as "these are the results" rather than a silent swap.
  useGSAP(
    () => {
      if (reduced) return;
      gsap.from('[data-grid-cell]', {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.02,
        ease: 'power2.out',
        overwrite: true,
      });
    },
    { scope: gridRef, dependencies: [filtered.length, density, type], revertOnUpdate: true },
  );

  const active = density !== null || type !== null || query !== '';

  return (
    <section>
      <hr className="nx-rule" />
      <div className="flex flex-wrap items-end justify-between gap-5 pt-7 pb-8">
        <div className="w-full max-w-[280px]">
          <div className="nx-field">
            <label className="nx-field__label" htmlFor="nx-q">
              Search
            </label>
            <input
              id="nx-q"
              className="nx-input"
              type="search"
              placeholder="lollipop, heatmap, sankey"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rendered only when the language declares the axis, so the shell
              never hardcodes a distinction a future language may not have. */}
          {declaredDensity?.map((value) => (
            <button
              key={value}
              type="button"
              className="nx-btn nx-btn--outline"
              aria-pressed={density === value}
              onClick={() => setDensity(density === value ? null : value)}
            >
              {value === 'close-read' ? 'Close read' : 'Glance'}
            </button>
          ))}

          <select
            className="nx-select nx-select--auto"
            value={type ?? ''}
            aria-label="Filter by component type"
            onChange={(event) => setType(event.target.value || null)}
          >
            <option value="">All types</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          {active ? (
            <button
              type="button"
              className="nx-btn nx-btn--quiet"
              onClick={() => {
                setQuery('');
                setDensity(null);
                setType(null);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          hint="Try a broader search, or clear the filters to see the whole language."
          action={
            <button
              type="button"
              className="nx-btn nx-btn--outline"
              onClick={() => {
                setQuery('');
                setDensity(null);
                setType(null);
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((item) => (
            <article key={item.name} data-grid-cell>
              <Link
                to={`/l/${language}/${item.name}`}
                className="block no-underline"
                style={{ color: 'inherit' }}
              >
                <Preview
                  src={previewUrl(language, item.name)}
                  title={item.title}
                  aspectRatio={item.meta.aspectRatio}
                  boxHeight={THUMB_HEIGHT}
                />
                <h2 className="mt-4 mb-0 text-[14px] font-bold tracking-[-0.01em]">
                  {item.title}
                </h2>
              </Link>
              <p
                className="mt-1.5 mb-0 text-[10.5px] tracking-[0.06em] uppercase"
                style={{ color: 'var(--nx-faint)' }}
              >
                {item.meta.component}
                {item.meta.density ? ` · ${item.meta.density}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="mt-10 text-[10.5px]" style={{ color: 'var(--nx-muted)' }}>
        {filtered.length} of {items.length} components. Each preview draws when it
        scrolls into view; click a chart to replay it.
      </p>
    </section>
  );
}

/** Primitives render inline, so they re-theme with the rest of the shell. */
function PrimitiveStrip({ items, language }: { items: Item[]; language: string }) {
  return (
    <section className="pt-20">
      <hr className="nx-rule" />
      <h2 className="mt-7 mb-1 text-[19px] font-extrabold tracking-[-0.02em]">
        Primitives
      </h2>
      <p
        className="mt-0 mb-9 max-w-[62ch] text-[11.5px] leading-[1.7]"
        style={{ color: 'var(--nx-muted)' }}
      >
        One implementation shared by every design language, wearing this
        language&apos;s tokens. Presentational only: apply the classes to a headless
        component when you need real keyboard and ARIA behaviour.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item) => (
          <PrimitiveCard key={item.name} item={item} language={language} />
        ))}
      </div>
    </section>
  );
}

function PrimitiveCard({ item, language }: { item: Item; language: string }) {
  const markup = useText(primitiveMarkupUrl(item.name));

  return (
    <article className="nx-card">
      <h3 className="nx-card__title text-[14px]">{item.title}</h3>
      {item.description ? <p className="nx-card__sub">{item.description}</p> : null}
      <div className="nx-card__body flex flex-wrap items-center gap-3">
        {markup.text ? (
          // Static markup from our own registry, no scripts. Inline rather than
          // framed precisely so it inherits the live token layer.
          <div
            className="flex flex-wrap items-center gap-3"
            dangerouslySetInnerHTML={{ __html: markup.text }}
          />
        ) : (
          <span className="text-[10.5px]" style={{ color: 'var(--nx-muted)' }}>
            Loading
          </span>
        )}
      </div>
      <div className="nx-card__caption">{addCommand(language, item)}</div>
    </article>
  );
}

function DesignDoc({ markdown }: { markdown: string }) {
  const html = useMemo(
    () => marked.parse(markdown, { async: false }),
    [markdown],
  );
  return (
    <section className="pt-20">
      <hr className="nx-rule" />
      <div className="grid grid-cols-1 gap-10 pt-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
            The written language
          </h2>
          <p
            className="mt-3 text-[11px] leading-[1.7]"
            style={{ color: 'var(--nx-muted)' }}
          >
            Tokens hold the values. This holds the reasoning they cannot carry,
            and it is what a coding agent reads before it builds anything.
          </p>
        </div>
        {/* Registry-authored markdown, not user input. */}
        <div className="nx-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
