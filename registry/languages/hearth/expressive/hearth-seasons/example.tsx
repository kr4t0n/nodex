import {
  HearthSeasons,
  type HearthSeasonsAxis,
  type HearthSeasonsDatum,
} from './component';

const columns: HearthSeasonsAxis[] = [
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
].map((label) => ({ id: label.toLowerCase(), label }));

// One digit per month, January first: 0 out of season … 3 at its best.
const calendar: [string, string][] = [
  ['Rhubarb', '122333100000'],
  ['Asparagus', '000133100000'],
  ['Strawberries', '000013332100'],
  ['Tomatoes', '000001333210'],
  ['Courgettes', '000013333100'],
  ['Apples', '210000013333'],
  ['Squash', '210000013332'],
  ['Leeks', '332100000233'],
];

const rows: HearthSeasonsAxis[] = calendar.map(([label]) => ({
  id: label.toLowerCase(),
  label,
}));

const data: HearthSeasonsDatum[] = calendar.flatMap(([label, months]) =>
  columns.map((column, index) => ({
    rowId: label.toLowerCase(),
    columnId: column.id,
    level: Number(months[index]),
  })),
);

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthSeasons
      data={data}
      rows={rows}
      columns={columns}
      levels={[
        'Out of season',
        'Arriving or leaving',
        'In season',
        'At its best',
      ]}
      unitLabel="Produce by month"
      contextLabel="A kitchen garden year"
      aria-label="Illustrative seasonal calendar for eight kinds of produce"
      animate={animate}
    />
  );
}
