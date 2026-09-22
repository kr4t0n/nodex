import { SoftHeatmap, type SoftHeatmapAxis, type SoftHeatmapDatum } from './component';

const rows: SoftHeatmapAxis[] = [
  { id: 'focus', label: 'Focus' }, { id: 'learn', label: 'Learn' },
  { id: 'move', label: 'Move' }, { id: 'rest', label: 'Rest' },
];
const columns: SoftHeatmapAxis[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ id: label, label }));
const values = [[45, 90, 60, 120, 75, 30, 0], [30, 45, 0, 60, 30, 90, 75], [45, 30, 60, 45, 30, 90, 60], [30, 45, 30, 60, 45, 90, null]];
const data: SoftHeatmapDatum[] = rows.flatMap((row, y) => columns.map((column, x) => ({ rowId: row.id, columnId: column.id, value: values[y]![x]! })));

export function Example({ animate = true }: { animate?: boolean }) {
  return <SoftHeatmap data={data} rows={rows} columns={columns} maxValue={120} unitLabel="Minutes of intention" contextLabel="This week" height={364} animate={animate} />;
}
