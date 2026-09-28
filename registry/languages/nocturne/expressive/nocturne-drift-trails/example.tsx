import { NocturneDriftTrails, type NocturneDriftSeries } from './component';

const data: NocturneDriftSeries[] = [
  { id: 'core', label: 'Core', tone: 'a', observations: [
    { id: 'w1', label: 'Week 1', time: 1, x: 28, y: 52 },
    { id: 'w2', label: 'Week 2', time: 2, x: 43, y: 59 },
    { id: 'w3', label: 'Week 3', time: 3, x: 39, y: 69 },
    { id: 'w4', label: 'Week 4', time: 4, x: 57, y: 78 },
  ] },
  { id: 'teams', label: 'Teams', tone: 'b', observations: [
    { id: 'w1', label: 'Week 1', time: 1, x: 55, y: 44 },
    { id: 'w2', label: 'Week 2', time: 2, x: 67, y: 49 },
    { id: 'w3', label: 'Week 3', time: 3, x: 74, y: 64 },
    { id: 'w4', label: 'Week 4', time: 4, x: 68, y: 72 },
  ] },
  { id: 'enterprise', label: 'Enterprise', tone: 'c', observations: [
    { id: 'w1', label: 'Week 1', time: 1, x: 21, y: 73 },
    { id: 'w2', label: 'Week 2', time: 2, x: 30, y: 81 },
    { id: 'w3', label: 'Week 3', time: 3, x: 37, y: 86 },
    { id: 'w4', label: 'Week 4', time: 4, x: 49, y: 84 },
  ] },
];
const percentage = (value: number) => value + '%';

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneDriftTrails data={data} unitLabel="Adoption in motion" contextLabel="Four weekly cohorts" xLabel="Feature adoption" yLabel="Week-one retention" xFormatter={percentage} yFormatter={percentage} height={508} animate={animate} />;
}
