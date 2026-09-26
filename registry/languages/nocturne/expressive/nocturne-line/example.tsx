import { NocturneLine, type NocturneLineDatum, type NocturneLineSeries } from './component';

const series: NocturneLineSeries[] = [
  { id: 'desktop', label: 'Desktop', tone: 'a' },
  { id: 'mobile', label: 'Mobile', tone: 'b' },
  { id: 'api', label: 'API', tone: 'c' },
];
const data: NocturneLineDatum[] = [
  { id: 'sep-1', label: 'Sep 1', x: 1, values: { desktop: 82, mobile: 42, api: 24 } },
  { id: 'sep-5', label: '5', x: 5, values: { desktop: 108, mobile: 54, api: 32 } },
  { id: 'sep-9', label: '9', x: 9, values: { desktop: 96, mobile: 68, api: 29 } },
  { id: 'sep-13', label: '13', x: 13, values: { desktop: 144, mobile: 63, api: 46 } },
  { id: 'sep-17', label: '17', x: 17, values: { desktop: 132, mobile: 84, api: 42 } },
  { id: 'sep-21', label: '21', x: 21, values: { desktop: 172, mobile: 92, api: 61 } },
  { id: 'sep-25', label: '25', x: 25, values: { desktop: 196, mobile: 108, api: 74 } },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneLine data={data} series={series} unitLabel="Weekly sessions" contextLabel="September" height={384} animate={animate} />;
}
