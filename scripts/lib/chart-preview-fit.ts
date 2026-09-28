import assert from 'node:assert/strict';
import type { Locator } from '@playwright/test';

/** Check real scroll extents, including overflow too small to notice with overlay scrollbars. */
export async function checkChartPreviewFit(chart: Locator): Promise<void> {
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
