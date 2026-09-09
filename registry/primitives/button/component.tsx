import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'solid' | 'outline' | 'quiet';
};

/** A native button. Pass aria-pressed for a toggle and type="submit" for a form action. */
export function Button({ variant = 'solid', type = 'button', className = '', ...props }: ButtonProps) {
  return <button {...props} type={type} className={`nx-btn nx-btn--${variant} ${className}`.trim()} />;
}
