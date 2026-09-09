import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type BadgeProps = ComponentPropsWithRef<'span'> & {
  variant?: 'solid' | 'outline' | 'dashed' | 'quiet';
};

export function Badge({ variant = 'outline', className = '', ...props }: BadgeProps) {
  return <span {...props} className={`nx-badge nx-badge--${variant} ${className}`.trim()} />;
}
