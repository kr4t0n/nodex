/**
 * Conformance checks for a component against a design language.
 *
 * This lives in the CLI and is imported by `scripts/build-registry.mjs`, so the
 * registry and a consumer's project are held to the same rules by the same
 * code. They used to be separate — the registry had checks and a consumer had
 * none — and `DESIGN.md` described enforcement that only existed on one side of
 * the line.
 *
 * Deliberately free of imports so the published CLI keeps zero dependencies.
 * Pure functions over strings: no file reads, no network, no process exit.
 */

export interface LanguageRules {
  /** Legal colours: `ramp.steps` plus the semantic `color` values. */
  palette: string[];
  /** `stroke.lineMax` in px. */
  lineMax: number;
}

export type Severity = 'error' | 'warning';

export interface Finding {
  rule: 'palette' | 'stroke' | 'motion' | 'determinism';
  severity: Severity;
  message: string;
}

export interface Source {
  /** Component markup, if any. */
  html?: string;
  css?: string;
  js?: string;
}

export interface LintOptions {
  /**
   * The stroke IS the area and its width encodes magnitude, so thinning it
   * would destroy information. Ribbons, bands, and violins.
   */
  strokeAsArea?: boolean;
}

/** A stroke-width assignment and the widths it can be shown to produce. */
interface StrokeUse {
  raw: string;
  widths: number[];
  /** True when the expression is beyond static reasoning. */
  unverifiable: boolean;
}

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/;

function asNumber(text: string): number | undefined {
  const t = text.trim();
  if (!NUMBER.test(t)) return undefined;
  return Number.parseFloat(t);
}

/**
 * Read the value of every `stroke-width` assignment.
 *
 * The previous implementation matched `'stroke-width'\s*:\s*([0-9.]+)`, which
 * requires a digit immediately after the colon. Widths are routinely written as
 * a ternary — `isHero?2:.65` — so it matched none of those and five components
 * shipped a 2px mark under a 1.4px ceiling without the build noticing.
 *
 * Both branches of a ternary are read. Anything else is reported as
 * unverifiable rather than guessed at, because `.6+rnd(i+3,j+11)*.9` contains
 * `3` and `11` as function arguments and "largest number wins" would call that
 * an 11px stroke.
 */
export function strokeUses(source: string): StrokeUse[] {
  const uses: StrokeUse[] = [];
  // Quoted attribute form only. A `stroke-width:3px` inside a style string is a
  // paint-order halo behind text, which is legibility rather than a data mark.
  const re = /['"]stroke-width['"]\s*:\s*/g;

  for (let m = re.exec(source); m; m = re.exec(source)) {
    const start = m.index + m[0].length;
    let depth = 0;
    let end = start;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0) break;
        depth--;
      } else if (ch === ',' && depth === 0) break;
    }
    const raw = source.slice(start, end).trim();
    if (!raw) continue;

    const literal = asNumber(raw);
    if (literal !== undefined) {
      uses.push({ raw, widths: [literal], unverifiable: false });
      continue;
    }

    // A ternary at depth zero: take the two branches.
    const branches = ternaryBranches(raw);
    if (branches) {
      const a = asNumber(branches[0]);
      const b = asNumber(branches[1]);
      if (a !== undefined && b !== undefined) {
        uses.push({ raw, widths: [a, b], unverifiable: false });
        continue;
      }
    }

    uses.push({ raw, widths: [], unverifiable: true });
  }
  return uses;
}

/** Split `cond ? a : b` on its top-level `?` and `:`. */
function ternaryBranches(expr: string): [string, string] | undefined {
  let depth = 0;
  let q = -1;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === '?' && depth === 0) {
      q = i;
      break;
    }
  }
  if (q === -1) return undefined;

  depth = 0;
  for (let i = q + 1; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === '?' && depth === 0) return undefined; // nested, give up
    else if (ch === ':' && depth === 0) {
      return [expr.slice(q + 1, i), expr.slice(i + 1)];
    }
  }
  return undefined;
}

/** Every six-digit hex literal, uppercased. */
export function hexLiterals(source: string): string[] {
  return [...source.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) =>
    m[0].toUpperCase(),
  );
}

export function lint(
  source: Source,
  rules: LanguageRules,
  options: LintOptions = {},
): Finding[] {
  const findings: Finding[] = [];
  const css = source.css ?? '';
  const js = source.js ?? '';
  const drawn = `${js}\n${css}`;

  // Anything that animates needs an escape hatch. Vestibular disorders are not
  // a preference, and the guard costs three lines.
  if (/animation\s*:/.test(css) && !/prefers-reduced-motion/.test(css)) {
    findings.push({
      rule: 'motion',
      severity: 'error',
      message: 'animates but ships no prefers-reduced-motion guard',
    });
  }

  if (!options.strokeAsArea) {
    const uses = strokeUses(drawn);
    const over = [
      ...new Set(
        uses.flatMap((u) => u.widths).filter((w) => w > rules.lineMax),
      ),
    ];
    if (over.length > 0) {
      findings.push({
        rule: 'stroke',
        severity: 'error',
        message:
          `stroke-width ${over.join(', ')} exceeds lineMax ${rules.lineMax}px. ` +
          'If the stroke is the area rather than an outline, declare strokeAsArea',
      });
    }
    for (const u of uses.filter((x) => x.unverifiable)) {
      findings.push({
        rule: 'stroke',
        severity: 'warning',
        message:
          `stroke-width "${u.raw}" cannot be checked statically. ` +
          'Bound it with a literal, or declare strokeAsArea if the stroke is the area',
      });
    }
  }

  // Marks are drawn imperatively with literal hex, so there is no var() to
  // check. Membership of the recorded ramp is the next best thing: it freezes
  // today's palette and catches an addition.
  const legal = new Set(rules.palette.map((c) => c.toUpperCase()));
  const strays = [...new Set(hexLiterals(drawn))].filter((h) => !legal.has(h));
  if (strays.length > 0) {
    findings.push({
      rule: 'palette',
      severity: 'error',
      message: `colour(s) outside the language's ramp: ${strays.join(', ')}`,
    });
  }

  // Sample data must reproduce, or a preview and a screenshot of it disagree
  // and no visual diff means anything.
  if (/Math\.random\s*\(/.test(js)) {
    findings.push({
      rule: 'determinism',
      severity: 'error',
      message: 'uses Math.random(); use a deterministic hash so previews reproduce',
    });
  }

  return findings;
}

/** Build the rule set a language's tokens.json implies. */
export function rulesFromTokens(tokens: {
  ramp?: { steps?: string[] };
  color?: Record<string, unknown>;
  stroke?: { lineMax?: string };
}): LanguageRules {
  const palette = [
    ...(tokens.ramp?.steps ?? []),
    ...Object.entries(tokens.color ?? {})
      // `$comment` keys are documentation, not colours.
      .filter(([k]) => !k.startsWith('$'))
      .map(([, v]) => String(v)),
  ].filter((c) => /^#[0-9A-Fa-f]{6}$/.test(c));

  return {
    palette,
    lineMax: Number.parseFloat(tokens.stroke?.lineMax ?? '1.4'),
  };
}
