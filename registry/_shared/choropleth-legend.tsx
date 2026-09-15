export const choroplethBands = [
  { label: '≤9k', fill: 'var(--nx-heatLow)' },
  { label: '10–20k', fill: 'var(--nx-markQuiet)' },
  { label: '21–38k', fill: 'var(--nx-muted)' },
  { label: '39–64k', fill: 'var(--nx-markStrong)' },
  { label: '65k+', fill: 'var(--nx-ink)' },
];

/** Preserve the literal piece intervals; a fractional value in an interval gap has no band. */
export function choroplethBand(value: number): number | null {
  if (value <= 9) return 0;
  if (value >= 10 && value <= 20) return 1;
  if (value >= 21 && value <= 38) return 2;
  if (value >= 39 && value <= 64) return 3;
  return value >= 65 ? 4 : null;
}

export function ChoroplethLegend({ selected, toggle, highlight }: { selected: readonly boolean[]; toggle: (index: number) => void; highlight: (index: number | null) => void }) {
  return <div className="flex justify-center gap-2.5 whitespace-nowrap text-[length:var(--nx-type-legend-size)] font-[number:var(--nx-type-subtitle-weight)] leading-[11px] text-[var(--nx-muted)]">
    {choroplethBands.map((band, index) => <button key={band.label} type="button" aria-pressed={selected[index]} onClick={() => toggle(index)} onPointerEnter={() => highlight(index)} onPointerLeave={() => highlight(null)} onFocus={() => highlight(index)} onBlur={() => highlight(null)} className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-inherit focus-visible:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)] focus-visible:outline-offset-2">
      <span aria-hidden="true" className="block size-[11px] shrink-0" style={{ background: selected[index] ? band.fill : 'var(--nx-markUnselected)' }} />
      <span style={{ opacity: selected[index] ? 1 : 0.5 }}>{band.label}</span>
    </button>)}
  </div>;
}
