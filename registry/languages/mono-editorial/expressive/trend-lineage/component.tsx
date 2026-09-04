/**
 * Ten product features, shipped and reworked — mono-editorial
 *
 * One column per feature, running down the years. A filled dot is a ship; a
 * hollow one is a rework. The line between two events goes dashed when more
 * than two years separate them, so a feature that was left alone reads
 * differently from one under continuous work — the same distance, told apart
 * by texture rather than by a second colour.
 *
 * A column that reaches the baseline is still alive; one that stops has been
 * retired, and it stops where it stopped rather than fading toward today.
 * That is the whole finding: the retired features are the short columns.
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

/** What happened to a feature in a given year. */
export type EventKind = 'shipped' | 'reworked';

/** One row per feature: its events in order, and whether it is still alive. */
export type Feature = {
  readonly name: string;
  readonly events: readonly (readonly [year: number, kind: EventKind])[];
  readonly alive: boolean;
};

export const FEATURES: readonly Feature[] = [
  { name: 'Dark mode', events: [[2017, 'shipped'], [2022, 'reworked']], alive: true },
  { name: 'Kanban', events: [[2016, 'shipped']], alive: true },
  { name: 'Wikis', events: [[2016, 'shipped'], [2019, 'reworked']], alive: false },
  { name: 'Slash cmds', events: [[2018, 'shipped']], alive: true },
  { name: 'Templates', events: [[2019, 'shipped'], [2024, 'reworked']], alive: true },
  { name: 'Inbox', events: [[2020, 'shipped']], alive: false },
  { name: 'Live cursors', events: [[2020, 'shipped'], [2023, 'reworked']], alive: true },
  { name: 'AI drafts', events: [[2023, 'shipped'], [2025, 'reworked']], alive: true },
  { name: 'Voice notes', events: [[2021, 'shipped']], alive: false },
  { name: 'Offline', events: [[2018, 'shipped'], [2026, 'reworked']], alive: true },
];

const FIRST_YEAR = 2016;
const LAST_YEAR = 2026;

/** Beyond this many quiet years, a segment goes dashed. */
const DORMANT_AFTER = 2;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const RULE = '#E3E2DB';
const STEM = '#B0AFA9';
const FAINT = '#C6C5BF';
const MUTED = '#8F8E88';
const LABEL = '#4A4944';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(features: readonly Feature[] = FEATURES): EChartsOption {
  // Years run downward, so the column reads as a life rather than as a bar.
  const yearY = (year: number) => -(year - FIRST_YEAR);
  const columnX = (c: number) => c;

  const rules: ([number, number] | null)[] = [];
  const yearLabels: { value: [number, number]; name: string }[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    rules.push([-0.75, yearY(year)], [features.length - 0.25, yearY(year)], null);
    if (year % 2 === 0) {
      yearLabels.push({ value: [-0.75, yearY(year)], name: String(year) });
    }
  }

  const solid: ([number, number] | null)[] = [];
  const dashed: ([number, number] | null)[] = [];
  const tails: ([number, number] | null)[] = [];
  const shipped: { value: [number, number]; name: string }[] = [];
  const reworked: { value: [number, number]; name: string }[] = [];
  const aliveEnds: [number, number][] = [];
  const deadEnds: [number, number][] = [];
  const names: { value: [number, number]; name: string; alive: boolean }[] = [];

  const baseline = yearY(LAST_YEAR) - 0.7;

  features.forEach(({ name, events, alive }, c) => {
    const x = columnX(c);

    for (let k = 0; k < events.length - 1; k++) {
      const [from] = events[k]!;
      const [to] = events[k + 1]!;
      const seg: ([number, number] | null)[] =
        to - from > DORMANT_AFTER ? dashed : solid;
      seg.push([x, yearY(from) - 0.28], [x, yearY(to) + 0.28], null);
    }

    const [last] = events[events.length - 1]!;
    if (alive) {
      tails.push([x, yearY(last) - 0.28], [x, baseline], null);
      aliveEnds.push([x, baseline]);
    } else {
      deadEnds.push([x, yearY(last) - 0.5]);
    }

    for (const [year, kind] of events) {
      const dot = { value: [x, yearY(year)] as [number, number], name: `${name} — ${kind} ${year}` };
      (kind === 'shipped' ? shipped : reworked).push(dot);
    }

    names.push({ value: [x, baseline - 0.45], name, alive });
  });

  const nameLabel = (alive: boolean) =>
    ({
      show: true,
      position: 'bottom' as const,
      distance: 6,
      // Angled, because ten names set horizontally under columns this close
      // together would collide, and turning the card sideways to fit them is
      // not a chart decision.
      rotate: 38,
      align: 'right' as const,
      verticalAlign: 'middle' as const,
      color: alive ? LABEL : STEM,
      fontFamily: SANS,
      fontSize: 6.8,
      fontWeight: 600,
      formatter: (p: CallbackDataParams) => String(p.name ?? ''),
    });

  return {
    color: [RULE, STEM, INK, MUTED],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 800,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 12,
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

    grid: { left: 46, right: 22, top: 20, bottom: 62 },

    xAxis: { show: false, type: 'value', min: -0.9, max: features.length - 0.2 },
    yAxis: { show: false, type: 'value', min: baseline - 1.6, max: 0.7 },

    series: [
      {
        // A rule per year, which is the scale.
        type: 'line',
        data: rules,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: RULE, width: 0.8 },
        silent: true,
        z: 1,
      },
      {
        // Under continuous work.
        type: 'line',
        data: solid,
        symbol: 'none',
        lineStyle: { color: STEM, width: 1 },
        silent: true,
        z: 2,
      },
      {
        // Left alone. Same distance, told apart by texture rather than colour.
        type: 'line',
        data: dashed,
        symbol: 'none',
        lineStyle: { color: STEM, width: 1, type: [2, 4] },
        silent: true,
        z: 2,
      },
      {
        // Still alive, so the column reaches today.
        type: 'line',
        data: tails,
        symbol: 'none',
        lineStyle: { color: STEM, width: 1 },
        silent: true,
        z: 2,
      },
      {
        // Shipped.
        type: 'scatter',
        data: shipped,
        symbolSize: 11,
        itemStyle: { color: INK },
        z: 4,
      },
      {
        // Reworked. Hollow, so a rework is legible as a different kind of
        // event without spending a second colour on it.
        type: 'scatter',
        data: reworked,
        symbolSize: 11,
        itemStyle: { color: PAPER, borderColor: INK, borderWidth: 1.4 },
        z: 4,
      },
      {
        // Reached today.
        type: 'scatter',
        data: aliveEnds,
        symbolSize: 6,
        itemStyle: { color: INK },
        silent: true,
        z: 4,
      },
      {
        // Retired, stopping where it stopped rather than fading toward today.
        type: 'scatter',
        data: deadEnds,
        symbolSize: 3.2,
        itemStyle: { color: FAINT },
        silent: true,
        z: 4,
      },
      {
        // The years.
        type: 'scatter',
        data: yearLabels,
        symbolSize: 0,
        silent: true,
        z: 3,
        label: {
          show: true,
          position: 'left',
          distance: 6,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 600,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // Feature names, split by whether the feature survived, because the
        // two want different weights and one series carries one label style.
        type: 'scatter',
        data: names.filter((n) => n.alive),
        symbolSize: 0,
        silent: true,
        z: 3,
        label: nameLabel(true),
      },
      {
        type: 'scatter',
        data: names.filter((n) => !n.alive),
        symbolSize: 0,
        silent: true,
        z: 3,
        label: nameLabel(false),
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

export function TrendLineage({ features = FEATURES }: { features?: readonly Feature[] }) {
  const option = useMemo(() => buildOption(features), [features]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-trend-lineage">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
