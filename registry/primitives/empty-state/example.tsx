import { EmptyState } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[18px]">
      <EmptyState title="Nothing matches" hint="Try a broader search, or clear the filters to see the whole language." />
      <EmptyState title="No primitives yet" hint="This language has tokens and charts but no shared controls. Run nodex new-language to scaffold them." quiet />
    </div>
  );
}
