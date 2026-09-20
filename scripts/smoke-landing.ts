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
  await expect(section.getByRole('button')).toBeEnabled({ timeout: 15_000 });
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
    await assertTheme(page, 'signal-console');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const pausedText = await page.locator('[data-cli-command]').allTextContents();
    await delay(400);
    assert.deepEqual(await page.locator('[data-cli-command]').allTextContents(), pausedText, 'Pause must stop typing');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await assertTheme(page, 'neo-brutalism');
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
    const recalled = samples.indexOf('$nodex init signal-console');
    assert(recalled >= 0, 'The previous command must be recalled');
    assert(samples.slice(recalled + 1).some((text) => text.startsWith('$nodex init ') && text.length < '$nodex init signal-console'.length), 'The language argument must visibly be deleted');
    assert(samples.includes('$nodex init neo-brutalism --force'), 'The replacement command must include --force');
    await assertFits(page);

    await expect.poll(() => page.locator('iframe').evaluateAll((frames) => frames.length > 0 && frames.every((frame) => frame.getAttribute('src')?.includes('/neo-brutalism/'))), { timeout: 15_000 }).toBe(true);
    await openTerminal(page);
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    await expect(page.locator('[data-cli-command]').first()).not.toHaveText('$nodex list');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('[data-terminal-state]')).toHaveAttribute('data-terminal-state', 'idle');
    const mark = await page.locator('h1').boundingBox();
    assert(mark && mark.x >= 0 && mark.x + mark.width <= 1366, 'The restored hero must fit');

    await openTerminal(page);
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/login');
    await delay(5000);
    await expect(page.locator('html')).not.toHaveAttribute('data-nx-landing-language');
    await expect(page.locator('style[data-nx-landing-tokens]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-nx-language', 'mono-editorial');
    await context.close();
    console.log('Landing animation: typing, deletion, real themes, belt, pause/replay and navigation passed');

    const mobile = await browser.newContext({ baseURL: origin, viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' });
    const small = await mobile.newPage();
    small.on('pageerror', (error) => errors.push(error.message));
    await small.goto('/');
    await openTerminal(small);
    await assertTheme(small, 'neo-brutalism');
    await assertFits(small);
    await expect(small.locator('[data-cli-command]').last()).toHaveText('$nodex init neo-brutalism --force');
    const switcher = small.getByRole('button', { name: 'Switch language', exact: true });
    await switcher.focus();
    await switcher.press('Enter');
    await assertTheme(small, 'signal-console');
    await switcher.press('Enter');
    await assertTheme(small, 'neo-brutalism');
    await small.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(small.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await small.emulateMedia({ reducedMotion: 'reduce' });
    await expect(switcher).toBeVisible();
    await expect(small.locator('[data-cli-command]').last()).toHaveText('$nodex init neo-brutalism --force');
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
