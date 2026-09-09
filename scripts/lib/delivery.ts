import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import type { LoadedComponent } from '../../packages/core/src/load.ts';
import type { RegistryItem } from '../../packages/core/src/schema.ts';
import { dependencyPin } from '../../packages/cli/src/install.ts';

export interface DeliveredFile {
  source: string;
  path: string;
  target: string;
  content: string;
  type: RegistryItem['files'][number]['type'];
}

const posix = (value: string) => value.split(path.sep).join('/');
const packageName = (specifier: string) => specifier.startsWith('@')
  ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]!;

/** Parse module specifiers with TypeScript; never infer exports or sample data. */
export function moduleSpecifiers(source: ts.SourceFile): ts.StringLiteralLike[] {
  const literals: ts.StringLiteralLike[] = [];
  const add = (argument: ts.Node | undefined) => {
    if (!argument || !ts.isStringLiteralLike(argument)) throw new Error(`${source.fileName}: module imports must name a literal module`);
    literals.push(argument);
  };
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier);
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) add(node.moduleSpecifier);
    if (ts.isImportTypeNode(node)) {
      add(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return literals;
}

/** Produce the complete, explicit consumer file set with portable local imports. */
export async function prepareDelivery(component: LoadedComponent, registryRoot: string): Promise<DeliveredFile[]> {
  const { meta, dir } = component;
  const resolvedRoot = await realpath(registryRoot);
  const declared = [
    ...meta.files.map((file) => ({ source: path.resolve(dir, file), target: `${meta.slug}/${file}` })),
    ...meta.shared.map((file) => ({ source: path.resolve(registryRoot, '_shared', file), target: `_shared/${file}` })),
  ];
  const targets = new Map(declared.map((file) => [file.source, file.target]));
  const imports = new Map<string, Set<string>>();
  if (targets.size !== declared.length) throw new Error(`${dir}: duplicate declared runtime file`);
  const dependencies = new Set(['react', 'react-dom']);
  const versions = new Map<string, string>();
  for (const dependency of meta.dependencies) {
    const { name, version } = dependencyPin(dependency);
    if (['react', 'react-dom', 'typescript', 'tailwindcss', '@types/react', '@types/react-dom'].includes(name)) throw new Error(`${dir}: ${name} is an application platform dependency`);
    if (versions.has(name) && versions.get(name) !== version) throw new Error(`${dir}: conflicting versions of ${name}`);
    versions.set(name, version);
    dependencies.add(name);
  }
  if (meta.library && !dependencies.has(meta.library)) throw new Error(`${dir}: library ${meta.library} is not a declared dependency`);

  const delivered = await Promise.all(declared.map(async ({ source, target }) => {
    if (!/\.(ts|tsx|css|json)$/.test(source)) throw new Error(`${source}: runtime files must be TypeScript, CSS or JSON`);
    const references = new Set<string>();
    imports.set(source, references);
    const actual = await realpath(source);
    if (!actual.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`${source}: runtime file escapes registry root`);
    let content = await readFile(source, 'utf8');
    if (/\.[cm]?[jt]sx?$/.test(source)) {
      const parsed = ts.createSourceFile(source, content, ts.ScriptTarget.Latest, true);
      const replacements: Array<{ start: number; end: number; value: string }> = [];
      for (const literal of moduleSpecifiers(parsed)) {
        const specifier = literal.text;
        if (!specifier.startsWith('.')) {
          if (!dependencies.has(packageName(specifier))) throw new Error(`${source}: undeclared dependency ${specifier}`);
          continue;
        }
        const base = path.resolve(path.dirname(source), specifier);
        const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
        if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
        const resolved = candidates.find((candidate) => targets.has(candidate));
        if (!resolved) throw new Error(`${source}: ${specifier} is not included in files/shared; examples may not be runtime imports`);
        references.add(resolved);
        const destination = targets.get(resolved)!;
        let relative = path.posix.relative(path.posix.dirname(target), destination).replace(/\.[jt]sx?$/, '');
        if (!relative.startsWith('.')) relative = `./${relative}`;
        replacements.push({ start: literal.getStart(parsed), end: literal.end, value: JSON.stringify(relative) });
      }
      for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
        content = content.slice(0, replacement.start) + replacement.value + content.slice(replacement.end);
      }
    } else if (source.endsWith('.css') && /@import\b|\burl\s*\(/i.test(content.replace(/\/\*[\s\S]*?\*\//g, ''))) {
      throw new Error(`${source}: CSS asset imports are not supported; keep primitive styles self-contained`);
    }
    return {
      source,
      path: `registry/${posix(path.relative(registryRoot, source))}`,
      target,
      content,
      type: target.startsWith('_shared/') ? 'registry:hook' as const
        : source.endsWith('.tsx') ? 'registry:component' as const : 'registry:file' as const,
    };
  }));
  const reachable = new Set<string>();
  function visit(file: string) {
    if (reachable.has(file)) return;
    reachable.add(file);
    for (const dependency of imports.get(file) ?? []) visit(dependency);
  }
  visit(path.resolve(dir, meta.entry));
  const unused = declared.filter((file) => !reachable.has(file.source));
  if (unused.length) throw new Error(`${dir}: unused delivery files: ${unused.map((file) => file.target).join(', ')}`);
  return delivered;
}
