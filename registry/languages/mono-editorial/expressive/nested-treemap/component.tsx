/**
 * Where the engineering hours went — mono-editorial
 *
 * A treemap two levels deep: three org areas, each holding the teams inside it.
 * Area is the encoding, so a team's share of the year is legible against every
 * other team without reading a single number.
 *
 * The fill is one tone throughout. Areas are separated by gaps painted in the
 * page colour rather than by colour, because a treemap that tints each branch
 * spends its whole palette on grouping and has none left for magnitude — and in
 * this language there is no palette to spend.
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

/** The ancestry a treemap hands its formatter, which the shared params type omits. */
type TreemapParams = CallbackDataParams & {
  treePathInfo?: { name: string }[];
};

/**
 * Mount an option onto an element and clean up after it.
 *
 * Inlined rather than imported. A component is lifted out of this registry one
 * at a time, so one file has to be the whole component — an import of a shared
 * hook would hand a consumer a path that does not resolve in their project.
 *
 * The SVG renderer is not a preference. Canvas leaves nothing in the DOM to
 * inspect, so a canvas chart cannot be checked by `nodex lint`.
 */
function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/** One area of the org and the teams inside it, in hours. */
export interface Area {
  readonly name: string;
  readonly teams: readonly (readonly [team: string, hours: number])[];
}

export const AREAS: readonly Area[] = [
  {
    name: 'PRODUCT',
    teams: [
      ['Core app', 260],
      ['Collaboration', 190],
      ['Search', 110],
      ['Mobile', 80],
    ],
  },
  {
    name: 'PLATFORM',
    teams: [
      ['AI systems', 170],
      ['Data infra', 120],
      ['APIs', 105],
    ],
  },
  {
    name: 'GROWTH',
    teams: [
      ['Acquisition', 90],
      ['Retention', 80],
      ['Onboarding', 75],
    ],
  },
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const FILL = '#55554F';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(areas: readonly Area[]): EChartsOption {
  const total = areas.reduce(
    (sum, area) => sum + area.teams.reduce((s, [, hours]) => s + hours, 0),
    0,
  );

  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },
    aria: { enabled: true },

    tooltip: {
      backgroundColor: PAPER,
      borderColor: INK,
      borderWidth: 1,
      textStyle: { color: INK, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = (Array.isArray(p) ? p[0] : p) as TreemapParams | undefined;
        if (!hit) return '';
        // The heading carries a share, so it is stripped from the path: the
        // tooltip states the team's own share below it.
        const path = (hit.treePathInfo ?? [])
          .slice(1)
          .map((d) => d.name.replace(/ · .*$/, ''))
          .join(' / ');
        const hours = (hit.value as number) ?? 0;
        return `${path}<br><b>${hours} hours</b> · ${((hours / total) * 100).toFixed(1)}%`;
      },
    },

    series: [
      {
        type: 'treemap',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        // A picture of one year, not an explorer: drilling in would replace the
        // comparison the chart exists to make.
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        leafDepth: 2,
        squareRatio: 1.2,
        label: {
          show: true,
          position: 'insideTopLeft',
          padding: [10, 8],
          color: INK,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 18,
          formatter: (p: CallbackDataParams) => {
            const depth = (p as TreemapParams).treePathInfo?.length ?? 0;
            // The root fills the card, so labelling it says nothing; an area
            // gets its name; a team gets its name and its hours.
            if (depth <= 1) return '';
            if (depth === 2) return p.name;
            return `${p.name}\n${p.value as number} h`;
          },
        },
        upperLabel: {
          show: true,
          height: 32,
          padding: [0, 10],
          color: INK,
          fontSize: 10,
          fontWeight: 700,
          backgroundColor: PAPER,
        },
        // Gaps in the page colour, not borders: this language draws separation
        // by absence rather than by a line around every cell.
        itemStyle: { borderColor: PAPER, borderWidth: 2, gapWidth: 2 },
        emphasis: { focus: 'ancestor', itemStyle: { borderColor: INK, borderWidth: 1.1 } },
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 5 } },
          {
            upperLabel: { show: true, height: 32 },
            itemStyle: { borderColor: PAPER, borderWidth: 3, gapWidth: 3 },
          },
          {
            upperLabel: { show: false },
            itemStyle: { borderColor: PAPER, borderWidth: 2, gapWidth: 2 },
          },
        ],
        data: areas.map((area) => {
          const hours = area.teams.reduce((s, [, h]) => s + h, 0);
          return {
            // The share is in the heading because an area's own rectangle is
            // the one thing a treemap cannot label with a number in place.
            name: `${area.name} · ${Math.round((hours / total) * 100)}%`,
            children: area.teams.map(([team, teamHours]) => ({
              name: team,
              value: teamHours,
              itemStyle: { color: FILL },
              label: { color: PAPER },
            })),
          };
        }),
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
export const previewOption = (): EChartsOption => buildOption(AREAS);

export function NestedTreemap({ areas = AREAS }: { areas?: readonly Area[] }) {
  const option = useMemo(() => buildOption(areas), [areas]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-nested-treemap">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
