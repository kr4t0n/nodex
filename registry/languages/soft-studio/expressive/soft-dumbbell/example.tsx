import { SoftDumbbell, type SoftDumbbellDatum } from './component';

const data: SoftDumbbellDatum[] = [
  { id: 'reading', label: 'Reading', before: 3, after: 6 },
  { id: 'movement', label: 'Movement', before: 4, after: 5 },
  { id: 'journaling', label: 'Journaling', before: 2, after: 5 },
  { id: 'outside', label: 'Time outside', before: 5, after: 4 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftDumbbell data={data} unitLabel="Days each week" contextLabel="A month of small shifts" beforeLabel="Last month" afterLabel="This month" height={364} animate={animate} />;
}
