import { ObservationMatrix } from './component';
const rows = ['Aster', 'Birch', 'Cedar', 'Dune'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));
const columns = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  label: String(i + 1).padStart(2, '0'),
}));
const values = [0, 16, 24, 58, 72, 91, 83, 45, 62, 38, 54, 76];
const data = rows.flatMap((row, r) =>
  columns.map((column, c) => ({
    rowId: row.id,
    columnId: column.id,
    value: r === 2 && c === 7 ? null : values[(c + r * 3) % values.length]!,
  })),
);
export function Example() {
  return (
    <ObservationMatrix
      data={data}
      rows={rows}
      columns={columns}
      domain={[0, 100]}
      title="Observation matrix"
      subtitle="Group × observation · Sample data"
    />
  );
}
