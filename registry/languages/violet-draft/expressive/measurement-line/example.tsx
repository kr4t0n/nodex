import { MeasurementLine } from './component';
const data = [34, 39, 36, 48, 44, 55, 52, 61, 56, 64, 60, 68.4].map(
  (value, x) => ({
    id: 'reading-' + x,
    label: String(x + 1).padStart(2, '0'),
    x,
    value,
  }),
);
export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <MeasurementLine
      data={data}
      title="Daily readings"
      subtitle="Twelve observations · Sample data"
      unit="units"
      animate={animate}
    />
  );
}
