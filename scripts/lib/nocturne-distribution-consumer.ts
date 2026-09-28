import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';

export const NOCTURNE_DISTRIBUTION_SOURCE = `import { useEffect, useState } from 'react';
import { NocturneWaterfall, type NocturneWaterfallDatum } from './components/nodex/nocturne-waterfall/component';
import { NocturneBoxplot, type NocturneBoxDatum } from './components/nodex/nocturne-boxplot/component';
type Mode = 'normal' | 'partial' | 'missing' | 'invalid' | 'empty' | 'single' | 'zero' | 'duplicates' | 'blank-id' | 'outlier-id' | 'overflow' | 'accumulation' | 'many' | 'long';
declare global { interface Window { nodexNocturneDistribution: { setMode: (value: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }
const normalWaterfall: NocturneWaterfallDatum[] = [
  {id:'open',label:'Same',kind:'start',value:10},
  {id:'up',label:'Same',kind:'change',value:5},
  {id:'down',label:'Decrease',kind:'change',value:-20},
  {id:'hold',label:'No change',kind:'change',value:0},
  {id:'total',label:'Subtotal',kind:'total'},
  {id:'reset',label:'New start',kind:'start',value:4},
  {id:'close',label:'Closing',kind:'total'},
];
const normalBox: NocturneBoxDatum[] = [
  {id:'a',label:'Same',summary:[-4,-2,0,4,8],outliers:[{id:'spike',label:'Spike',value:12}]},
  {id:'b',label:'Same',summary:[2,2,2,2,2]},
  {id:'c',label:'Missing summary',summary:null,outliers:[{id:'spike',value:-6}]},
  {id:'d',label:'Zero',summary:[0,0,0,0,0]},
];
export function NocturneDistributionConsumer() {
  const [mode,setMode]=useState<Mode>('normal'); const [revision,setRevision]=useState(false); const [animate,setAnimate]=useState(false);
  useEffect(()=>{window.nodexNocturneDistribution={setMode,setRevision,setAnimate};},[]);
  let waterfall: NocturneWaterfallDatum[]=normalWaterfall.map(row=>({...row}));
  let box: NocturneBoxDatum[]=normalBox.map(row=>({...row,outliers:row.outliers?.map(point=>({...point}))}));
  if(mode==='empty'){waterfall=[];box=[];}
  if(mode==='single'){waterfall=waterfall.slice(0,1);box=box.slice(0,1);}
  if(mode==='zero'){waterfall=[{id:'zero',label:'Zero',kind:'start',value:0}];box=[{...normalBox[3]!,outliers:[]}];}
  if(mode==='partial'){
    waterfall[1]={...normalWaterfall[1]!,kind:'change',value:null};
    box[0]!.summary=[0,4,2,8,10]; box[0]!.outliers=[...box[0]!.outliers!,{id:'unknown',value:null}];
  }
  if(mode==='missing'||mode==='invalid'){
    waterfall=waterfall.map(row=>row.kind==='total'?row:{...row,value:mode==='missing'?null:Infinity});
    box=box.map(row=>({...row,summary:mode==='missing'?null:[0,1,NaN,3,4],outliers:row.outliers?.map(point=>({...point,value:mode==='missing'?null:Infinity}))}));
  }
  if(mode==='duplicates'){waterfall.push({...waterfall[0]!});box.push({...box[0]!});}
  if(mode==='blank-id'){waterfall[0]!.id=' ';box[0]!.id='';}
  if(mode==='outlier-id')box[0]!.outliers=[...box[0]!.outliers!,{...box[0]!.outliers![0]!}];
  if(mode==='overflow'){
    waterfall=[{id:'a',label:'Low',kind:'start',value:-Number.MAX_VALUE},{id:'b',label:'High',kind:'start',value:Number.MAX_VALUE}];
    box=[{id:'huge',label:'Huge',summary:[-Number.MAX_VALUE,-1,0,1,Number.MAX_VALUE],outliers:[]}];
  }
  if(mode==='accumulation')waterfall=[{id:'a',label:'Start',kind:'start',value:Number.MAX_VALUE},{id:'b',label:'Overflow',kind:'change',value:Number.MAX_VALUE},{id:'c',label:'Total',kind:'total'},{id:'d',label:'Reset',kind:'start',value:0}];
  if(mode==='many'){
    waterfall=[normalWaterfall[0]!,...Array.from({length:24},(_,i)=>({id:'s'+i,label:'Step '+i,kind:'change' as const,value:i%2?-2:3}))];
    box=Array.from({length:24},(_,i)=>({...normalBox[0]!,id:'r'+i,label:'Distribution '+i,outliers:[]}));
  }
  if(mode==='long'){
    waterfall=waterfall.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));
    box=box.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));
  }
  if(revision){
    waterfall=waterfall.map(row=>row.id==='up'?{...row,kind:'change',value:8}:row);
    box=box.toReversed().map(row=>row.id==='a'?{...row,summary:[-4,-1,1,5,8]}:row);
  }
  const value=(v:number)=>'v'+v+(mode==='long'?' extremely long units':'');
  const delta=(v:number)=>(v>0?'+':'')+v+'d'+(mode==='long'?' extremely long units':'');
  return <div data-nocturne>
    <div id="nocturne-distribution-primary" className="w-[760px]">
      <NocturneWaterfall data={waterfall} valueFormatter={value} deltaFormatter={delta} height={mode==='many'?230:undefined} animate={animate}/>
      <NocturneBoxplot data={box} valueFormatter={value} height={mode==='many'?230:undefined} animate={animate}/>
    </div>
    <div id="nocturne-distribution-secondary" className="w-[700px]">
      <NocturneWaterfall data={normalWaterfall} animate={false}/><NocturneBoxplot data={normalBox} animate={false}/>
    </div>
  </div>;
}
`;

const near = (a: number, b: number, message: string) => assert(Math.abs(a - b) < 0.02, message + ': ' + a + ' vs ' + b);
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexNocturneDistribution: { setMode: (value: string) => void } }).nodexNocturneDistribution.setMode(value), value);
const revision = (page: Page, value: boolean) => page.evaluate(value => (window as unknown as { nodexNocturneDistribution: { setRevision: (value: boolean) => void } }).nodexNocturneDistribution.setRevision(value), value);
async function bounds(node: Locator) { return node.evaluate(element => { const b = (element as SVGGraphicsElement).getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }); }
async function checkJoins(waterfall: Locator) {
  const open = await bounds(waterfall.locator('[data-nx-waterfall-bar="open"]'));
  const up = await bounds(waterfall.locator('[data-nx-waterfall-bar="up"]'));
  const down = await bounds(waterfall.locator('[data-nx-waterfall-bar="down"]'));
  const joins = await waterfall.locator('[data-nx-waterfall-join]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-waterfall-join')!, ['x1','x2','y1','y2'].map(key=>Number(element.getAttribute(key)))])));
  near(joins.up![0]!, open.x + open.width, 'Connector starts at the previous native bar edge');
  near(joins.up![1]!, up.x, 'Connector ends at the next native bar edge');
  near(joins.up![2]!, open.y, 'Connector retains the previous balance');
  near(joins.up![3]!, up.y + up.height, 'Increase starts at its previous balance');
  near(joins.down![2]!, up.y, 'Decrease starts from the raised balance');
  near(joins.down![3]!, down.y, 'Decrease and connector share their actual endpoint');
}

export async function checkNocturneDistributionConsumer(page: Page): Promise<void> {
  const primary = page.locator('#nocturne-distribution-primary');
  const waterfall = primary.locator('[data-nx-chart="nocturne-waterfall"]');
  const box = primary.locator('[data-nx-chart="nocturne-boxplot"]');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(waterfall.locator('[data-nx-waterfall-step]')).toHaveCount(7);
  await expect(waterfall.locator('[data-nx-waterfall-reading]')).toHaveText(['v10','+5d','-20d','0d','v-5','v4','v4']);
  const open = await bounds(waterfall.locator('[data-nx-waterfall-bar="open"]'));
  const up = await bounds(waterfall.locator('[data-nx-waterfall-bar="up"]'));
  const down = await bounds(waterfall.locator('[data-nx-waterfall-bar="down"]'));
  near(up.height / open.height, 0.5, 'Native lengths preserve change magnitude');
  near(down.height / open.height, 2, 'Signed changes retain their complete magnitude across zero');
  await checkJoins(waterfall);
  await expect(waterfall.locator('[data-nx-waterfall-zero="hold"]')).toHaveCount(1);
  await expect(waterfall.locator('[data-nx-waterfall-join="reset"]')).toHaveCount(0);
  await expect(box.locator('[data-nx-box-summary]')).toHaveCount(3);
  await expect(box.locator('[data-nx-box-outlier]')).toHaveCount(2);
  await expect(box.locator('[data-nx-box-reading]')).toHaveText(['v0','v2','—','v0']);
  const whisker = await bounds(box.locator('[data-nx-box-summary="a"] [data-nx-box-whisker]'));
  const iqr = await bounds(box.locator('[data-nx-box-summary="a"] [data-nx-box-iqr]'));
  const median = await bounds(box.locator('[data-nx-box-summary="a"] [data-nx-box-median]'));
  near(iqr.width / whisker.width, 0.5, 'Quartiles and whiskers share a numeric scale');
  near((median.x - iqr.x) / iqr.width, 1/3, 'Median is an actual coordinate, not centered decoration');
  const outlier = Number(await box.locator('[data-nx-box-owner="a"] [data-nx-box-dot]').getAttribute('cx'));
  near((outlier - whisker.x) / whisker.width, 16/12, 'Outliers use the same numeric scale');
  await expect(box.locator('[data-nx-box-summary="b"] rect')).toHaveCount(0);
  await expect(box.locator('[data-nx-box-owner="c"]')).toHaveCount(1);

  for (const [node, first, second] of [[waterfall,'Start: v10','Change: +5d'],[box,'Median: v0','Spike: v12']] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880,10); await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(first);
    await page.keyboard.press('ArrowRight'); await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(second);
  }
  await waterfall.locator('[data-nx-waterfall-bar="down"]').hover();
  await expect(waterfall.locator('.recharts-tooltip-wrapper:visible')).toContainText('Balance: v-5');
  await box.locator('[data-nx-box-owner="a"] [data-nx-box-dot]').hover();
  await expect(box.locator('.recharts-tooltip-wrapper:visible')).toContainText('Spike: v12');
  const siblingPaint = await page.locator('#nocturne-distribution-secondary [data-nx-box-iqr]').evaluate(element=>getComputedStyle(element).stroke);
  await primary.evaluate(element=>{const s=(element as HTMLElement).style;s.setProperty('--nx-seriesA','#923b61');s.setProperty('--nx-radius-bar','5px');s.setProperty('--nx-ink','#afc5b1');});
  await expect(waterfall.locator('[data-nx-waterfall-bar="open"]')).toHaveCSS('fill','rgb(146, 59, 97)');
  await expect(waterfall.locator('[data-nx-waterfall-bar="open"]')).toHaveCSS('rx','5px');
  await expect(box.locator('[data-nx-box-iqr]')).toHaveCSS('stroke','rgb(146, 59, 97)');
  await expect(box.locator('[data-nx-box-summary="a"] [data-nx-box-median]')).toHaveCSS('stroke','rgb(175, 197, 177)');
  assert.equal(await page.locator('#nocturne-distribution-secondary [data-nx-box-iqr]').evaluate(element=>getComputedStyle(element).stroke),siblingPaint,'Sibling scopes retain their paint');
  await primary.evaluate(element=>element.removeAttribute('style'));
  await revision(page,true);
  await expect(waterfall.locator('[data-nx-waterfall-reading="total"]')).toHaveText('v-2');
  await expect(box.locator('[data-nx-box-reading]')).toHaveText(['v0','—','v2','v1']);
  await checkJoins(waterfall); await revision(page,false);
  await mode(page,'partial');
  await expect(waterfall.locator('[data-nx-waterfall-reading]')).toHaveText(['v10','—','—','—','—','v4','v4']);
  await expect(waterfall.locator('[data-nx-waterfall-bar]')).toHaveCount(3);
  await expect(box.locator('[data-nx-box-summary="a"]')).toHaveCount(0);
  await expect(box.locator('[data-nx-box-outlier]')).toHaveCount(2);
  await expect(box.locator('[data-nx-box-omitted]')).toContainText('1 unavailable');
  for (const state of ['missing','invalid']) {
    await mode(page,state);
    await expect(waterfall.locator('[data-nx-waterfall-bar],[data-nx-waterfall-zero]')).toHaveCount(0);
    await expect(waterfall.locator('[data-nx-waterfall-step]')).toHaveCount(7);
    await expect(box.locator('[data-nx-box-summary],[data-nx-box-outlier]')).toHaveCount(0);
    await expect(box.locator('[data-nx-box-row]')).toHaveCount(4);
    await expect(box.locator('[data-nx-box-omitted]')).toContainText('2 unavailable');
  }
  for (const state of ['duplicates','blank-id','empty','overflow']) {
    await mode(page,state); for (const node of [waterfall,box]) await expect(node.getByRole('status')).toHaveCount(1);
  }
  await mode(page,'outlier-id'); await expect(box.getByRole('status')).toContainText('unique');
  await mode(page,'accumulation');
  await expect(waterfall.locator('[data-nx-waterfall-reading="b"],[data-nx-waterfall-reading="c"]')).toHaveText(['—','—']);
  await expect(waterfall.locator('[data-nx-waterfall-zero="d"]')).toHaveCount(1);
  await mode(page,'single');
  await expect(waterfall.locator('[data-nx-waterfall-bar]')).toHaveCount(1);
  await expect(waterfall.locator('[data-nx-waterfall-join]')).toHaveCount(0);
  await expect(box.locator('[data-nx-box-row]')).toHaveCount(1);
  await mode(page,'zero');
  await expect(waterfall.locator('[data-nx-waterfall-bar]')).toHaveCount(0);
  await expect(waterfall.locator('[data-nx-waterfall-zero]')).toHaveCount(1);
  await expect(box.locator('[data-nx-box-iqr]')).toHaveCount(0);
  await expect(box.locator('[data-nx-box-median]')).toHaveCount(1);
  await mode(page,'long');
  await expect(waterfall.locator('[data-nx-waterfall-reading="open"]')).toContainText('extremely long units');
  for (const node of [waterfall,box]) await expect.poll(()=>node.locator('foreignObject span').evaluateAll(elements=>elements.every(element=>getComputedStyle(element).textOverflow==='ellipsis' && element.getAttribute('title') && element.clientWidth>0)), {message:'Compact labels retain usable space and full titles'}).toBe(true);
  await mode(page,'many'); await primary.evaluate(element=>(element as HTMLElement).style.width='280px');
  await expect(waterfall.locator('[data-nx-waterfall-step]')).toHaveCount(25);
  await expect(box.locator('[data-nx-box-row]')).toHaveCount(24);
  for (const node of [waterfall,box]) {
    await expect.poll(()=>node.evaluate(element=>element.scrollWidth<=element.clientWidth+1 && element.scrollHeight<=element.clientHeight+1)).toBe(true);
    assert(await node.locator('div').evaluateAll(elements=>elements.some(element=>element.scrollHeight>element.clientHeight+20 && getComputedStyle(element).overflowY==='auto')),'Short frames scroll all plot and key content internally');
    assert(await node.locator('div').evaluateAll(elements=>elements.some(element=>element.scrollWidth>element.clientWidth+20 && getComputedStyle(element).overflowX==='auto')),'Dense charts scroll horizontally within their frame');
  }
  await primary.evaluate(element=>element.removeAttribute('style')); await mode(page,'normal');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await primary.evaluate(element=>(element as HTMLElement).style.setProperty('--nx-motion-draw-duration','1s'));
  await page.evaluate(()=>(window as unknown as {nodexNocturneDistribution:{setAnimate:(value:boolean)=>void}}).nodexNocturneDistribution.setAnimate(true));
  for (const node of [waterfall,box]) await expect(node).toHaveAttribute('data-nx-animated','true');
  await revision(page,true);
  await expect.poll(()=>waterfall.locator('[data-nx-waterfall-step="up"]').getAttribute('opacity').then(value=>Number(value)>0 && Number(value)<1)).toBe(true);
  await checkJoins(waterfall);
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const node of [waterfall,box]) await expect(node).toHaveAttribute('data-nx-animated','false');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await primary.evaluate(element=>(element as HTMLElement).style.setProperty('--nx-motion-draw-duration','0s'));
  for (const node of [waterfall,box]) await expect(node).toHaveAttribute('data-nx-animated','false');
  await page.emulateMedia({reducedMotion:'reduce'}); await primary.evaluate(element=>element.removeAttribute('style')); await revision(page,false);
  assert.equal(await primary.locator('svg').evaluateAll(elements=>elements.some(element=>/(?:NaN|Infinity)/.test(element.innerHTML))),false,'Final chart geometry remains finite');
  console.log('Validated Nocturne waterfall and boxplot: native numeric geometry, balance gaps, supplied statistics, independent outliers, inspection, scoped tokens, constrained layouts and live motion.');
}
