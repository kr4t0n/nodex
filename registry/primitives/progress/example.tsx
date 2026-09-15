import { Progress } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-[18px]">
      <Progress label="Quarter target" value={68} />
      <Progress label="Last quarter" value={41} quiet />
      <Progress label="Migration" value={82} thick />
      <Progress label="Indexing" />
    </div>
  );
}
