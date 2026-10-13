import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import { useReducedMotion } from './use-reduced-motion';

/** Stable category identities; they never encode rank or intensity. */
export type HearthTone = 'a' | 'b' | 'c' | 'd';
export const hearthTones: Record<HearthTone, string> = {
  a: 'var(--nx-seriesA)',
  b: 'var(--nx-seriesB)',
  c: 'var(--nx-seriesC)',
  d: 'var(--nx-seriesD)',
};

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const formatHearthNumber = (value: number) => numbers.format(value);

/** Recharts focuses its SVG and pie sectors; only keyboard focus shows the ink ring. */
export const hearthChartFocus =
  '[&_[tabindex]:focus-visible]:[outline:var(--nx-stroke-mark)_solid_var(--nx-ink)] [&_[tabindex]:focus-visible]:[outline-offset:calc(-1*var(--nx-stroke-mark))] [&_[tabindex]:focus:not(:focus-visible)]:outline-none';

function durationInMs(value: string): number {
  const match = /^([\d.]+)(ms|s)$/.exec(value.trim());
  const duration = match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : 0;
  return Number.isFinite(duration) ? duration : 0;
}

/**
 * A one-time entrance for charts whose reveal is not a Recharts mark animation:
 * the cells of a table appear together, a rosette opens from its centre. It plays
 * on the container at mount, so the resting state is the default paint and needs
 * no script. A live reduced-motion change finishes it in place.
 */
export function useHearthEntrance(
  animate: boolean,
  role: 'draw' | 'fade',
  keyframes: Keyframe[],
) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const enabled = animate && !reduced;
  const initial = useRef({ enabled, role, keyframes });
  useLayoutEffect(() => {
    const node = ref.current;
    const { enabled, role, keyframes } = initial.current;
    if (!node || !enabled || typeof node.animate !== 'function') return;
    const style = getComputedStyle(node);
    const duration = durationInMs(
      style.getPropertyValue(`--nx-motion-${role}-duration`),
    );
    if (!duration) return;
    const animation = node.animate(keyframes, {
      duration,
      easing:
        style.getPropertyValue(`--nx-motion-${role}-easing`).trim() ||
        'ease-out',
    });
    return () => animation.cancel();
  }, []);
  useEffect(() => {
    if (!enabled)
      for (const animation of ref.current?.getAnimations() ?? [])
        animation.finish();
  }, [enabled]);
  return ref;
}

/** Hearth's charts share a reading edge, unit heading and quiet context. */
export function HearthChartFrame({
  ref,
  name,
  unitLabel,
  contextLabel,
  animated,
  status,
  className = '',
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  name: string;
  unitLabel: string;
  contextLabel?: string;
  animated: boolean;
  status?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      data-nx-chart={name}
      data-nx-animated={animated}
      className={`min-w-0 rounded-[var(--nx-radius-card)] bg-[var(--nx-paper)] [padding:var(--nx-space-cardPadding)] [font-family:var(--nx-font-sans)] text-[var(--nx-ink)] ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--nx-space-fieldGap)] border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] pb-[var(--nx-space-cardBodyGap)]">
        <span className="[font-family:var(--nx-font-heading)] text-[length:var(--nx-type-cardTitle-size)] leading-[var(--nx-type-prose-headingLineHeight)] font-[number:var(--nx-type-cardTitle-weight)] tracking-[var(--nx-type-cardTitle-tracking)]">
          {unitLabel}
        </span>
        {contextLabel && (
          <span className="text-[length:var(--nx-type-caption-size)] text-[var(--nx-muted)]">
            {contextLabel}
          </span>
        )}
      </div>
      {status ? (
        <p
          role="status"
          className="my-[var(--nx-space-gridGap)] text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]"
        >
          {status}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export function HearthChartTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className="max-w-[260px] rounded-[var(--nx-radius-tooltip)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-fieldFill)] [padding:var(--nx-space-tooltipPadding)] text-[length:var(--nx-type-tooltip-size)] text-[var(--nx-ink)]"
    >
      <div className="font-[number:var(--nx-font-weight-semibold)]">
        {title}
      </div>
      {children}
    </div>
  );
}
