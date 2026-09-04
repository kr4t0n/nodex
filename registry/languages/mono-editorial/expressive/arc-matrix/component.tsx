/**
 * Eight products across twelve cities — mono-editorial
 *
 * A matrix whose rows are not straight. Each row sags into a shallow horizon
 * arc, which does two things a flat grid cannot: it separates rows that would
 * otherwise run together at this dot size, and it gives the eye a line to
 * follow across a city sequence rather than a field of equidistant marks.
 *
 * Dot area is the account count and tone is a three-step ladder over the same
 * number, so a cell reads at a glance and at a squint. An empty market is a
 * pinprick rather than a gap — an absence you can point at, which a blank cell
 * is not.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  EChartsOption,
} from 'echarts/types/dist/shared';

/**
 * Mount an option onto an element and clean up after it.
 *
 * Inlined rather than imported. A component is lifted out of this registry one
 * at a time, so one file has to be the whole component — an import of a shared
 * hook would hand a consumer a path that does not resolve in their project.
 *
 * The SVG renderer is not a preference. Canvas leaves nothing in the DOM to
 * inspect — no elements, no stroke widths, no colours — so a canvas chart
 * cannot be checked by `nodex lint` or by anyone with dev tools open.
 *
 * `option` is a dependency, so memoise it in the caller or the chart tears
 * down and rebuilds on every render.
 */
function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    // ResizeObserver rather than a window listener: a chart in a resizable
    // panel or a grid cell changes size without the window doing anything.
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

export const PRODUCTS = ['Editor', 'Boards', 'Docs', 'Flows', 'Chat', 'Vault', 'Pages', 'Sync'] as const;

export const CITIES = ['SF', 'NYC', 'LON', 'BER', 'TOK', 'SYD', 'SIN', 'PAR', 'AMS', 'TOR', 'SEO', 'SAO'] as const;

/** Market weight per city, which is most of what sets a column's mass. */
const WEIGHT = [9, 8, 7, 7, 6, 5, 5, 4, 4, 3, 3, 2];

/** Accounts for one cell. Zero is a real absence, not a missing reading. */
const accountsAt = (i: number, j: number) => {
  if (rnd(i * 13 + 1, j * 7 + 3) < 0.09) return 0;
  const age = 1 - i * 0.085;
  return Math.min(40, Math.round((WEIGHT[j] ?? 0) * 3.4 * age * (0.45 + rnd(i + 1, j + 1) * 0.85)));
};

/** How many cells are called out with their number. */
const CALLOUTS = 4;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const ARC = '#E3E2DB';
const ABSENT = '#D8D6CE';
const LIGHT = '#B0AFA9';
const MID = '#6A6963';
const MUTED = '#8F8E88';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  products: readonly string[] = PRODUCTS,
  cities: readonly string[] = CITIES,
): EChartsOption {
  const columnX = (j: number) => j * 27;
  // The sag. Shallow enough to read as one row, deep enough to separate two.
  const sag = (j: number) => 16 * Math.sin((Math.PI * j) / (cities.length - 1));
  const rowY = (i: number) => -i * 29 + sag(0);
  const cellY = (i: number, j: number) => -i * 29 + sag(j);

  const cells = products.flatMap((product, i) =>
    cities.map((city, j) => ({ value: accountsAt(i, j), product, city, i, j })),
  );

  // The largest few carry their number, so the chart has exact readings
  // without labelling ninety-six cells.
  const called = new Set(
    [...cells].sort((a, b) => b.value - a.value).slice(0, CALLOUTS).map((c) => `${c.i}:${c.j}`),
  );

  const arcs: ([number, number] | null)[] = [];
  products.forEach((_, i) => {
    cities.forEach((__, j) => arcs.push([columnX(j), cellY(i, j)]));
    arcs.push(null);
  });

  const present = cells.filter((c) => c.value > 0);
  const absent = cells.filter((c) => c.value === 0);

  return {
    color: [ARC, INK, MID, LIGHT],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 8,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return String(hit?.name ?? '');
      },
    },

    grid: { left: 62, right: 24, top: 46, bottom: 16 },

    xAxis: { show: false, type: 'value', min: -14, max: columnX(cities.length - 1) + 14 },
    yAxis: {
      show: false,
      type: 'value',
      min: rowY(products.length - 1) - 16,
      // The city labels ride the top horizon, which bows highest in the middle
      // — so the ceiling has to clear the deepest sag plus the label offset, or
      // ECharts clips the six labels over the crown and says nothing.
      max: Math.max(...cities.map((_, j) => sag(j))) + 34,
    },

    series: [
      {
        // The horizon each row sits on.
        type: 'line',
        data: arcs,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: ARC, width: 1 },
        silent: true,
        z: 1,
      },
      {
        // A market with no accounts. A pinprick rather than a gap, because an
        // absence you can point at is not the same as a blank.
        type: 'scatter',
        data: absent.map((c) => ({
          value: [columnX(c.j), cellY(c.i, c.j)],
          name: `${c.product} · ${c.city} — no accounts`,
        })),
        symbolSize: 1.8,
        itemStyle: { color: ABSENT },
        z: 2,
      },
      {
        // The cells. Area is the count; tone is a three-step ladder over the
        // same number, so a cell reads at a glance and at a squint.
        type: 'scatter',
        z: 3,
        data: present.map((c) => ({
          value: [columnX(c.j), cellY(c.i, c.j)],
          name: `${c.product} · ${c.city} — ${c.value} accounts`,
          symbolSize: Math.sqrt(c.value) * 2.6,
          itemStyle: { color: c.value >= 25 ? INK : c.value >= 12 ? MID : LIGHT },
          label: called.has(`${c.i}:${c.j}`)
            ? {
                show: true,
                position: 'top' as const,
                distance: 4,
                color: INK,
                fontFamily: SANS,
                fontSize: 7,
                fontWeight: 800,
                formatter: () => String(c.value),
              }
            : undefined,
        })),
      },
      {
        // Product names, down the left.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 3,
        data: products.map((product, i) => ({ value: [columnX(0), rowY(i)], name: product })),
        label: {
          show: true,
          position: 'left',
          distance: 8,
          color: MID,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 600,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // City names, angled off the top of the first horizon. Twelve set
        // horizontally at this column spacing would collide.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 3,
        data: cities.map((city, j) => ({
          value: [columnX(j), cellY(0, j) + 22],
          name: city,
          label: { rotate: 55 },
        })),
        label: {
          show: true,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 7,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption();

export function ArcMatrix({
  products = PRODUCTS,
  cities = CITIES,
}: {
  products?: readonly string[];
  cities?: readonly string[];
}) {
  const option = useMemo(() => buildOption(products, cities), [products, cities]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-arc-matrix">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
