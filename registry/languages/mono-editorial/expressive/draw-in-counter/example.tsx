import { DrawInCounter, type DrawInCounterDatum } from './component';
const texture = (i: number, k: number) => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
const daily: readonly DrawInCounterDatum[] = Array.from({ length: 180 }, (_, index) => ({
  day: String(index), bookingsK: 14 + 10 * Math.sin(index / 29) + index * 0.12 + texture(index + 1, 3) * 6,
  axisLabel: index % 30 === 0 ? months[index / 30] : undefined,
}));
export function Example({ animate = true }: { animate?: boolean }) { return <DrawInCounter data={daily} periodLabel="ARR · H1 2026" animate={animate} />; }
