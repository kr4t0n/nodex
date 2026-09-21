import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const SIGNAL_CHARTS_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { EndpointLatency, type EndpointDatum } from './components/nodex/endpoint-latency/component';
import { RequestThroughput, type RequestThroughputDatum } from './components/nodex/request-throughput/component';
import { LatencyTrend, type LatencyTrendDatum } from './components/nodex/latency-trend/component';
import { ResponseCodes, type ResponseCodesDatum } from './components/nodex/response-codes/component';
import { LatencyHistogram, type LatencyHistogramDatum } from './components/nodex/latency-histogram/component';
import { ServiceHealth, type ServiceHealthDatum } from './components/nodex/service-health/component';
import { CapacityRing, type CapacityRingDatum } from './components/nodex/capacity-ring/component';
import { SaturationScatter, type SaturationScatterDatum } from './components/nodex/saturation-scatter/component';
import { TraceSpans, type TraceSpanDatum } from './components/nodex/trace-spans/component';

type Mode = 'normal' | 'partial' | 'empty' | 'zero' | 'single' | 'invalid' | 'duplicates' | 'limits' | 'quantiles' | 'fractional';
declare global { interface Window { nodexSignal: { setMode: (mode: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }

function Charts({ mode, revision, animate }: { mode: Mode; revision: boolean; animate: boolean }) {
  let endpoints: EndpointDatum[] = [{route:'GET /catalog',p99Ms:revision?900:200},{route:'POST /checkout',p99Ms:800},{route:'GET /catalog',p99Ms:0},{route:'POST /a-long-route/that-needs-the-full-tooltip',p99Ms:300}];
  let throughput: RequestThroughputDatum[] = [10,20,35,revision?42:18].map((requestsPerSecond,i)=>({id:String(i),label:'12:0'+i,requestsPerSecond}));
  let latency: LatencyTrendDatum[] = [[10,20,30],[20,50,80],[25,60,100],[30,70,90]].map(([p50Ms,p95Ms,p99Ms],i)=>({id:String(i),label:'12:0'+i,p50Ms:p50Ms!,p95Ms:p95Ms!,p99Ms:p99Ms!}));
  let responses: ResponseCodesDatum[] = [20,30,40,10].map((success,i)=>({id:String(i),label:'12:0'+i,success,redirect:4,clientError:2,serverError:i+1}));
  let histogram: LatencyHistogramDatum[] = [2,6,10].map(count=>({count}));
  let health: ServiceHealthDatum[] = [{serviceId:'a',windowId:'0',status:'healthy'},{serviceId:'a',windowId:'1',status:'degraded'},{serviceId:'b',windowId:'0',status:'down'},{serviceId:'b',windowId:'1',status:null}];
  let capacity: CapacityRingDatum = {used:revision?80:60,capacity:100};
  let hosts: SaturationScatterDatum[] = [{id:'a',label:'Same',cpuPercent:revision?40:20,latencyMs:40},{id:'b',label:'Same',cpuPercent:90,latencyMs:60},{id:'c',label:'Third',cpuPercent:50,latencyMs:110}];
  let spans: TraceSpanDatum[] = [{id:'a',label:'Request',startMs:0,endMs:100,outcome:'ok'},{id:'b',label:'Parallel A',startMs:20,endMs:60},{id:'c',label:'Parallel B',startMs:40,endMs:90,outcome:'error'},{id:'d',label:'Instant',startMs:75,endMs:75}];
  if(mode==='empty'){endpoints=[];throughput=[];latency=[];responses=[];histogram=[];health=[];capacity={used:null,capacity:100};hosts=[];spans=[];}
  if(mode==='partial'){
    endpoints[1]={...endpoints[1]!,p99Ms:NaN};endpoints[3]={...endpoints[3]!,p99Ms:-1};
    throughput=throughput.map((p,i)=>({...p,requestsPerSecond:i===1||i===3?null:p.requestsPerSecond}));
    latency=latency.map((p,i)=>({...p,p99Ms:i===1||i===3?null:p.p99Ms}));
    responses=responses.map((p,i)=>({...p,clientError:i===1?null:p.clientError}));
    histogram[1]={count:null};health=health.slice(1);capacity={used:null,capacity:100};
    hosts[1]={...hosts[1]!,cpuPercent:null};spans[1]={...spans[1]!,endMs:null};
  }
  if(mode==='zero'||mode==='invalid'){
    const value=mode==='zero'?0:NaN;
    endpoints=endpoints.map(p=>({...p,p99Ms:value}));
    throughput=throughput.map(p=>({...p,requestsPerSecond:value}));
    latency=latency.map(p=>({...p,p50Ms:value,p95Ms:value,p99Ms:value}));
    responses=responses.map(p=>({...p,success:value,redirect:value,clientError:value,serverError:value}));
    histogram=histogram.map(()=>({count:value}));capacity={used:value,capacity:100};
    hosts=hosts.map(p=>({...p,cpuPercent:value,latencyMs:value}));spans=spans.map(p=>({...p,startMs:value,endMs:value}));
  }
  if(mode==='single'){endpoints=endpoints.slice(0,1);throughput=throughput.slice(0,1);latency=latency.slice(0,1);responses=responses.slice(0,1);histogram=histogram.slice(0,1);health=health.slice(0,1);hosts=hosts.slice(0,1);spans=spans.slice(0,1);}
  if(mode==='duplicates'){
    throughput=throughput.map(p=>({...p,id:'same'}));latency=latency.map(p=>({...p,id:'same'}));responses=responses.map(p=>({...p,id:'same'}));
    health=[health[0]!,health[0]!];hosts=hosts.map(p=>({...p,id:'same'}));spans=spans.map(p=>({...p,id:'same'}));
  }
  if(mode==='quantiles')latency=latency.map(p=>({...p,p50Ms:100,p95Ms:50,p99Ms:75}));
  if(mode==='fractional'){responses=responses.map(p=>({...p,success:0.5}));histogram=histogram.map(()=>({count:0.5}));}
  if(revision){hosts=hosts.toReversed();spans=spans.toReversed();}
  return <>
    <EndpointLatency data={endpoints} objectiveMs={mode==='limits'?NaN:mode==='zero'?0:300} animate={animate}/>
    <RequestThroughput data={throughput} animate={animate}/>
    <LatencyTrend data={latency} objectiveMs={mode==='limits'?NaN:85} animate={animate}/>
    <ResponseCodes data={responses} animate={animate}/>
    <LatencyHistogram data={histogram} bucketWidthMs={mode==='limits'?0:50} objectiveMs={75} animate={animate}/>
    <ServiceHealth data={health} services={[{id:'a',label:'Same'},{id:'b',label:'Same'}]} windows={[{id:'0',label:'12:00'},{id:'1',label:'12:05'}]} animate={animate}/>
    <CapacityRing data={capacity} warningAt={mode==='limits'?2:0.75} animate={animate}/>
    <SaturationScatter data={hosts} cpuThresholdPercent={mode==='limits'?120:80} latencyObjectiveMs={85} animate={animate}/>
    <TraceSpans data={spans} animate={animate}/>
  </>;
}
export function SignalChartsConsumer({ animate }: { animate: boolean }) {
  const [mode,setMode]=useState<Mode>('normal');const [revision,setRevision]=useState(false);const [localAnimation,setAnimate]=useState(false);
  useEffect(()=>{window.nodexSignal={setMode,setRevision,setAnimate};},[]);
  return <div data-signal><section id="signal-primary" className="w-[660px]"><Charts mode={mode} revision={revision} animate={animate||localAnimation}/></section><section id="signal-secondary" className="w-[580px]"><Charts mode="normal" revision={false} animate={false}/></section></div>;
}
`;

export const SIGNAL_CHART_SLUGS = ['endpoint-latency', 'request-throughput', 'latency-trend', 'response-codes', 'latency-histogram', 'service-health', 'capacity-ring', 'saturation-scatter', 'trace-spans'] as const;
const chart = (page: Page, slug: string, scope = 'primary') => page.locator(`#signal-${scope} [data-nx-chart="${slug}"]`);
const setMode = (page: Page, mode: string) => page.evaluate(mode => (window as unknown as { nodexSignal: { setMode: (mode: string) => void } }).nodexSignal.setMode(mode), mode);

export async function checkSignalChartsConsumer(page: Page): Promise<void> {
  const endpoints = chart(page, 'endpoint-latency');
  const throughput = chart(page, 'request-throughput'); const latency = chart(page, 'latency-trend');
  const responses = chart(page, 'response-codes'); const histogram = chart(page, 'latency-histogram');
  const health = chart(page, 'service-health'); const capacity = chart(page, 'capacity-ring');
  const scatter = chart(page, 'saturation-scatter'); const spans = chart(page, 'trace-spans');
  for (const slug of SIGNAL_CHART_SLUGS) for (const scope of ['primary', 'secondary']) await expect(chart(page, slug, scope).locator('svg.recharts-surface')).toHaveCount(1);
  await expect(endpoints.locator('[data-nx-summary]')).toHaveText('1 OF 4 OVER SLO');
  await expect(endpoints.locator('[data-nx-endpoint-value]')).toHaveText(['800', '300', '200', '0']);
  await expect(endpoints.locator('[data-nx-endpoint-route="GET /catalog"]')).toHaveCount(2);
  await expect(endpoints.locator('[data-nx-endpoint-zero]')).toHaveCount(1);
  const endpointBars = await endpoints.locator('.recharts-bar-rectangle path').evaluateAll(elements => elements.map(element => { const box = (element as SVGGraphicsElement).getBBox(); return { x: box.x, y: box.y, width: box.width, height: box.height }; }));
  assert(Math.abs(endpointBars[1]!.width / endpointBars[0]!.width - 300 / 800) < 0.001, 'Ranked bars must encode p99 on one shared scale');
  const endpointSlo = await endpoints.locator('.recharts-reference-line line').evaluate(element => Number(element.getAttribute('x1')));
  assert(Math.abs(endpointSlo - endpointBars[1]!.x - endpointBars[1]!.width) < 0.01, 'A reading at the SLO must end exactly on the objective');
  const endpointLabels = await endpoints.locator('[data-nx-endpoint-value]').evaluateAll(elements => elements.map(element => ({ x: Number(element.getAttribute('x')), y: Number(element.getAttribute('y')) })));
  assert(endpointLabels.every(point => point.x === endpointLabels[0]!.x), 'P99 readings must share an aligned column');
  for (let i = 0; i < endpointBars.length; i++) assert(Math.abs(endpointLabels[i]!.y - endpointBars[i]!.y - endpointBars[i]!.height / 2) < 0.01, 'Each P99 label must track its native bar band');
  assert(await endpoints.locator('[data-nx-endpoint-label]').evaluateAll(elements => elements.every(element => element.querySelectorAll('tspan').length === 1)), 'Route labels must stay on one line');
  await endpoints.locator('svg.recharts-surface').focus();
  await endpoints.locator('svg.recharts-surface').press('ArrowLeft');
  await expect(endpoints.getByRole('status')).toContainText('POST /a-long-route/that-needs-the-full-tooltip');
  await expect(endpoints.getByRole('status')).toContainText('Within SLO');
  await expect(throughput.locator('[data-nx-summary]')).toHaveText('18 REQ/S');
  await expect(throughput.locator('[data-nx-throughput]')).toHaveCount(4);
  await expect(latency.locator('[data-nx-latency]')).toHaveCount(12);
  await expect(responses.locator('[data-nx-response]')).toHaveCount(16);
  await expect(health.locator('[data-nx-health]')).toHaveCount(4);
  await expect(scatter.locator('[data-nx-host]')).toHaveCount(3);
  await expect(spans.locator('[data-nx-span]')).toHaveCount(3);
  await expect(spans.locator('[data-nx-span-state]')).toHaveText('0ms');

  const bars = await histogram.locator('[data-nx-bucket]').evaluateAll(elements => elements.map(element => { const box = (element as SVGGraphicsElement).getBBox(); return { x:box.x, width:box.width, height:box.height }; }));
  assert.equal(bars.length, 3);
  assert(Math.abs(bars[1]!.height / bars[0]!.height - 3) < 0.01, 'Histogram heights must encode counts');
  assert(Math.abs(bars[1]!.width - bars[0]!.width) < 0.01 && Math.abs(bars[1]!.x - bars[0]!.x - bars[0]!.width) < 0.01, 'Equal numeric buckets must be contiguous and equally wide');
  const objectiveX = await histogram.locator('.recharts-reference-line line').evaluate(element => Number(element.getAttribute('x1')));
  assert(Math.abs(objectiveX - bars[1]!.x - bars[1]!.width / 2) < 0.01, 'An objective inside a bucket must use its exact numeric position');
  const usedAngle = await capacity.locator('[data-nx-capacity-part="Used"]').evaluate(element => Math.abs(Number(element.getAttribute('data-nx-end')) - Number(element.getAttribute('data-nx-start'))));
  assert(Math.abs(usedAngle - 216) < 0.001, '60% usage must occupy exactly 216 degrees');
  const spanBoxes = await spans.locator('[data-nx-span] .recharts-rectangle').evaluateAll(elements => elements.map(element => { const box = (element as SVGGraphicsElement).getBBox(); return { x:box.x, width:box.width }; }));
  assert(Math.abs(spanBoxes[1]!.width / spanBoxes[0]!.width - 0.4) < 0.01, 'Span length must encode elapsed time');
  assert(Math.abs((spanBoxes[2]!.x - spanBoxes[0]!.x) / spanBoxes[0]!.width - 0.4) < 0.01, 'Concurrent spans must keep their actual start offsets');

  for (const slug of SIGNAL_CHART_SLUGS) {
    await page.mouse.move(0, 0);
    const surface = chart(page, slug).locator('svg.recharts-surface');
    await surface.focus();
    await surface.press(slug === 'trace-spans' || slug === 'endpoint-latency' ? 'ArrowLeft' : 'ArrowRight');
    await expect(chart(page, slug).getByRole('status')).toBeVisible();
  }
  const siblingPaint = await chart(page, 'request-throughput', 'secondary').locator('.recharts-area-curve').evaluate(element => getComputedStyle(element).stroke);
  await page.locator('#signal-primary').evaluate(element => {
    const node = element as HTMLElement;
    node.style.setProperty('--nx-ink', '#153354'); node.style.setProperty('--nx-muted', '#7399aa');
    node.style.setProperty('--nx-crit', '#eb586a'); node.style.setProperty('--nx-withinObjective', '#329978');
    node.style.setProperty('--nx-surface', '#15212f');
  });
  for (const slug of SIGNAL_CHART_SLUGS) await expect.poll(() => chart(page, slug).evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(21, 33, 47)');
  await expect.poll(() => throughput.locator('.recharts-area-curve').evaluate(element => getComputedStyle(element).stroke)).toBe('rgb(21, 51, 84)');
  for (const mark of [histogram.locator('[data-nx-bucket]').first(), spans.locator('[data-nx-span="b"] .recharts-rectangle')]) {
    await expect.poll(() => mark.evaluate(element => getComputedStyle(element).fill)).toBe('rgb(115, 153, 170)');
  }
  for (const mark of [endpoints.locator('.recharts-bar-rectangle path').first(), endpoints.locator('[data-nx-endpoint-value]').first(), latency.locator('[data-nx-latency="2"][data-nx-percentile="p99Ms"]'), responses.locator('[data-nx-code="serverError"]').first(), health.locator('[data-nx-state="down"] rect'), scatter.locator('[data-nx-host="c"] rect')]) {
    await expect.poll(() => mark.evaluate(element => getComputedStyle(element).fill)).toBe('rgb(235, 88, 106)');
  }
  await expect.poll(() => capacity.locator('[data-nx-capacity-part="Used"]').evaluate(element => getComputedStyle(element).fill)).toBe('rgb(50, 153, 120)');
  assert.equal(await chart(page, 'request-throughput', 'secondary').locator('.recharts-area-curve').evaluate(element => getComputedStyle(element).stroke), siblingPaint, 'Descendant tokens must not affect a sibling chart');
  await page.locator('#signal-primary').evaluate(element => element.removeAttribute('style'));
  await page.evaluate(() => (window as unknown as { nodexSignal: { setRevision: (value: boolean) => void } }).nodexSignal.setRevision(true));
  await expect(endpoints.locator('[data-nx-endpoint-value]')).toHaveText(['900', '800', '300', '0']);
  await expect(endpoints.locator('[data-nx-endpoint-row]').first()).toHaveAttribute('data-nx-endpoint-route', 'GET /catalog');
  await expect(chart(page, 'endpoint-latency', 'secondary').locator('[data-nx-endpoint-value]')).toHaveText(['800', '300', '200', '0']);
  await expect(throughput.locator('[data-nx-summary]')).toHaveText('42 REQ/S');
  await expect(capacity.locator('[data-nx-capacity-percent]')).toHaveText('80%');
  await expect(capacity).toContainText('ABOVE THRESHOLD');
  await expect(scatter.locator('[data-nx-host="a"]')).toHaveAttribute('data-nx-cpu', '40');
  await expect(spans.locator('[data-nx-span="c"]')).toHaveAttribute('data-nx-start-ms', '40');

  for (const width of [375, 320]) {
    await page.locator('#signal-primary').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, width);
    for (const slug of SIGNAL_CHART_SLUGS) await expect.poll(() => chart(page, slug).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect.poll(() => capacity.evaluate(element => element.querySelector('dl')!.getBoundingClientRect().top >= element.querySelector('svg')!.getBoundingClientRect().bottom)).toBe(true);
  }
  await page.locator('#signal-primary').evaluate(element => element.removeAttribute('style'));
  await page.evaluate(() => (window as unknown as { nodexSignal: { setRevision: (value: boolean) => void } }).nodexSignal.setRevision(false));
  await setMode(page, 'partial');
  await expect(endpoints.locator('[data-nx-endpoint-value]')).toHaveText(['200', '0']);
  await expect(endpoints).toContainText('2 UNAVAILABLE');
  await expect(throughput.locator('[data-nx-throughput]')).toHaveCount(2);
  await expect(throughput.locator('[data-nx-summary]')).toHaveText('— REQ/S');
  await expect(latency.locator('[data-nx-percentile="p99Ms"]')).toHaveCount(2);
  await expect(latency.locator('[data-nx-percentile="p50Ms"]')).toHaveCount(4);
  await expect(responses.locator('[data-nx-response="1"]')).toHaveCount(0);
  await expect(responses.locator('[data-nx-response-state="1"]')).toHaveText('?');
  await expect(histogram.locator('[data-nx-bucket]')).toHaveCount(2);
  await expect(histogram.locator('[data-nx-summary]')).toHaveText('— REQUESTS');
  await expect(health.locator('[data-nx-state="unavailable"]')).toHaveCount(2);
  await expect(scatter.locator('[data-nx-host]')).toHaveCount(2);
  await expect(scatter).toContainText('1 UNAVAILABLE');
  await expect(spans.locator('[data-nx-span="b"]')).toHaveCount(0);
  await expect(spans.locator('[data-nx-span-state="b"]')).toHaveText('Unavailable');
  await expect(spans.locator('[data-nx-summary]')).toHaveText('— MS / LAST END');
  await expect(capacity.getByRole('status')).toBeVisible();

  await setMode(page, 'zero');
  await expect(endpoints.locator('[data-nx-endpoint-zero]')).toHaveCount(4);
  await expect(endpoints.locator('[data-nx-endpoint-value]')).toHaveText(['0', '0', '0', '0']);
  await expect(endpoints.locator('[data-nx-summary]')).toHaveText('0 OF 4 OVER SLO');
  await expect(throughput.locator('[data-nx-throughput]')).toHaveCount(4);
  await expect(latency.locator('[data-nx-latency]')).toHaveCount(12);
  await expect(responses.locator('[data-nx-response]')).toHaveCount(0);
  await expect(responses.locator('[data-nx-response-state]')).toHaveText(['0', '0', '0', '0']);
  await expect(histogram.locator('[data-nx-bucket]')).toHaveCount(0);
  await expect(histogram.locator('[data-nx-bucket-state]')).toHaveText(['0', '0', '0']);
  await expect(capacity.locator('[data-nx-capacity-part="Used"]')).toHaveCount(0);
  await expect(capacity.locator('[data-nx-capacity-percent]')).toHaveText('0%');
  await expect(scatter.locator('[data-nx-host]')).toHaveCount(3);
  await expect(spans.locator('[data-nx-span-state]')).toHaveText(['0ms', '0ms', '0ms', '0ms']);
  await setMode(page, 'single');
  await expect(endpoints.locator('[data-nx-endpoint-row]')).toHaveCount(1);
  await expect(throughput.locator('[data-nx-throughput]')).toHaveCount(1);
  await expect(latency.locator('[data-nx-latency]')).toHaveCount(3);
  await expect(histogram.locator('[data-nx-bucket]')).toHaveCount(1);
  await expect(scatter.locator('[data-nx-host]')).toHaveCount(1);
  await expect(spans.locator('[data-nx-span]')).toHaveCount(1);
  for (const mode of ['empty', 'invalid']) {
    await setMode(page, mode);
    for (const slug of SIGNAL_CHART_SLUGS.filter(slug => slug !== 'service-health')) {
      await expect(chart(page, slug).getByRole('status')).toBeVisible();
      await expect(chart(page, slug).locator('svg')).toHaveCount(0);
    }
    if (mode === 'empty') await expect(health.locator('[data-nx-state="unavailable"]')).toHaveCount(4);
  }
  await setMode(page, 'duplicates');
  for (const slug of ['request-throughput', 'latency-trend', 'response-codes', 'service-health', 'saturation-scatter', 'trace-spans']) await expect(chart(page, slug).locator('svg')).toHaveCount(0);
  await setMode(page, 'limits');
  await expect(endpoints).toContainText('SLO UNAVAILABLE');
  await expect(endpoints.locator('.recharts-reference-line')).toHaveCount(0);
  const unclassifiedColor = await endpoints.getByText('SLO UNAVAILABLE · BARS UNCLASSIFIED').evaluate(element => getComputedStyle(element).color);
  await expect.poll(() => endpoints.locator('.recharts-bar-rectangle path').first().evaluate(element => getComputedStyle(element).fill)).toBe(unclassifiedColor);
  for (const slug of ['latency-histogram', 'capacity-ring', 'saturation-scatter']) await expect(chart(page, slug).locator('svg')).toHaveCount(0);
  await expect(latency).toContainText('SLO UNAVAILABLE');
  await expect(latency.locator('.recharts-reference-line')).toHaveCount(0);
  await setMode(page, 'quantiles'); await expect(latency.locator('svg')).toHaveCount(0);
  await setMode(page, 'fractional'); await expect(responses.locator('svg')).toHaveCount(0); await expect(histogram.locator('svg')).toHaveCount(0);
  await setMode(page, 'normal');
  await page.evaluate(() => (window as unknown as { nodexSignal: { setAnimate: (value: boolean) => void } }).nodexSignal.setAnimate(true));
  for (const slug of SIGNAL_CHART_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const slug of SIGNAL_CHART_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of SIGNAL_CHART_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await expect(throughput.locator('[data-nx-throughput]')).toHaveCount(4); await expect(health.locator('[data-nx-health]')).toHaveCount(4);
  await expect(endpoints.locator('[data-nx-endpoint-value]')).toHaveText(['800', '300', '200', '0']);
  await page.evaluate(() => (window as unknown as { nodexSignal: { setAnimate: (value: boolean) => void } }).nodexSignal.setAnimate(false));
  console.log('Validated nine Signal Console charts: quantitative geometry, ranked endpoint alignment, complete counts, real span offsets, native keyboard inspection, scoped tokens, mobile fit, missing/zero/invalid observations and reduced motion.');
}
