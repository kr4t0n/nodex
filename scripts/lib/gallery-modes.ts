import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Browser, type Page } from '@playwright/test';
import { resolveTokens } from '../../packages/cli/src/tokens.ts';
import { checkGalleryModeLayout } from './gallery-mode-layout.ts';
import { modeFixture } from './mode-fixture.ts';
import { renderFontFaces, renderTokens } from './tokens.ts';

async function checkModeSwitch(page: Page, checked: boolean, output: string) {
  const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
  await expect(mode).toBeChecked({ checked });
  await expect(
    mode.getByText(checked ? 'Dark' : 'Light', { exact: true }),
  ).toBeVisible();
  await expect(
    mode.getByText(checked ? 'Light' : 'Dark', { exact: true }),
  ).toBeHidden();
  const label = await mode
    .getByText(checked ? 'Dark' : 'Light', { exact: true })
    .boundingBox();
  const track = await mode.locator(':scope > span').first().boundingBox();
  const thumb = await mode
    .locator(':scope > span > span')
    .first()
    .boundingBox();
  assert(label && track && thumb);
  assert(
    Math.abs(label.y + label.height / 2 - track.y - track.height / 2) < 1,
    'The visible label stays vertically centered beside the switch track',
  );
  assert(
    thumb.x > track.x && thumb.x + thumb.width < track.x + track.width,
    'The thumb stays inside the track',
  );
  const thumbCenter = thumb.x + thumb.width / 2 - track.x;
  assert(
    checked ? thumbCenter > track.width / 2 : thumbCenter < track.width / 2,
    `The thumb must occupy the ${checked ? 'right' : 'left'} half in ${checked ? 'dark' : 'light'} mode`,
  );
  await expect(mode).toBeFocused();
  const focus = await mode.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      visible: button.matches(':focus-visible'),
      color: style.outlineColor,
      width: style.outlineWidth,
      style: style.outlineStyle,
    };
  });
  assert(
    focus.visible && parseFloat(focus.width) > 0 && focus.style === 'solid',
  );
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const node = nodes.find(
      (entry) =>
        entry.role?.value === 'switch' && entry.name?.value === 'Dark mode',
    );
    assert(node, 'The browser accessibility tree must expose the mode switch');
    const state = node.properties?.find((entry) => entry.name === 'checked')
      ?.value.value;
    assert.equal(state, String(checked));
    await writeFile(
      output,
      JSON.stringify(
        {
          role: node.role?.value,
          name: node.name?.value,
          checked: state,
          visibleLabel: checked ? 'Dark' : 'Light',
          thumbCenter,
          trackWidth: track.width,
          focus,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await session.detach();
  }
}

/** Serve a test-only variation through the real gallery's manifest and assets. */
export async function checkGalleryModes(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  const tokens = await modeFixture();
  const dark = resolveTokens(tokens, 'dark').color as Record<string, string>;
  const css = renderTokens(
    tokens,
    'Mode fixture',
    await renderFontFaces(tokens, path.resolve(import.meta.dirname, '../..')),
    'mono-editorial',
  );
  await mkdir(evidence, { recursive: true });
  for (const width of [1365, 390]) {
    const page = await browser.newPage({
      baseURL: origin,
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.route('**/r/languages.json', async (route) => {
        const response = await route.fetch();
        const languages = (await response.json()) as Array<{
          slug: string;
          modes: string[];
        }>;
        languages.find(
          (language) => language.slug === 'mono-editorial',
        )!.modes = ['light', 'dark'];
        await route.fulfill({ response, json: languages });
      });
      await page.route(
        '**/registry/languages/mono-editorial/tokens.css',
        (route) => route.fulfill({ contentType: 'text/css', body: css }),
      );
      await page.route(
        '**/registry/languages/mono-editorial/tokens.json',
        (route) => route.fulfill({ json: tokens }),
      );
      await page.goto('/l/mono-editorial');
      const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
      await expect(mode).not.toBeChecked();
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
      const inputPreview = page.locator('[data-nx-preview="shared/input"]');
      await inputPreview.scrollIntoViewIfNeeded();
      const input = inputPreview.getByRole('searchbox', {
        name: 'Search components',
      });
      await input.fill('Preserved gallery input');
      const inputNode = await input.elementHandle();
      const chart = page.locator(
        '[data-nx-preview="mono-editorial/hairline-line"]',
      );
      await chart.scrollIntoViewIfNeeded();
      await expect(chart).toHaveAttribute('data-nx-preview-state', 'ready', {
        timeout: 20_000,
      });
      await page.mouse.move(0, 0);
      const svg = chart.locator('.recharts-surface').first();
      await svg.focus();
      await svg.press('ArrowRight');
      await expect(chart.getByRole('status')).toContainText('JUN 2:');
      const chartNode = await svg.elementHandle();
      await mode.scrollIntoViewIfNeeded();
      await mode.focus();
      await checkModeSwitch(
        page,
        false,
        path.join(evidence, `gallery-switch-light-${width}.json`),
      );
      await page.screenshot({
        path: path.join(evidence, `gallery-light-${width}.png`),
      });
      await page.keyboard.press('Space');
      await checkModeSwitch(
        page,
        true,
        path.join(evidence, `gallery-switch-dark-${width}.json`),
      );
      await page.keyboard.press('Enter');
      await expect(mode).not.toBeChecked();
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
      await page.keyboard.press('Space');
      await expect(mode).toBeChecked();
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
      assert(await input.evaluate((node, saved) => node === saved, inputNode));
      assert(await svg.evaluate((node, saved) => node === saved, chartNode));
      await expect(input).toHaveValue('Preserved gallery input');
      await expect(
        page
          .getByRole('region', { name: 'UI colors' })
          .locator(`li[title^="${dark.bg}"]`),
      ).toHaveCount(1);
      const resolved = await page.evaluate(() => {
        const chart = document.querySelector(
          '[data-nx-chart="hairline-line"]',
        )!;
        return {
          shell: getComputedStyle(document.body).backgroundColor,
          chart: getComputedStyle(chart).backgroundColor,
        };
      });
      assert.equal(resolved.shell, resolved.chart);
      await page.screenshot({
        path: path.join(evidence, `gallery-dark-${width}.png`),
      });
      await chart.scrollIntoViewIfNeeded();
      await svg.focus();
      // Recharts hides its tooltip on blur; the next arrow reveals whether its
      // keyboard index survived while focus moved to the mode switch.
      await svg.press('ArrowRight');
      await expect(chart.getByRole('status')).toContainText('JUN 3:');
      await page.screenshot({
        path: path.join(evidence, `gallery-dark-chart-${width}.png`),
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(chart.locator('[data-nx-chart]')).toHaveAttribute(
        'data-nx-animated',
        'false',
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.goto('/l/mono-editorial/input');
      await expect(mode).not.toBeChecked();
      await mode.click();
      await expect(mode).toBeChecked();
      await expect(page.locator('[data-nx-preview="shared/input"]')).toHaveCSS(
        'color-scheme',
        'dark',
      );
      await page.goto('/l/nocturne');
      await expect(page.locator('h1').first()).toHaveText('Nocturne');
      await expect(mode).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute(
        'data-nx-mode',
        'light',
      );
      await page.goto('/l/nocturne/input');
      await expect(page.locator('h1').first()).toHaveText('Input');
      await expect(mode).toHaveCount(0);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
  await checkHearthGallery(browser, origin, evidence);
  await checkGalleryModeLayout(browser, origin, evidence);
  console.log(
    'Gallery modes: active shell/palette, retained native/chart state, keyboard selection, mobile and reduced motion',
  );
}

/** Check the shipped two-mode language without substituting a fixture palette. */
async function checkHearthGallery(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  for (const width of [1365, 390]) {
    const page = await browser.newPage({
      baseURL: origin,
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto('/l/hearth');
      const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
      await expect(mode).not.toBeChecked();
      await expect(
        page
          .getByRole('complementary', { name: 'Language tokens' })
          .locator('svg line'),
      ).toHaveCount(2);
      const inputPreview = page.locator('[data-nx-preview="shared/input"]');
      await inputPreview.scrollIntoViewIfNeeded();
      const input = inputPreview.getByRole('searchbox', {
        name: 'Search components',
      });
      await input.fill('Hearth gallery state');
      const savedInput = await input.elementHandle();
      const chart = page.locator('[data-nx-preview="hearth/hearth-bars"]');
      await chart.scrollIntoViewIfNeeded();
      await expect(chart).toHaveAttribute('data-nx-preview-state', 'ready', {
        timeout: 20_000,
      });
      const svg = chart.locator('.recharts-surface').first();
      const savedChart = await svg.elementHandle();
      for (const selection of ['light', 'dark']) {
        await mode.scrollIntoViewIfNeeded();
        await mode.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        if (selection === 'dark') await page.keyboard.press('Space');
        await checkModeSwitch(
          page,
          selection === 'dark',
          path.join(evidence, `hearth-switch-${selection}-${width}.json`),
        );
        await expect(page.locator('html')).toHaveCSS('color-scheme', selection);
        await expect(input).toHaveValue('Hearth gallery state');
        assert(
          await input.evaluate((node, saved) => node === saved, savedInput),
        );
        assert(await svg.evaluate((node, saved) => node === saved, savedChart));
        const paints = await page.evaluate(() => {
          const frame = document.querySelector(
            '[data-nx-chart="hearth-bars"]',
          )!;
          return {
            bg: getComputedStyle(document.body).backgroundColor,
            chart: getComputedStyle(frame).backgroundColor,
            ink: getComputedStyle(frame).getPropertyValue('--nx-ink').trim(),
          };
        });
        assert.equal(paints.bg, paints.chart);
        assert.equal(
          paints.ink.toUpperCase(),
          selection === 'light' ? '#352B24' : '#EDE2CF',
        );
        await mode.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.screenshot({
          path: path.join(evidence, `hearth-gallery-${selection}-${width}.png`),
        });
        await chart.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: path.join(
            evidence,
            `hearth-gallery-charts-${selection}-${width}.png`,
          ),
        });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await svg.focus();
      await svg.press('ArrowLeft');
      await expect(chart.getByRole('status')).toContainText('Protein');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(chart.locator('[data-nx-chart]')).toHaveAttribute(
        'data-nx-animated',
        'true',
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(chart.locator('[data-nx-chart]')).toHaveAttribute(
        'data-nx-animated',
        'false',
      );
      for (const slug of ['input', 'hearth-bars']) {
        await page.goto(`/l/hearth/${slug}`);
        const preview = page.locator('[data-nx-preview]').first();
        await expect(preview).toHaveAttribute('data-nx-preview-state', 'ready');
        const content =
          slug === 'input'
            ? preview.getByRole('searchbox', { name: 'Search components' })
            : preview.locator('.recharts-surface').first();
        if (slug === 'input') await content.fill('Hearth component state');
        const specimen = await content.elementHandle();
        for (const selection of ['light', 'dark']) {
          await mode.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          if (selection === 'dark') await page.keyboard.press('Enter');
          await checkModeSwitch(
            page,
            selection === 'dark',
            path.join(
              evidence,
              `hearth-${slug}-switch-${selection}-${width}.json`,
            ),
          );
          await expect(preview).toHaveCSS('color-scheme', selection);
          assert(
            await content.evaluate((node, saved) => node === saved, specimen),
          );
          if (slug === 'input')
            await expect(content).toHaveValue('Hearth component state');
          await page.screenshot({
            path: path.join(
              evidence,
              `hearth-${slug}-${selection}-${width}.png`,
            ),
          });
        }
        const thumb = mode.locator('[aria-hidden="true"] > span').first();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await expect(thumb).toHaveCSS('transition-duration', '0.14s');
        await expect(thumb).not.toHaveCSS('transition-property', 'none');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(thumb).toHaveCSS('transition-property', 'none');
        await mode.click();
        await expect(mode).not.toBeChecked();
        await expect(preview).toHaveCSS('color-scheme', 'light');
        await page.emulateMedia({ forcedColors: 'active' });
        for (const checked of [false, true]) {
          if (checked) await mode.click();
          const colors = await thumb.evaluate((node) => ({
            thumb: getComputedStyle(node).backgroundColor,
            track: getComputedStyle(node.parentElement!).backgroundColor,
            text: getComputedStyle(node.closest('button')!).color,
          }));
          assert.notEqual(colors.thumb, colors.track);
          assert.notEqual(colors.thumb, 'rgba(0, 0, 0, 0)');
          assert.equal(colors.thumb, colors.text);
        }
        await page.screenshot({
          path: path.join(
            evidence,
            `hearth-${slug}-forced-colors-${width}.png`,
          ),
        });
        await page.emulateMedia({ forcedColors: 'none' });
      }
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
}
