/**
 * Eight years of support volume, twelve product areas — mono-editorial
 *
 * An almanac page rather than a bubble chart. Three things carry that and all
 * three are load-bearing: ledger hairlines under everything, bubbles drawn
 * large enough to collide and overlap into washes, and marginalia pointing at
 * what the marks mean.
 *
 * No bubble is a compass circle. Each rim wobbles on two slow sine waves plus
 * a little noise, so every mark is its own slightly-off print — which is what
 * stops ninety overlapping circles reading as a machine diagram. Beta areas
 * are drawn as dashed outlines with no core: barely anybody files tickets
 * against a beta, and an empty outline says that better than a small circle.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn,
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

export const AREAS = [
  'EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT',
  'PAGES', 'SYNC', 'GRID', 'VIEWS', 'HUB', 'FORMS',
] as const;

const FIRST_YEAR = 2019;
const YEARS = 8;

/** When each area shipped. Nothing is drawn before its own first year. */
const BORN: Record<string, number> = {
  EDITOR: 2019, BOARDS: 2019, DOCS: 2019, CHAT: 2020, FLOWS: 2020, VAULT: 2021,
  PAGES: 2021, SYNC: 2022, GRID: 2022, VIEWS: 2023, HUB: 2024, FORMS: 2024,
};

/** Areas that were still in beta up to and including the given year. */
const BETA_UNTIL: Record<string, number> = { GRID: 2023, VIEWS: 2024, HUB: 2025, FORMS: 2025 };

/** The almanac's shelf of events, printed under the field. */
export const EVENTS: readonly (readonly [year: string, note: string])[] = [
  ['2020', 'SLA introduced'],
  ['2022', 'self-serve help center'],
  ['2023', 'the GA wave'],
  ['2025', 'AI deflection live'],
];

/** One bubble: an area's ticket volume in one year. */
export type Reading = {
  readonly area: string;
  readonly year: number;
  readonly tickets: number;
  readonly beta: boolean;
  readonly row: number;
  readonly column: number;
};

export const READINGS: readonly Reading[] = (() => {
  const out: Reading[] = [];
  for (let i = 0; i < YEARS; i++) {
    const year = FIRST_YEAR + i;
    AREAS.forEach((area, j) => {
      if (year < (BORN[area] ?? Infinity)) return;
      const age = year - (BORN[area] ?? year);
      // A steep spread on purpose: quiet areas stay pinpricks and busy ones
      // balloon, which is what makes the page a landscape rather than a grid.
      const v = Math.round((2 + age * 5) * (0.25 + rnd(i * 12 + j + 1, j + 3) ** 2 * 2.2));
      const beta = BETA_UNTIL[area] !== undefined && year <= (BETA_UNTIL[area] ?? 0);
      out.push({ area, year, tickets: Math.max(1, v), beta, row: i, column: j });
    });
  }
  // Large first, so the giants sit underneath as washes rather than blotting
  // out the small marks on top of them.
  return out.sort((a, b) => b.tickets - a.tickets);
})();

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const LEDGER = '#E4E3DC';
const RULE = '#D3D2CA';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';
const MUTED = '#8F8E88';
const NOTE = '#6A6963';

const SANS = "'Inter', sans-serif";

/**
 * A rim that wobbles, so no two bubbles are the same circle.
 *
 * Built in pixels rather than data units: a custom series draws in screen
 * space, and converting thirty rim points per bubble through the axis would
 * cost far more than converting one centre and a radius.
 */
function blob(cx: number, cy: number, r: number, seed: number) {
  const n = Math.max(14, Math.round(r * 1.6));
  const points: [number, number][] = [];
  for (let t = 0; t < n; t++) {
    const a = (t / n) * Math.PI * 2;
    const w =
      1 + 0.055 * Math.sin(a * 2 + seed * 7) + 0.04 * Math.sin(a * 3 + seed * 13) +
      (rnd(seed + t, 3) - 0.5) * 0.03;
    points.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w]);
  }
  let d = `M${points[0]![0].toFixed(1)} ${points[0]![1].toFixed(1)}`;
  for (let t = 0; t < n; t++) {
    const p = points[t]!;
    const q = points[(t + 1) % n]!;
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return `${d} Z`;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(readings: readonly Reading[] = READINGS): EChartsOption {
  const columnX = (j: number) => j * 57;
  const rowY = (i: number) => -i * 34;

  const spread = columnX(AREAS.length - 1);
  const left = -76;
  const right = spread + 30;

  // Ledger paper, under everything.
  const ledger: ([number, number] | null)[] = [];
  for (let y = 24; y >= rowY(YEARS - 1) - 42; y -= 6.8) {
    ledger.push([left, y], [right, y], null);
  }

  // A firmer rule on each year, which is the scale.
  const yearRules: ([number, number] | null)[] = [];
  for (let i = 0; i < YEARS; i++) yearRules.push([left, rowY(i)], [right, rowY(i)], null);

  const top3 = new Set(readings.slice(0, 3).map((r) => `${r.row}:${r.column}`));

  // Marginalia. Each is a hairline from a mark out to a note in the margin.
  const pointers: ([number, number] | null)[] = [];
  const notes: { value: [number, number]; name: string }[] = [];
  const marginalia: readonly (readonly [number, number, number, number, string])[] = [
    [columnX(3) + 30, rowY(5) + 14, columnX(3) + 118, rowY(5) + 38, 'chat tickets triple after mobile GA'],
    [columnX(9) + 16, rowY(2) - 8, columnX(9) + 80, rowY(2) - 30, 'betas barely ticket — nobody files bugs on toys'],
  ];
  for (const [x0, y0, x1, y1, text] of marginalia) {
    for (let t = 0; t <= 16; t++) {
      const u = t / 16;
      pointers.push([
        (1 - u) ** 3 * x0 + 3 * (1 - u) ** 2 * u * ((x0 + x1) / 2) +
          3 * (1 - u) * u * u * (x1 - 22) + u ** 3 * x1,
        (1 - u) ** 3 * y0 + 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y1 + u ** 3 * y1,
      ]);
    }
    pointers.push(null);
    notes.push({ value: [x1, y1], name: text });
  }

  const shelfY = rowY(YEARS - 1) - 30;

  const bubble = (
    params: { dataIndex: number },
    api: CustomSeriesRenderItemAPI,
  ): CustomSeriesRenderItemReturn => {
    const r = readings[params.dataIndex]!;
    // Jittered off the gridline, so a column reads as hand-set rather than
    // as a machine-plotted grid.
    const jitter = (rnd(r.row * 7 + r.column + 2, r.column + 9) - 0.5) * 10;
    const [cx = 0, cy = 0] = api.coord([columnX(r.column) + jitter, rowY(r.row)]);
    const [ux = 0] = api.coord([columnX(r.column) + jitter + 1, rowY(r.row)]);
    const radius = Math.sqrt(r.tickets) * 3.8 * Math.abs(ux - cx);
    const seed = r.row * 12 + r.column;

    if (r.beta) {
      return {
        type: 'path',
        shape: { pathData: blob(cx, cy, radius, seed) },
        style: { fill: 'none', stroke: MUTED, lineWidth: 1, lineDash: [3, 3] },
      };
    }

    const offsetX = (rnd(seed + 1, 17) - 0.5) * radius * 0.3;
    const offsetY = (rnd(seed + 3, 19) - 0.5) * radius * 0.3;
    return {
      type: 'group',
      children: [
        {
          type: 'path',
          shape: { pathData: blob(cx, cy, radius, seed) },
          style: {
            fill: INK,
            opacity: 0.09 + rnd(r.row + 2, r.column + 4) * 0.1,
            stroke: INK,
            // Was the one stroke in the registry the lint could not check: as
            // source it is an expression, and "largest number wins" would have
            // read the 11 in a hash argument as an 11px line. Rendered, it is
            // a literal inside the ceiling, and the warning is gone.
            lineWidth: 0.6 + rnd(r.row + 3, r.column + 11) * 0.8,
            strokeOpacity: 0.3 + rnd(r.row + 5, r.column + 7) * 0.35,
          },
        },
        {
          // The escalation core, nudged off centre like a press mark.
          type: 'path',
          shape: { pathData: blob(cx + offsetX, cy + offsetY, Math.max(1.4, radius * 0.17), seed + 29) },
          style: { fill: INK },
        },
      ],
    };
  };

  return {
    color: [LEDGER, RULE, INK, MUTED],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 6,
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

    grid: { left: 30, right: 18, top: 40, bottom: 18 },

    xAxis: { show: false, type: 'value', min: left, max: right },
    yAxis: { show: false, type: 'value', min: shelfY - 26, max: 30 },

    series: [
      {
        // Ledger paper.
        type: 'line',
        data: ledger,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: LEDGER, width: 0.5 },
        silent: true,
        z: 1,
      },
      {
        // One firmer rule per year.
        type: 'line',
        data: yearRules,
        symbol: 'none',
        lineStyle: { color: RULE, width: 0.9 },
        silent: true,
        z: 2,
      },
      {
        // The bubbles.
        type: 'custom',
        renderItem: bubble,
        z: 3,
        data: readings.map((r) => ({
          value: [columnX(r.column), rowY(r.row)],
          name: `${r.area} · ${r.year} — ${r.tickets * 10} tickets${r.beta ? ' (beta)' : ''}`,
        })),
      },
      {
        // The years.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: Array.from({ length: YEARS }, (_, i) => ({
          value: [left, rowY(i)] as [number, number],
          name: String(FIRST_YEAR + i),
        })),
        label: {
          show: true,
          position: 'left',
          distance: 4,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // Area names, angled across the head of the page.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: AREAS.map((area, j) => ({
          value: [columnX(j), 20] as [number, number],
          name: area,
          label: { rotate: 32 },
        })),
        label: {
          show: true,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // The three largest, carrying their number.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 5,
        data: readings
          .filter((r) => top3.has(`${r.row}:${r.column}`))
          .map((r) => ({
            value: [columnX(r.column), rowY(r.row) + Math.sqrt(r.tickets) * 3.8 + 6] as [number, number],
            name: String(r.tickets * 10),
          })),
        label: {
          show: true,
          color: INK,
          fontFamily: SANS,
          fontSize: 8.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // Marginalia: the pointer hairlines.
        type: 'line',
        data: pointers,
        symbol: 'none',
        lineStyle: { color: QUIET, width: 0.7 },
        silent: true,
        z: 5,
      },
      {
        // Marginalia: the notes themselves.
        type: 'scatter',
        data: notes,
        symbolSize: 0,
        silent: true,
        z: 5,
        label: {
          show: true,
          position: 'right',
          distance: 5,
          color: NOTE,
          fontFamily: SANS,
          fontSize: 7,
          fontStyle: 'italic',
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // The shelf of events under the field.
        type: 'line',
        data: [[left, shelfY], [right, shelfY], null],
        symbol: 'none',
        lineStyle: { color: FAINT, width: 0.8 },
        silent: true,
        z: 4,
      },
      {
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 5,
        data: EVENTS.map(([year, note], k) => ({
          value: [left + 34 + k * (spread / 3.6), shelfY] as [number, number],
          name: `${year}||${note}`,
        })),
        label: {
          show: true,
          position: 'bottom',
          distance: 6,
          align: 'left',
          color: INK,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 800,
          rich: { note: { color: MUTED, fontSize: 7, fontWeight: 400, fontFamily: SANS } },
          formatter: (p: CallbackDataParams) => {
            const [year = '', note = ''] = String(p.name ?? '').split('||');
            return `${year}\n{note|${note}}`;
          },
        },
      },
      {
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 5,
        data: [{ value: [left, shelfY + 10] as [number, number], name: 'IMPORTANT EVENTS' }],
        label: {
          show: true,
          position: 'right',
          distance: 0,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 7,
          fontWeight: 800,
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

export function BubbleAlmanac({ readings = READINGS }: { readings?: readonly Reading[] }) {
  const option = useMemo(() => buildOption(readings), [readings]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-bubble-almanac">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
