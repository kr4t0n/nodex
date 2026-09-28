import { NocturneForecastFan, type NocturneForecastDatum } from './component';

const observed = [68, 72, 70, 79, 83, 87];
const forecast = [92, 98, 103, 109, 114, 120];
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const data: NocturneForecastDatum[] = [
  ...observed.map((value, i) => ({ id: labels[i]!, label: labels[i]!, x: i + 1, kind: 'observed' as const, value })),
  ...forecast.map((value, i) => ({ id: labels[i + 6]!, label: labels[i + 6]!, x: i + 7, kind: 'forecast' as const, value,
    intervals: { central: [value - 6 - i * 2, value + 7 + i * 2] as const, broad: [value - 11 - i * 3, value + 13 + i * 4] as const } })),
];
const bands = [{ id: 'central', coverage: 0.8 }, { id: 'broad', coverage: 0.95 }];
const tickets = (value: number) => value + 'k tickets';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneForecastFan data={data} bands={bands} unitLabel="Support demand outlook" contextLabel="Monthly tickets · thousands" valueFormatter={tickets} height={452} animate={animate} />;
}
