import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';

import {
  apiBase,
  awaitApproval,
  startDevice,
  whoami,
} from '../packages/cli/src/device.ts';

test('API bases allow HTTPS and loopback HTTP without credentials or URL suffixes', (t) => {
  const previous = process.env.NODEX_API;
  t.after(() => {
    if (previous === undefined) delete process.env.NODEX_API;
    else process.env.NODEX_API = previous;
  });
  delete process.env.NODEX_API;
  for (const base of [
    'https://accounts.example.test',
    'http://localhost:4180',
    'http://127.0.0.1:4180',
    'http://[::1]:4180',
  ]) {
    assert.equal(apiBase(`${base}///`), base);
  }
  process.env.NODEX_API = 'https://accounts.example.test/prefix/';
  assert.equal(
    apiBase('https://registry.example.test'),
    'https://accounts.example.test/prefix',
  );
  for (const base of [
    'http://remote.example.test',
    'ftp://localhost',
    '/local',
    'https://user@example.test',
    'https://example.test?token=value',
    'https://example.test#fragment',
    'https://example.test?',
    'https://example.test#',
    'https://example.test\\path',
    ' https://example.test',
  ]) {
    process.env.NODEX_API = base;
    assert.throws(
      () => apiBase('https://registry.example.test'),
      /API must use HTTPS/,
    );
  }
});

test('all device operations reject unsafe bases before sending any request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('unexpected fetch');
  });
  const start = {
    deviceCode: randomBytes(32).toString('base64url'),
    userCode: 'ABCD-EFGH',
    verificationUri: 'https://example.test/activate',
    expiresIn: 900,
    interval: 0,
  };
  await assert.rejects(
    startDevice('http://remote.example.test'),
    /API must use HTTPS/,
  );
  await assert.rejects(
    awaitApproval('http://remote.example.test', start),
    /API must use HTTPS/,
  );
  await assert.rejects(
    whoami('http://remote.example.test', randomBytes(32).toString('base64url')),
    /API must use HTTPS/,
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test('device requests never follow same-origin or cross-origin redirects', async () => {
  let redirectedRequests = 0;
  const server = createServer((req, res) => {
    if (req.url === '/capture') {
      redirectedRequests += 1;
      res.end('{}');
    } else {
      res.writeHead(307, { location: '/capture' });
      res.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const api = `http://127.0.0.1:${address.port}`;
  const start = {
    deviceCode: randomBytes(32).toString('base64url'),
    userCode: 'ABCD-EFGH',
    verificationUri: `${api}/activate`,
    expiresIn: 900,
    interval: 0,
  };
  try {
    for (const location of [
      '/capture',
      `http://localhost:${address.port}/capture`,
    ]) {
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        if (req.url === '/capture') {
          redirectedRequests += 1;
          res.end('{}');
        } else {
          res.writeHead(307, { location });
          res.end();
        }
      });
      await assert.rejects(startDevice(api), /Redirects are not allowed/);
      await assert.rejects(
        awaitApproval(api, start),
        /Redirects are not allowed/,
      );
      await assert.rejects(
        whoami(api, randomBytes(32).toString('base64url')),
        /Redirects are not allowed/,
      );
    }
    assert.equal(redirectedRequests, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
