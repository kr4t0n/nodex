'use client';

import { useId, useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from 'recharts';
import { useChartMotion } from '../use-chart-motion';
import { useSketchSettings, type SketchSettings } from './use-sketch-settings';
import { SketchPaths, sketchGenerator } from './marks';
import { uniqueIds, nonnegative, sketchSeed } from './identity';
import { SketchFrame, SketchStatus, SketchTooltip, sketchFocus, formatNumber, type SketchPresentationProps } from './frame';

export interface SketchPolarPart { id: string; label: string; value: number | null; paint: string }
export interface SketchPolarProps extends SketchPresentationProps { data: readonly SketchPolarPart[]; kind: 'pie' | 'donut'; hatchWidth: string }
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
function Slice({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload, settings, hatchWidth }: PieSectorShapeProps & { settings: SketchSettings | null; hatchWidth: string }) {
  const part = payload as SketchPolarPart; const id = useId();
  const drawings = useMemo(() => {
    if (!settings || !outerRadius || startAngle === endAngle) return null;
    const seed = sketchSeed(part.id); const options = { ...settings, seed, fill: part.paint, stroke: 'var(--nx-ink)', preserveVertices: true };
    const whole = Math.abs(endAngle - startAngle) >= 359.99;
    // Recharts angles increase counterclockwise; Rough.js follows SVG's downward Y axis.
    const outer = whole ? sketchGenerator.circle(0, 0, outerRadius * 2, options) : sketchGenerator.arc(0, 0, outerRadius * 2, outerRadius * 2, -startAngle * Math.PI / 180, -endAngle * Math.PI / 180, true, options);
    const inner = innerRadius > 0 ? whole ? sketchGenerator.circle(0, 0, innerRadius * 2, { ...options, fill: undefined })
      : sketchGenerator.arc(0, 0, innerRadius * 2, innerRadius * 2, -startAngle * Math.PI / 180, -endAngle * Math.PI / 180, false, { ...options, fill: undefined }) : null;
    return { outer, inner };
  }, [settings, outerRadius, innerRadius, startAngle, endAngle, part.id, part.paint]);
  if (!part.value) return <g />;
  const geometry = { cx: 0, cy: 0, innerRadius, outerRadius, startAngle, endAngle };
  return <g transform={`translate(${cx},${cy})`} data-nx-sketch-slice={part.id} data-nx-start={startAngle} data-nx-end={endAngle} data-nx-inner={innerRadius} data-nx-outer={outerRadius}>
    <defs><clipPath id={id}><Sector {...geometry} /></clipPath></defs>
    <Sector {...geometry} fill="transparent" data-nx-sector-bounds={part.id} />
    <g clipPath={`url(#${id})`} pointerEvents="none" aria-hidden="true">{drawings ? <><SketchPaths drawing={drawings.outer} paint={part.paint} hatchWidth={hatchWidth} />{drawings.inner && <SketchPaths drawing={drawings.inner} paint={part.paint} hatchWidth={hatchWidth} />}</>
      : <Sector {...geometry} fill={part.paint} stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" />}</g>
  </g>;
}
/** Shared only by the pie and donut encodings: native sectors define exact shares. */
export function SketchPolar({ data, kind, hatchWidth, unitLabel = 'Total', contextLabel, valueFormatter = formatNumber, width, height, animate = true, className = '', 'aria-label': label = 'Composition of a total' }: SketchPolarProps) {
  const { ref, ...motion } = useChartMotion(animate); const settings = useSketchSettings(ref); const id = useId();
  const parts = useMemo(() => data.map(part => ({ ...part, value: nonnegative(part.value) })), [data]);
  const sum = parts.reduce((sum, part) => sum + (part.value ?? 0), 0);
  const total = parts.every(part => part.value !== null) && Number.isFinite(sum) ? sum : null;
  const status = !parts.length ? 'No categories to compare.' : !uniqueIds(parts) ? 'Each category needs a unique, nonempty ID.' : total === null ? 'A complete breakdown is required.' : total === 0 ? 'No positive values to compare.' : null;
  return <SketchFrame ref={ref} slug={`sketch-${kind}`} animated={motion.isAnimationActive} {...{ unitLabel, contextLabel, width, height, className }}>
    <div className="mt-[var(--nx-space-cardBodyGap)] grid min-h-0 flex-1 items-center gap-[var(--nx-space-gridGap)] overflow-auto @min-[500px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        {status ? <SketchStatus>{status}</SketchStatus> : <>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 320 }}><PieChart accessibilityLayer title={label} className={sketchFocus}
            desc={`Sector angles are exact shares of ${unitLabel}. Zero has no sector. Values and shares appear in the adjacent key. Use left and right arrows to inspect categories.`}>
            <Tooltip isAnimationActive={false} content={({ active, payload }) => { const part = payload?.[0]?.payload as SketchPolarPart | undefined; return active && part && part.value !== null && total ? <SketchTooltip><div>{part.label}</div><div>{valueFormatter(part.value)} · {percent.format(part.value / total)}</div></SketchTooltip> : null; }} />
            <Pie id={id} data={parts} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="90%" innerRadius={kind === 'donut' ? '53%' : 0} startAngle={90} endAngle={-270} minAngle={0} paddingAngle={0}
              rootTabIndex={-1} fill="var(--nx-ink)" stroke="none" {...motion} shape={(props: PieSectorShapeProps) => <Slice {...props} settings={settings} hatchWidth={hatchWidth} />} />
          </PieChart></ResponsiveContainer>
          {kind === 'donut' && <div className="pointer-events-none absolute top-1/2 left-1/2 w-[43%] -translate-x-1/2 -translate-y-1/2 text-center">
            <div data-nx-sketch-polar-total className="break-words text-[length:var(--nx-type-stat-size)] [font-family:var(--nx-font-heading)]">{valueFormatter(total!)}</div>
            <div className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">{unitLabel}</div>
          </div>}
        </>}
      </div>
      <ul aria-label="Category values and shares" className="m-0 min-w-0 list-none p-0">{parts.map((part, index) => <li key={`${part.id}-${index}`} data-nx-sketch-polar-key={part.id} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-grid)] py-3 last:border-0">
        <span aria-hidden="true" className="h-3 w-3 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)]" style={{ background: part.paint }} />
        <span className="break-words text-[length:var(--nx-type-uiLabel-size)] [font-family:var(--nx-font-ui)]">{part.label}</span>
        <span className="text-[length:var(--nx-type-caption-size)]">{!status && total && part.value !== null ? percent.format(part.value / total) : total === 0 && part.value === 0 ? '0%' : '—'}</span>
        <span className="col-start-2 text-[length:var(--nx-type-plotValue-size)] [font-family:var(--nx-font-heading)]">{part.value === null ? '—' : valueFormatter(part.value)}</span>
      </li>)}</ul>
    </div>
  </SketchFrame>;
}
