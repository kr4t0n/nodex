'use client';

import { useId, useMemo } from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  type PieLabelRenderProps,
  type PieSectorShapeProps,
} from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import {
  HearthChartFrame,
  HearthChartTooltip,
  formatHearthNumber,
  hearthChartFocus,
  useHearthEntrance,
} from '../../../../_shared/hearth-chart-frame';

export interface HearthRosetteDatum {
  id: string;
  /** Short period name written at the rim, such as Jan. */
  label: string;
  /** Finite, nonnegative amount. Null and invalid values are unavailable. */
  value: number | null;
}

export interface HearthRosetteProps {
  /** Three to twenty-four periods in cycle order, starting at the top. */
  data: readonly HearthRosetteDatum[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Petal {
  id: string;
  label: string;
  value: number | null;
  weight: number;
  /** Share of the largest value; the petal's area outside the hub follows it. */
  share: number;
}

const inner = 6;
const reach = 66;
const rim = 84;

/**
 * A sector's area grows with r² − hub², not r², so the hub would inflate small
 * petals if radius alone followed the square root of the share.
 */
const petalRadius = (share: number) =>
  Math.sqrt(inner ** 2 + (reach ** 2 - inner ** 2) * share);
const openOut: Keyframe[] = [
  { clipPath: 'circle(0% at 50% 50%)' },
  { clipPath: 'circle(71% at 50% 50%)' },
];

/** The paper stroke separates neighbours; zero and unavailable periods keep only the rim label. */
function PetalMark(props: PieSectorShapeProps) {
  const petal = props.payload as Petal;
  if (!petal.value) return <g data-nx-hearth-petal={petal.id} />;
  return (
    <Sector
      {...props}
      fill="var(--nx-valueFill)"
      stroke="var(--nx-paper)"
      strokeWidth="var(--nx-stroke-mark)"
      data-nx-hearth-petal={petal.id}
      data-nx-value={petal.value}
    />
  );
}

function RimLabel(
  props: PieLabelRenderProps,
  format: (value: number) => string,
) {
  const { cx, cy, startAngle, endAngle } = props;
  const petal = props.payload as Petal;
  const radius = (Math.min(cx as number, cy as number) * rim) / 100;
  const angle = (-((startAngle + endAngle) / 2) * Math.PI) / 180;
  const x = (cx as number) + radius * Math.cos(angle);
  const y = (cy as number) + radius * Math.sin(angle);
  return (
    <g
      pointerEvents="none"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="var(--nx-font-sans)"
      data-nx-hearth-rim={petal.id}
    >
      <text
        x={x}
        y={y - 8}
        fill="var(--nx-muted)"
        fontSize="var(--nx-type-axis-size)"
      >
        {petal.label}
      </text>
      <text
        x={x}
        y={y + 8}
        fill="var(--nx-ink)"
        fontSize="var(--nx-type-caption-size)"
        fontWeight="var(--nx-font-weight-semibold)"
        className="tabular-nums"
      >
        {petal.value === null ? '—' : format(petal.value)}
      </text>
    </g>
  );
}

/** Equal angles for each period of a cycle; petal area outside the hub, not radius, is proportional to the amount. */
export function HearthRosette({
  data,
  unitLabel = 'Value',
  contextLabel,
  valueFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Amounts through a cycle',
}: HearthRosetteProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const opening = useHearthEntrance(animate, 'draw', openOut);
  const id = useId();
  const { petals, valid } = useMemo(() => {
    const valid =
      data.every((datum) => datum.id.trim()) &&
      new Set(data.map((datum) => datum.id)).size === data.length;
    const values = data.map((datum) =>
      typeof datum.value === 'number' &&
      Number.isFinite(datum.value) &&
      datum.value >= 0
        ? datum.value
        : null,
    );
    const largest = Math.max(0, ...values.map((value) => value ?? 0));
    const petals = data.map((datum, index): Petal => ({
      id: datum.id,
      label: datum.label,
      value: values[index] ?? null,
      weight: 1,
      share: largest > 0 ? (values[index] ?? 0) / largest : 0,
    }));
    return { petals, valid };
  }, [data]);
  const status =
    data.length < 3 || data.length > 24
      ? 'Use three to twenty-four periods.'
      : !valid
        ? 'Each period needs a unique, nonempty ID.'
        : !petals.some((petal) => petal.value !== null)
          ? 'No observations available.'
          : null;
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-rosette"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      {/* A table ignores the clipping width, so its wrapper is the hidden box. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">{unitLabel}</th>
            </tr>
          </thead>
          <tbody>
            {petals.map((petal) => (
              <tr key={petal.id}>
                <th scope="row">{petal.label}</th>
                <td>
                  {petal.value === null
                    ? 'Unavailable'
                    : valueFormatter(petal.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        ref={opening}
        className="mx-auto mt-[var(--nx-space-cardBodyGap)] aspect-square w-full max-w-[440px] min-w-0"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 440, height: 440 }}
        >
          <PieChart
            accessibilityLayer
            title={label}
            desc={`Each period has an equal angle, clockwise from the top. Petal area is proportional to ${unitLabel}, measured outside the central hub. Values are written at the rim; a dash means unavailable. Use Left and Right Arrow to inspect periods.`}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            className={hearthChartFocus}
          >
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const petal = payload?.[0]?.payload as Petal | undefined;
                return active && petal ? (
                  <HearthChartTooltip title={petal.label}>
                    {petal.value === null
                      ? 'Unavailable'
                      : `${valueFormatter(petal.value)} ${unitLabel}`}
                  </HearthChartTooltip>
                ) : null;
              }}
            />
            <Pie
              id={`${id}-petals`}
              data={petals}
              dataKey="weight"
              nameKey="label"
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={`${inner}%`}
              outerRadius={(petal: Petal) => `${petalRadius(petal.share)}%`}
              shape={PetalMark}
              label={(props: PieLabelRenderProps) =>
                RimLabel(props, valueFormatter)
              }
              labelLine={false}
              rootTabIndex={-1}
              fill="var(--nx-valueFill)"
              stroke="none"
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </HearthChartFrame>
  );
}
