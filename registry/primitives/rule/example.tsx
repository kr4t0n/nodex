import { Rule } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-[18px]">
      <Rule />
      <Rule tone="strong" />
      <Rule tone="faint" />
      <Rule dashed />
      <div className="flex h-[26px] items-center">
        <span>Close read</span><Rule orientation="vertical" /><span>Glance</span><Rule orientation="vertical" /><span>All types</span>
      </div>
    </div>
  );
}
