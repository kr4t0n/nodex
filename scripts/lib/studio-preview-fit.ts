import assert from 'node:assert/strict';
import { expect, type Locator } from '@playwright/test';

/** A surface can fit perfectly while its responsive chart has collapsed to zero. */
export async function checkStudioGaugeGeometry(chart: Locator): Promise<void> {
  await expect(chart.locator('[data-nx-soft-gauge-arc]')).toHaveCount(2);
  await expect.poll(() => chart.evaluate(root => {
    const svg = root.querySelector('svg.recharts-surface')?.getBoundingClientRect();
    const arcs = [...root.querySelectorAll('[data-nx-soft-gauge-arc]')].map(e => e.getBoundingClientRect());
    const value = root.querySelector('[data-nx-soft-gauge-percent]')?.getBoundingClientRect();
    const reading = root.querySelector('[data-nx-soft-gauge-reading]')?.getBoundingClientRect();
    const minimum = root.querySelector('[data-nx-soft-gauge-min]')?.getBoundingClientRect();
    const maximum = root.querySelector('[data-nx-soft-gauge-max]')?.getBoundingClientRect();
    if (!svg || !value || !reading || !minimum || !maximum) return false;
    const center = svg.left + svg.width / 2;
    return svg.width > 0 && svg.height > 0 && arcs.length === 2 && arcs.every(arc => arc.width > 1 && arc.height > 1)
      && Math.abs(value.left + value.width / 2 - center) < 1
      && Math.abs(reading.left + reading.width / 2 - center) < 1
      && value.bottom <= reading.top + 1 && minimum.right < value.left && maximum.left > value.right
      && [value, reading, minimum, maximum, ...arcs].every(box => box.left >= svg.left - 1 && box.right <= svg.right + 1 && box.top >= svg.top - 1 && box.bottom <= svg.bottom + 1);
  }), { message: 'Gauge arcs must be visible, readings centered and limits separated inside the measured chart' }).toBe(true);
}

/** Check real scroll extents, including overflow too small to notice with overlay scrollbars. */
export async function checkStudioPreviewFit(chart: Locator): Promise<void> {
  if (await chart.getAttribute('data-nx-chart') === 'soft-gauge') await checkStudioGaugeGeometry(chart);
  const result = await chart.evaluate(root => {
    const overflow = [root, ...root.querySelectorAll<HTMLElement>('div,ul')].flatMap(element => {
      const style = getComputedStyle(element);
      const x = ['auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
      const y = ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
      return x || y ? [{ classes: element.className, x: element.scrollWidth - element.clientWidth, y: element.scrollHeight - element.clientHeight }] : [];
    });
    const bounds = root.getBoundingClientRect();
    const frame = root.closest('[data-nx-preview]')?.getBoundingClientRect();
    return { slug: root.getAttribute('data-nx-chart'), overflow,
      fits: root.scrollWidth <= root.clientWidth + 1 && root.scrollHeight <= root.clientHeight + 1,
      framed: !frame || bounds.left >= frame.left - 1 && bounds.right <= frame.right + 1 && bounds.top >= frame.top - 1 && bounds.bottom <= frame.bottom + 1 };
  });
  assert.deepEqual(result.overflow, [], `${result.slug}: the complete specimen must fit without scrollbars`);
  assert(result.fits, `${result.slug}: content must fit inside the chart surface`);
  assert(result.framed, `${result.slug}: scaling must keep the whole surface inside the preview frame`);
}
