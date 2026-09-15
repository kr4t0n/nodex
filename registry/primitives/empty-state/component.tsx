import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type EmptyStateProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  quiet?: boolean;
  centered?: boolean;
};

export function EmptyState({ title, hint, action, quiet = false, centered = false, className = '', children, ...props }: EmptyStateProps) {
  return (
    <div {...props} className={`nx-empty${quiet ? ' nx-empty--quiet' : ''}${centered ? ' nx-empty--center' : ''} ${className}`.trim()}>
      <p className="nx-empty__title">{title}</p>
      {(hint !== undefined && hint !== null) && <p className="nx-empty__hint">{hint}</p>}
      {children}
      {(action !== undefined && action !== null) && <div className="nx-empty__action">{action}</div>}
    </div>
  );
}
