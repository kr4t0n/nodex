'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  type BarShapeProps,
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

export interface HearthSharesPart {
  id: string;
  label: string;
  /** Stable category identity; omitted tones follow the part order a–d. */
  tone?: HearthTone;
}

export interface HearthSharesDatum {
  id: string;
  label: string;
  /** Amount per part ID. Every part needs a finite, nonnegative amount. */
  values: Readonly<Record<string, number | null>>;
}

export interface HearthSharesProps {
  data: readonly HearthSharesDatum[];
  /** One to four parts, in stacking order. */
  parts: readonly HearthSharesPart[];
  unitLabel?: string;
  contextLabel?: string;
  valueFormatter?: (value: number) => string;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface Row {
  id: string;
  label: string;
  index: number;
  /** Null when any part is unavailable or the whole is zero. */
  total: number | null;
  amounts: Record<string, number>;
  shares: Record<string, number>;
}

const order: HearthTone[] = ['a', 'b', 'c', 'd'];
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

function Segment({ x, y, width, height, payload, paint, part }: SegmentProps) {
  const row = payload as Row;
  if (row.total === null || width <= 0 || height <= 0) return <g />;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={paint}
      stroke="var(--nx-paper)"
      strokeWidth="var(--nx-stroke-mark)"
      style={{ rx: 'var(--nx-radius-bar)', ry: 'var(--nx-radius-bar)' }}
      data-nx-hearth-share={`${row.id}:${part}`}
      data-nx-value={row.shares[part]}
    />
  );
}
type SegmentProps = BarShapeProps & { paint: string; part: string };

/** Each row's heading and total sit above its bar; part shares sit below, where they fit. */
function Readings({
  rows,
  parts,
  format,
}: {
  rows: readonly Row[];
  parts: readonly HearthSharesPart[];
  format: (value: number) => string;
}) {
  const y = useYAxisScale();
  const x = useXAxisScale();
  const plot = usePlotArea();
  if (!y || !x || !plot) return null;
  return (
    <g>
      {rows.map((row) => {
        const middle = y(row.index, { position: 'middle' });
        if (middle === undefined) return null;
        let start = 0;
        return (
          <g key={row.id}>
            <foreignObject
              x={plot.x}
              y={middle - 34}
              width={plot.width}
              height={24}
            >
              <div
                data-nx-hearth-row={row.id}
                className="flex h-full items-baseline justify-between gap-[var(--nx-space-fieldGap)] text-[length:var(--nx-type-body-size)] text-[var(--nx-ink)]"
              >
                <span title={row.label} className="min-w-0 truncate">
                  {row.label}
                </span>
                <span
                  data-nx-hearth-reading={row.id}
                  className="shrink-0 text-[length:var(--nx-type-plotValue-size)] font-[number:var(--nx-type-plotValue-weight)] tabular-nums"
                >
                  {row.total === null ? '—' : format(row.total)}
                </span>
              </div>
            </foreignObject>
            {row.total !== null &&
              parts.map((part) => {
                const share = row.shares[part.id]!;
                const left = x(start) ?? plot.x;
                start += share;
                const right = x(start) ?? left;
                if (right - left < 40) return null;
                return (
                  <text
                    key={part.id}
                    x={left + 2}
                    y={middle + 22}
                    fill="var(--nx-muted)"
                    fontSize="var(--nx-type-axis-size)"
                    className="tabular-nums"
                    data-nx-hearth-share-label={`${row.id}:${part.id}`}
                  >
                    {percent.format(share)}
                  </text>
                );
              })}
          </g>
        );
      })}
    </g>
  );
}

/** Rows divide one whole into the same ordered parts, so every part shares a reading edge. */
export function HearthShares({
  data,
  parts,
  unitLabel = 'Value',
  contextLabel,
  valueFormatter = formatHearthNumber,
  animate = true,
  className,
  'aria-label': label = 'Parts of a whole',
}: HearthSharesProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const { rows, valid } = useMemo(() => {
    const unique = (items: readonly { id: string }[]) =>
      items.every((item) => item.id.trim()) &&
      new Set(items.map((item) => item.id)).size === items.length;
    const rows = data.map((datum, index): Row => {
      const amounts: Record<string, number> = {};
      let available = true;
      for (const part of parts) {
        const value = datum.values[part.id];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
          amounts[part.id] = value;
        else available = false;
      }
      const total = Object.values(amounts).reduce((sum, v) => sum + v, 0);
      const whole = available && total > 0;
      return {
        id: datum.id,
        label: datum.label,
        index,
        total: whole ? total : null,
        amounts,
        shares: Object.fromEntries(
          parts.map((part) => [part.id, whole ? amounts[part.id]! / total : 0]),
        ),
      };
    });
    return { rows, valid: unique(data) && unique(parts) };
  }, [data, parts]);
  const status =
    parts.length < 1 || parts.length > 4
      ? 'Use one to four parts.'
      : !valid
        ? 'Each row and part needs a unique, nonempty ID.'
        : !rows.length
          ? 'No rows to divide.'
          : null;
  const step = motion.animationDuration / Math.max(1, parts.length);
  return (
    <HearthChartFrame
      ref={ref}
      name="hearth-shares"
      unitLabel={unitLabel}
      contextLabel={contextLabel}
      animated={motion.isAnimationActive}
      status={status}
      className={className}
    >
      {!!rows.length && !rows.some((row) => row.total !== null) && (
        <p
          role="status"
          className="mt-[var(--nx-space-cardBodyGap)] text-[length:var(--nx-type-note-size)] text-[var(--nx-muted)]"
        >
          No complete rows available.
        </p>
      )}
      <ul
        aria-label="Parts"
        className="mt-[var(--nx-space-cardBodyGap)] flex flex-wrap gap-x-[var(--nx-space-gridGap)] gap-y-1 text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]"
      >
        {parts.map((part, index) => (
          <li key={part.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-[var(--nx-radius-checkbox)]"
              style={{ background: hearthTones[part.tone ?? order[index]!] }}
            />
            {part.label}
          </li>
        ))}
      </ul>
      <div className="mt-[var(--nx-space-fieldGap)] overflow-x-auto">
        <div
          style={{
            minWidth: 280,
            height: Math.max(120, rows.length * 84 + 28),
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 372 }}
          >
            <BarChart
              data={rows}
              layout="vertical"
              accessibilityLayer
              title={label}
              desc={`Each row divides its ${unitLabel} into ${parts.map((part) => part.label).join(', ')}, left to right, as shares of the row's total. The total sits above each bar; a dash means a part is unavailable. Left Arrow moves to the next row; Right Arrow moves back.`}
              margin={{ top: 22, right: 8, bottom: 6, left: 8 }}
              barSize={12}
              className={hearthChartFocus}
            >
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis dataKey="index" type="category" scale="band" hide />
              <Tooltip
                filterNull={false}
                cursor={false}
                isAnimationActive={false}
                content={({ active, label: index }) => {
                  const row =
                    typeof index === 'number' ? rows[index] : undefined;
                  return active && row ? (
                    <HearthChartTooltip title={row.label}>
                      {row.total === null ? (
                        'Unavailable'
                      ) : (
                        <ul>
                          {parts.map((part) => (
                            <li key={part.id} className="tabular-nums">
                              {part.label}:{' '}
                              {percent.format(row.shares[part.id]!)} ·{' '}
                              {valueFormatter(row.amounts[part.id]!)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </HearthChartTooltip>
                  ) : null;
                }}
              />
              {parts.map((part, index) => {
                const paint = hearthTones[part.tone ?? order[index]!];
                return (
                  <Bar
                    key={part.id}
                    id={`${id}-${index}`}
                    stackId="whole"
                    dataKey={(row: Row) => row.shares[part.id]}
                    name={part.label}
                    fill={paint}
                    stroke="none"
                    activeBar={false}
                    shape={(props: BarShapeProps) => (
                      <Segment {...props} paint={paint} part={part.id} />
                    )}
                    isAnimationActive={motion.isAnimationActive}
                    animationEasing={motion.animationEasing}
                    animationDuration={step}
                    animationBegin={step * index}
                  />
                );
              })}
              <Readings rows={rows} parts={parts} format={valueFormatter} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HearthChartFrame>
  );
}
