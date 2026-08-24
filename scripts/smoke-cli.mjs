/**
 * End-to-end test for the CLI against a temporary project.
 *
 * The CLI is the surface a coding agent actually touches, so "it worked when I
 * tried it" is not good enough. This exercises the real write path: init, then
 * add across all three component shapes (hand-rolled SVG, ECharts, and a shared
 * primitive), and asserts the files land where nodex.json says they will.
 *
 * Usage: node scripts/smoke-cli.mjs
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, 'packages', 'cli', 'src', 'index.ts');

const failures = [];
const check = (label, ok, detail = '') => {
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ''}`);
};

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function nodex(cwd, args) {
  const { stdout, stderr } = await run(
    process.execPath,
    [CLI, ...args, '--registry', ROOT],
    { cwd, env: { ...process.env, NO_COLOR: '1' } },
  );
  return stdout + stderr;
}

const project = await mkdtemp(path.join(tmpdir(), 'nodex-cli-'));

try {
  // Read commands work with no project at all.
  const list = await nodex(project, ['list']);
  check('list names the language', list.includes('mono-editorial'));

  const search = await nodex(project, ['search', '--tier', 'primitive']);
  for (const name of ['button', 'card', 'badge', 'input', 'select', 'table']) {
    check(`search finds primitive ${name}`, search.includes(name));
  }

  const typed = await nodex(project, ['search', '--type', 'choropleth']);
  check('type filter is exact', typed.includes('choropleth-states'));
  check('type filter excludes others', !typed.includes('barcode-lollipop'));

  // add before init must refuse, because a component with no token layer
  // renders unstyled and silently copying it would be worse than failing.
  let refused = false;
  try {
    await nodex(project, ['add', 'mono-editorial/barcode-lollipop']);
  } catch (error) {
    refused = `${error.stdout ?? ''}${error.stderr ?? ''}`.includes('nodex init');
  }
  check('add before init refuses and points at init', refused);

  // A pre-existing AGENTS.md must be appended to, not clobbered.
  await writeFile(path.join(project, 'AGENTS.md'), '# My App\n\nExisting notes.\n');

  const init = await nodex(project, ['init', 'mono-editorial']);
  check('init reports the language', init.includes('Mono Editorial'));

  const config = JSON.parse(
    await readFile(path.join(project, 'nodex.json'), 'utf8'),
  );
  check('config records the language', config.language === 'mono-editorial');

  for (const file of [
    config.paths.tokens,
    config.paths.design,
    'AGENTS.md',
    'nodex.json',
  ]) {
    check(`init wrote ${file}`, await exists(path.join(project, file)));
  }

  const agents = await readFile(path.join(project, 'AGENTS.md'), 'utf8');
  check('existing AGENTS.md content survived', agents.includes('Existing notes.'));
  check('AGENTS.md gained the language section', agents.includes('Design language:'));

  const tokens = await readFile(path.join(project, config.paths.tokens), 'utf8');
  check('tokens.css defines namespaced variables', tokens.includes('--nx-ink'));

  // init must be idempotent: re-running should not stack a second section.
  await nodex(project, ['init', 'mono-editorial']);
  const agentsAgain = await readFile(path.join(project, 'AGENTS.md'), 'utf8');
  check(
    'init is idempotent on AGENTS.md',
    agentsAgain.split('## Design language:').length === 2,
  );

  // One of each shape: inline SVG, ECharts, and a shared primitive.
  const added = await nodex(project, [
    'add',
    'mono-editorial/barcode-lollipop',
    'mono-editorial/choropleth-states',
    'button',
  ]);
  check('add reports echarts dependency', added.includes('echarts@6'));
  check(
    'add warns about the runtime data fetch',
    added.includes('third party') && added.includes('USA.json'),
  );

  const base = path.join(project, config.paths.components);
  for (const [name, files] of [
    ['barcode-lollipop', ['component.html', 'component.css', 'component.js']],
    ['choropleth-states', ['component.html', 'component.css', 'component.js']],
    ['button', ['component.html', 'component.css']],
  ]) {
    for (const file of files) {
      check(`${name}/${file} landed`, await exists(path.join(base, name, file)));
    }
  }

  const fragment = await readFile(
    path.join(base, 'barcode-lollipop', 'component.html'),
    'utf8',
  );
  check('fragment is not a full document', !fragment.includes('<!doctype'));
  check('fragment carries the scope class', fragment.includes('nx-barcode-lollipop'));
  check('mount points are data attributes', fragment.includes('data-nx-mount'));
  check('no id attributes remain', !/ id="/.test(fragment));

  const js = await readFile(path.join(base, 'barcode-lollipop', 'component.js'), 'utf8');
  check('script exports a root-scoped mount', js.includes('export function mount(root)'));

  // A bare primitive name with no --design must explain itself rather than guess.
  let guided = false;
  try {
    await nodex(project, ['add', 'no-such-component']);
  } catch (error) {
    guided = `${error.stdout ?? ''}${error.stderr ?? ''}`.includes(
      'No component named',
    );
  }
  check('unknown component gives a useful error', guided);

  const perProject = await nodex(project, ['add', 'mono-editorial/ridgeline', '--to', 'src/charts']);
  check('--to overrides the configured directory', perProject.includes('src/charts'));
  check(
    '--to actually wrote there',
    await exists(path.join(project, 'src/charts/ridgeline/component.js')),
  );
} finally {
  await rm(project, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} CLI check(s) failed:\n`);
  console.error(failures.map((f) => `  ${f}`).join('\n'));
  console.error('');
  process.exitCode = 1;
} else {
  console.log('\nCLI end-to-end: all checks passed\n');
}
