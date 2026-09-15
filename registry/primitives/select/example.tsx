import { Select } from './component';

export function Example() {
  return (
    <div className="flex flex-col items-start gap-5">
      <Select label="Component type" name="component-type" defaultValue="all">
        <option value="all">All types</option>
        <option value="bar">bar</option>
        <option value="heatmap">heatmap</option>
        <option value="lollipop">lollipop</option>
        <option value="sankey">sankey</option>
      </Select>
      <Select aria-label="Reading speed" name="reading-speed" autoWidth>
        <option value="close-read">Close read</option>
        <option value="glance">Glance</option>
      </Select>
    </div>
  );
}
