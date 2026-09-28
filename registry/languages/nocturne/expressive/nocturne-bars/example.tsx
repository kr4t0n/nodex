import { NocturneBars, type NocturneBarsDatum } from './component';

const data: NocturneBarsDatum[] = [
  { id: 'design', label: 'Design', value: 8640 },
  { id: 'engineering', label: 'Engineering', value: 12480 },
  { id: 'research', label: 'Research', value: 6120 },
  { id: 'operations', label: 'Operations', value: 4320 },
  { id: 'success', label: 'Customer success', value: 2960 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <NocturneBars data={data} unitLabel="Active workspaces" contextLabel="Last 7 days" height={344} animate={animate} />;
}
