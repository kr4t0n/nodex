/** Browser regression for the landing's terminal, real themes and navigation. */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium, expect, type Page } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const WEB = path.join(ROOT, 'apps/web');
let server: ChildProcess | undefined;

async function startSite(): Promise<string> {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const address = socket.address();
  assert(address && typeof address !== 'string');
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const origin = `http://127.0.0.1:${address.port}`;
  const next = createRequire(path.join(WEB, 'package.json')).resolve('next/dist/bin/next');
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(address.port)], {
    cwd: WEB, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let startupError: Error | undefined;
  server.on('error', (error) => { startupError = error; });
  for (const stream of [server.stdout, server.stderr]) {
    stream?.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-8000); });
  }
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`Next exited before becoming ready:\n${output}`);
    const response = await fetch(origin).catch(() => undefined);
    if (response?.ok) return origin;
    await delay(200);
  }
  throw new Error(`Next did not start. Build the web app before this check.\n${output}`);
}

async function stopSite() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const exited = once(server, 'exit');
  server.kill('SIGTERM');
  await Promise.race([exited, delay(5000, undefined, { ref: false })]);
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL');
    await exited;
  }
}

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

async function main() {
  const origin = process.argv[2] ?? await startSite();
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
    await expect(page.locator('iframe')).toHaveCount(0);

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
    const command = page.getByRole('textbox', { name: 'Terminal command', exact: true });
    await expect(command).toBeEnabled();
    await expect(command).not.toBeFocused();
    await expect(page.getByRole('button', { name: /^(Replay|Play|Pause)$/ })).toHaveCount(0);
    const recalled = samples.indexOf('$nodex init signal-console');
    assert(recalled >= 0, 'The previous command must be recalled');
    assert(samples.slice(recalled + 1).some((text) => text.startsWith('$nodex init ') && text.length < '$nodex init signal-console'.length), 'The language argument must visibly be deleted');
    assert(samples.includes('$nodex init neo-brutalism --force'), 'The replacement command must include --force');
    await assertFits(page);

    await expect.poll(() => page.locator('iframe').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.getAttribute('src')?.includes('/neo-brutalism/'))), { timeout: 15_000 }).toBe(true);
    const completedText = await page.locator('[data-terminal-entry]').allTextContents();
    assert.equal(completedText.length, 3, 'The interactive history must retain all three demo commands');
    await returnToHero(page, 'neo-brutalism');
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'interactive');
    await openTerminal(page);
    assert.deepEqual(await page.locator('[data-terminal-entry]').allTextContents(), completedText, 'Scrolling must preserve the completed transcript');
    await command.fill('nodex init mono-editorial');
    await returnToHero(page, 'neo-brutalism');
    await openTerminal(page);
    await expect(command).toHaveValue('nodex init mono-editorial');
    await command.press('Enter');
    await assertTheme(page, 'mono-editorial');
    await expect(command).toHaveValue('');
    await expect(page.locator('[data-terminal-entry]').last()).toContainText('Switched to Mono Editorial');
    await command.fill('nodex init ');
    await command.press('ArrowUp');
    await expect(command).toHaveValue('nodex init mono-editorial');
    await command.press('ArrowDown');
    await expect(command).toHaveValue('nodex init ');

    await command.fill('nodex init missing-language');
    await command.press('Enter');
    await expect(page.locator('[data-terminal-entry]').last()).toContainText('Unknown language: missing-language');
    await assertTheme(page, 'mono-editorial');
    await command.fill('nodex init signal-console --unknown');
    await command.press('Enter');
    await expect(page.locator('[data-terminal-entry]').last()).toContainText('Try nodex list or nodex init');
    await assertTheme(page, 'mono-editorial');
    await page.getByRole('button', { name: 'nodex list', exact: true }).click();
    await page.locator('[data-terminal-entry]').last().getByRole('button', { name: 'Apply Signal Console' }).click();
    await assertTheme(page, 'signal-console');
    await expect.poll(() => page.locator('iframe').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.getAttribute('src')?.includes('/signal-console/'))), { timeout: 15_000 }).toBe(true);
    await command.fill('nodex init neo-brutalism --force');
    await page.getByRole('button', { name: 'Run command' }).click();
    await assertTheme(page, 'neo-brutalism');
    await expect(page.locator('[data-cli-command]')).toHaveCount(0);
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/login');
    await delay(5000);
    await expect(page.locator('html')).not.toHaveAttribute('data-nx-landing-language');
    await expect(page.locator('style[data-nx-landing-tokens]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    await context.close();
    console.log('Landing terminal: single playback, interactive commands, history, retained themes, belt and navigation passed');

    const mobile = await browser.newContext({ baseURL: origin, viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' });
    const small = await mobile.newPage();
    small.on('pageerror', (error) => errors.push(error.message));
    await small.goto('/');
    await openTerminal(small);
    await assertTheme(small, 'neo-brutalism');
    await assertFits(small);
    const input = small.getByRole('textbox', { name: 'Terminal command' });
    await expect(input).toBeEnabled();
    await expect(input).not.toBeFocused();
    await expect(small.locator('[data-terminal-entry]').last()).toContainText('nodex init neo-brutalism --force');
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
    await small.getByRole('button', { name: 'nodex list', exact: true }).click();
    await small.locator('[data-terminal-entry]').last().getByRole('button', { name: 'Apply Neo-brutalism' }).click();
    await assertTheme(small, 'neo-brutalism');
    await assertFits(small);
    await mobile.close();
    console.log('Landing accessibility: narrow viewport, keyboard switching and live reduced-motion changes passed');

    const failure = await browser.newPage({ baseURL: origin });
    failure.on('pageerror', (error) => errors.push(error.message));
    await failure.route('**/registry/languages/neo-brutalism/tokens.css', (route) => route.abort());
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

try { await main(); } finally { await stopSite(); }
