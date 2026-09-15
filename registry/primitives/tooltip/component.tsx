import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type TooltipProps = ComponentPropsWithRef<'span'> & {
  label: string;
  placement?: 'above' | 'below';
  align?: 'center' | 'start' | 'end';
  wrap?: boolean;
};

/**
 * A CSS visual hint for redundant information, not a complete tooltip widget.
 * Generated content is not reliably announced, touch and Escape dismissal are
 * not implemented, and fallback positioning can clip. Use a headless tooltip
 * with these styles when the label conveys information unavailable elsewhere.
 * Children must include a focusable trigger.
 */
export function Tooltip({ label, placement = 'above', align = 'center', wrap = false, className = '', ...props }: TooltipProps) {
  return (
    <span
      {...props}
      data-tooltip={label}
      className={[
        'nx-tooltip', placement === 'below' && 'nx-tooltip--below', align !== 'center' && `nx-tooltip--${align}`,
        wrap && 'nx-tooltip--wrap', className,
      ].filter(Boolean).join(' ')}
    />
  );
}

/** A focusable text trigger. For an action, use a native button as the Tooltip child instead. */
export function TooltipTrigger({ tabIndex = 0, className = '', ...props }: ComponentPropsWithRef<'span'>) {
  return <span {...props} tabIndex={tabIndex} className={`nx-tooltip__trigger ${className}`.trim()} />;
}
