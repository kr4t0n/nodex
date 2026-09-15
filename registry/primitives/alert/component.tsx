import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type AlertProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  title?: ReactNode;
  severity?: 'note' | 'important' | 'critical';
  inverted?: boolean;
};

/** Add role="alert" when a newly displayed message must interrupt the reader. */
export function Alert({ title, severity = 'note', inverted = false, className = '', children, ...props }: AlertProps) {
  return (
    <div {...props} className={`nx-alert nx-alert--${severity}${inverted ? ' nx-alert--invert' : ''} ${className}`.trim()}>
      {(title !== undefined && title !== null) && <p className="nx-alert__title">{title}</p>}
      <div className="nx-alert__body">{children}</div>
    </div>
  );
}
