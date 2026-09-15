import { Card, CardBody, CardCaption, CardSubtitle, CardTitle } from './component';

export function Example() {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-[18px] [&>*]:min-w-0 [&>*]:flex-initial">
      <Card>
        <CardTitle>Ninety days as a barcode</CardTitle>
        <CardSubtitle>peak concurrent users, daily</CardSubtitle>
        <CardBody>Body content sits here.</CardBody>
        <CardCaption>LOLLIPOP · CLOSE READ</CardCaption>
      </Card>
      <Card variant="inverted">
        <CardTitle>What breaks, stacked and ranked</CardTitle>
        <CardSubtitle>incidents by root cause</CardSubtitle>
        <CardCaption>DOT PLOT · CLOSE READ</CardCaption>
      </Card>
    </div>
  );
}
