import { TileHeatmap, type TileHeatmapAxis, type TileHeatmapDatum } from './component';
const rows: readonly TileHeatmapAxis[] = [{ id: 'studio', label: 'Studio' }, { id: 'product', label: 'Product' }, { id: 'platform', label: 'Platform' }, { id: 'labs', label: 'Labs' }];
const columns: readonly TileHeatmapAxis[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ id: label, label }));
const values = [[6, 12, 18, 9, 15, 3, 0], [12, 18, 24, 15, 21, 6, 3], [9, 15, 12, 24, 18, 9, 6], [3, 6, 15, 18, 12, 0, null]] as const;
const data: readonly TileHeatmapDatum[] = rows.flatMap((row, index) => columns.map((column, day) => ({ rowId: row.id, columnId: column.id, value: values[index]![day]! })));
export function Example({ animate = true }: { animate?: boolean }) {
  return <TileHeatmap data={data} rows={rows} columns={columns} maxValue={24} unitLabel="Focus hours" contextLabel="One week" animate={animate} />;
}
