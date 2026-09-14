'use client';

import { useId, useMemo, useState } from 'react';
import { Curve, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, useActiveTooltipDataPoints, useIsTooltipActive, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';
import { useChartMotion } from '../../../../_shared/use-chart-motion';
import { geographicRegions, geographicDomains, type GeoCollection, type GeoRegion } from '../../../../_shared/geo-geometry';
import { ChoroplethLegend, choroplethBand, choroplethBands } from '../../../../_shared/choropleth-legend';
import { GEO } from './geo';

export interface ChoroplethWorldDatum { country: string; monthlyActivesK: number | null; annotation?: { text: string; offset?: readonly [number, number] } }
export interface ChoroplethWorldProps {
  data: readonly ChoroplethWorldDatum[];
  height?: number;
  width?: number;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}
interface CountryPoint { region: GeoRegion; x: number; y: number; value: number | null; band: number | null; annotation?: ChoroplethWorldDatum['annotation'] }
const mapBounds = { left: -170, right: 190, bottom: -58, top: 76 };
const regions = geographicRegions(GEO as GeoCollection).filter(region => region.bounds.top >= mapBounds.bottom && region.bounds.bottom <= mapBounds.top && region.bounds.right >= mapBounds.left && region.bounds.left <= mapBounds.right);
function CountryMark({ shape, selected, highlighted }: { shape: unknown; selected: readonly boolean[]; highlighted: number | null }) {
  const { payload: row, cx, cy, isAnimating, animationElapsedTime } = shape as { payload?: CountryPoint; cx?: number; cy?: number; isAnimating?: boolean; animationElapsedTime?: number };
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<CountryPoint>()?.[0];
  const points = useMemo(() => row && xScale && yScale ? row.region.rings.flatMap(ring => [...ring.map(point => ({ x: xScale(point.x) ?? 0, y: yScale(point.y) ?? 0 })), { x: NaN, y: NaN }]) : [], [row, xScale, yScale]);
  if (!row || cx === undefined || cy === undefined) return <g />;
  const emphasized = active && focus?.region.name === row.region.name || highlighted !== null && row.band === highlighted;
  const visible = row.value === null || row.band !== null && selected[row.band]; const progress = isAnimating ? animationElapsedTime ?? 0 : 1;

  return <g data-nx-region={row.region.name} data-nx-center-x={cx} data-nx-center-y={cy} data-nx-visible={visible} opacity={visible ? progress : 0}>
    <Curve data-nx-geography={row.region.name} points={points} type="linearClosed" fillRule="evenodd" fill={row.value === null ? 'var(--nx-plotLedger)' : row.band === null ? 'none' : choroplethBands[row.band]!.fill} stroke={emphasized ? 'var(--nx-ink)' : 'var(--nx-paper)'} strokeWidth={emphasized ? 'var(--nx-stroke-emphasis)' : 'var(--nx-stroke-hairline)'} />

  </g>;
}
function CountryLabels({ rows, selected, highlighted }: { rows: readonly CountryPoint[]; selected: readonly boolean[]; highlighted: number | null }) {
  const xScale = useXAxisScale(); const yScale = useYAxisScale(); const active = useIsTooltipActive(); const focus = useActiveTooltipDataPoints<CountryPoint>()?.[0];
  if (!xScale || !yScale) return null;
  return <g pointerEvents="none" aria-hidden="true">{rows.map(row => {
    const emphasized = active && focus?.region.name === row.region.name || highlighted !== null && row.band === highlighted;
    const visible = row.value === null || row.band !== null && selected[row.band];
    const annotation = row.value !== null ? row.annotation : undefined; const offset = annotation?.offset?.every(Number.isFinite) ? annotation.offset : [0, 0];
    if (!visible || !annotation && !emphasized) return null;
    const cx = xScale(row.x) ?? 0; const cy = yScale(row.y) ?? 0;
    return <text key={row.region.name} data-nx-map-label={row.region.name} x={cx + offset[0]!} y={cy + offset[1]!} textAnchor="middle" dominantBaseline="central" fill={emphasized ? 'var(--nx-ink)' : 'var(--nx-paper)'} stroke={emphasized ? 'var(--nx-paper)' : 'var(--nx-ink)'} strokeWidth={emphasized ? 3 : 2} paintOrder="stroke" strokeLinejoin="round" fontSize={emphasized ? 'calc(var(--nx-type-axis-size) * 10 / 8)' : 'var(--nx-type-legend-size)'} fontWeight="var(--nx-type-pageTitle-weight)">{annotation?.text ?? row.region.name}</text>;
  })}</g>;
}
function CountrySeries({ rows, selected, highlighted, id, motion }: { rows: CountryPoint[]; selected: readonly boolean[]; highlighted: number | null; id: string; motion: Omit<ReturnType<typeof useChartMotion>, 'ref'> }) {
  const plot = usePlotArea(); const plotWidth = plot?.width ?? 540; const plotHeight = plot?.height ?? 281;
  const domains = useMemo(() => geographicDomains(mapBounds, plotWidth, plotHeight), [plotWidth, plotHeight]);
  const shape = (props: unknown) => <CountryMark shape={props} selected={selected} highlighted={highlighted} />;
  return <><XAxis dataKey="x" type="number" domain={domains.x} allowDataOverflow hide /><YAxis dataKey="y" type="number" domain={domains.y} allowDataOverflow hide /><Scatter id={`${id}-regions`} data={rows} name="Countries" shape={shape} activeShape={shape} fill="var(--nx-ink)" zIndex={0} {...motion} /><CountryLabels rows={rows} selected={selected} highlighted={highlighted} /></>;
}

/** Native Cartesian scales project the vendored polygons; each region is one inspected observation. */
export function ChoroplethWorld({ data, height, width, animate = true, className = '', 'aria-label': label = 'Monthly active accounts by country' }: ChoroplethWorldProps) {
  const { ref, ...motion } = useChartMotion(animate); const id = useId();
  const [selected, setSelected] = useState([true, true, true, true, true]); const [highlighted, setHighlighted] = useState<number | null>(null);
  const layout = useMemo(() => {
    const readings = new Map(data.map(row => [row.country, row]));
    const rows: CountryPoint[] = regions.map(region => { const datum = readings.get(region.name); const value = typeof datum?.monthlyActivesK === 'number' && Number.isFinite(datum.monthlyActivesK) && datum.monthlyActivesK >= 0 ? datum.monthlyActivesK : null;
      return { region, x: region.center.x, y: region.center.y, value, band: value === null ? null : choroplethBand(value), annotation: datum?.annotation };
    });
    return { rows, valid: data.length > 0 && readings.size === data.length && rows.some(row => row.value !== null) };
  }, [data]);
  return <div ref={ref} className={`nx-choropleth-world flex min-w-0 flex-col rounded-[var(--nx-radius-card)] bg-[var(--nx-bg)] text-[var(--nx-ink)] [font-family:var(--nx-font-sans)] [padding:var(--nx-space-cardPadding)] ${className}`} style={{ width: width ?? '100%', height, boxSizing: 'border-box' }} data-nx-chart="choropleth-world" data-nx-animated={motion.isAnimationActive}>
    {!layout.valid ? <div className="flex min-h-0 flex-1 items-center text-[var(--nx-muted)]" role="status">No unique mapped account observations available.</div> : <div className={`${height === undefined ? 'aspect-[640/380] min-h-[304px] w-full' : 'min-h-0 flex-1'} relative`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 540, height: 321 }}>
        <ScatterChart accessibilityLayer title={label} desc="Country shade shows monthly active accounts in five fixed bands. The original latitude window crops Antarctica. Pale regions have no observation; measured zero occupies the lowest band. Use left/right arrows to inspect regions. Legend buttons toggle a band and highlight matching regions on focus. Country clicks do not filter."
          className="[&_[tabindex]:focus:not(:focus-visible)]:outline-none [&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)]" margin={{ top: 4, bottom: 36, left: 0, right: 0 }}>
          <Tooltip cursor={false} isAnimationActive={false} content={({ active, payload }) => { const row = payload?.[0]?.payload as CountryPoint | undefined; return active && row ? <div role="status" className="whitespace-nowrap bg-[var(--nx-ink)] px-3.5 py-2.5 text-[length:calc(var(--nx-type-note-size)*12/11)] text-[var(--nx-paper)]">{row.region.name} — {row.value === null ? 'not opened yet' : `${row.value}k MAU`}</div> : null; }} />
          <CountrySeries rows={layout.rows} selected={selected} highlighted={highlighted} id={id} motion={motion} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-[17px]"><ChoroplethLegend selected={selected} toggle={index => setSelected(previous => previous.map((value, position) => position === index ? !value : value))} highlight={setHighlighted} /></div>
    </div>}
  </div>;
}
