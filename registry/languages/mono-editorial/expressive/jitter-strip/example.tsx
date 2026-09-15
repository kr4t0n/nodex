import { JitterStrip, type JitterStripDatum } from './component';

const bands = ['P0 CRITICAL', 'P1 HIGH', 'P2 NORMAL', 'P3 LOW'];
const rnd = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
function band(ci: number, count: number, median: number, spread: number, outliers: number): JitterStripDatum[] {
  return Array.from({ length: count }, (_, i) => {
    const u = rnd(i + 1, ci + 1); const v = rnd(i + 7, ci + 3);
    let hours = median + (u - 0.5) * spread * 2 + (v > 0.5 ? u * spread * 0.6 : 0);
    if (i < outliers) hours = median + spread * 2.2 + u * spread * 3;
    return { hours: Math.max(0.2, hours), band: ci + (rnd(i + 13, ci + 5) - 0.5) * 0.58 };
  });
}
const observations = [...band(0, 38, 0.8, 0.5, 2), ...band(1, 64, 2.4, 1.1, 3), ...band(2, 110, 6.5, 2.4, 4), ...band(3, 72, 14, 4.5, 3)];
export function Example({ animate = true }: { animate?: boolean }) {
  return <JitterStrip data={observations} bands={bands} animate={animate} />;
}
