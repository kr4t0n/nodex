import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function fixture(files: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), 'nodex-lint-'));
  for (const config of [
    '.oxlintrc.json',
    'eslint.config.mjs',
    'package.json',
  ]) {
    copyFileSync(join(root, config), join(directory, config));
  }
  symlinkSync(
    join(root, 'node_modules'),
    join(directory, 'node_modules'),
    'junction',
  );
  for (const [file, source] of Object.entries(files)) {
    const target = join(directory, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
  return directory;
}

function lint(directory: string, tool: 'oxlint' | 'eslint') {
  return spawnSync(
    process.execPath,
    [
      join(
        root,
        'node_modules',
        tool,
        'bin',
        tool === 'oxlint' ? 'oxlint' : 'eslint.js',
      ),
      '.',
      '--format',
      'json',
      '--max-warnings',
      '0',
    ],
    { cwd: directory, encoding: 'utf8' },
  );
}

function lintCommand(directory: string) {
  return spawnSync('pnpm', ['run', 'lint'], {
    cwd: directory,
    encoding: 'utf8',
  });
}

test('lint preserves JSX runtime, underscore exemptions, scoped Next rules and generated ignores', (t) => {
  const directory = fixture({
    'registry/valid.tsx': `
      import type { ReactNode } from 'react';
      export function Picture({ label, _unused }: { label: ReactNode; _unused: string }) {
        const _reserved = 1;
        return <figure><img src="/sample.png" alt="Sample" />{label}</figure>;
      }
    `,
    'apps/web/valid.tsx': `
      export const Picture = () => (
        // oxlint-disable-next-line nextjs/no-img-element -- A native image is intentional in this fixture.
        <img src="/sample.png" alt="Sample" />
      );
    `,
    ...Object.fromEntries(
      ['public', 'apps/web/public', 'packages/cli/dist', 'apps/web/.next'].map(
        (folder) => [`${folder}/invalid.tsx`, 'this is not valid source'],
      ),
    ),
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const tool of ['oxlint', 'eslint'] as const) {
    const result = lint(directory, tool);
    assert.equal(
      result.status,
      0,
      `${tool}: ${result.stdout}\n${result.stderr}`,
    );
  }
});

test('Oxlint catches TypeScript, hooks, accessibility and the selected nursery regressions', (t) => {
  const directory = fixture({
    'scripts/invalid.mjs': 'missingName();',
    'registry/invalid.tsx': `
      import { Component, useEffect, useState, ReactNode } from 'react';
      export const unused: any = 1;
      export function Bad({ value }: { value: ReactNode }) {
        if (value) useState(0);
        useEffect(() => { console.log(value); }, []);
        let reading = 1;
        reading = 2;
        console.log(reading == 2);
        return <div role="switch" />;
      }
      export class MissingRender extends Component { render() {} }
    `,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const result = lint(directory, 'oxlint');
  assert.equal(result.status, 1, result.stderr);
  const output = JSON.parse(result.stdout) as {
    diagnostics: { code: string }[];
  };
  const codes = new Set(output.diagnostics.map(({ code }) => code));
  for (const rule of [
    'eslint(no-undef)',
    'eslint(no-useless-assignment)',
    'eslint(eqeqeq)',
    'typescript(no-explicit-any)',
    'typescript(consistent-type-imports)',
    'react-hooks(rules-of-hooks)',
    'react-hooks(exhaustive-deps)',
    'react(require-render-return)',
    'jsx-a11y(role-has-required-aria-props)',
  ]) {
    assert.ok(codes.has(rule), `Missing ${rule}: ${result.stdout}`);
  }
});

test('Next warnings fail Oxlint and ESLint retains only its two coverage gaps', (t) => {
  const directory = fixture({
    'apps/web/warning.tsx':
      'export const Picture = () => <img src="/x.png" alt="Sample" />;',
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const native = lint(directory, 'oxlint');
  assert.equal(native.status, 1, native.stderr);
  const diagnostics = JSON.parse(native.stdout).diagnostics;
  assert.deepEqual(
    diagnostics.map((d: { code: string; severity: string }) => [
      d.code,
      d.severity,
    ]),
    [['next(no-img-element)', 'warning']],
  );
  assert.equal(
    lint(directory, 'eslint').status,
    0,
    'The fallback must not duplicate Next image checks',
  );
  const nativeCommand = lintCommand(directory);
  assert.equal(nativeCommand.status, 1, nativeCommand.stderr);

  writeFileSync(
    join(directory, 'apps/web/warning.tsx'),
    'export const value = 1;',
  );
  writeFileSync(
    join(directory, 'apps/web/navigation.ts'),
    'window.location.assign("/login");',
  );
  const navigation = lint(directory, 'eslint');
  assert.equal(navigation.status, 1, navigation.stderr);
  assert.match(navigation.stderr, /too many warnings/);
  const fallbackCommand = lintCommand(directory);
  assert.equal(fallbackCommand.status, 1, fallbackCommand.stderr);
  assert.match(
    fallbackCommand.stdout,
    /no-location-assign-relative-destination/,
  );
  writeFileSync(
    join(directory, 'apps/web/legacy.tsx'),
    `
    import { Component } from 'react';
    export class Legacy extends Component { componentWillMount() {} render() { return null; } }
  `,
  );
  const fallback = lint(directory, 'eslint');
  const rules = JSON.parse(fallback.stdout).flatMap(
    (file: { messages: { ruleId: string }[] }) =>
      file.messages.map(({ ruleId }) => ruleId),
  );
  assert.deepEqual(rules.sort(), [
    '@next/next/no-location-assign-relative-destination',
    'react/no-deprecated',
  ]);
});
