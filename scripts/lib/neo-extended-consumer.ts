import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const NEO_EXTENDED_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { BridgeWaterfall, type BridgeWaterfallDatum } from './components/nodex/bridge-waterfall/component';
import { TwinPins, type TwinPinsDatum } from './components/nodex/twin-pins/component';
import { StickerScatter, type StickerScatterDatum } from './components/nodex/sticker-scatter/component';
import { TileHeatmap, type TileHeatmapDatum } from './components/nodex/tile-heatmap/component';
import { HundredBlocks, type HundredBlocksDatum } from './components/nodex/hundred-blocks/component';

type Mode = 'normal' | 'partial' | 'empty' | 'zero' | 'single' | 'invalid' | 'duplicates' | 'negative' | 'fractional' | 'bad-scale';
declare global { interface Window { nodexNeoExtended: { setMode: (value: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }

function Charts({ mode, revision, animate }: { mode: Mode; revision: boolean; animate: boolean }) {
  let bridge: BridgeWaterfallDatum[] = [{ id:'a',label:'Opening',kind:'start',value:100 },{id:'b',label:'New',kind:'change',value:revision?70:50},{id:'c',label:'Lost',kind:'change',value:-20},{id:'d',label:'Total',kind:'total'}];
  let pairs: TwinPinsDatum[] = [{id:'a',label:'Same',before:10,after:30},{id:'b',label:'Same',before:40,after:20},{id:'c',label:'Third',before:25,after:25}];
  let scatter: StickerScatterDatum[] = [{id:'a',label:'Same',x:10,y:20,tone:'a'},{id:'b',label:'Same',x:30,y:40},{id:'c',label:'Third',x:20,y:30}];
  let heat: TileHeatmapDatum[] = [{rowId:'a',columnId:'mon',value:0},{rowId:'a',columnId:'tue',value:5},{rowId:'b',columnId:'mon',value:revision?2:10},{rowId:'b',columnId:'tue',value:null}];
  let shares: HundredBlocksDatum[] = [{id:'a',label:'Same',percent:revision?20:40,tone:'a'},{id:'b',label:'Same',percent:revision?50:30},{id:'c',label:'Third',percent:20},{id:'d',label:'Fourth',percent:10}];
  if(mode==='empty'){bridge=[];pairs=[];scatter=[];heat=[];shares=[];}
  if(mode==='zero'||mode==='single'||mode==='invalid'){
    const value=mode==='invalid'?NaN:mode==='zero'?0:3;
    bridge=[{id:'only',label:'Only',kind:'start',value}];
    pairs=[{id:'only',label:'Only',before:value,after:value}];
    scatter=[{id:'only',label:'Only',x:value,y:value}];
    heat=[{rowId:'a',columnId:'mon',value}];
    shares=[{id:'only',label:'Only',percent:mode==='single'?100:value}];
  }
  if(mode==='partial'){
    bridge=[{id:'a',label:'Opening',kind:'start',value:100},{id:'b',label:'Missing',kind:'change',value:null},{id:'c',label:'Later',kind:'change',value:10},{id:'d',label:'Unknown total',kind:'total'},{id:'e',label:'Restart',kind:'start',value:20},{id:'f',label:'Added',kind:'change',value:5},{id:'g',label:'Recovered',kind:'total'}];
    pairs=[{id:'a',label:'First only',before:10,after:null},{id:'b',label:'Second only',before:null,after:20},{id:'c',label:'Neither',before:null,after:null}];
    scatter=[{id:'a',label:'Known zero',x:0,y:0},{id:'b',label:'Missing X',x:null,y:20},{id:'c',label:'Invalid Y',x:20,y:Infinity}];
    heat=[{rowId:'a',columnId:'mon',value:0},{rowId:'a',columnId:'tue',value:5},{rowId:'b',columnId:'mon',value:11}];
    shares=[{id:'a',label:'Known',percent:60},{id:'b',label:'Missing',percent:null}];
  }
  if(mode==='negative'){
    bridge=[{id:'a',label:'Opening',kind:'start',value:10},{id:'b',label:'Loss',kind:'change',value:-30},{id:'c',label:'Total',kind:'total'}];
    pairs=[{id:'a',label:'Signed',before:-10,after:10}];
    scatter=[{id:'a',label:'Negative',x:-10,y:-20},{id:'b',label:'Positive',x:10,y:20}];
  }
  if(mode==='duplicates'){bridge=bridge.map(row=>({...row,id:'same'}));pairs=pairs.map(row=>({...row,id:'same'}));scatter=scatter.map(row=>({...row,id:'same'}));heat=[heat[0]!,heat[0]!];shares=shares.map(row=>({...row,id:'same'}));}
  if(mode==='fractional') shares=[{id:'a',label:'Fractional',percent:40.5},{id:'b',label:'Remaining',percent:59.5}];
  if(revision){pairs=pairs.toReversed();scatter=scatter.toReversed();shares=shares.toReversed();}
  return <>
    <BridgeWaterfall data={bridge} unitLabel="Revenue" animate={animate}/>
    <TwinPins data={pairs} unitLabel="Seconds" animate={animate}/>
    <StickerScatter data={scatter} xLabel="Reach" yLabel="Engagement" animate={animate}/>
    <TileHeatmap data={heat} rows={[{id:'a',label:'Same'},{id:'b',label:'Same'}]} columns={[{id:'mon',label:'Mon'},{id:'tue',label:'Tue'}]} maxValue={mode==='bad-scale'?0:10} unitLabel="Hours" animate={animate}/>
    <HundredBlocks data={shares} unitLabel="Capacity" animate={animate}/>
  </>;
}
export function NeoExtendedConsumer({ animate }: { animate: boolean }) {
  const [mode,setMode]=useState<Mode>('normal');const [revision,setRevision]=useState(false);const [localAnimation,setAnimate]=useState(false);
  useEffect(()=>{window.nodexNeoExtended={setMode,setRevision,setAnimate};},[]);
  return <div data-neo><section id="neo-extended-primary" className="w-[720px]"><Charts mode={mode} revision={revision} animate={animate||localAnimation}/></section><section id="neo-extended-secondary" className="w-[620px]"><Charts mode="normal" revision={false} animate={false}/></section></div>;
}
`;

const slugs = ['bridge-waterfall', 'twin-pins', 'sticker-scatter', 'tile-heatmap', 'hundred-blocks'] as const;
const chart = (page: Page, slug: string, scope = 'primary') => page.locator(`#neo-extended-${scope} [data-nx-chart="${slug}"]`);
const setMode = (page: Page, mode: string) => page.evaluate(mode => (window as unknown as { nodexNeoExtended: { setMode: (value: string) => void } }).nodexNeoExtended.setMode(mode), mode);
async function colors(page: Page, scope: string) {
  return page.locator(`#neo-extended-${scope} [data-nx-sticker], #neo-extended-${scope} [data-nx-unit]`).evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-sticker') ? `point/${element.getAttribute('data-nx-sticker')}` : `share/${element.getAttribute('data-nx-unit')}`, getComputedStyle(element).fill])));
}

export async function checkNeoExtendedConsumer(page: Page): Promise<void> {
  const bridge = chart(page, 'bridge-waterfall'); const pairs = chart(page, 'twin-pins');
  const scatter = chart(page, 'sticker-scatter'); const heat = chart(page, 'tile-heatmap'); const blocks = chart(page, 'hundred-blocks');
  await expect(bridge.locator('[data-nx-bridge-label]')).toHaveText(['100', '+50', '-20', '130']);
  assert.deepEqual(await bridge.locator('[data-nx-bridge]').evaluateAll(elements => elements.map(element => [Number(element.getAttribute('data-nx-from')), Number(element.getAttribute('data-nx-to'))])), [[0, 100], [100, 150], [130, 150], [0, 130]]);
  const heights = await bridge.locator('[data-nx-bridge]').evaluateAll(elements => elements.map(element => (element as SVGGraphicsElement).getBBox().height));
  assert(Math.abs(heights[1]! / heights[0]! - 0.5) < 0.001 && Math.abs(heights[2]! / heights[0]! - 0.2) < 0.001, 'Floating bar lengths must encode the change');
  await expect(pairs.locator('[data-nx-pair]')).toHaveCount(3);
  const pins = await pairs.locator('[data-nx-pair-rail]').evaluateAll(elements => elements.map(element => [Number(element.getAttribute('x1')), Number(element.getAttribute('x2'))]));
  assert(pins[0]![1]! > pins[0]![0]! && pins[1]![1]! < pins[1]![0]! && pins[2]![0] === pins[2]![1], 'Pairs must retain increasing, decreasing and equal values');
  await expect(scatter.locator('[data-nx-sticker]')).toHaveCount(3);
  const points = await scatter.locator('[data-nx-sticker]').evaluateAll(elements => elements.map(element => ({ x: Number(element.getAttribute('x')), y: Number(element.getAttribute('y')), width: Number(element.getAttribute('width')) })));
  assert(points[0]!.x < points[2]!.x && points[2]!.x < points[1]!.x && points[0]!.y > points[2]!.y && points[2]!.y > points[1]!.y, 'Scatter position must follow both numeric scales');
  assert(points.every(point => point.width === points[0]!.width), 'Sticker sizes must remain equal');
  await expect(heat.locator('[data-nx-tile]')).toHaveCount(4);
  assert.deepEqual(await heat.locator('[data-nx-tile-fill]').evaluateAll(elements => elements.map(element => getComputedStyle(element).fillOpacity)), ['0', '0.5', '1', '0']);
  await expect(heat.locator('[data-nx-value="0"] circle')).toHaveCount(1);
  await expect(heat.locator('[data-nx-value="missing"] line')).toHaveCount(2);
  await expect(blocks.locator('[data-nx-unit]')).toHaveCount(100);
  for (const [id, count] of [['a', 40], ['b', 30], ['c', 20], ['d', 10]] as const) await expect(blocks.locator(`[data-nx-unit="${id}"]`)).toHaveCount(count);
  assert.equal(new Set(await blocks.locator('[data-nx-cell]').evaluateAll(elements => elements.map(element => element.getAttribute('data-nx-cell')))).size, 100, 'Waffle cells must never overlap by allocation index');

  for (const [node, first, second] of [
    [bridge, 'Opening100 Revenue', 'New+50 RevenueBalance: 150'],
    [pairs, 'SameBefore: 10After: 30', 'SameBefore: 40After: 20'],
    [scatter, 'SameReach: 10Engagement: 20', 'SameReach: 30Engagement: 40'],
    [heat, 'Same · Mon0 Hours', 'Same · Tue5 Hours'],
    [blocks, 'Same40% · 40 of 100 blocks', 'Same30% · 30 of 100 blocks'],
  ] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880, 10); await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
    await page.keyboard.press('ArrowRight'); await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(second);
  }
  await expect(page.locator('#neo-extended-secondary .recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await scatter.locator('[data-nx-sticker="a"]').hover();
  await expect(scatter.locator('.recharts-tooltip-wrapper:visible')).toHaveText('SameReach: 10Engagement: 20');
  await heat.locator('[data-nx-tile]').last().hover();
  await expect(heat.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Same · TueUnavailable');
  await blocks.locator('[data-nx-unit="c"]').first().hover();
  await expect(blocks.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Third20% · 20 of 100 blocks');

  const sibling = await colors(page, 'secondary');
  await page.locator('#neo-extended-primary').evaluate(element => {
    const node = element as HTMLElement; node.style.setProperty('--nx-seriesA', '#d5a1eb'); node.style.setProperty('--nx-ink', '#24395a'); node.style.setProperty('--nx-valueFill', '#315c9c');
  });
  for (const mark of [bridge.locator('[data-nx-bridge]').first(), pairs.locator('[data-nx-pin-before]').first(), scatter.locator('[data-nx-sticker="a"]'), blocks.locator('[data-nx-unit="a"]').first()]) {
    await expect.poll(() => mark.evaluate(element => ({ fill: getComputedStyle(element).fill, stroke: getComputedStyle(element).stroke }))).toEqual({ fill: 'rgb(213, 161, 235)', stroke: 'rgb(36, 57, 90)' });
  }
  await expect.poll(() => heat.locator('[data-nx-tile-fill]').first().evaluate(element => getComputedStyle(element).fill)).toBe('rgb(49, 92, 156)');
  assert.deepEqual(await colors(page, 'secondary'), sibling, 'A descendant palette must not change sibling instances');
  await page.locator('#neo-extended-primary').evaluate(element => element.removeAttribute('style'));
  const original = await colors(page, 'primary');
  await page.evaluate(() => (window as unknown as { nodexNeoExtended: { setRevision: (value: boolean) => void } }).nodexNeoExtended.setRevision(true));
  await expect(bridge.locator('[data-nx-bridge-label]')).toHaveText(['100', '+70', '-20', '150']);
  await expect(blocks.locator('[data-nx-unit="a"]')).toHaveCount(20);
  assert.deepEqual(await colors(page, 'primary'), original, 'Reordering must retain observation and share identity colors');
  await expect(heat.locator('[data-nx-tile-fill]').nth(1)).toHaveAttribute('fill-opacity', '0.5');

  for (const width of [375, 320]) {
    await page.locator('#neo-extended-primary').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, width);
    for (const slug of slugs) await expect.poll(() => chart(page, slug).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect.poll(() => blocks.evaluate(element => element.querySelector('ul')!.getBoundingClientRect().top >= element.querySelector('svg')!.getBoundingClientRect().bottom)).toBe(true);
    const cell = await blocks.locator('[data-nx-unit]').first().evaluate(element => {
      const { width, height } = (element as SVGGraphicsElement).getBBox();
      return { width, height };
    });
    assert(Math.abs(cell.width - cell.height) < 0.01, 'Units must stay square at narrow widths');
  }
  await page.locator('#neo-extended-primary').evaluate(element => element.removeAttribute('style'));
  await page.evaluate(() => (window as unknown as { nodexNeoExtended: { setRevision: (value: boolean) => void } }).nodexNeoExtended.setRevision(false));
  await setMode(page, 'partial');
  await expect(bridge.locator('[data-nx-bridge-label]')).toHaveText(['100', '—', '—', '—', '20', '+5', '25']);
  await expect(bridge.locator('[data-nx-bridge-join]')).toHaveCount(2);
  await expect(pairs.locator('[data-nx-pin-before]')).toHaveCount(1); await expect(pairs.locator('[data-nx-pin-after]')).toHaveCount(1);
  await expect(pairs.locator('[data-nx-pair-rail]')).toHaveCount(0);
  await expect(scatter.locator('[data-nx-sticker]')).toHaveCount(1); await expect(scatter).toContainText('2 unavailable');
  await expect(heat.locator('[data-nx-value="missing"]')).toHaveCount(2);
  await expect(blocks.getByRole('status')).toHaveText('Provide complete whole-percent shares totaling 100.');
  await setMode(page, 'negative');
  await expect(bridge.locator('[data-nx-bridge-label]')).toHaveText(['10', '-30', '-20']);
  await expect(bridge.locator('[data-nx-bridge="b"]')).toHaveAttribute('data-nx-from', '-20');
  await expect(pairs.locator('[data-nx-pin-before]')).toHaveCount(1);
  await expect(scatter.locator('[data-nx-sticker="a"]')).toHaveAttribute('data-nx-x', '-10');
  await setMode(page, 'zero');
  await expect(bridge.locator('[data-nx-bridge]')).toHaveCount(0); await expect(bridge.locator('[data-nx-bridge-label]')).toHaveText(['0']);
  await expect(pairs.locator('[data-nx-pin-before]')).toHaveCount(1); await expect(pairs.locator('[data-nx-pin-after]')).toHaveCount(1);
  await expect(scatter.locator('[data-nx-sticker]')).toHaveCount(1); await expect(heat.locator('[data-nx-value="0"]')).toHaveCount(1);
  await expect(blocks.locator('[data-nx-unit]')).toHaveCount(0);
  await setMode(page, 'single');
  await expect(bridge.locator('[data-nx-bridge]')).toHaveCount(1); await expect(pairs.locator('[data-nx-pair]')).toHaveCount(1);
  await expect(scatter.locator('[data-nx-sticker]')).toHaveCount(1); await expect(blocks.locator('[data-nx-unit]')).toHaveCount(100);
  for (const mode of ['empty', 'invalid', 'duplicates']) {
    await setMode(page, mode);
    for (const slug of slugs) { await expect(chart(page, slug).getByRole('status')).toBeVisible(); await expect(chart(page, slug).locator('svg')).toHaveCount(0); }
  }
  await setMode(page, 'fractional'); await expect(blocks.getByRole('status')).toHaveText('Provide complete whole-percent shares totaling 100.');
  await setMode(page, 'bad-scale'); await expect(heat.getByRole('status')).toHaveText('A finite, positive scale maximum is required.');
  await setMode(page, 'normal');
  await page.evaluate(() => (window as unknown as { nodexNeoExtended: { setAnimate: (value: boolean) => void } }).nodexNeoExtended.setAnimate(true));
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await expect(blocks.locator('[data-nx-unit]')).toHaveCount(100); await expect(heat.locator('[data-nx-tile]')).toHaveCount(4);
  await expect(bridge.locator('[data-nx-bridge-label]')).toHaveCount(4);
  await page.evaluate(() => (window as unknown as { nodexNeoExtended: { setAnimate: (value: boolean) => void } }).nodexNeoExtended.setAnimate(false));
  console.log('Validated five additional Neo charts: signed balances, paired endpoints, numeric scatter, fixed-intensity cells, exact 100-block allocation, native tooltips, scoped identity, mobile fit and missing/zero/invalid data.');
}
