import { Badge } from './component';

export function Example() {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-[18px] [&>*]:min-w-0 [&>*]:flex-initial">
      <Badge variant="solid">Close read</Badge>
      <Badge>Glance</Badge>
      <Badge variant="dashed">Recharts</Badge>
      <Badge variant="quiet">64 components</Badge>
    </div>
  );
}
