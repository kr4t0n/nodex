'use client';

import { useId, useMemo } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';

export interface ArcMatrixDatum {
  product: string;
  city: string;
  value: number;
}

export interface ArcMatrixProps {
  /** One observation per product/city pair. Zero is measured absence; omitted pairs are missing. */
  data: readonly ArcMatrixDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

const bow = (column: number, columns: number) => columns < 2 ? 0 : 16 * Math.sin(Math.PI * column / (columns - 1));

interface MatrixPoint extends ArcMatrixDatum {
  index: number;
  x: number;
  y: number;
  called: boolean;
}

function MatrixCell(props: unknown) {
  const { cx, cy, size, payload, isActive } = props as { cx?: number; cy?: number; size?: number; payload?: MatrixPoint; isActive?: boolean };
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const color = payload.value === 0 ? 'var(--nx-plotFaint)' : payload.value >= 25 ? 'var(--nx-ink)' : payload.value >= 12 ? 'var(--nx-markMuted)' : 'var(--nx-markQuiet)';
  const r = payload.value === 0 ? 0.9 : Math.sqrt((size ?? 0) / Math.PI);
  return <g data-nx-cell={payload.index}>
    <circle cx={cx} cy={cy} r={r} fill={color} stroke={isActive ? 'var(--nx-ink)' : 'none'} strokeWidth="var(--nx-stroke-emphasis)" />
    {payload.called && <text x={cx} y={cy - r - 4} textAnchor="middle" fill="var(--nx-ink)" fontSize="calc(var(--nx-type-axis-size)*0.875)" fontWeight="var(--nx-type-pageTitle-weight)">{payload.value}</text>}
  </g>;
}

/** Recharts supplies the scales and curve generator; these guides never enter the tooltip's observation list. */
function MatrixGuides({ products, cities }: { products: string[]; cities: string[] }) {
  const x = useXAxisScale();
  const y = useYAxisScale();
  if (!x || !y) return null;
  return <g aria-hidden="true" pointerEvents="none">
    {products.map((product, row) => <g key={product}>
      <Curve type="linear" points={cities.map((_, column) => ({ x: x(column * 27) ?? 0, y: y(-row * 29 + bow(column, cities.length)) ?? 0 }))}
        stroke="var(--nx-plotGrid)" strokeWidth="var(--nx-stroke-mark)" fill="none" />
      <text x={(x(0) ?? 0) - 24} y={y(-row * 29)} dy="0.3em" textAnchor="end" fill="var(--nx-markMuted)" fontSize="var(--nx-type-axis-size)" fontWeight="var(--nx-type-axis-weight)">{product}</text>
    </g>)}
    {cities.map((city, column) => {
      const cx = x(column * 27) ?? 0;
      const cy = y(bow(column, cities.length) + 22) ?? 0;
      return <text key={city} x={cx} y={cy} textAnchor="middle" transform={`rotate(-55 ${cx} ${cy})`} fill="var(--nx-muted)" fontSize="calc(var(--nx-type-axis-size)*0.875)" fontWeight="var(--nx-type-cardTitle-weight)">{city}</text>;
    })}
  </g>;
}

/** Bowed rows retain matrix order; area and tone encode the supplied value. */
export function ArcMatrix({ data, height, width, animate = true, className = '', 'aria-label': label = 'Values by product and city' }: ArcMatrixProps) {
  const { ref, ...motion } = useChartMotion(animate);
  const id = useId();
  const layout = useMemo(() => {
    const products = [...new Set(data.map((point) => point.product))];
    const cities = [...new Set(data.map((point) => point.city))];
    const valid = data.map((point, index) => ({ ...point, index })).filter((point) => Number.isFinite(point.value) && point.value >= 0);
    const max = Math.max(0, ...valid.map((point) => point.value));
    const called = new Set([...valid].filter((point) => point.value > 0).sort((a, b) => b.value - a.value).slice(0, 4).map((point) => point.index));
    const points = valid.map((point) => {
      const column = cities.indexOf(point.city);
      const row = products.indexOf(point.product);
      return { ...point, x: column * 27, y: -row * 29 + bow(column, cities.length), called: called.has(point.index) };
    });
    return { products, cities, points, max: max || 1, top: Math.max(0, ...cities.map((_, column) => bow(column, cities.length))) + 34 };
  }, [data]);

  return (
    <div ref={ref} className={`nx-arc-matrix flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`}
      style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="arc-matrix" data-nx-animated={motion.isAnimationActive}>
      {layout.points.length === 0 ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No observations available.</div> : (
        <div className={height === undefined ? 'aspect-[460/340] min-h-[272px] w-full' : 'min-h-0 flex-1'}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: width ?? 540, height: height ?? 399 }}>
            <ScatterChart accessibilityLayer title={label} desc="Dot area and tone encode value. Pinpricks represent measured zeroes; gaps represent missing data. Use left and right arrow keys to inspect cells."
              className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none [&_.recharts-surface:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]"
              margin={{ top: 46, right: 24, bottom: 16, left: 62 }}>
              <XAxis dataKey="x" type="number" hide domain={[-14, (layout.cities.length - 1) * 27 + 14]} />
              <YAxis dataKey="y" type="number" hide domain={[-(layout.products.length - 1) * 29 - 16, layout.top]} />
              <ZAxis dataKey="value" type="number" domain={[0, layout.max]} range={[0, layout.max * Math.PI * 1.3 ** 2]} />
              <MatrixGuides products={layout.products} cities={layout.cities} />
              <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => {
                const point = payload?.[0]?.payload as typeof layout.points[number] | undefined;
                return active && point ? <div role="status" className="bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:var(--nx-type-note-size)] text-[var(--nx-paper)]">{point.product} · {point.city} — {point.value === 0 ? 'no accounts' : `${point.value} accounts`}</div> : null;
              }} />
              <Scatter id={`${id}-cells`} data={layout.points} name="Value" fill="var(--nx-ink)" {...motion} activeShape={MatrixCell} shape={MatrixCell} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
