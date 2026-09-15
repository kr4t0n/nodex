import { Button } from './component';

export function Example() {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-[18px] [&>*]:min-w-0 [&>*]:flex-initial">
      <Button>Add component</Button>
      <Button variant="outline">Close read</Button>
      <Button variant="outline" aria-pressed="true">Glance</Button>
      <Button variant="quiet">Clear filters</Button>
      <Button disabled>Unavailable</Button>
    </div>
  );
}
