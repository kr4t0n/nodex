import { Textarea } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-5">
      <Textarea label="Subtitle" name="subtitle" rows={3} defaultValue="one tick = one respondent in a hundred · inked = picked it" help="Say what one mark represents." count="58 / 120" />
      <Textarea label="Chart options" name="options" rows={3} defaultValue={'{ strokeWidth: "var(--nx-stroke-hairline)" }'} monospace autoSize help="Grows with its content where supported." />
    </div>
  );
}
