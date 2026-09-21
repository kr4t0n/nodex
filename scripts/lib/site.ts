/** Start the existing production build for browser smoke checks. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function startSite() {
  const web = path.resolve(import.meta.dirname, '../../apps/web');
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const address = socket.address();
  assert(address && typeof address !== 'string');
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const origin = `http://127.0.0.1:${address.port}`;
  const next = createRequire(path.join(web, 'package.json')).resolve('next/dist/bin/next');
  const server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(address.port)], {
    cwd: web, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  async function close() {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await Promise.race([exited, delay(5000, undefined, { ref: false })]);
    if (server.exitCode === null && server.signalCode === null) {
      server.kill('SIGKILL');
      await exited;
    }
  }
  let output = '';
  let startupError: Error | undefined;
  server.on('error', (error) => { startupError = error; });
  for (const stream of [server.stdout, server.stderr]) {
    stream.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-8000); });
  }
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (server.exitCode !== null) throw new Error(`Next exited before becoming ready:\n${output}`);
      const response = await fetch(`${origin}/r/languages.json`).catch(() => undefined);
      if (response?.ok) return { origin, close };
      await delay(200);
    }
    throw new Error(`Next did not start. Build the web app before this check.\n${output}`);
  } catch (error) {
    await close();
    throw error;
  }
}
