import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type LinkProps = ComponentPropsWithRef<'a'> & {
  variant?: 'default' | 'quiet' | 'strong';
  external?: boolean;
};

/** The external treatment adds a visual mark; target remains the caller's choice. */
export function Link({ variant = 'default', external = false, className = '', ...props }: LinkProps) {
  return (
    <a
      {...props}
      className={`nx-link${variant === 'default' ? '' : ` nx-link--${variant}`}${external ? ' nx-link--external' : ''} ${className}`.trim()}
    />
  );
}
