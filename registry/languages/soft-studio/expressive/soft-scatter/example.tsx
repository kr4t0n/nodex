import { SoftScatter, type SoftScatterDatum } from './component';

const data: SoftScatterDatum[] = [
  { id: 'session1', label: 'Monday morning', x: 25, y: 5, tone: 'a' },
  { id: 'session2', label: 'Monday afternoon', x: 45, y: 6, tone: 'a' },
  { id: 'session3', label: 'Tuesday morning', x: 60, y: 8, tone: 'b' },
  { id: 'session4', label: 'Tuesday afternoon', x: 35, y: 4, tone: 'b' },
  { id: 'session5', label: 'Wednesday morning', x: 75, y: 7, tone: 'c' },
  { id: 'session6', label: 'Wednesday afternoon', x: 50, y: 7, tone: 'c' },
  { id: 'session7', label: 'Thursday morning', x: 90, y: 9, tone: 'd' },
  { id: 'session8', label: 'Thursday afternoon', x: 65, y: 5, tone: 'd' },
  { id: 'session9', label: 'Friday morning', x: 40, y: 8, tone: 'a' },
  { id: 'session10', label: 'Friday afternoon', x: 80, y: 6, tone: 'a' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftScatter data={data} xLabel="Focus time · minutes" yLabel="Energy · out of 10" contextLabel="Ten moments from your week" height={364} animate={animate} />;
}
