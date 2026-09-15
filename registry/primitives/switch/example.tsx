import { Switch, SwitchGroup } from './component';

export function Example() {
  return (
    <SwitchGroup className="max-w-[280px]" role="group" aria-label="Chart settings">
      <Switch label="Draw on scroll" name="animate" spread defaultChecked />
      <Switch label="Replay on click" name="replay" spread defaultChecked />
      <Switch label="Show gridlines" name="gridlines" spread />
      <Switch label="Loop animation" name="loop" spread disabled />
    </SwitchGroup>
  );
}
