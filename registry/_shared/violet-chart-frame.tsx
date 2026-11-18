import type { ReactNode, Ref } from 'react';

/** The three Violet Draft plots share a ruled sheet, not chart composition. */
export function VioletChartFrame({
  ref,
  name,
  title,
  subtitle,
  children,
  status,
  className = '',
}: {
  ref?: Ref<HTMLDivElement>;
  name: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  status?: string | null;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      data-nx-chart={name}
      className={`min-w-0 border-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] bg-[var(--nx-paper)] [padding:var(--nx-space-cardPadding)] [font-family:var(--nx-font-ui)] text-[var(--nx-ink)] ${className}`}
    >
      <h3 className="m-0 [font-family:var(--nx-font-heading)] text-[length:var(--nx-type-cardTitle-size)] font-[number:var(--nx-type-cardTitle-weight)] [overflow-wrap:anywhere] [font-stretch:var(--nx-type-cardTitle-stretch)]">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-[var(--nx-space-subtitleGap)] mb-0 [font-family:var(--nx-font-sans)] text-[length:var(--nx-type-subtitle-size)] [line-height:var(--nx-type-subtitle-lineHeight)] [overflow-wrap:anywhere] text-[var(--nx-muted)]">
          {subtitle}
        </p>
      )}
      {status ? (
        <p
          role="status"
          className="my-[var(--nx-space-cardBodyGap)] text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]"
        >
          {status}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export function VioletTooltip({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="max-w-[260px] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-fieldBorder)] bg-[var(--nx-paper)] [padding:var(--nx-space-tooltipPadding)] text-[length:var(--nx-type-tooltip-size)] [overflow-wrap:anywhere] text-[var(--nx-ink)]"
    >
      {children}
    </div>
  );
}
