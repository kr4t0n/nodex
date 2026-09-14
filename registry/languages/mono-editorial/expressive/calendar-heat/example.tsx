import { CalendarHeat, type CalendarHeatDatum, type CalendarHeatPeriod } from './component';

const hash = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const data: CalendarHeatDatum[] = Array.from({ length: 52 }, (_, w) => ({ week: `W${w + 1}`, deploys: Array.from({ length: 7 }, (_, d) => {
  if (d >= 5) return hash(w * 7 + d + 1, 3) > 0.82 ? 1 : 0;
  const season = 1 + 0.55 * Math.sin((w - 8) / 9);
  const shipped = hash(w + 1, d + 5) > 0.12 ? 1 : 0;
  return Math.round(season * (2.5 + hash(w * 7 + d + 1, d + 2) * 9) * shipped);
}) }));
const periods: CalendarHeatPeriod[] = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((label, k) => ({ label, week: Math.round(k * 52 / 12) }));

export function Example() { return <CalendarHeat data={data} periods={periods} peakLabel="the release-week spike" />; }
