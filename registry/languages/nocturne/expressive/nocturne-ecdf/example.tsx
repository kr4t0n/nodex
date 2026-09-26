import { NocturneEcdf, type NocturneEcdfSeries } from './component';

const data: NocturneEcdfSeries[] = [
  { id: 'current', label: 'Current release', tone: 'a', samples: [22, 28, 31, 35, 35, 42, 48, 52, 58, 63, 69, 75, 84, 94, 106, 122, 138, 159, 186, 220].map((value, i) => ({ id: 'c' + i, value })) },
  { id: 'candidate', label: 'Candidate', tone: 'b', samples: [18, 22, 24, 27, 31, 34, 38, 42, 45, 48, 53, 59, 65, 72, 81, 92, 109, 128, 157, 196].map((value, i) => ({ id: 'n' + i, value })) },
];
const milliseconds = (value: number) => value + 'ms';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneEcdf data={data} threshold={100} unitLabel="How much fits under 100ms?" contextLabel="Request duration · ms" valueFormatter={milliseconds} height={512} animate={animate} />;
}
