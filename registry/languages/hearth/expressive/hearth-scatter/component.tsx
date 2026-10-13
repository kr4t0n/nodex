'use client';

import { useId, useMemo } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  formatHearthNumber,
  hearthChartFocus,
  type HearthTone,
} from '../../../../_shared/hearth-chart-frame';

const hearthTones: Record<HearthTone, string> = {
  a: 'var(--nx-seriesA)',
  b: 'var(--nx-seriesB)',
  c: 'var(--nx-seriesC)',
  d: 'var(--nx-seriesD)',
};

export interface HearthScatterGroup {
  id: string;
  label: string;
  /** Stable category identity; omitted tones follow the group order a–d. */
  tone?: HearthTone;
}

export interface HearthScatterDatum {
  id: string;
  label: string;
  /** ID of one declared group. */
  group: string;
  x: number | null;
  y: number | null;
  /** Optional short note written beside the point, for the readings worth explaining. */
  note?: string;
}

export interface HearthScatterProps {
  data: readonly HearthScatterDatum[];
  /** One to four groups; each has its own color and point form. */
  groups: readonly HearthScatterGroup[];
  xLabel?: string;
  yLabel?: string;
  unitLabel?: string;
  contextLabel?: string;
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

type Form = 'circle' | 'square' | 'diamond' | 'triangle';
const forms: Form[] = ['circle', 'square', 'diamond', 'triangle'];
const order: HearthTone[] = ['a', 'b', 'c', 'd'];

/** Recharts observation fields are spread into shape props, so the public row is nested. */
interface Point {
  pointId: string;
  x: number;
  y: number;
  row: HearthScatterDatum;
  groupLabel: string;
  paint: string;
  form: Form;
}

function Glyph({
  form,
  cx,
  cy,
  paint,
}: {
  form: Form;
  cx: number;
  cy: number;
  paint: string;
}) {
  const common = {
    fill: paint,
    stroke: 'var(--nx-paper)',
    strokeWidth: 'var(--nx-stroke-hairline)',
  };
  if (form === 'square')
    return <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} {...common} />;
  if (form === 'diamond')
    return (
      <path
        d={`M${cx} ${cy - 6}L${cx + 6} ${cy}L${cx} ${cy + 6}L${cx - 6} ${cy}Z`}
        {...common}
      />
    );
  if (form === 'triangle')
    return (
      <path
        d={`M${cx} ${cy - 6}L${cx + 6} ${cy + 4.5}L${cx - 6} ${cy + 4.5}Z`}
        {...common}
      />
    );
  return <circle cx={cx} cy={cy} r={5} {...common} />;
}

function Mark(props: unknown) {
  const { cx, cy, payload } = props as {
    cx?: number;
    cy?: number;
    payload?: Point;
  };
  const plot = usePlotArea();
  if (!payload || cx === undefined || cy === undefined) return <g />;
  // Notes on the right half read leftwards so they stay inside the plot.
  const leftwards = !!plot && cx > plot.x + plot.width / 2;
  return (
    <g data-nx-hearth-dot={payload.row.id} data-nx-hearth-form={payload.form}>
      <Glyph form={payload.form} cx={cx} cy={cy} paint={payload.paint} />
      {payload.row.note && (
        <text
          x={leftwards ? cx - 10 : cx + 10}
          y={cy - 8}
          textAnchor={leftwards ? 'end' : 'start'}
          fill="var(--nx-ink)"
          fontSize="var(--nx-type-note-size)"
          fontStyle="italic"
          fontFamily="var(--nx-font-heading)"
          data-nx-hearth-note={payload.row.id}
        >
          {payload.row.note}
        </text>
      )}
    </g>
  );
}

/** Two measurements per observation; color and form both name the group, notes explain outliers. */
export function HearthScatter({
  data,
  groups,
  xLabel = 'X',
  yLabel = 'Y',
  unitLabel = 'Relationship',
  contextLabel,
  xFormatter = formatHearthNumber,
  yFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Two measurements per observation',
}: HearthScatterProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { points, valid, unavailable } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) =>
      items.every((item) => item.id.trim()) &&
      new Set(items.map((item) => item.id)).size === items.length;
    const lookup = new Map(groups.map((group, index) => [group.id, index]));
    let valid = unique(data) && unique(groups);
    let unavailable = 0;
    const points: Point[] = [];
    for (const row of data) {
      const index = lookup.get(row.group);
      if (index === undefined) {
        valid = false;
        continue;
      }
      const { x, y } = row;
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        unavailable++;
        continue;
      }
      const group = groups[index]!;
      points.push({
        pointId: row.id,
        x,
        y,
        row,
        groupLabel: group.label,
        paint: hearthTones[group.tone ?? order[index]!],
        form: forms[index]!,
      });
    }
    return { points, valid, unavailable };
  }, [data, groups]);
  const status =
    groups.length < 1 || groups.length > 4
      ? 'Use one to four groups.'
      : !valid
        ? 'Each observation needs a unique, nonempty ID and a declared group.'
        : !points.length
          ? 'No observations available.'
          : null;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-scatter"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      <ul
        aria-label="Groups"
        className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-x-[var(--nx-space-gridGap)] gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"
      >
        {groups.map((group, index) => (
          <li key={group.id} className="flex items-center gap-2">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
              <Glyph
                form={forms[index]!}
                cx={7}
                cy={7}
                paint={hearthTones[group.tone ?? order[index]!]}
              />
            </svg>
            {group.label}
          </li>
        ))}
      </ul>
      <p
        aria-hidden="true"
        className="mt-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"
      >
        {yLabel}
      </p>
      <div className="mt-1 overflow-x-auto">
        <div style={{ minWidth: 280, height: 300 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 300 }}
          >
            <ScatterChart
              accessibilityLayer
              title={label}
              desc={`Each mark is one observation: ${xLabel} across, ${yLabel} up. Color and form both identify the group; italic notes explain selected readings. Use Left and Right Arrow to inspect observations.`}
              margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
              className={hearthChartFocus}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--nx-grid)"
                strokeWidth="var(--nx-stroke-hairline)"
              />
              <XAxis
                dataKey="x"
                type="number"
                domain={['auto', 'auto']}
                name={xLabel}
                height={48}
                padding={{ left: 12, right: 12 }}
                tickCount={5}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                tickFormatter={xFormatter}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
                label={{
                  value: xLabel,
                  position: 'insideBottom',
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-caption-size)',
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={['auto', 'auto']}
                name={yLabel}
                width={56}
                padding={{ top: 12, bottom: 12 }}
                tickCount={5}
                axisLine={false}
                tickLine={false}
                tickFormatter={yFormatter}
                tick={{
                  fill: 'var(--nx-muted)',
                  fontSize: 'var(--nx-type-axis-size)',
                }}
              />
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  return active && point ? (
                    <HearthChartTooltip title={point.row.label}>
                      <div>{point.groupLabel}</div>
                      <div className="tabular-nums">
                        {xLabel}: {xFormatter(point.x)} · {yLabel}:{' '}
                        {yFormatter(point.y)}
                      </div>
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              <Scatter
                id={`${id}-points`}
                data={points}
                fill="var(--nx-seriesA)"
                activeShape={false}
                shape={Mark}
                {...motion}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      {unavailable > 0 && (
        <p className="mt-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
          {unavailable} unavailable, not shown
        </p>
      )}
    </HearthChartFrame>
  );
}
