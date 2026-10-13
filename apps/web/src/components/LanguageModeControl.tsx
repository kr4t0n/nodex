import type { TokenMode } from '../../../../packages/cli/src/tokens.ts';
import type { Language } from '@/lib/registry.ts';

export function LanguageModeControl({
  language,
  mode,
  onChange,
}: {
  language: Language;
  mode: TokenMode;
  onChange: (mode: TokenMode) => void;
}) {
  if (!language.modes?.some((entry) => entry === 'dark')) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={mode === 'dark'}
      className="group inline-flex shrink-0 cursor-pointer items-center gap-[var(--nx-space-choiceGap)] rounded-[var(--nx-radius-pill)] border-[length:var(--nx-stroke-hairline)] border-transparent bg-transparent p-[var(--nx-space-controlPadding)] [font-family:var(--nx-font-ui)] text-[length:var(--nx-type-control-size)] leading-[var(--nx-type-control-lineHeight)] text-[var(--nx-ink)] focus-visible:outline-[length:var(--nx-stroke-hairline)] focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-ink)]"
      onClick={() => onChange(mode === 'dark' ? 'light' : 'dark')}
    >
      <span
        aria-hidden="true"
        className="relative h-[1.25em] w-[2.25em] shrink-0 rounded-[var(--nx-radius-pill)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-fieldFill)] group-aria-checked:bg-[var(--nx-selectionFill)]"
      >
        <span className="absolute top-1/2 left-[0.2em] size-[0.75em] -translate-y-1/2 rounded-full bg-[var(--nx-ink)] transition-transform duration-[var(--nx-motion-toggle-duration)] ease-[var(--nx-motion-toggle-easing)] group-aria-checked:translate-x-[1em] group-aria-checked:bg-[var(--nx-selectionText)] motion-reduce:transition-none" />
      </span>
      <span aria-hidden="true" className="grid text-left">
        <span
          className={`col-start-1 row-start-1 ${mode === 'dark' ? 'invisible' : ''}`}
        >
          Light
        </span>
        <span
          className={`col-start-1 row-start-1 ${mode === 'light' ? 'invisible' : ''}`}
        >
          Dark
        </span>
      </span>
    </button>
  );
}
