import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type RuleProps = ComponentPropsWithRef<'hr'> & {
  tone?: 'default' | 'strong' | 'faint';
  dashed?: boolean;
  orientation?: 'horizontal' | 'vertical';
  inset?: boolean;
};

export function Rule({ tone = 'default', dashed = false, orientation = 'horizontal', inset = false, className = '', ...props }: RuleProps) {
  return (
    <hr
      {...props}
      aria-orientation={orientation}
      className={[
        'nx-rule', tone !== 'default' && `nx-rule--${tone}`, dashed && 'nx-rule--dashed',
        orientation === 'vertical' && 'nx-rule--vertical', inset && 'nx-rule--inset', className,
      ].filter(Boolean).join(' ')}
    />
  );
}
