import assert from 'node:assert/strict';

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Application data and test controls stay outside the files installed by nodex.
export const DUAL_AREA_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { DualArea, type DualAreaDatum } from './components/nodex/dual-area/component';

type Mode = 'normal' | 'empty' | 'single' | 'zero' | 'invalid' | 'negative' | 'partial';
declare global { interface Window { nodexDualAreaFixture: { setMode: (value: Mode) => void; setRevision: (value: number) => void } } }

export function DualAreaConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(0);
  useEffect(() => { window.nodexDualAreaFixture = { setMode, setRevision }; }, []);
  const normal: DualAreaDatum[] = revision ? [
    { day: 1, spendK: 9, signUps: 60 }, { day: 2, spendK: 4, signUps: 35 }, { day: 3, spendK: 21, signUps: 180 },
  ] : [
    { day: 1, spendK: 2, signUps: 40 }, { day: 2, spendK: 6, signUps: 70 }, { day: 3, spendK: 12, signUps: 110 },
  ];
  const data: DualAreaDatum[] = mode === 'normal' ? normal
    : mode === 'empty' ? []
    : mode === 'invalid' ? [{ day: 1, spendK: NaN, signUps: Infinity }, { day: 2, spendK: -Infinity, signUps: NaN }]
    : mode === 'negative' ? [{ day: 1, spendK: -2, signUps: -3 }]
    : mode === 'partial' ? [
      { day: 1, spendK: null, signUps: 40 }, { day: 2, spendK: 6, signUps: null },
      { day: 3, spendK: -1, signUps: 70 }, { day: 4, spendK: 8, signUps: -2 },
      { day: 5, spendK: NaN, signUps: 110 }, { day: 6, spendK: 12, signUps: Infinity },
    ]
    : [{ day: 7, spendK: mode === 'zero' ? 0 : 3, signUps: mode === 'zero' ? 0 : 6 }];
  return <>
    <section id="dual-primary" className="w-[660px]"><DualArea data={data} height={400} animate={animate} aria-label="Campaign spend and sign-ups" /></section>
    <section id="dual-secondary" className="w-[660px]"><DualArea data={[{ day: 1, spendK: 4, signUps: 8 }, { day: 2, spendK: 7, signUps: 13 }, { day: 3, spendK: 2, signUps: 6 }]} height={320} animate={false} aria-label="Independent campaign" /></section>
  </>;
}
`;

const PRIMARY = '#dual-primary';
const SECONDARY = '#dual-secondary';
const SPEND = `${PRIMARY} [data-nx-plot="spend"]`;
const SIGNUPS = `${PRIMARY} [data-nx-plot="sign-ups"]`;
const TOOLTIP = `${PRIMARY} .recharts-tooltip-wrapper:visible`;

async function setMode(page: Page, mode: string): Promise<void> {
  await page.evaluate((value) => (window as unknown as { nodexDualAreaFixture: { setMode: (mode: string) => void } }).nodexDualAreaFixture.setMode(value), mode);
}

async function checkTooltip(page: Page, text: string): Promise<void> {
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(TOOLTIP)).toHaveText(text);
  await expect(page.locator(`${SECONDARY} .recharts-tooltip-wrapper:visible`)).toHaveCount(0);
}

async function checkCursorAlignment(page: Page): Promise<void> {
  await expect.poll(() => page.locator(PRIMARY).evaluate((element) => {
    const cursors = ['spend', 'sign-ups'].map((plot) => element.querySelector(`[data-nx-plot="${plot}"] .nx-dual-area-cursor`)?.getBoundingClientRect());
    if (!cursors[0] || !cursors[1]) return Infinity;
    return Math.abs((cursors[0].x + cursors[0].width / 2) - (cursors[1].x + cursors[1].width / 2));
  }), { message: 'Both plots must point at the same day in screen coordinates' }).toBeLessThan(1);
}

async function hoverBar(page: Page, index: number): Promise<void> {
  await page.locator(`${SPEND} .recharts-bar-rectangle path`).nth(index).hover();
}

async function chartPaint(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => ({
    line: getComputedStyle(element.querySelector('.recharts-area-curve')!).stroke,
    bar: getComputedStyle(element.querySelector('.recharts-bar-rectangle path')!).fill,
    stops: [...element.querySelectorAll('linearGradient stop')].map((stop) => getComputedStyle(stop).stopColor),
  }));
}

export async function checkDualAreaConsumer(page: Page): Promise<void> {
  await page.locator(PRIMARY).scrollIntoViewIfNeeded();
  const line = page.locator(`${SIGNUPS} .recharts-area-curve`);
  const bars = page.locator(`${SPEND} .recharts-bar-rectangle path`);
  await expect(bars).toHaveCount(3);
  await expect(line).toHaveCount(1);
  await expect(page.locator(`${SIGNUPS} .recharts-area-area`)).toHaveCount(1);

  // Both plots retain the original band positions, even though one is a bar chart.
  await hoverBar(page, 1);
  await checkTooltip(page, 'Day 2 — spend $6K · 70 sign-ups');
  await checkCursorAlignment(page);
  const thirdBar = await bars.nth(2).boundingBox();
  const lowerPlot = await page.locator(`${SIGNUPS} svg.recharts-surface`).boundingBox();
  assert(thirdBar && lowerPlot, 'Both coordinated plots must have a layout');
  await page.mouse.move(thirdBar.x + thirdBar.width / 2, lowerPlot.y + lowerPlot.height / 2);
  await checkTooltip(page, 'Day 3 — spend $12K · 110 sign-ups');
  await checkCursorAlignment(page);

  // Keyboard input owns both cursors even while the pointer remains over the other plot.
  await page.locator(`${SPEND} svg.recharts-surface`).focus();
  await checkTooltip(page, 'Day 1 — spend $2K · 40 sign-ups');
  await checkCursorAlignment(page);
  await page.keyboard.press('ArrowRight');
  await checkTooltip(page, 'Day 2 — spend $6K · 70 sign-ups');
  await checkCursorAlignment(page);

  // Changing input without a new mouse-enter or focus event must hand ownership back.
  const firstBar = await bars.first().boundingBox();
  assert(firstBar, 'The first campaign observation must have a mark');
  await page.mouse.move(firstBar.x + firstBar.width / 2, lowerPlot.y + lowerPlot.height / 2);
  await checkTooltip(page, 'Day 1 — spend $2K · 40 sign-ups');
  await checkCursorAlignment(page);
  await page.keyboard.press('ArrowRight');
  await checkTooltip(page, 'Day 3 — spend $12K · 110 sign-ups');
  await checkCursorAlignment(page);

  // Recharts prioritizes hover within the same chart; move off it for keyboard-only input.
  await page.mouse.move(800, 10);
  await page.locator(`${SIGNUPS} svg.recharts-surface`).focus();
  await page.keyboard.press('ArrowRight');
  await checkTooltip(page, 'Day 2 — spend $6K · 70 sign-ups');
  await checkCursorAlignment(page);

  const previousPath = await line.getAttribute('d');
  const siblingPath = await page.locator(`${SECONDARY} .recharts-area-curve`).getAttribute('d');
  await page.evaluate(() => (window as unknown as { nodexDualAreaFixture: { setRevision: (value: number) => void } }).nodexDualAreaFixture.setRevision(1));
  await expect(line).not.toHaveAttribute('d', previousPath!);
  await expect(page.locator(`${SECONDARY} .recharts-area-curve`)).toHaveAttribute('d', siblingPath!);
  await hoverBar(page, 2);
  await checkTooltip(page, 'Day 3 — spend $21K · 180 sign-ups');
  await checkCursorAlignment(page);
  const largestBar = await bars.nth(2).boundingBox();
  const upperPlot = await page.locator(`${SPEND} svg.recharts-surface`).boundingBox();
  assert(largestBar && upperPlot && largestBar.y >= upperPlot.y - 1 && largestBar.y + largestBar.height <= upperPlot.y + upperPlot.height + 1, 'Caller spend above the original $18K maximum must fit the chart');

  const siblingPaint = await chartPaint(page, SECONDARY);
  assert(siblingPaint.stops.length >= 2, 'The delivered area must include its gradient stops');
  await page.locator(PRIMARY).evaluate((element) => {
    const node = element as HTMLElement;
    node.style.setProperty('--nx-ink', '#123456');
    node.style.setProperty('--nx-markQuiet', '#987654');
  });
  await expect.poll(() => chartPaint(page, PRIMARY)).toEqual({
    line: 'rgb(18, 52, 86)', bar: 'rgb(152, 118, 84)',
    stops: siblingPaint.stops.map(() => 'rgb(18, 52, 86)'),
  });
  assert.deepEqual(await chartPaint(page, SECONDARY), siblingPaint, 'Scoped line, bar and gradient paints must not affect another instance');

  const originalWidth = Number(await page.locator(`${SPEND} svg.recharts-surface`).getAttribute('width'));
  await page.locator(PRIMARY).evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
  await expect.poll(async () => Number(await page.locator(`${SPEND} svg.recharts-surface`).getAttribute('width'))).toBeLessThan(originalWidth);
  await expect.poll(async () => {
    const widths = await page.locator(`${PRIMARY} svg.recharts-surface`).evaluateAll((elements) => elements.map((element) => Number(element.getAttribute('width'))));
    return widths.length === 2 && widths[0] === widths[1];
  }).toBe(true);
  assert(Number(await page.locator(`${SECONDARY} svg.recharts-surface`).first().getAttribute('width')) > 340, 'Resizing one dual-area instance must not resize its sibling');
  await hoverBar(page, 1);
  await checkTooltip(page, 'Day 2 — spend $4K · 35 sign-ups');
  await checkCursorAlignment(page);

  for (const mode of ['empty', 'single', 'zero', 'invalid', 'negative'] as const) {
    await setMode(page, mode);
    if (mode === 'empty' || mode === 'invalid' || mode === 'negative') {
      await expect(page.locator(`${PRIMARY} [role="status"]`)).toContainText('available');
    } else {
      await expect(page.locator(`${PRIMARY} svg.recharts-surface`)).toHaveCount(2);
      await page.mouse.move(800, 10);
      await page.locator(`${SPEND} svg.recharts-surface`).focus();
      await page.keyboard.press('ArrowRight');
      await checkTooltip(page, mode === 'zero' ? 'Day 7 — spend $0K · 0 sign-ups' : 'Day 7 — spend $3K · 6 sign-ups');
      await checkCursorAlignment(page);
    }
    assert.equal(await page.locator(PRIMARY).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `Dual-area ${mode} data generated invalid DOM`);
  }

  // Missing, negative and non-finite values remain unavailable independently;
  // keeping their day positions is essential to cross-plot synchronization.
  await setMode(page, 'partial');
  await expect(page.locator(`${PRIMARY} svg.recharts-surface`)).toHaveCount(2);
  await page.mouse.move(800, 10);
  await page.locator(`${SPEND} svg.recharts-surface`).focus();
  const partialObservations = [
    'Day 1 — spend Unavailable · 40 sign-ups', 'Day 2 — spend $6K · Unavailable sign-ups',
    'Day 3 — spend Unavailable · 70 sign-ups', 'Day 4 — spend $8K · Unavailable sign-ups',
    'Day 5 — spend Unavailable · 110 sign-ups', 'Day 6 — spend $12K · Unavailable sign-ups',
  ];
  for (const [index, observation] of partialObservations.entries()) {
    if (index) await page.keyboard.press('ArrowRight');
    await checkTooltip(page, observation);
    await checkCursorAlignment(page);
  }
  assert.equal(await page.locator(PRIMARY).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, 'Partially missing dual-area data generated invalid DOM');

  await setMode(page, 'normal');
  await expect(page.locator(`${PRIMARY} svg.recharts-surface`)).toHaveCount(2);
  console.log('Validated dual-area coordinated pointer/keyboard observations, scale expansion, scoped bar/line/gradient tokens, independent instances, resizing and missing/zero/invalid data.');
}
