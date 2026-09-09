import { Tooltip, TooltipTrigger } from './component';

export function Example() {
  return (
    <div className="flex flex-col items-start gap-[26px] pt-[34px] text-[12.5px] leading-[1.7]">
      <p className="m-0 max-w-[40ch]">Charts are tagged <Tooltip label="One mark per record. Rewards study."><TooltipTrigger>close read</TooltipTrigger></Tooltip> or glance, depending on how they are meant to be read.</p>
      <Tooltip placement="below" wrap label="Sub-pixel strokes are the strongest signature in this language. Anything above the line maximum reads as a different product."><TooltipTrigger>Why 0.8px?</TooltipTrigger></Tooltip>
      <Tooltip align="start" label="Copied to clipboard"><TooltipTrigger>Copy command</TooltipTrigger></Tooltip>
    </div>
  );
}
