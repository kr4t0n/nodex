import process from 'node:process';

/**
 * Output helpers.
 *
 * Colour is opt-out via NO_COLOR and auto-disabled when not a TTY, because this
 * CLI is expected to be run by coding agents as often as by people and escape
 * codes in a captured log are noise.
 */
const useColor =
  process.stdout.isTTY === true && !process.env.NO_COLOR && !process.env.CI;

const wrap = (open: string) => (text: string) =>
  useColor ? `\u001B[${open}m${text}\u001B[0m` : text;

export const bold = wrap('1');
export const dim = wrap('2');
export const underline = wrap('4');

export function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

export function err(line: string): void {
  process.stderr.write(`${line}\n`);
}

export function heading(text: string): void {
  out();
  out(bold(text));
}

/** Left-aligned two-column list, used for every listing the CLI prints. */
export function rows(pairs: Array<[string, string]>, indent = '  '): void {
  const width = Math.max(0, ...pairs.map(([left]) => left.length));
  for (const [left, right] of pairs) {
    out(`${indent}${left.padEnd(width)}  ${dim(right)}`);
  }
}

export function fail(message: string): never {
  err(`\n${message}\n`);
  process.exit(1);
}
