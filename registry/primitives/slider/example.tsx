import { Slider } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-[22px]">
      <Slider label="Stroke width" name="stroke" valueLabel="0.8px" min={0} max={100} defaultValue={42} />
      <Slider label="Sample size" name="days" valueLabel="90 days" min={0} max={100} defaultValue={72} hollow ticks={12} />
      <Slider label="Unavailable" name="unavailable" valueLabel="--" min={0} max={100} defaultValue={25} disabled />
    </div>
  );
}
