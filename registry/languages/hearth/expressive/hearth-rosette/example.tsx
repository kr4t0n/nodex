import { HearthRosette, type HearthRosetteDatum } from './component';

const loaves = [6, 7, 9, 10, 8, 5, 3, 4, 8, 11, 13, 16];
const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const data: HearthRosetteDatum[] = months.map((label, index) => ({
  id: label.toLowerCase(),
  label,
  value: loaves[index]!,
}));

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthRosette
      data={data}
      unitLabel="Loaves baked"
      contextLabel="Each month of one year"
      aria-label="Illustrative number of loaves baked in each month of one year"
      animate={animate}
    />
  );
}
