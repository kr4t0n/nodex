import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';

export const NOCTURNE_ANALYTICAL_SOURCE = `import {useEffect,useState} from 'react';
import {NocturneForecastFan,type NocturneForecastDatum,type NocturneForecastBand} from './components/nodex/nocturne-forecast-fan/component';
import {NocturneControl,type NocturneControlDatum,type NocturneControlLimits,type NocturneControlEvent} from './components/nodex/nocturne-control/component';
import {NocturneEcdf,type NocturneEcdfSeries} from './components/nodex/nocturne-ecdf/component';
type Mode='normal'|'empty'|'missing'|'single'|'zero'|'interval-only'|'partial'|'crossed'|'duplicates'|'blank-id'|'bad-x'|'bad-phase'|'bad-band'|'bad-guides'|'bad-event'|'no-limits'|'bad-limits'|'overflow'|'below'|'above'|'many'|'long';
declare global {interface Window {nodexNocturneAnalysis:{setMode:(v:Mode)=>void;setRevision:(v:boolean)=>void;setAnimate:(v:boolean)=>void}}}
const baseForecast:NocturneForecastDatum[]=[
 {id:'h0',label:'First',x:0,kind:'observed',value:-4},{id:'h1',label:'Last observed',x:2,kind:'observed',value:0},
 {id:'f1',label:'First forecast',x:5,kind:'forecast',value:2,intervals:{wide:[-2,6],narrow:[0,4]}},
 {id:'f2',label:'Middle forecast',x:9,kind:'forecast',value:4,intervals:{wide:[-1,9],narrow:[2,6]}},
 {id:'f3',label:'Final forecast',x:12,kind:'forecast',value:6,intervals:{wide:[0,12],narrow:[4,8]}},
];
const baseBands:NocturneForecastBand[]=[{id:'narrow',coverage:.8},{id:'wide',coverage:.95}];
const baseControl:NocturneControlDatum[]=[-2,0,4,6,null,-3].map((value,i)=>({id:'c'+i,label:'Reading '+i,x:[0,2,5,9,12,16][i]!,value}));
const baseLimits={lower:-2,center:0,upper:4};
const baseEvents=[{id:'deploy',x:5,label:'Deploy'}];
const baseEcdf:NocturneEcdfSeries[]=[
 {id:'a',label:'Alpha',tone:'a',samples:[4,0,2,0,null].map((value,i)=>({id:'s'+i,value}))},
 {id:'b',label:'Beta',tone:'b',samples:[-2,1,3,NaN].map((value,i)=>({id:'s'+i,value}))},
];
export function NocturneAnalyticalConsumer(){
 const [mode,setMode]=useState<Mode>('normal');const [revision,setRevision]=useState(false);const [animate,setAnimate]=useState(false);
 useEffect(()=>{window.nodexNocturneAnalysis={setMode,setRevision,setAnimate};},[]);
 let forecast:NocturneForecastDatum[]=baseForecast.map(row=>({...row}));let bands=baseBands.map(band=>({...band}));
 let control=baseControl.map(row=>({...row}));let limits:NocturneControlLimits|null={...baseLimits};let events:NocturneControlEvent[]=baseEvents.map(event=>({...event}));
 let ecdf:NocturneEcdfSeries[]=baseEcdf.map(series=>({...series,samples:series.samples.map(row=>({...row}))}));
 let threshold=2;let percentiles=[.5,.9];
 if(mode==='empty'){forecast=[];control=[];events=[];ecdf=[];}
 if(mode==='missing'){
  forecast=forecast.map(row=>row.kind==='forecast'?{...row,value:null,intervals:{wide:null,narrow:[Infinity,NaN]}}:{...row,value:null});
  control=control.map(row=>({...row,value:null}));ecdf=ecdf.map(series=>({...series,samples:series.samples.map(row=>({...row,value:null}))}));
 }
 if(mode==='single'){forecast=[baseForecast[2]!];control=[baseControl[0]!];events=[];ecdf=[{...baseEcdf[0]!,samples:[{id:'one',value:3}]}];threshold=3;}
 if(mode==='zero'){forecast=[{id:'zero',label:'Zero',x:0,kind:'forecast',value:0,intervals:{wide:[0,0],narrow:[0,0]}}];control=[{id:'zero',label:'Zero',x:0,value:0}];limits={lower:0,center:0,upper:0};events=[];ecdf=[{id:'zero',label:'Zero',samples:[{id:'z1',value:0},{id:'z2',value:0}]}];threshold=0;}
 if(mode==='interval-only')forecast=[{id:'zero',label:'No point estimate',x:0,kind:'forecast',value:null,intervals:{wide:[0,0],narrow:[0,0]}}];
 if(mode==='partial'){
  forecast[1]={...baseForecast[1]!,value:null};forecast[3]={...baseForecast[3]!,kind:'forecast',intervals:{wide:null,narrow:null}};forecast[4]={...baseForecast[4]!,value:null};
  control[2]!.value=null;
 }
 if(mode==='crossed')forecast[3]={...baseForecast[3]!,kind:'forecast',intervals:{wide:[-1,9],narrow:[2,10]}};
 if(mode==='duplicates'){forecast.push({...forecast[0]!});control.push({...control[0]!});ecdf[0]!.samples=[...ecdf[0]!.samples,{...ecdf[0]!.samples[0]!}];}
 if(mode==='blank-id'){forecast[0]!.id=' ';control[0]!.id='';ecdf[0]!.id=' ';}
 if(mode==='bad-x'){forecast[1]!.x=0;control[1]!.x=Infinity;}
 if(mode==='bad-phase')forecast[3]={...baseForecast[3]!,kind:'observed'};
 if(mode==='bad-band')bands[0]!.coverage=.95;
 if(mode==='bad-guides')percentiles=[2];
 if(mode==='bad-event')events=[{id:'outside',x:900,label:'Outside window'}];
 if(mode==='no-limits')limits=null;
 if(mode==='bad-limits')limits={lower:4,center:2,upper:0};
 if(mode==='overflow'){
  forecast=[{id:'a',label:'Low',kind:'observed',x:0,value:-Number.MAX_VALUE},{id:'b',label:'High',kind:'observed',x:1,value:Number.MAX_VALUE}];
  control=[{id:'a',label:'Low',x:0,value:-Number.MAX_VALUE},{id:'b',label:'High',x:1,value:Number.MAX_VALUE}];events=[];
  ecdf=[{id:'huge',label:'Huge',samples:[{id:'a',value:-Number.MAX_VALUE},{id:'b',value:Number.MAX_VALUE}]}];
 }
 if(mode==='below')threshold=-10;if(mode==='above')threshold=20;
 if(mode==='many'){
  forecast=Array.from({length:32},(_,i)=>({id:'f'+i,label:'Week '+i,x:i,kind:'forecast',value:i,intervals:{wide:[i-4,i+4],narrow:[i-2,i+2]}}));
  control=Array.from({length:32},(_,i)=>({id:'c'+i,label:'Observation '+i,x:i,value:i%8}));
  ecdf=Array.from({length:18},(_,i)=>({...baseEcdf[0]!,id:'s'+i,label:'Distribution '+i}));
 }
 if(mode==='long'){forecast=forecast.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));control=control.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));ecdf=ecdf.map(series=>({...series,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));}
 if(revision){
  forecast=forecast.map(row=>({...row,value:row.value===null?null:row.value+1}));bands=bands.toReversed();
  control=control.map(row=>({...row,value:row.value===null?null:row.value-1}));
  ecdf=ecdf.toReversed().map(series=>({...series,samples:series.samples.toReversed()}));
 }
 const format=(v:number)=>'v'+v+(mode==='long'?' extremely long units':'');
 return <div data-nocturne><div id="nocturne-analysis-primary" className="w-[760px]">
  <NocturneForecastFan data={forecast} bands={bands} valueFormatter={format} height={mode==='many'?230:undefined} animate={animate}/>
  <NocturneControl data={control} limits={limits} events={events} valueFormatter={format} height={mode==='many'?230:undefined} animate={animate}/>
  <NocturneEcdf data={ecdf} threshold={threshold} percentiles={percentiles} valueFormatter={format} height={mode==='many'?230:undefined} animate={animate}/>
 </div><div id="nocturne-analysis-secondary" className="w-[700px]">
  <NocturneForecastFan data={baseForecast} bands={baseBands} animate={false}/><NocturneControl data={baseControl} limits={baseLimits} animate={false}/><NocturneEcdf data={baseEcdf} threshold={2} animate={false}/>
 </div></div>;
}
`;

const near = (a: number, b: number, message: string) => assert(Math.abs(a - b) < .05, message + ': ' + a + ' vs ' + b);
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexNocturneAnalysis: { setMode: (value: string) => void } }).nodexNocturneAnalysis.setMode(value), value);
const revision = (page: Page, value: boolean) => page.evaluate(value => (window as unknown as { nodexNocturneAnalysis: { setRevision: (value: boolean) => void } }).nodexNocturneAnalysis.setRevision(value), value);
async function bounds(node: Locator) { return node.evaluate(element => { const b = (element as SVGGraphicsElement).getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }); }
async function coordinate(node: Locator) { return node.evaluate(element => ({ x: Number(element.getAttribute('cx')), y: Number(element.getAttribute('cy')) })); }
async function checkStep(ecdf: Locator) {
  const first = await coordinate(ecdf.locator('[data-nx-ecdf-series="a"][data-nx-ecdf-step="0"] [data-nx-ecdf-point]'));
  const next = await coordinate(ecdf.locator('[data-nx-ecdf-series="a"][data-nx-ecdf-step="2"] [data-nx-ecdf-point]'));
  const path = ecdf.locator('[data-nx-ecdf-series="a"][data-nx-ecdf-step="2"] [data-nx-ecdf-curve]');
  const length = await path.evaluate(element => (element as SVGPathElement).getTotalLength());
  near(length, next.x - first.x + first.y - next.y, 'The native ECDF uses exact orthogonal steps');
  const corner = await path.evaluate((element, distance) => { const p = (element as SVGPathElement).getPointAtLength(distance); return { x: p.x, y: p.y }; }, next.x - first.x);
  near(corner.x, next.x, 'The jump occurs at the next actual value'); near(corner.y, first.y, 'The preceding share holds until that value');
}

export async function checkNocturneAnalyticalConsumer(page: Page): Promise<void> {
  const primary = page.locator('#nocturne-analysis-primary');
  const fan = primary.locator('[data-nx-chart="nocturne-forecast-fan"]');
  const control = primary.locator('[data-nx-chart="nocturne-control"]');
  const ecdf = primary.locator('[data-nx-chart="nocturne-ecdf"]');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(fan.locator('[data-nx-forecast-point]')).toHaveCount(5);
  await expect(fan.locator('[data-nx-forecast-coverage]')).toHaveText(['95%', '80%']);
  const f1 = await coordinate(fan.locator('[data-nx-forecast-point="f1"]')); const f2 = await coordinate(fan.locator('[data-nx-forecast-point="f2"]')); const f3 = await coordinate(fan.locator('[data-nx-forecast-point="f3"]'));
  near((f2.x - f1.x) / (f3.x - f2.x), 4/3, 'Forecast spacing preserves supplied numeric time');
  const wide = await bounds(fan.locator('[data-nx-forecast-band="wide"] .recharts-area-area'));
  const narrow = await bounds(fan.locator('[data-nx-forecast-band="narrow"] .recharts-area-area'));
  near(wide.x, f1.x, 'Prediction intervals start at the first supplied forecast');
  near(wide.width, f3.x - f1.x, 'Bands do not extend into invented horizons');
  near(wide.height / (f1.y - f2.y), 7, 'Range areas preserve absolute lower and upper values');
  near(narrow.height / (f1.y - f2.y), 4, 'Inner prediction range retains its own width');
  await expect(fan.locator('[data-nx-forecast-final]')).toHaveText('v6');
  await expect(control.locator('[data-nx-control-point]')).toHaveCount(5);
  await expect(control.locator('[data-nx-control-outside="above"],[data-nx-control-outside="below"]')).toHaveCount(2);
  for (const id of ['c0','c2']) await expect(control.locator('[data-nx-control-point="' + id + '"]')).toHaveAttribute('data-nx-control-outside','false');
  await expect(control.locator('[data-nx-control-count]')).toHaveText('2 outside limits · 5 measured · 1 unavailable');
  await expect(ecdf.locator('[data-nx-ecdf-point]')).toHaveCount(6);
  await expect(ecdf.locator('[data-nx-ecdf-key="a"] [data-nx-ecdf-n]')).toHaveText('n=4');
  await expect(ecdf.locator('[data-nx-ecdf-share]')).toHaveText(['75% at or below','66.67% at or below']);
  await expect(ecdf.locator('[data-nx-ecdf-key="a"] [data-nx-ecdf-quantile]')).toHaveText(['P50: v0','P90: v4']);
  await expect(ecdf.locator('[data-nx-ecdf-omitted]')).toHaveText(['1 unavailable omitted','1 unavailable omitted']);
  await checkStep(ecdf);
  for (const [node, first, second] of [[fan,'Observed: v-4','Observed: v0'],[control,'Observed: v-2','Observed: v0'],[ecdf,'At or below v0: 50%','At or below v2: 75%']] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880,10); await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(first); await page.keyboard.press('ArrowRight');
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(second);
  }
  await fan.locator('[data-nx-forecast-point="f1"]').hover(); await expect(fan.locator('.recharts-tooltip-wrapper:visible')).toContainText('95% interval: v-2 → v6');
  await control.locator('[data-nx-control-point="c3"]').hover(); await expect(control.locator('.recharts-tooltip-wrapper:visible')).toContainText('Above upper control limit');
  await ecdf.locator('[data-nx-ecdf-series="a"][data-nx-ecdf-step="0"] [data-nx-ecdf-point]').hover(); await expect(ecdf.locator('.recharts-tooltip-wrapper:visible')).toContainText('2 at this value');
  const sibling = page.locator('#nocturne-analysis-secondary [data-nx-forecast-band="wide"] .recharts-area-area'); const siblingPaint = await sibling.evaluate(element=>getComputedStyle(element).fill);
  await primary.evaluate(element=>{const s=(element as HTMLElement).style;s.setProperty('--nx-seriesA','#923b61');s.setProperty('--nx-seriesC','#bd875b');s.setProperty('--nx-ink','#c0d0c3');});
  await expect(fan.locator('[data-nx-forecast-band="wide"] .recharts-area-area')).toHaveCSS('fill','rgb(146, 59, 97)');
  await expect(control.locator('[data-nx-control-point="c3"]')).toHaveCSS('stroke','rgb(189, 135, 91)');
  await expect(ecdf.locator('[data-nx-ecdf-series="a"] [data-nx-ecdf-point]').first()).toHaveCSS('fill','rgb(146, 59, 97)');
  assert.equal(await sibling.evaluate(element=>getComputedStyle(element).fill),siblingPaint,'Paint overrides do not affect sibling instances');
  await primary.evaluate(element=>element.removeAttribute('style'));
  const ecdfPaths = await ecdf.locator('[data-nx-ecdf-series="a"] [data-nx-ecdf-curve]').evaluateAll(elements=>elements.map(element=>element.getAttribute('d')));
  await revision(page,true); await expect(fan.locator('[data-nx-forecast-final]')).toHaveText('v7');
  await expect(ecdf.locator('[data-nx-ecdf-key]').first()).toHaveAttribute('data-nx-ecdf-key','b');
  assert.deepEqual(await ecdf.locator('[data-nx-ecdf-series="a"] [data-nx-ecdf-curve]').evaluateAll(elements=>elements.map(element=>element.getAttribute('d'))),ecdfPaths,'Reordering raw samples and series preserves exact distribution geometry');
  await revision(page,false); await mode(page,'partial');
  await expect(fan.locator('[data-nx-forecast-final]')).toHaveText('—');
  await expect(fan.locator('[data-nx-forecast-isolated]')).toHaveCount(4);
  await expect(fan.locator('[data-nx-forecast-point="f2"]')).toHaveCount(1);
  await expect(control.locator('[data-nx-control-point="c2"]')).toHaveCount(0);
  await mode(page,'crossed'); await expect(fan.locator('[data-nx-forecast-unavailable]')).toHaveText('2 unavailable prediction intervals');
  await fan.locator('[data-nx-forecast-point="f2"]').hover(); await expect(fan.locator('.recharts-tooltip-wrapper:visible')).toContainText('Intervals must be nested by coverage.');
  for (const state of ['no-limits','bad-limits']) { await mode(page,state); await expect(control.locator('[data-nx-control-point]')).toHaveCount(5); await expect(control.locator('[data-nx-control-outside="above"],[data-nx-control-outside="below"]')).toHaveCount(0); await expect(control.locator('[data-nx-control-limit]')).toHaveText(['—','—','—']); }
  await mode(page,'missing');
  await expect(fan.locator('[data-nx-forecast-point]')).toHaveCount(0); await expect(fan.locator('[data-nx-forecast-unavailable]')).toHaveText('6 unavailable prediction intervals');
  await expect(control.locator('[data-nx-control-count]')).toContainText('0 measured · 6 unavailable');
  await expect(ecdf.locator('[data-nx-ecdf-point]')).toHaveCount(0); await expect(ecdf.locator('[data-nx-ecdf-share]')).toHaveText(['Unavailable','Unavailable']); await expect(ecdf.locator('[data-nx-ecdf-omitted]')).toHaveText(['5 unavailable omitted','4 unavailable omitted']);
  for (const node of [fan,control]) { await node.scrollIntoViewIfNeeded(); await page.mouse.move(880,10); await node.locator('svg.recharts-surface').focus(); await page.keyboard.press('ArrowRight'); await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText('Unavailable'); }
  for (const state of ['duplicates','blank-id','empty','overflow']) { await mode(page,state); for (const node of [fan,control,ecdf]) await expect(node.getByRole('status')).toHaveCount(1); }
  for (const [state,node,text] of [['bad-x',fan,'strictly increasing'],['bad-phase',fan,'precede'],['bad-band',fan,'coverage'],['bad-guides',ecdf,'probabilities'],['bad-event',control,'inside']] as const) { await mode(page,state); await expect(node.getByRole('status')).toContainText(text); }
  await mode(page,'single'); await expect(fan.locator('[data-nx-forecast-isolated]')).toHaveCount(2); await expect(control.locator('[data-nx-control-point]')).toHaveCount(1); await expect(ecdf.locator('[data-nx-ecdf-point]')).toHaveCount(1); await expect(ecdf.locator('[data-nx-ecdf-share]')).toHaveText('100% at or below');
  await mode(page,'zero'); await expect(fan.locator('[data-nx-forecast-final]')).toHaveText('v0'); await expect(control.locator('[data-nx-control-point="zero"]')).toHaveAttribute('data-nx-control-outside','false'); await expect(ecdf.locator('[data-nx-ecdf-point]')).toHaveCount(1); await expect(ecdf.locator('[data-nx-ecdf-quantile]')).toHaveText(['P50: v0','P90: v0']);
  await mode(page,'interval-only'); await expect(fan.locator('[data-nx-forecast-point]')).toHaveCount(0); await expect(fan.locator('[data-nx-forecast-isolated]')).toHaveCount(2);
  const collapsed = await bounds(fan.locator('[data-nx-forecast-isolated="wide"]')); near(collapsed.height,0,'A collapsed interval has no invented vertical span'); assert(collapsed.width>0,'A collapsed interval retains a visible cap without a point estimate');
  await mode(page,'below'); await expect(ecdf.locator('[data-nx-ecdf-share]')).toHaveText(['0% at or below','0% at or below']);
  await mode(page,'above'); await expect(ecdf.locator('[data-nx-ecdf-share]')).toHaveText(['100% at or below','100% at or below']); await expect(ecdf.locator('[data-nx-ecdf-point]')).toHaveCount(6);
  await mode(page,'long'); await expect(fan.locator('[data-nx-forecast-final]')).toContainText('extremely long units');
  await mode(page,'many'); await primary.evaluate(element=>(element as HTMLElement).style.width='280px');
  await expect(ecdf.locator('[data-nx-ecdf-key]')).toHaveCount(18);
  for (const node of [fan,control,ecdf]) {
    await expect.poll(()=>node.evaluate(element=>element.scrollWidth<=element.clientWidth+1 && element.scrollHeight<=element.clientHeight+1)).toBe(true);
    assert(await node.locator('div').evaluateAll(elements=>elements.some(element=>element.scrollHeight>element.clientHeight+20 && getComputedStyle(element).overflowY==='auto')),'Short cards keep plots and keys inside one vertical scroller');
    assert(await node.locator('div').evaluateAll(elements=>elements.some(element=>element.scrollWidth>element.clientWidth+20 && getComputedStyle(element).overflowX==='auto')),'Plots scroll locally in narrow containers');
  }
  await primary.evaluate(element=>element.removeAttribute('style')); await mode(page,'normal');
  await page.emulateMedia({reducedMotion:'no-preference'}); await primary.evaluate(element=>(element as HTMLElement).style.setProperty('--nx-motion-draw-duration','1s'));
  await page.evaluate(()=>(window as unknown as {nodexNocturneAnalysis:{setAnimate:(value:boolean)=>void}}).nodexNocturneAnalysis.setAnimate(true));
  for (const node of [fan,control,ecdf]) await expect(node).toHaveAttribute('data-nx-animated','true');
  await revision(page,true); await expect.poll(()=>ecdf.locator('[data-nx-ecdf-series="a"]').first().getAttribute('opacity').then(value=>Number(value)>0 && Number(value)<1)).toBe(true); await checkStep(ecdf);
  await page.emulateMedia({reducedMotion:'reduce'}); for (const node of [fan,control,ecdf]) await expect(node).toHaveAttribute('data-nx-animated','false');
  await page.emulateMedia({reducedMotion:'no-preference'}); await primary.evaluate(element=>(element as HTMLElement).style.setProperty('--nx-motion-draw-duration','0s')); for (const node of [fan,control,ecdf]) await expect(node).toHaveAttribute('data-nx-animated','false');
  await page.emulateMedia({reducedMotion:'reduce'}); await primary.evaluate(element=>element.removeAttribute('style')); await revision(page,false);
  assert.equal(await primary.locator('svg').evaluateAll(elements=>elements.some(element=>/(?:NaN|Infinity)/.test(element.innerHTML))),false,'Analytical charts retain finite final geometry');
  console.log('Validated Nocturne forecast fan, control chart and ECDF: exact native ranges, limits, ties, empirical quantiles, missing data, native inspection, scoped delivery, constrained layouts and live motion.');
}
