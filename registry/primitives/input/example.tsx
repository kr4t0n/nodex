import { Input } from './component';

export function Example() {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-[18px] [&>*]:min-w-0 [&>*]:flex-initial">
      <Input label="Search components" type="search" name="query" placeholder="lollipop, heatmap, sankey" help="Matches titles, types, and tags." />
      <Input label="Component slug" type="text" name="slug" defaultValue="Matrix Heat" error="Slugs are lowercase and hyphenated." />
    </div>
  );
}
