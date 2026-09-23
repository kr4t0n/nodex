export interface LanguageTokens {
  color?: Record<string, string>;
  ramp?: { steps?: string[] };
  stroke?: { scale?: string[]; lineMax?: string };
}

interface ColorRole {
  key: string;
  label: string;
  usage: string;
}

interface ColorGroup {
  value: string;
  roles: ColorRole[];
}

// Presentation metadata only. Paint always comes from the language's tokens.
// Order puts the page, panels and editable fields first in the UI palette.
const UI_ROLES: ColorRole[] = [
  { key: 'bg', label: 'Page', usage: 'Page background and plain surfaces.' },
  { key: 'surfaceFill', label: 'Panels', usage: 'Cards, dialogs and other framed surfaces.' },
  { key: 'fieldFill', label: 'Fields', usage: 'Inputs, textareas and selects.' },
  { key: 'ink', label: 'Text', usage: 'Primary text, icons and ink marks.' },
  { key: 'muted', label: 'Muted text', usage: 'Supporting text and labels.' },
  { key: 'faint', label: 'Faint text', usage: 'Low-emphasis text and details.' },
  { key: 'border', label: 'Borders', usage: 'Structural outlines around controls and surfaces.' },
  { key: 'grid', label: 'Quiet fills', usage: 'Quiet backgrounds, tracks and chart grids.' },
  { key: 'actionFill', label: 'Actions', usage: 'Solid action backgrounds.' },
  { key: 'actionHoverFill', label: 'Action hover', usage: 'Solid action backgrounds on hover.' },
  { key: 'selectionFill', label: 'Selections', usage: 'Selected controls and switch tracks.' },
  { key: 'badgeFill', label: 'Badges', usage: 'Solid badge backgrounds.' },
  { key: 'valueFill', label: 'Values', usage: 'Progress fills and slider values.' },
  { key: 'valueQuietFill', label: 'Quiet values', usage: 'Quiet progress fills.' },
  { key: 'paper', label: 'Paper', usage: 'Paper surfaces and light contrast paint.' },
  { key: 'dark', label: 'Dark', usage: 'Dark surfaces and contrast paint.' },
  { key: 'onDarkMuted', label: 'Inverse text', usage: 'Supporting text on inverted surfaces.' },
  { key: 'onDarkFaint', label: 'Inverse faint', usage: 'Low-emphasis text on inverted surfaces.' },
  { key: 'actionText', label: 'Action text', usage: 'Text and icons on solid actions.' },
  { key: 'actionBorder', label: 'Action border', usage: 'Solid action outlines.' },
  { key: 'actionHoverBorder', label: 'Hover border', usage: 'Solid action outlines on hover.' },
  { key: 'selectionText', label: 'Selection text', usage: 'Checkbox marks and switch thumbs.' },
  { key: 'badgeText', label: 'Badge text', usage: 'Text on solid badges.' },
];

function colorGroups(tokens: LanguageTokens): { chart: ColorGroup[]; ui: ColorGroup[] } {
  const colors = Object.entries(tokens.color ?? {}).filter(([key]) => !key.startsWith('$'));
  const uiKeys = new Set(UI_ROLES.map(({ key }) => key));
  const roleFor = (key: string): ColorRole => UI_ROLES.find((role) => role.key === key) ?? {
    key,
    label: key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()),
    usage: '',
  };
  const group = (values: string[], roles: ColorRole[]): ColorGroup[] =>
    [...new Set(values)].map((value) => ({
      value,
      roles: roles.filter(({ key }) => tokens.color?.[key] === value),
    }));
  const uiRoles = UI_ROLES.filter(({ key }) => tokens.color?.[key]);

  return {
    // Preserve authored ramp order; include additional chart roles if needed.
    chart: group(
      [...(tokens.ramp?.steps ?? []), ...colors.filter(([key]) => !uiKeys.has(key)).map(([, value]) => value)],
      colors.map(([key]) => roleFor(key)),
    ),
    ui: group(uiRoles.map(({ key }) => tokens.color![key]!), uiRoles),
  };
}

function Swatch({ value, className = 'size-7 shrink-0' }: { value: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`block rounded-[var(--nx-radius-code)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] ${className}`}
      style={{ background: value }}
    />
  );
}

function ColorPalette({ title, groups, description, singleRow = false }: {
  title: string;
  groups: ColorGroup[];
  description: string;
  singleRow?: boolean;
}) {
  if (!groups.length) return null;

  return (
    <section aria-label={title}>
      <h2 className="nx-badge nx-badge--quiet m-0">{title}</h2>
      <ul className={`mt-2 flex list-none gap-[3px] p-0 ${singleRow ? '' : 'flex-wrap'}`}>
        {groups.map(({ value, roles }) => (
          <li key={value} className={singleRow ? 'min-w-0 max-w-7 flex-1' : 'flex'} title={
            `${value}${roles.length ? ` — ${roles.map(({ label }) => label).join(', ')}` : ''}`
          }>
            <Swatch value={value} className={singleRow ? 'aspect-square w-full' : undefined} />
            <span className="sr-only">{value}: {roles.map(({ label }) => label).join(', ')}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[length:var(--nx-type-body-supportingSize)] leading-relaxed text-[var(--nx-muted)]">
        {description}
      </p>
      <details className="mt-2 text-[11px]">
        <summary className="w-fit cursor-pointer py-1 text-[length:var(--nx-type-body-noteSize)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--nx-ink)]">
          Roles and values<span className="sr-only"> for {title.toLowerCase()}</span>
        </summary>
        <dl className="mt-3 space-y-4">
          {groups.map(({ value, roles }) => (
            <div key={value}>
              <dt className="flex items-center gap-2">
                <Swatch value={value} />
                <code className="[font-family:var(--nx-font-mono)]">{value}</code>
              </dt>
              <dd className="mt-2 ml-0 space-y-2">
                {roles.length ? roles.map(({ key, label, usage }) => (
                  <div key={key}>
                    <code className="block [font-family:var(--nx-font-mono)] [overflow-wrap:anywhere]">--nx-{key}</code>
                    <p className="m-0 text-[length:var(--nx-type-body-noteSize)] leading-relaxed text-[var(--nx-muted)]">{usage || label}</p>
                  </div>
                )) : <p className="text-[length:var(--nx-type-body-noteSize)] text-[var(--nx-muted)]">Chart palette color.</p>}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}

/** The complete palette and stroke scale, sourced from canonical language assets. */
export function TokenPanel({ tokens }: { tokens: LanguageTokens }) {
  const { chart, ui } = colorGroups(tokens);
  const strokes = tokens.stroke?.scale ?? [];

  return (
    <aside aria-label="Language tokens" className="nx-card nx-card--plain min-w-0 gap-6 p-0">
      <ColorPalette
        title="Chart colors"
        groups={chart}
        description="Colors for data marks and chart structure; some also serve the UI."
      />
      <ColorPalette
        title="UI colors"
        groups={ui}
        description="Shared colors are grouped. Expand below to see every use."
        singleRow
      />
      <div>
        <h2 className="nx-badge nx-badge--quiet m-0">Stroke scale</h2>
        <svg viewBox="0 0 300 46" className="mt-2 block w-full" aria-hidden>
          {strokes.map((value, i) => {
            const stroke = Number.parseFloat(value);
            const x = 14 + i * (272 / Math.max(strokes.length - 1, 1));
            return (
              <g key={value}>
                <line x1={x} y1={4} x2={x} y2={30} stroke="var(--nx-ink)" strokeWidth={stroke * 3} />
                <text x={x} y={42} fontSize={7} textAnchor="middle" fill="var(--nx-muted)" fontFamily="var(--nx-font-sans)">
                  {value.replace('px', '')}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-[length:var(--nx-type-body-supportingSize)] text-[var(--nx-muted)]">
          Drawn at 3x so sub-pixel widths are visible. Data marks never exceed the
          line maximum.
        </p>
      </div>
    </aside>
  );
}
