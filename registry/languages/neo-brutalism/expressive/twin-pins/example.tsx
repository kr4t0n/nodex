import { TwinPins, type TwinPinsDatum } from './component';
const times: readonly TwinPinsDatum[] = [
  { id: 'search', label: 'Search', before: 42, after: 24 },
  { id: 'checkout', label: 'Checkout', before: 56, after: 31 },
  { id: 'upload', label: 'Upload', before: 36, after: 44 },
  { id: 'reports', label: 'Reports', before: 68, after: 38 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <TwinPins data={times} unitLabel="Task time · seconds" contextLabel="Release comparison" beforeLabel="Previous" afterLabel="Current" animate={animate} />;
}
