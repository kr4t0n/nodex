/** Browser regression for the landing's terminal, real themes and navigation. */
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium, expect, type Page } from '@playwright/test';

import { startSite } from './lib/site.ts';

let site: Awaited<ReturnType<typeof startSite>> | undefined;
interface HandoffMeasurement { height: number; x: number; y: number; reused: boolean; prompts: number; visible: boolean }

async function openTerminal(page: Page) {
  const section = page.locator('[data-landing-terminal]');
  await expect(page.locator('[data-terminal-ready]')).toHaveAttribute('data-terminal-ready', 'true', { timeout: 15_000 });
  await section.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
}

async function assertTheme(page: Page, slug: string) {
  await expect(page.locator('html')).toHaveAttribute('data-nx-language', slug, { timeout: 15_000 });
  const response = await page.request.get(`/registry/languages/${slug}/tokens.json`);
  assert(response.ok());
  const tokens = await response.json() as { color: { bg: string }; radius: { card: string }; font: { faces: Array<{ family: string }> } };
  const rgb = tokens.color.bg.replace('#', '').match(/.{2}/g)!.map((part) => Number.parseInt(part, 16));
  await expect(page.locator('body')).toHaveCSS('background-color', `rgb(${rgb.join(', ')})`);
  await expect(page.locator('html')).toHaveCSS('scrollbar-width', 'thin');
  await expect(page.locator('[data-terminal-state]')).toHaveCSS('border-radius', tokens.radius.card);
  assert((await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)).includes(tokens.font.faces[0]!.family));
}

async function assertFits(page: Page) {
  const bounds = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    header: document.querySelector('header')!.getBoundingClientRect().toJSON(),
    action: document.querySelector('header a')!.getBoundingClientRect().toJSON(),
  }));
  assert(bounds.document <= bounds.viewport, 'The page must not scroll horizontally');
  assert(bounds.action.right <= bounds.viewport && bounds.action.left >= 0, 'Sign in must fit the viewport');
  assert(bounds.action.bottom <= bounds.header.bottom, 'The navbar must contain the themed action');
}

async function returnToHero(page: Page, slug: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  // Let the wordmark's scrub finish and scroll callbacks settle before checking
  // the retained theme and its different font metrics.
  await delay(700);
  await assertTheme(page, slug);
  const viewport = page.viewportSize()!;
  const mark = await page.locator('h1').boundingBox();
  const action = await page.getByRole('link', { name: 'Sign in', exact: true }).boundingBox();
  assert(mark && mark.x >= 0 && mark.x + mark.width <= viewport.width, 'The themed hero wordmark must fit');
  assert(action && action.x >= 0 && action.x + action.width <= viewport.width, 'The themed hero sign-in must fit');
}

async function assertScrollback(page: Page) {
  const history = page.getByRole('region', { name: 'Terminal history' });
  await expect(history).toHaveCSS('scrollbar-width', 'thin');
  await expect(history).toHaveCSS('scrollbar-gutter', 'stable');
  assert(await history.evaluate((element) => element.scrollHeight > element.clientHeight), 'Terminal history must remain scrollable');
  const pageY = await page.evaluate(() => scrollY);
  await history.focus();
  await history.press('Home');
  await expect.poll(() => history.evaluate((element) => element.scrollTop)).toBe(0);
  await history.press('End');
  await expect.poll(() => history.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(1);
  assert.equal(await page.evaluate(() => scrollY), pageY, 'History keyboard scrolling must not move the page');
}

async function main() {
  const origin = process.argv[2] ?? (site = await startSite()).origin;
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ baseURL: origin, viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('[data-landing-terminal] button')).toBeEnabled({ timeout: 15_000 });
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'idle');
    await expect(page.getByRole('textbox', { name: 'Terminal command' })).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    // Outlast Preview's observer fallback: the belt must own this deferral.
    await delay(1600);
    await expect(page.locator('[data-nx-example]')).toHaveCount(0);

    await expect(page.locator('[data-cli-command]')).toHaveCount(3);
    const samples: string[] = [];
    await page.exposeFunction('recordTerminalCommand', (text: string) => { samples.push(text); });
    await page.locator('[data-cli-command]').last().evaluate((element) => {
      const record = (window as typeof window & { recordTerminalCommand: (text: string) => Promise<void> }).recordTerminalCommand;
      new MutationObserver(() => { void record(element.textContent ?? ''); }).observe(element, { subtree: true, childList: true, characterData: true });
    });
    await openTerminal(page);
    await expect(page.locator('[data-cli-command]').first()).toHaveText('$nodex list');
    await returnToHero(page, 'mono-editorial');
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'paused');
    const offscreenText = await page.locator('[data-cli-command]').allTextContents();
    await delay(400);
    assert.deepEqual(await page.locator('[data-cli-command]').allTextContents(), offscreenText, 'Offscreen typing must pause without rewinding');
    await openTerminal(page);
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'playing');
    await assertTheme(page, 'signal-console');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const pausedText = await page.locator('[data-cli-command]').allTextContents();
    await delay(400);
    assert.deepEqual(await page.locator('[data-cli-command]').allTextContents(), pausedText, 'Pause must stop typing');
    await returnToHero(page, 'signal-console');
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'paused');
    await openTerminal(page);
    assert.deepEqual(await page.locator('[data-cli-command]').allTextContents(), pausedText, 'Scrolling must preserve a paused transcript');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await assertTheme(page, 'neo-brutalism');
    // Capture in the browser when the final theme applies. A network assertion
    // can otherwise outlast the brief final frame and read a detached demo.
    await page.locator('[data-cli-command]').last().evaluate(element => {
      const observer = new MutationObserver(() => {
        if (document.documentElement.dataset.nxLanguage !== 'sketchbook') return;
        const body = document.querySelector('[data-terminal-body]')!;
        const bounds = element.querySelector('div')!.getBoundingClientRect();
        const prompts = document.querySelectorAll('[data-cli-command]');
        (window as typeof window & { terminalHandoff?: HandoffMeasurement }).terminalHandoff = {
          height: body.getBoundingClientRect().height, x: bounds.x, y: bounds.y,
          reused: element.isConnected && prompts[prompts.length - 1] === element,
          prompts: prompts.length, visible: bounds.top >= 0 && bounds.bottom <= innerHeight,
        };
        observer.disconnect();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nx-language'] });
    });
    await expect(page.locator('[data-nx-preview]').first()).toHaveAttribute('data-nx-preview', /^neo-brutalism\//);
    await expect(page.locator('[data-cli-command]').last()).toHaveText('$nodex init sketchbook --force', { timeout: 15_000 });
    // Measure after the command applies its theme: each language owns its
    // border widths and fonts. Only the later editor handoff must stay still.
    await assertTheme(page, 'sketchbook');
    const measurement = await page.evaluate(() => (window as typeof window & { terminalHandoff?: HandoffMeasurement }).terminalHandoff);
    assert(measurement, 'The final demo frame must be observed before handoff');
    const demoHeight = measurement.height;
    const demoCommandBounds = measurement;
    assert(measurement.reused, 'Sketchbook must reuse the Neo-brutalism prompt');
    assert.equal(measurement.prompts, 3, 'The demo must retain three prompts');
    assert(measurement.visible, 'The final demo prompt must be visible');
    const command = page.getByRole('textbox', { name: 'Terminal command', exact: true });
    await expect(command).toBeEnabled();
    await expect(command).not.toBeFocused();
    await expect(command).toHaveValue('nodex init sketchbook --force');
    await expect(page.locator('[data-terminal-caret]')).toHaveCSS('animation-name', 'nx-terminal-caret');
    const editorBounds = (await command.boundingBox())!;
    assert(Math.abs(editorBounds.x - demoCommandBounds.x) < 1 && Math.abs(editorBounds.y - demoCommandBounds.y) < 1,
      'The editable command must stay at the final demo command position');
    await expect(page.getByRole('button', { name: /^(Replay|Play|Pause)$/ })).toHaveCount(0);
    for (const [previous, replacement] of [
      ['$nodex init signal-console', '$nodex init neo-brutalism --force'],
      ['$nodex init neo-brutalism --force', '$nodex init sketchbook --force'],
    ] as const) {
      const recalled = samples.indexOf(previous);
      assert(recalled >= 0, 'The previous command must be recalled');
      assert(samples.slice(recalled + 1).some((text) => text.startsWith('$nodex init ') && text.length < previous.length), 'The language argument must visibly be deleted');
      assert(samples.includes(replacement), 'The replacement command must include --force');
    }
    assert.equal((await page.locator('[data-terminal-state] > div').last().boundingBox())!.height, demoHeight, 'The terminal body must keep its height at handoff');
    assert(await page.locator('[data-terminal-entry]').evaluateAll((rows) => rows.every((row) => {
      const viewport = row.closest('[role="region"]')!.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      return bounds.top >= viewport.top && bounds.bottom <= viewport.bottom;
    })), 'All three prompts must fit inside the desktop terminal');
    await assertFits(page);

    await expect.poll(() => page.locator('[data-nx-example]').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.closest('[data-nx-preview]')?.getAttribute('data-nx-preview')?.startsWith('sketchbook/'))), { timeout: 15_000 }).toBe(true);
    const completedText = await page.locator('[data-terminal-entry]').allTextContents();
    assert.equal(completedText.length, 3, 'The editor must retain exactly three visible command rows');
    await expect(page.locator('[data-terminal-entry]').last()).toContainText('nodex init sketchbook --force');
    const pageYBeforeFocus = await page.evaluate(() => scrollY);
    await page.getByText('~/your-app', { exact: true }).click();
    await expect(command).toBeFocused();
    assert.equal(await page.evaluate(() => scrollY), pageYBeforeFocus, 'Clicking the terminal header must not move the page');
    await page.keyboard.press('Backspace');
    await expect(command).toHaveValue('nodex init sketchbook --forc');
    await page.keyboard.press('e');
    await expect(command).toHaveValue('nodex init sketchbook --force');
    const historyText = (await page.locator('[data-terminal-entry]').first().locator('span').last().boundingBox())!;
    await page.mouse.move(historyText.x + 1, historyText.y + historyText.height / 2);
    await page.mouse.down();
    await page.mouse.move(historyText.x + historyText.width - 1, historyText.y + historyText.height / 2, { steps: 8 });
    await page.mouse.up();
    assert((await page.evaluate(() => window.getSelection()?.toString() ?? '')).length > 0, 'Dragging across terminal text must preserve the selection');
    await expect(command).not.toBeFocused();
    await page.locator('[data-terminal-state]').click({ position: { x: 8, y: 80 } });
    await expect(command).toBeFocused();
    await command.press('ArrowUp');
    await expect(command).toHaveValue('nodex init sketchbook --force');
    await command.press('ArrowUp');
    await expect(command).toHaveValue('nodex init neo-brutalism --force');
    await command.press('ArrowDown');
    await command.press('ArrowDown');
    await expect(command).toHaveValue('nodex init sketchbook --force');
    await returnToHero(page, 'sketchbook');
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'interactive');
    await openTerminal(page);
    assert.deepEqual(await page.locator('[data-terminal-entry]').allTextContents(), completedText, 'Scrolling must preserve the completed transcript');
    await command.fill('nodex init mono-editorial');
    await returnToHero(page, 'sketchbook');
    await openTerminal(page);
    await expect(command).toHaveValue('nodex init mono-editorial');
    await command.press('Enter');
    await assertTheme(page, 'mono-editorial');
    await expect(command).toHaveValue('nodex init mono-editorial');
    await expect(page.locator('[data-terminal-output]')).toHaveText('Switched to Mono Editorial');
    await expect(page.locator('[data-terminal-entry]')).toHaveCount(3);
    await command.fill('nodex init ');
    await command.press('ArrowUp');
    await expect(command).toHaveValue('nodex init mono-editorial');
    await command.press('ArrowDown');
    await expect(command).toHaveValue('nodex init ');

    await command.fill('nodex init missing-language');
    await command.press('Enter');
    await expect(page.locator('[data-terminal-output]')).toContainText('Unknown language: missing-language');
    await assertTheme(page, 'mono-editorial');
    await command.fill('nodex init signal-console --unknown');
    await command.press('Enter');
    await expect(page.locator('[data-terminal-output]')).toContainText('Try nodex list or nodex init');
    await assertTheme(page, 'mono-editorial');
    await command.fill('nodex list');
    await command.press('Enter');
    await assertScrollback(page);
    await page.locator('[data-terminal-output]').getByRole('button', { name: 'Apply Signal Console' }).click();
    await assertTheme(page, 'signal-console');
    await expect(command).not.toBeFocused();
    await expect(command).toHaveValue('nodex init signal-console --force');
    await expect.poll(() => page.locator('[data-nx-example]').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.closest('[data-nx-preview]')?.getAttribute('data-nx-preview')?.startsWith('signal-console/'))), { timeout: 15_000 }).toBe(true);
    await command.fill('nodex init neo-brutalism --force');
    await command.press('Enter');
    await assertTheme(page, 'neo-brutalism');
    await command.fill('nodex init sketchbook');
    await command.press('Enter');
    await assertTheme(page, 'sketchbook');
    await expect.poll(() => page.locator('[data-nx-example]').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.closest('[data-nx-preview]')?.getAttribute('data-nx-preview')?.startsWith('sketchbook/'))), { timeout: 15_000 }).toBe(true);
    assert(await page.evaluate(() => [...document.fonts].some((face) => face.family.replace(/["']/g, '') === 'Gaegu' && face.status === 'loaded')), 'The heading face must preload before a language switch');
    await command.fill('nodex init soft-studio');
    await command.press('Enter');
    await assertTheme(page, 'soft-studio');
    await expect.poll(() => page.locator('[data-nx-example]').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.closest('[data-nx-preview]')?.getAttribute('data-nx-preview')?.startsWith('soft-studio/'))), { timeout: 15_000 }).toBe(true);
    assert(await page.evaluate(() => [...document.fonts].some((face) => face.family.replace(/["']/g, '') === 'Manrope' && face.status === 'loaded')), 'Soft Studio typography must preload before switching');
    await command.fill('nodex init nocturne');
    await command.press('Enter');
    await assertTheme(page, 'nocturne');
    await expect.poll(() => page.locator('[data-nx-example]').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.closest('[data-nx-preview]')?.getAttribute('data-nx-preview')?.startsWith('nocturne/'))), { timeout: 15_000 }).toBe(true);
    await expect(page.locator('[data-cli-command]')).toHaveCount(0);
    await expect(page.locator('[data-terminal-entry]')).toHaveCount(3);
    assert.deepEqual((await page.locator('[data-terminal-entry]').allTextContents()).slice(0, 2), completedText.slice(0, 2), 'Edits must preserve the first two command rows');
    assert.equal((await page.locator('[data-terminal-state] > div').last().boundingBox())!.height, demoHeight, 'Repeated commands must not grow the terminal');
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/login');
    await delay(5000);
    await expect(page.locator('html')).not.toHaveAttribute('data-nx-landing-language');
    await expect(page.locator('style[data-nx-landing-tokens]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    await context.close();
    console.log('Landing terminal: single playback, interactive commands, history, retained themes, belt and navigation passed');

    const mobile = await browser.newContext({ baseURL: origin, viewport: { width: 320, height: 740 }, reducedMotion: 'reduce', hasTouch: true });
    const small = await mobile.newPage();
    small.on('pageerror', (error) => errors.push(error.message));
    await small.goto('/');
    await openTerminal(small);
    await assertTheme(small, 'sketchbook');
    await assertFits(small);
    const input = small.getByRole('textbox', { name: 'Terminal command' });
    await expect(input).toBeEnabled();
    await expect(input).not.toBeFocused();
    await expect(input).toHaveValue('nodex init sketchbook --force');
    await small.getByText('~/your-app', { exact: true }).tap();
    await expect(input).toBeFocused();
    await small.keyboard.press('Backspace');
    await expect(input).toHaveValue('nodex init sketchbook --forc');
    await small.keyboard.press('e');
    await expect(small.locator('[data-terminal-entry]')).toHaveCount(3);
    await expect(small.locator('[data-terminal-caret]')).toHaveCSS('animation-name', 'none');
    await expect(small.locator('[data-terminal-entry]').last()).toContainText('nodex init sketchbook --force');
    await assertScrollback(small);
    await input.fill('nodex init signal-console');
    await input.press('Enter');
    await assertTheme(small, 'signal-console');
    await returnToHero(small, 'signal-console');
    await openTerminal(small);
    await assertTheme(small, 'signal-console');
    await input.fill('nodex init mono-');
    const mobileHistory = await small.locator('[data-terminal-entry]').allTextContents();
    await small.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(small.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'interactive');
    await expect(input).toHaveValue('nodex init mono-');
    await assertTheme(small, 'signal-console');
    await small.emulateMedia({ reducedMotion: 'reduce' });
    await expect(input).toHaveValue('nodex init mono-');
    assert.deepEqual(await small.locator('[data-terminal-entry]').allTextContents(), mobileHistory, 'Motion preferences must preserve interactive history');
    await input.fill('nodex init mono-editorial');
    await input.press('Enter');
    await assertTheme(small, 'mono-editorial');
    await input.fill('nodex list');
    await input.press('Enter');
    await small.locator('[data-terminal-output]').getByRole('button', { name: 'Apply Neo-brutalism' }).click();
    await assertTheme(small, 'neo-brutalism');
    await assertFits(small);
    for (const [language, name] of [['mono-editorial', 'Mono Editorial'], ['signal-console', 'Signal Console'], ['neo-brutalism', 'Neo-brutalism'], ['sketchbook', 'Sketchbook'], ['soft-studio', 'Soft Studio'], ['nocturne', 'Nocturne']]) {
      await small.goto(`/l/${language}/button`);
      await expect(small.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
      await small.evaluate(() => document.fonts.ready);
      await expect(small.locator('header').getByRole('link', { name, exact: true })).toBeVisible();
      assert(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}: component navigation must fit at 320px with loaded fonts`);
      const signOut = await small.getByRole('button', { name: 'Sign out', exact: true }).boundingBox();
      assert(signOut && signOut.x + signOut.width <= 320, `${language}: the account action must remain inside the viewport`);
    }
    await small.emulateMedia({ reducedMotion: 'no-preference' });
    await small.goto('/');
    await openTerminal(small);
    await expect(small.locator('[data-cli-command]').last()).toHaveText('$nodex init sketchbook --force', { timeout: 30_000 });
    await assertTheme(small, 'sketchbook');
    const narrowDemo = (await small.locator('[data-cli-command]').last().locator('div').boundingBox())!;
    await expect(input).toHaveValue('nodex init sketchbook --force');
    await expect(input).not.toBeFocused();
    const narrowEditor = (await input.boundingBox())!;
    assert(Math.abs(narrowEditor.x - narrowDemo.x) < 1 && Math.abs(narrowEditor.y - narrowDemo.y) < 1 && Math.abs(narrowEditor.height - narrowDemo.height) < 1,
      'The narrow editor must preserve the demo command position and wrapping');
    await expect(small.locator('[data-terminal-entry]')).toHaveCount(3);
    await mobile.close();
    console.log('Landing accessibility: narrow viewport, keyboard switching and live reduced-motion changes passed');

    const failure = await browser.newPage({ baseURL: origin });
    failure.on('pageerror', (error) => errors.push(error.message));
    await failure.route('**/registry/languages/sketchbook/tokens.css', (route) => route.abort());
    await failure.goto('/');
    await expect(failure.getByText('The demo could not load. Try refreshing the page.')).toBeVisible();
    await expect(failure.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    await failure.close();
    assert.deepEqual(errors, [], 'Landing pages must not raise browser errors');
    console.log('Landing failure state: unavailable token stylesheet leaves the default page usable');
  } finally {
    await browser.close();
  }
}

try { await main(); } finally { await site?.close(); }
