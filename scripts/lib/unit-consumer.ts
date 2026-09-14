import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';
export const UNIT_SLUGS = ['hundred-field', 'ballot-tally', 'tick-donut', 'tick-gauge', 'donut-redesigned', 'custom-pie'];
export const UNIT_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {HundredField} from './components/nodex/hundred-field/component';
import {TickDonut} from './components/nodex/tick-donut/component';
import {DonutRedesigned} from './components/nodex/donut-redesigned/component';
import {CustomPie} from './components/nodex/custom-pie/component';
import {TickGauge} from './components/nodex/tick-gauge/component';
import {BallotTally} from './components/nodex/ballot-tally/component';
type Mode='normal'|'revised'|'empty'|'zero'|'invalid'|'partial'|'single'|'excess'|'groups';
type Size={width?:number;height?:number};
declare global {interface Window {nodexUnitFixture:{setMode:(mode:Mode)=>void;setSize:(size:Size)=>void}}}
function Charts({mode,animate,size={}}:{mode:Mode;animate:boolean;size?:Size}) {
 const values=mode==='invalid'?[NaN,Infinity,-1,0.5]:mode==='zero'?[0,0,0,0]:mode==='excess'?[80,40,20,10]:mode==='partial'?[40,null,20,10]:mode==='revised'?[20,50,20,10]:[40,30,20,10];
 const surfaces=mode==='empty'?[]:[{surface:'A',sharePct:mode==='invalid'?NaN:mode==='single'?100:mode==='revised'?20:50,minutes:mode==='zero'?0:mode==='revised'?90:15},...mode==='single'?[]:[{surface:'A',sharePct:30,minutes:mode==='partial'?null:mode==='zero'?0:45},{surface:'B',sharePct:mode==='revised'?50:20,minutes:mode==='zero'?0:30}],...mode==='groups'?[{surface:'Zero',sharePct:0,minutes:20}]:[]];
 const data=values.map(percent=>({name:'A',percent}));
 const rows=mode==='empty'?[]:mode==='single'?data.slice(0,1):mode==='groups'?[...data,{name:'Fifth',percent:0}]:data;
 return <><HundredField data={rows} animate={animate}/><BallotTally data={rows.map(row=>({option:row.name,picked:row.percent}))} animate={animate}/><TickDonut {...size} data={mode==='single'?[{channel:'A',percent:100}]:rows.map(row=>({channel:row.name,percent:row.percent}))} animate={animate}/><TickGauge {...size} data={mode==='empty'?null:{percent:mode==='single'?100:values[0]??null,goalLabel:mode==='revised'?'REVISED GOAL':'QUARTER TARGET'}} animate={animate}/><DonutRedesigned data={mode==='single'?[{source:'A',percent:100}]:rows.map(row=>({source:row.name,percent:row.percent}))} animate={animate}/><CustomPie data={surfaces} scaleMinutes={45} referenceMinutes={[15,30,45,NaN,Infinity,-1,15]} animate={animate}/></>;
}
export function UnitConsumer({animate}:{animate:boolean}) {
 const [mode,setMode]=useState<Mode>('normal');const [size,setSize]=useState<Size>({});useEffect(()=>{window.nodexUnitFixture={setMode,setSize};},[]);
 return <><section id="unit-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate} size={size}/></section><section id="unit-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;
async function setMode(page:Page,mode:string){await page.evaluate(value=>(window as unknown as {nodexUnitFixture:{setMode:(mode:string)=>void}}).nodexUnitFixture.setMode(value),mode);}
export async function checkBallotLayout(node: Locator): Promise<void> {
 await expect.poll(() => node.evaluate(element => {
  const svg = element.querySelector('svg.recharts-surface')!.getBoundingClientRect();
  const labels = [...element.querySelectorAll<SVGTextElement>('[data-nx-option-label]')];
  const rules = [...element.querySelectorAll('[data-nx-row-rule]')].map(rule => rule.getBoundingClientRect());
  return labels.length > 0 && labels.every(label => {
   const bounds = label.getBoundingClientRect();
   const row = label.dataset.nxOptionLabel!;
   const marks = [...element.querySelectorAll(`[data-nx-observation="${row}"] [data-nx-tally], [data-nx-count="${row}"]`)];
   return bounds.left >= svg.left && bounds.right <= svg.right && bounds.top >= svg.top && bounds.bottom <= svg.bottom
    && marks.every(mark => bounds.bottom + 0.5 < mark.getBoundingClientRect().top)
    && rules.every(rule => bounds.bottom + 0.5 < rule.top || bounds.top - 0.5 > rule.bottom);
  });
 }), { message: 'Ballot headings must stay above ticks and counts, clear of dividers and inside the chart' }).toBe(true);
}
export async function checkUnitConsumer(page:Page):Promise<void>{
 const node=page.locator('#unit-primary [data-nx-chart="hundred-field"]');const sibling=page.locator('#unit-secondary [data-nx-chart="hundred-field"]');
 await expect(node.locator('[data-nx-person]')).toHaveCount(100);await expect(node.locator('[data-nx-person="0"]')).toHaveCount(40);await expect(node.locator('[data-nx-spoke="0"]')).toHaveCount(8);await expect(node.locator('[data-nx-tie]')).toHaveCount(4);await expect(node.locator('[data-nx-share="1"]')).toHaveText('A 30');
 await node.scrollIntoViewIfNeeded();await node.locator('[data-nx-person="0"]').first().hover();const tooltip=node.locator('.recharts-tooltip-wrapper:visible');await expect(tooltip).toHaveText('A — 40 people in a hundred');
 await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — 30 people in a hundred');await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — 20 people in a hundred');await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — 10 people in a hundred');await expect(sibling.locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
 const ballot=page.locator('#unit-primary [data-nx-chart="ballot-tally"]');const otherBallot=page.locator('#unit-secondary [data-nx-chart="ballot-tally"]');
 await expect(ballot.locator('[data-nx-tally]')).toHaveCount(400);await expect(ballot.locator('[data-nx-tally-series="picked"] [data-nx-tally]')).toHaveCount(100);await expect(ballot.locator('[data-nx-counting-dot]')).toHaveCount(40);
 await checkBallotLayout(ballot);await checkBallotLayout(otherBallot);
 await ballot.scrollIntoViewIfNeeded();const tick=await ballot.locator('[data-nx-observation="0"] [data-nx-tally-series="picked"] [data-nx-tally="2"]').boundingBox();assert(tick);await page.mouse.move(tick.x+tick.width/2,tick.y+tick.height/2);const ballotTooltip=ballot.locator('.recharts-tooltip-wrapper:visible');await expect(ballotTooltip).toHaveText('40 of 100 picked this — they could pick several');
 await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await ballot.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(ballotTooltip).toHaveText('30 of 100 picked this — they could pick several');await expect(otherBallot.locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
 await ballot.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-markUnselected','#234567');s.setProperty('--nx-stroke-mark','1.5px');s.setProperty('--nx-stroke-hairline','1.4px');});
 await expect.poll(()=>ballot.locator('[data-nx-tally-series="picked"] rect').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');await expect.poll(()=>ballot.locator('[data-nx-tally-series="unpicked"] rect').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(35, 69, 103)');await expect.poll(()=>ballot.locator('[data-nx-tally-series="picked"] rect').first().evaluate(e=>getComputedStyle(e).width)).toBe('1.35px');await expect.poll(()=>ballot.locator('[data-nx-tally-series="unpicked"] rect').first().evaluate(e=>getComputedStyle(e).width)).toBe('1.1px');assert.notEqual(await otherBallot.locator('[data-nx-tally-series="picked"] rect').first().evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
 const ballotWidth=Number(await ballot.locator('svg').getAttribute('width'));await ballot.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await ballot.locator('svg').getAttribute('width'))).toBeLessThan(ballotWidth);await checkBallotLayout(ballot);await ballot.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await ballot.locator('svg').getAttribute('width'))).toBe(ballotWidth);
 const oldPaint=await sibling.locator('[data-nx-person="0"]').first().evaluate(e=>getComputedStyle(e).fill);
 await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-markDeep','#234567');s.setProperty('--nx-stroke-hairline','1.4px');});
 await expect.poll(()=>node.locator('[data-nx-person="0"]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('[data-nx-person="1"]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(35, 69, 103)');await expect.poll(()=>node.locator('[data-nx-spoke]').first().evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1px');assert.equal(await sibling.locator('[data-nx-person="0"]').first().evaluate(e=>getComputedStyle(e).fill),oldPaint);
 const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
 await setMode(page,'revised');await expect(ballot.locator('[data-nx-count="0"]')).toHaveText('20');await expect(ballot.locator('[data-nx-observation="0"] [data-nx-tally-series="picked"] rect')).toHaveCount(20);await expect(node.locator('[data-nx-person="0"]')).toHaveCount(20);await expect(node.locator('[data-nx-person="1"]')).toHaveCount(50);await expect(node.locator('[data-nx-person]')).toHaveCount(100);
 await setMode(page,'partial');await expect(ballot.locator('[data-nx-tally]')).toHaveCount(300);await expect(ballot.locator('[data-nx-count="1"]')).toHaveText('—');await expect(ballot.locator('[data-nx-observation="1"] [data-nx-tally-series="unpicked"] rect')).toHaveCount(0);await expect(node.locator('[data-nx-person]')).toHaveCount(70);await expect(node.locator('[data-nx-share="1"]')).toHaveText('A —');
 await checkBallotLayout(ballot);
 for(const mode of ['single','zero','invalid','empty','excess','groups']) {await setMode(page,mode);if(mode==='invalid'||mode==='empty')await expect(ballot.getByRole('status')).toContainText('available');else await expect(ballot.locator('svg.recharts-surface')).toHaveCount(1);if(mode==='zero'){await expect(ballot.locator('[data-nx-tally-series="picked"] rect')).toHaveCount(0);await expect(ballot.locator('[data-nx-tally-series="unpicked"] rect')).toHaveCount(400);}if(mode==='excess')await expect(ballot.locator('[data-nx-tally-series="picked"] rect')).toHaveCount(150);if(mode==='groups')await expect(ballot.locator('[data-nx-tally]')).toHaveCount(500);if(['invalid','empty','excess','groups'].includes(mode))await expect(node.getByRole('status')).toContainText('available');else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);if(mode==='zero'){await expect(node.locator('[data-nx-person]')).toHaveCount(0);await expect(node.locator('[data-nx-share="0"]')).toHaveText('A 0');}if(mode==='single'){await expect(node.locator('[data-nx-person]')).toHaveCount(40);await expect(node.locator('[data-nx-tie]')).toHaveCount(0);}}
 await setMode(page,'normal');await checkRadialConsumer(page);await checkGridAndPieConsumer(page);console.log('Validated exact percentage-unit counts, partial allocation, segment-only keyboard inspection, scoped cluster paint/strokes, duplicate names and invalid totals.');
}

export async function checkRadialGeometry(node: Locator): Promise<void> {
 await expect(node.locator('[data-nx-radial-tick]')).toHaveCount(100);
 await expect.poll(() => node.evaluate(element => {
  const svg = element.querySelector<SVGSVGElement>('svg.recharts-surface')!;
  const box = svg.getBoundingClientRect();
  const screenPoint = (mark: SVGGraphicsElement, point: DOMPoint | SVGPoint) => {
   const p = point.matrixTransform(mark.getScreenCTM()!);
   return { x: p.x - box.x, y: p.y - box.y };
  };
  const ticks = [...element.querySelectorAll<SVGPathElement>('[data-nx-radial-tick]')]
   .sort((a, b) => Number(a.dataset.nxRadialTick) - Number(b.dataset.nxRadialTick));
  const points = ticks.map(tick => screenPoint(tick, tick.getPointAtLength(0)));
  const [a, b, c] = [points[0]!, points[33]!, points[66]!];
  const bx = b.x - a.x; const by = b.y - a.y; const cx = c.x - a.x; const cy = c.y - a.y;
  const determinant = 2 * (bx * cy - by * cx);
  const bb = bx * bx + by * by; const cc = cx * cx + cy * cy;
  const center = { x: a.x + (cy * bb - by * cc) / determinant, y: a.y + (bx * cc - cx * bb) / determinant };
  const distance = (p: { x: number; y: number }) => Math.hypot(p.x - center.x, p.y - center.y);
  const radius = distance(a);
  const radialError = Math.max(...points.map(p => Math.abs(distance(p) - radius)));
  const guides = [...element.querySelectorAll<SVGCircleElement>('[data-nx-counting-bead], [data-nx-scale-mark] circle')];
  const guideRatio = element.getAttribute('data-nx-chart') === 'tick-donut' ? 59 / 64 : 97 / 104;
  const guideError = Math.max(...guides.map(guide => Math.abs(distance(screenPoint(guide, new DOMPoint(guide.cx.baseVal.value, guide.cy.baseVal.value))) - radius * guideRatio)));
  const fits = ticks.every(tick => [0, tick.getTotalLength()].every(length => {
   const p = screenPoint(tick, tick.getPointAtLength(length));
   return p.x >= 0 && p.x <= box.width && p.y >= 0 && p.y <= box.height;
  }));
  return { circular: Number.isFinite(radialError) && radialError < 0.03, concentricGuides: Number.isFinite(guideError) && guideError < 0.03, fits };
 }), { message: 'Radial ticks must lie on one circle, with concentric guides and no clipped endpoints' })
  .toEqual({ circular: true, concentricGuides: true, fits: true });
}

async function checkRadialConsumer(page:Page):Promise<void>{
 const donut=page.locator('#unit-primary [data-nx-chart="tick-donut"]');const gauge=page.locator('#unit-primary [data-nx-chart="tick-gauge"]');
 const other=page.locator('#unit-secondary [data-nx-chart="tick-donut"]');
 for (const node of [donut, gauge, other, page.locator('#unit-secondary [data-nx-chart="tick-gauge"]')]) await checkRadialGeometry(node);
 for (const size of [{ width: 340 }, { width: 780, height: 300 }, { width: 340, height: 560 }, {}]) {
  await page.evaluate(value => (window as unknown as { nodexUnitFixture: { setSize: (size: { width?: number; height?: number }) => void } }).nodexUnitFixture.setSize(value), size);
  for (const node of [donut, gauge]) {
   await expect(node).toHaveCSS('width', `${size.width ?? 660}px`);
   if (size.height) await expect(node).toHaveCSS('height', `${size.height}px`);
   const plot = await node.evaluate(element => {
    const style = getComputedStyle(element);
    return { width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) };
   });
   await expect.poll(async () => Number(await node.locator('svg.recharts-surface').getAttribute('width'))).toBe(Math.round(plot.width));
   if (size.height) await expect.poll(async () => Number(await node.locator('svg.recharts-surface').getAttribute('height'))).toBe(Math.round(plot.height));
   await checkRadialGeometry(node);
  }
 }
 await expect(donut.locator('[data-nx-radial-tick]')).toHaveCount(100);await expect(donut.locator('[data-nx-radial-series="0"] [data-nx-radial-tick]')).toHaveCount(40);await expect(donut.locator('[data-nx-counting-bead]')).toHaveCount(10);await expect(donut.locator('[data-nx-radial-series="1"] [data-nx-radial-tick]').first()).toHaveAttribute('data-nx-radial-tick','40');
 await expect(gauge.locator('[data-nx-radial-series="reached"] [data-nx-radial-tick]')).toHaveCount(40);await expect(gauge.locator('[data-nx-radial-series="remaining"] [data-nx-radial-tick]')).toHaveCount(60);await expect(gauge.locator('[data-nx-progress]')).toHaveText('40%');
 await donut.scrollIntoViewIfNeeded();await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await donut.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');const tooltip=donut.locator('.recharts-tooltip-wrapper:visible');await expect(tooltip).toHaveText('A — 40% of traffic');await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — 30% of traffic');await expect(other.locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
 await gauge.scrollIntoViewIfNeeded();await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await gauge.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(gauge.getByRole('status')).toHaveText('40% QUARTER TARGET');
 for(const node of [donut,gauge]){await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-markUnselected','#234567');s.setProperty('--nx-stroke-mark','1.4px');});await expect.poll(()=>node.locator('[data-nx-radial-series="0"] path, [data-nx-radial-series="reached"] path').first().evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('[data-nx-radial-series="0"] path, [data-nx-radial-series="reached"] path').first().evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.4px');const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);}
 assert.notEqual(await other.locator('[data-nx-radial-tick]').first().evaluate(e=>getComputedStyle(e).stroke),'rgb(18, 52, 86)');await expect.poll(()=>gauge.locator('[data-nx-radial-series="remaining"] path').first().evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(35, 69, 103)');
 await setMode(page,'revised');await expect(donut.locator('[data-nx-radial-series="0"] path')).toHaveCount(20);await expect(donut.locator('[data-nx-radial-series="1"] path')).toHaveCount(50);await expect(gauge.locator('[data-nx-progress]')).toHaveText('20%');await expect(gauge).toContainText('REVISED GOAL');
 for(const mode of ['single','zero','invalid','empty','partial','excess','groups']){await setMode(page,mode);if(['zero','invalid','empty','partial','excess'].includes(mode))await expect(donut.getByRole('status')).toContainText('available');else await expect(donut.locator('[data-nx-radial-tick]')).toHaveCount(100);if(mode==='invalid'||mode==='empty')await expect(gauge.getByRole('status')).toContainText('available');else await expect(gauge.locator('[data-nx-radial-tick]')).toHaveCount(100);if(mode==='zero'){await expect(gauge.locator('[data-nx-radial-series="reached"] path')).toHaveCount(0);await expect(gauge.locator('[data-nx-radial-series="remaining"] path')).toHaveCount(100);}if(mode==='single'){await expect(gauge.locator('[data-nx-radial-series="reached"] path')).toHaveCount(100);await expect(gauge.locator('[data-nx-radial-series="remaining"] path')).toHaveCount(0);}if(mode==='groups'){await expect(donut.locator('[data-nx-share="4"]')).toHaveText('0%');await expect(donut.locator('[data-nx-radial-series="4"] path')).toHaveCount(0);}assert.equal(await donut.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);assert.equal(await gauge.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}
 await setMode(page,'normal');
}

async function checkGridAndPieConsumer(page:Page):Promise<void>{
 const grid=page.locator('#unit-primary [data-nx-chart="donut-redesigned"]');const pie=page.locator('#unit-primary [data-nx-chart="custom-pie"]');
 await expect(grid.locator('[data-nx-percent-cell]')).toHaveCount(100);await expect(grid.locator('[data-nx-observation="0"] circle')).toHaveCount(40);const cells=await grid.locator('[data-nx-percent-cell="0"], [data-nx-percent-cell="10"]').evaluateAll(nodes=>nodes.map(e=>({x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy'))})));assert.equal(cells[0]?.x,cells[1]?.x);assert(cells[0]!.y<cells[1]!.y);
 await grid.scrollIntoViewIfNeeded();await grid.locator('[data-nx-percent-cell="0"]').hover();const tooltip=grid.locator('.recharts-tooltip-wrapper:visible');await expect(tooltip).toHaveText('A — 40% of sign-ups');await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await grid.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — 30% of sign-ups');
 await expect(pie.locator('[data-nx-wedge]')).toHaveCount(3);await expect(pie.locator('[data-nx-reference-ring]')).toHaveCount(3);
 const radius=(i:number)=>pie.locator('[data-nx-wedge="'+i+'"]').evaluate(e=>Number(e.getAttribute('data-nx-radius')));const smallRadius=await radius(0);const fullRadius=await radius(1);assert(Math.abs(smallRadius/fullRadius-(0.24+0.76/3))<1e-6);await expect(pie.locator('[data-nx-wedge="0"]')).toHaveAttribute('data-nx-start','90');await expect(pie.locator('[data-nx-wedge="0"]')).toHaveAttribute('data-nx-end','-90');
 await pie.scrollIntoViewIfNeeded();await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await pie.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');const pieTooltip=pie.locator('.recharts-tooltip-wrapper:visible');await expect(pieTooltip).toHaveText('A — 50% of users · 15 min/day');await page.keyboard.press('ArrowRight');await expect(pieTooltip).toHaveText('A — 30% of users · 45 min/day');
 for(const node of [grid,pie]){await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-bg','#345678');s.setProperty('--nx-plotFaint','#234567');s.setProperty('--nx-type-plotValue-size','34px');});await expect.poll(()=>node.locator('[data-nx-observation="0"] circle, [data-nx-wedge="1"]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);}
 await expect.poll(()=>pie.locator('[data-nx-wedge="1"]').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(52, 86, 120)');await expect.poll(()=>pie.locator('[data-nx-reference-ring]').first().evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(35, 69, 103)');await expect.poll(()=>grid.locator('[data-nx-share="0"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('30px');
 assert.notEqual(await page.locator('#unit-secondary [data-nx-chart="custom-pie"] [data-nx-wedge="1"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
 await setMode(page,'revised');await expect(grid.locator('[data-nx-observation="0"] circle')).toHaveCount(20);await expect(pie.locator('[data-nx-wedge="2"]')).toHaveAttribute('data-nx-start','90');assert(await radius(0)>smallRadius);assert(await radius(1)<fullRadius);
 await setMode(page,'partial');await expect(grid.getByRole('status')).toContainText('available');await expect(pie.locator('[data-nx-wedge]')).toHaveCount(2);await expect(pie.locator('[data-nx-surface-label="1"]')).toContainText('30% · —');await expect(pie.locator('[data-nx-wedge="2"]')).toHaveAttribute('data-nx-start','-198');
 for(const mode of ['single','zero','invalid','empty','groups']){await setMode(page,mode);if(['zero','invalid','empty'].includes(mode))await expect(grid.getByRole('status')).toContainText('available');else await expect(grid.locator('[data-nx-percent-cell]')).toHaveCount(100);if(['invalid','empty'].includes(mode))await expect(pie.getByRole('status')).toContainText('available');else await expect(pie.locator('svg.recharts-surface')).toHaveCount(1);if(mode==='zero'){await expect(pie.locator('[data-nx-wedge]')).toHaveCount(0);await expect(pie.locator('[data-nx-surface-label]')).toHaveCount(3);}if(mode==='single')await expect(pie.locator('[data-nx-wedge]')).toHaveCount(1);if(mode==='groups'){await expect(pie.locator('[data-nx-surface-label="3"]')).toContainText('0%');await expect(pie.locator('[data-nx-wedge="3"]')).toHaveCount(0);await expect(grid.locator('[data-nx-share="4"]')).toHaveText('0%');}assert.equal(await grid.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);assert.equal(await pie.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}
 await setMode(page,'normal');
}
