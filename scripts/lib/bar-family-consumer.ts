import assert from 'node:assert/strict';

import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const BAR_FAMILY_PRIMARY_SELECTORS = ['#chunky-primary', '#rung-primary', '#paired-primary', '#stacked-primary'];

export const BAR_FAMILY_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { ChunkyBars } from './components/nodex/chunky-bars/component';
import { RungBars } from './components/nodex/rung-bars/component';
import { PairedRungs } from './components/nodex/paired-rungs/component';
import { StackedRungs } from './components/nodex/stacked-rungs/component';

type Mode = 'normal' | 'empty' | 'single' | 'zero' | 'invalid' | 'partial' | 'fractional';
declare global { interface Window { nodexBarFixture: { setMode: (value: Mode) => void; setRevision: (value: number) => void } } }

export function BarFamilyConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(0);
  useEffect(() => { window.nodexBarFixture = { setMode, setRevision }; }, []);
  const plans = [{ plan: 'Alpha', mrrK: 4 }, { plan: 'Bravo', mrrK: 2 }, { plan: 'Charlie', mrrK: 6 }];
  const pairs = [{ plan: 'Alpha', beforeK: 3, afterK: 5 }, { plan: 'Bravo', beforeK: 4, afterK: 2 }, { plan: 'Charlie', beforeK: 0, afterK: 1 }];
  const stacks = [{ region: 'North', coreK: 3, addOnsK: 2, servicesK: 1 }, { region: 'South', coreK: 2, addOnsK: 0, servicesK: 3 }, { region: 'West', coreK: 0, addOnsK: 2, servicesK: 1 }];
  const planData = mode === 'normal' ? revision ? [{ plan: 'Alpha', mrrK: 7 }, { plan: 'Bravo', mrrK: 1 }, { plan: 'Charlie', mrrK: 4 }] : plans
    : mode === 'empty' ? [] : mode === 'single' ? [{ plan: 'Only', mrrK: 3 }]
    : mode === 'zero' ? [{ plan: 'Alpha', mrrK: 0 }, { plan: 'Bravo', mrrK: 0 }]
    : mode === 'fractional' ? [{ plan: 'Fraction', mrrK: 1.5 }]
    : mode === 'invalid' ? [{ plan: 'Absent', mrrK: null }, { plan: 'Invalid', mrrK: NaN }, { plan: 'Negative', mrrK: -2 }, { plan: 'Unbounded', mrrK: Infinity }]
    : [{ plan: 'Alpha', mrrK: 4 }, { plan: 'Absent', mrrK: null }, { plan: 'Zero', mrrK: 0 }, { plan: 'Negative', mrrK: -1 }, { plan: 'Fraction', mrrK: 1.5 }, { plan: 'Unbounded', mrrK: Infinity }];
  const pairData = mode === 'normal' ? revision ? [{ plan: 'Alpha', beforeK: 2, afterK: 7 }, { plan: 'Bravo', beforeK: 5, afterK: 1 }, { plan: 'Charlie', beforeK: 1, afterK: 3 }] : pairs
    : mode === 'empty' ? [] : mode === 'single' ? [{ plan: 'Only', beforeK: 1, afterK: 2 }]
    : mode === 'zero' ? [{ plan: 'Alpha', beforeK: 0, afterK: 0 }, { plan: 'Bravo', beforeK: 0, afterK: 0 }]
    : mode === 'fractional' ? [{ plan: 'Fraction', beforeK: 1.5, afterK: 2.5 }]
    : mode === 'invalid' ? [{ plan: 'Absent', beforeK: null, afterK: NaN }, { plan: 'Negative', beforeK: -2, afterK: Infinity }]
    : [{ plan: 'Alpha', beforeK: null, afterK: 3 }, { plan: 'Bravo', beforeK: 2, afterK: null }, { plan: 'Zero', beforeK: 0, afterK: 0 }, { plan: 'Fraction', beforeK: 1.5, afterK: 4 }, { plan: 'Absent', beforeK: -1, afterK: NaN }];
  const stackData = mode === 'normal' ? revision ? [{ region: 'North', coreK: 4, addOnsK: 1, servicesK: 2 }, { region: 'South', coreK: 1, addOnsK: 3, servicesK: 1 }, { region: 'West', coreK: 2, addOnsK: 1, servicesK: 0 }] : stacks
    : mode === 'empty' ? [] : mode === 'single' ? [{ region: 'Only', coreK: 1, addOnsK: 0, servicesK: 2 }]
    : mode === 'zero' ? [{ region: 'North', coreK: 0, addOnsK: 0, servicesK: 0 }, { region: 'South', coreK: 0, addOnsK: 0, servicesK: 0 }]
    : mode === 'fractional' ? [{ region: 'Fraction', coreK: 1.5, addOnsK: 2, servicesK: 3 }]
    : mode === 'invalid' ? [{ region: 'Absent', coreK: null, addOnsK: NaN, servicesK: Infinity }, { region: 'Negative', coreK: -2, addOnsK: -1, servicesK: -3 }]
    : [{ region: 'North', coreK: 3, addOnsK: null, servicesK: 2 }, { region: 'South', coreK: 0, addOnsK: 1, servicesK: 0 }, { region: 'West', coreK: null, addOnsK: null, servicesK: null }, { region: 'East', coreK: 1.5, addOnsK: 2, servicesK: -1 }];
  return <>
    <section id="bar-family-primary" className="w-[660px] space-y-6">
      <div id="chunky-primary"><ChunkyBars data={planData} height={360} animate={animate} aria-label="Plan revenue" /></div>
      <div id="rung-primary"><RungBars data={planData} height={360} animate={animate} aria-label="Revenue units" /></div>
      <div id="paired-primary"><PairedRungs data={pairData} height={360} animate={animate} aria-label="Revenue comparison" /></div>
      <div id="stacked-primary"><StackedRungs data={stackData} height={360} animate={animate} aria-label="Regional revenue" /></div>
    </section>
    <section id="bar-family-secondary" className="w-[520px] space-y-6">
      <div id="chunky-secondary"><ChunkyBars data={plans} height={280} animate={false} aria-label="Independent plan revenue" /></div>
      <div id="rung-secondary"><RungBars data={plans} height={280} animate={false} aria-label="Independent revenue units" /></div>
      <div id="paired-secondary"><PairedRungs data={pairs} height={280} animate={false} aria-label="Independent comparison" /></div>
      <div id="stacked-secondary"><StackedRungs data={stacks} height={280} animate={false} aria-label="Independent regional revenue" /></div>
    </section>
  </>;
}
`;

async function setMode(page: Page, mode: string): Promise<void> {
  await page.evaluate((value) => (window as unknown as { nodexBarFixture: { setMode: (mode: string) => void } }).nodexBarFixture.setMode(value), mode);
}

function rungs(page: Page, chart: string, observation: number, series: string): Locator {
  return page.locator(`${chart} [data-nx-observation="${observation}"][data-nx-series="${series}"] rect[data-nx-rung]`);
}

async function checkRungs(page: Page, chart: string, series: string, counts: number[]): Promise<void> {
  for (const [index, count] of counts.entries()) await expect(rungs(page, chart, index, series)).toHaveCount(count);
}

async function tooltip(page: Page, chart: string, fragments: string[]): Promise<void> {
  const tip = page.locator(`${chart} .recharts-tooltip-wrapper:visible`);
  await expect(tip).toHaveCount(1);
  for (const fragment of fragments) await expect(tip).toContainText(fragment, { ignoreCase: true });
  await expect(page.locator(`${chart.replace('-primary', '-secondary')} .recharts-tooltip-wrapper:visible`)).toHaveCount(0);
}

async function keyboardObservations(page: Page, chart: string, observations: string[][]): Promise<void> {
  const frame = () => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const press = async (key: string) => { await page.keyboard.press(key); await frame(); };
  // Recharts batches input by animation frame. Let the preceding pointer input
  // settle before leaving the plot, then send distinct keyboard observations.
  await frame();
  await page.mouse.move(800, 10);
  await frame();
  await page.locator(`${chart} svg.recharts-surface`).focus();
  // Focus retains the prior index; moving back from the next category also
  // activates an inactive selection left behind by clicking a chart descendant.
  await press('ArrowRight');
  for (let index = 0; index < observations.length; index++) await press('ArrowLeft');
  for (const [index, fragments] of observations.entries()) {
    if (index) await press('ArrowRight');
    await tooltip(page, chart, fragments);
  }
  await press('ArrowRight');
  await tooltip(page, chart, observations.at(-1)!);
}

async function geometry(page: Page, selector: string) {
  return page.locator(`${selector} [data-nx-bar], ${selector} rect[data-nx-rung]`).evaluateAll((elements) => elements.map((element) => ({
    d: element.getAttribute('d'), x: element.getAttribute('x'), y: element.getAttribute('y'), width: element.getAttribute('width'), height: element.getAttribute('height'),
  })));
}

async function paints(page: Page, selector: string) {
  return page.locator(`${selector} [data-nx-bar], ${selector} rect[data-nx-rung], ${selector} [data-nx-total], ${selector} .recharts-xAxis-tick-labels text`).evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { fill: style.fill, fontSize: style.fontSize, height: style.height };
  }));
}

export async function checkBarFamilyConsumer(page: Page): Promise<void> {
  await expect(page.locator('#chunky-primary [data-nx-bar]')).toHaveCount(3);
  await checkRungs(page, '#rung-primary', 'mrr', [4, 2, 6]);
  await checkRungs(page, '#paired-primary', 'before', [3, 4, 0]);
  await checkRungs(page, '#paired-primary', 'after', [5, 2, 1]);
  await checkRungs(page, '#stacked-primary', 'core', [3, 2, 0]);
  await checkRungs(page, '#stacked-primary', 'add-ons', [2, 0, 2]);
  await checkRungs(page, '#stacked-primary', 'services', [1, 3, 1]);

  const cases = [
    { chart: '#chunky-primary', mark: '[data-nx-bar="0"]', observations: [['$4K'], ['$2K'], ['$6K']] },
    { chart: '#rung-primary', mark: '[data-nx-observation="0"] rect[data-nx-rung]', observations: [['$4K'], ['$2K'], ['$6K']] },
    { chart: '#paired-primary', mark: '[data-nx-observation="0"][data-nx-series="after"] rect[data-nx-rung]', observations: [['Alpha', '$3K', '$5K'], ['Bravo', '$4K', '$2K'], ['Charlie', '$0K', '$1K']] },
    { chart: '#stacked-primary', mark: '[data-nx-observation="0"][data-nx-series="core"] rect[data-nx-rung]', observations: [['North', '$6K', 'across 3 lines'], ['South', '$5K'], ['West', '$3K']] },
  ];
  for (const { chart, mark, observations } of cases) {
    const visibleMark = page.locator(`${chart} ${mark}`).first();
    await visibleMark.scrollIntoViewIfNeeded();
    // A rung is one screen pixel thick; Playwright's floored bounding-box
    // center can miss it. Use an integer coordinate verified by hit testing.
    const hit = await visibleMark.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const point = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
      return document.elementFromPoint(point.x, point.y) === element ? point : null;
    });
    assert(hit, `${chart}: the visible data mark must receive pointer input`);
    await page.mouse.move(hit.x, hit.y);
    await tooltip(page, chart, observations[0]!);
    await page.mouse.click(hit.x, hit.y);
    await expect.poll(() => page.locator(chart).evaluate((root) => {
      const focused = document.activeElement;
      if (!focused || !root.contains(focused) || focused.matches(':focus-visible')) return false;
      const style = getComputedStyle(focused);
      return style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0;
    })).toBe(true);
    await keyboardObservations(page, chart, observations);
  }
  for (const [chart, series] of [['#rung-primary', 'mrr'], ['#paired-primary', 'after'], ['#stacked-primary', 'core']] as const) {
    const separated = await rungs(page, chart, 0, series).evaluateAll((elements) => {
      const bounds = elements.map((element) => element.getBoundingClientRect()).sort((a, b) => a.y - b.y);
      return bounds.slice(1).every((box, index) => box.top > bounds[index]!.bottom);
    });
    assert(separated, `${chart}: each dollar unit must retain a visible gap`);
  }
  const stackGaps = await page.locator('#stacked-primary').evaluate((root) => {
    const ys = (series: string) => [...root.querySelectorAll(`[data-nx-observation="0"][data-nx-series="${series}"] rect[data-nx-rung]`)].map((element) => element.getBoundingClientRect().y);
    const core = ys('core');
    const addOns = ys('add-ons');
    const services = ys('services');
    const unit = core[0]! - core[1]!;
    return [(core[2]! - addOns[0]!) / unit, (addOns[1]! - services[0]!) / unit];
  });
  for (const gap of stackGaps) assert(Math.abs(gap - 2) < 0.01, 'Stack separators must add one empty rung without inventing revenue');

  const siblingPaint = await paints(page, '#bar-family-secondary');
  await page.locator('#bar-family-primary').evaluate((element) => {
    const node = element as HTMLElement;
    for (const [role, value] of Object.entries({ ink: '#123456', muted: '#879ba7', markQuiet: '#987654', faint: '#bdcbd3', markPale: '#cbd5b9', grid: '#ccd3dc', 'type-axis-size': '16px', 'type-plotValue-size': '34px', 'stroke-mark': '2px', 'stroke-hairline': '1.75px' })) node.style.setProperty(`--nx-${role}`, value);
  });
  const ink = 'rgb(18, 52, 86)';
  const muted = 'rgb(135, 155, 167)';
  const quiet = 'rgb(152, 118, 84)';
  await expect.poll(() => page.locator('#chunky-primary [data-nx-bar]').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).fill))).toEqual([muted, quiet, ink]);
  for (const [chart, series, color] of [
    ['#rung-primary', 'mrr', ink], ['#paired-primary', 'before', quiet], ['#paired-primary', 'after', ink],
    ['#stacked-primary', 'core', ink], ['#stacked-primary', 'add-ons', muted], ['#stacked-primary', 'services', 'rgb(203, 213, 185)'],
  ] as const) {
    await expect.poll(() => rungs(page, chart, 0, series).first().evaluate((element) => getComputedStyle(element).fill)).toBe(color);
    await expect.poll(() => rungs(page, chart, 0, series).first().evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(2);
  }
  await expect.poll(() => page.locator('#rung-primary [data-nx-counting-dot]').first().evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(189, 203, 211)');
  for (const [chart, valueSize] of [['#chunky-primary', '26px'], ['#rung-primary', '22px'], ['#paired-primary', '21px'], ['#stacked-primary', '21px']] as const) {
    await expect.poll(() => page.locator(`${chart} [data-nx-total]`).first().evaluate((element) => getComputedStyle(element).fontSize)).toBe(valueSize);
    await expect.poll(() => page.locator(`${chart} .recharts-xAxis-tick-labels text`).first().evaluate((element) => getComputedStyle(element).fontSize)).toBe(chart === '#chunky-primary' ? '18px' : '15px');
    if (chart !== '#chunky-primary') {
      await expect.poll(() => page.locator(`${chart} .recharts-cartesian-axis-line`).evaluate((element) => {
        const style = getComputedStyle(element);
        return { stroke: style.stroke, width: style.strokeWidth };
      })).toEqual({ stroke: 'rgb(204, 211, 220)', width: '2px' });
    }
  }
  await expect.poll(() => page.locator('#stacked-primary svg').evaluate((element) => {
    const style = getComputedStyle(element);
    return { visible: element.matches(':focus-visible'), color: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle };
  })).toEqual({ visible: true, color: ink, width: '2px', style: 'solid' });
  assert.deepEqual(await paints(page, '#bar-family-secondary'), siblingPaint, 'Scoped mark, count, axis and unit-thickness tokens must not affect independent instances');

  const siblings = await geometry(page, '#bar-family-secondary');
  const previous = await geometry(page, '#bar-family-primary');
  await page.evaluate(() => (window as unknown as { nodexBarFixture: { setRevision: (value: number) => void } }).nodexBarFixture.setRevision(1));
  await checkRungs(page, '#rung-primary', 'mrr', [7, 1, 4]);
  await checkRungs(page, '#paired-primary', 'before', [2, 5, 1]);
  await checkRungs(page, '#paired-primary', 'after', [7, 1, 3]);
  await checkRungs(page, '#stacked-primary', 'core', [4, 1, 2]);
  await checkRungs(page, '#stacked-primary', 'add-ons', [1, 3, 1]);
  await checkRungs(page, '#stacked-primary', 'services', [2, 1, 0]);
  await expect.poll(() => geometry(page, '#bar-family-primary')).not.toEqual(previous);
  assert.deepEqual(await geometry(page, '#bar-family-secondary'), siblings, 'Changing bar observations must not reshape independent instances');
  await expect(page.locator('#chunky-primary [data-nx-total="0"]')).toHaveText('$7K');
  await expect.poll(() => page.locator('#chunky-primary [data-nx-bar]').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).fill))).toEqual([ink, quiet, muted]);

  for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) {
    const oldWidth = Number(await page.locator(`${chart} svg.recharts-surface`).getAttribute('width'));
    const oldGeometry = await geometry(page, chart);
    await page.locator(chart).evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
    await expect.poll(async () => Number(await page.locator(`${chart} svg.recharts-surface`).getAttribute('width'))).toBeLessThan(oldWidth);
    await expect.poll(() => geometry(page, chart)).not.toEqual(oldGeometry);
    assert(Number(await page.locator(`${chart.replace('-primary', '-secondary')} svg`).getAttribute('width')) > 340, `${chart}: resizing leaked into its sibling`);
  }

  for (const mode of ['empty', 'single', 'zero', 'invalid', 'fractional'] as const) {
    await setMode(page, mode);
    for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) {
      if (mode === 'empty' || mode === 'invalid' || (mode === 'fractional' && chart !== '#chunky-primary')) {
        await expect(page.locator(`${chart} [role="status"]`)).toContainText('available');
      } else {
        await expect(page.locator(`${chart} svg.recharts-surface`)).toHaveCount(1);
        if (mode === 'zero') await expect(page.locator(`${chart} [data-nx-bar], ${chart} rect[data-nx-rung]`)).toHaveCount(0);
      }
      assert.equal(await page.locator(chart).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${chart}: ${mode} input generated invalid DOM`);
    }
    if (mode === 'single') {
      await checkRungs(page, '#rung-primary', 'mrr', [3]);
      await checkRungs(page, '#paired-primary', 'before', [1]);
      await checkRungs(page, '#paired-primary', 'after', [2]);
      await checkRungs(page, '#stacked-primary', 'core', [1]);
      await checkRungs(page, '#stacked-primary', 'add-ons', [0]);
      await checkRungs(page, '#stacked-primary', 'services', [2]);
      for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) await keyboardObservations(page, chart, [[chart === '#paired-primary' ? '$2K' : '$3K']]);
    }
    if (mode === 'zero') for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) await keyboardObservations(page, chart, [['$0K'], ['$0K']]);
    if (mode === 'fractional') {
      await expect(page.locator('#chunky-primary [data-nx-bar]')).toHaveCount(1);
      await expect(page.locator('#chunky-primary [data-nx-total="0"]')).toHaveText('$1.5K');
      await keyboardObservations(page, '#chunky-primary', [['$1.5K']]);
    }
  }

  await setMode(page, 'partial');
  await checkRungs(page, '#rung-primary', 'mrr', [4, 0, 0, 0, 0, 0]);
  await checkRungs(page, '#paired-primary', 'before', [0, 2, 0, 0, 0]);
  await checkRungs(page, '#paired-primary', 'after', [3, 0, 0, 4, 0]);
  await checkRungs(page, '#stacked-primary', 'core', [0, 0, 0, 0]);
  await checkRungs(page, '#stacked-primary', 'add-ons', [0, 1, 0, 0]);
  await checkRungs(page, '#stacked-primary', 'services', [0, 0, 0, 0]);
  await expect(page.locator('#stacked-primary [data-nx-total="0"]')).toHaveText('—');
  await expect(page.locator('#stacked-primary [data-nx-total="1"]')).toHaveText('1');
  await keyboardObservations(page, '#chunky-primary', [['$4K'], ['Unavailable'], ['$0K'], ['Unavailable'], ['$1.5K'], ['Unavailable']]);
  await keyboardObservations(page, '#rung-primary', [['$4K'], ['Unavailable'], ['$0K'], ['Unavailable'], ['Unavailable'], ['Unavailable']]);
  await keyboardObservations(page, '#paired-primary', [['Alpha', 'Unavailable', '$3K'], ['Bravo', '$2K', 'Unavailable'], ['Zero', '$0K'], ['Fraction', 'Unavailable', '$4K'], ['Absent', 'Unavailable']]);
  await keyboardObservations(page, '#stacked-primary', [['North', 'Unavailable'], ['South', '$1K'], ['West', 'Unavailable'], ['East', 'Unavailable']]);
  for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) assert.equal(await page.locator(chart).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${chart}: partial input generated invalid DOM`);
  await setMode(page, 'normal');
  for (const chart of BAR_FAMILY_PRIMARY_SELECTORS) await expect(page.locator(`${chart} svg.recharts-surface`)).toHaveCount(1);
  console.log('Validated bar-family observation tooltips and keyboard stops, rung counts/gaps, scoped paint/type/thickness/focus, data updates, independent instances, resizing and missing/zero/fractional data.');
}
