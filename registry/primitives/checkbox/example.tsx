import { Checkbox, CheckboxGroup } from './component';

export function Example() {
  return (
    <CheckboxGroup>
      <Checkbox label="Hand-rolled SVG" defaultChecked />
      <Checkbox label="Recharts" />
      <Checkbox label="All runtimes" indeterminate />
      <Checkbox label="Chart.js, removed" disabled />
    </CheckboxGroup>
  );
}
