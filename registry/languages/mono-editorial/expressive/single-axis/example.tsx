import { SingleAxis, type SingleAxisDatum } from './component';

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const observations: readonly SingleAxisDatum[] = days.flatMap((day, row) => Array.from({ length: 24 }, (_, hour) => {
  const core = row < 5 && hour >= 9 && hour <= 17 ? 6 + 5 * Math.sin((hour - 9) / 8 * Math.PI) : 0;
  const ripple = (hour + row) % 5 === 0 ? 2 : 0;
  const awake = hour >= 22 || hour <= 5 ? 0 : 1;
  return { day, hour, tickets: Math.round(core + ripple + awake) };
}).filter((point) => point.tickets > 0));

export function Example({ animate = true }: { animate?: boolean }) {
  return <SingleAxis data={observations} animate={animate} />;
}
