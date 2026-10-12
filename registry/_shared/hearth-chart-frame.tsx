import type { ReactNode, Ref } from 'react';

/** Hearth's two charts share a reading edge, unit heading and quiet context. */
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
