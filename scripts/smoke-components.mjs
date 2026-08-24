/**
 * Prove every component actually runs and draws.
 *
 * Syntax-checking `component.js` only proves it parses. This mounts each one in
 * a real DOM and asserts it produced marks, which is the check that catches a
 * bad extraction: a chart whose helpers were tree-shaken too aggressively, or
 * whose mount node was renamed wrong, parses fine and draws nothing.
 *
 * Permanent tooling, not throwaway. It began as an extraction check but it is
 * the only thing proving a component still works after anyone edits it, so it
 * runs in CI.
 *
 * IntersectionObserver is stubbed to fire immediately, since the components draw
 * on scroll into view. ECharts is stubbed with a recorder, so ECharts-backed
 * components are checked for "ran without throwing and called setOption" rather
 * than for pixels.
 *
 * Usage: node scripts/smoke-components.mjs
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const LANGUAGE = process.env.NODEX_LANGUAGE ?? 'mono-editorial';
const EXPRESSIVE = path.join(
  ROOT,
  'registry',
  'languages',
  LANGUAGE,
  'expressive',
);

function makeEchartsStub(record) {
  const instance = {
    clear() {},
    setOption(opt) {
      record.setOptionCalls += 1;
      record.lastOption = opt;
    },
    resize() {},
    on() {},
    dispatchAction() {},
    getZr: () => ({ on() {} }),
  };
  return {
    init: () => {
      record.initCalls += 1;
      return instance;
    },
    getInstanceByDom: () => null,
    graphic: {
      LinearGradient: class {
        constructor(...args) {
          this.args = args;
        }
      },
    },
    registerMap() {
      record.registerMapCalls += 1;
    },
    color: {},
  };
}

async function run(slug) {
  const dir = path.join(EXPRESSIVE, slug);
  const meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'));
  const fragment = await readFile(path.join(dir, 'component.html'), 'utf8');

  const dom = new JSDOM(
    `<!doctype html><html><body><div id="host">${fragment}</div></body></html>`,
    { pretendToBeVisual: true, runScripts: 'outside-only' },
  );
  const { window } = dom;

  // Draw immediately instead of waiting for scroll.
  window.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe(node) {
      this.cb([{ isIntersecting: true, target: node }], this);
    }
    disconnect() {}
    unobserve() {}
  };

  const record = {
    initCalls: 0,
    setOptionCalls: 0,
    registerMapCalls: 0,
    lastOption: null,
  };
  window.echarts = makeEchartsStub(record);

  // The components are authored against browser globals. These are installed
  // and deliberately NOT restored afterwards: several charts finish drawing in
  // a promise or a timer, so tearing the globals down at the end of mount()
  // makes late work fail with a misleading error.
  for (const key of [
    'window',
    'document',
    'IntersectionObserver',
    'echarts',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'getComputedStyle',
    'Element',
    'SVGElement',
    'Node',
  ]) {
    globalThis[key] =
      key === 'window' ? window : (window[key] ?? globalThis[key]);
  }
  globalThis.addEventListener = window.addEventListener.bind(window);
  globalThis.setInterval = window.setInterval.bind(window);
  globalThis.clearInterval = window.clearInterval.bind(window);
  // Charts that fetch geo data at runtime: resolve to an empty feature set so
  // the code path runs without reaching the network.
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ type: 'FeatureCollection', features: [] }),
  });

  const errors = [];
  let skipped = false;
  try {
    const mod = await import(
      `${path.join(dir, 'component.js')}?v=${Date.now()}`
    );
    const root = window.document.getElementById('host');
    mod.mount(root);

    const mounts = [...root.querySelectorAll('[data-nx-mount]')];
    const drew = mounts.some((m) => m.childElementCount > 0);

    if (meta.externalData?.length) {
      // These build their chart inside a fetch chain against a third-party
      // host, so drawing cannot be proven offline. Assert only that mounting
      // did not throw; vendoring the geo data would make them verifiable.
      skipped = true;
    } else if (meta.runtime === 'svg') {
      if (mounts.length === 0) errors.push('no [data-nx-mount] element');
      else if (!drew) errors.push('mount node has no child elements — drew nothing');
    } else {
      if (record.initCalls === 0) errors.push('echarts.init was never called');
      else if (record.setOptionCalls === 0)
        errors.push('setOption was never called');
    }
  } catch (error) {
    errors.push(
      `threw: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
    );
  }

  // Let promise-based work settle so its errors are attributed to this
  // component rather than crashing the run later. The choropleths chain
  // fetch -> json -> registerMap -> init, so one tick is not enough.
  for (let i = 0; i < 4; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Several charts stream via setInterval. Closing the jsdom window clears its
  // timers; without this the event loop never drains and the run hangs.
  window.close();

  return { slug, runtime: meta.runtime, errors, skipped, external: meta.externalData };
}

// A chart that finishes drawing asynchronously can reject after mount returns.
// Capture rather than crash, so one bad component does not hide the other 63.
const lateErrors = [];
process.on('unhandledRejection', (reason) => {
  lateErrors.push(reason instanceof Error ? reason.message : String(reason));
});

const slugs = (await readdir(EXPRESSIVE, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const results = [];
for (const slug of slugs) {
  results.push(await run(slug));
}

const failed = results.filter((r) => r.errors.length > 0);
const unverifiable = results.filter((r) => r.skipped && r.errors.length === 0);
const passed = results.length - failed.length - unverifiable.length;

for (const r of failed) {
  console.log(`FAIL  ${r.slug.padEnd(24)} [${r.runtime}]  ${r.errors.join('; ')}`);
}
const external = results.filter((r) => r.external?.length);
if (external.length > 0) {
  console.log('\ncomponents fetching data at runtime:');
  for (const r of external) {
    console.log(`  ${r.slug}: ${r.external.join(', ')}`);
  }
}

if (unverifiable.length > 0) {
  console.log(
    `\n${unverifiable.length} component(s) mounted cleanly but cannot be proven ` +
      `to draw offline (they build inside a runtime fetch):`,
  );
  console.log(unverifiable.map((r) => `  ${r.slug}`).join('\n'));
}

console.log(
  `\n${passed}/${results.length} components mounted and drew` +
    (failed.length ? `  —  ${failed.length} failing` : ''),
);
if (lateErrors.length > 0) {
  console.log(`\n${lateErrors.length} late (async) error(s):`);
  console.log([...new Set(lateErrors)].map((e) => `  ${e}`).join('\n'));
}
if (failed.length > 0) process.exitCode = 1;
