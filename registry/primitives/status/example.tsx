import { Status, StatusBlock } from './component';

export function Example() {
  return (
    <div className="flex w-full flex-col items-start gap-[14px]">
      <Status>Waiting for input</Status>
      <Status state="working" meta="80 items">Building registry</Status>
      <Status state="done" meta="62 of 64">Extraction verified</Status>
      <Status state="failed">Two components need network</Status>
      <StatusBlock inline>Loading registry</StatusBlock>
    </div>
  );
}
