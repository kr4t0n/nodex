import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type DetailsProps = ComponentPropsWithRef<'details'> & {
  summary: ReactNode;
  meta?: ReactNode;
};

/** Native disclosure: open, name, and onToggle retain their platform behavior. */
export function Details({ summary, meta, className = '', children, ...props }: DetailsProps) {
  return (
    <details {...props} className={`nx-details ${className}`.trim()}>
      <summary className="nx-details__summary">
        {summary}
        {(meta !== undefined && meta !== null) && <span className="nx-details__meta">{meta}</span>}
      </summary>
      <div className="nx-details__body">{children}</div>
    </details>
  );
}
