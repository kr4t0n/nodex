import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type ProseProps = ComponentPropsWithRef<'div'> & { narrow?: boolean };

/** Styles authored HTML such as rendered markdown; sanitization belongs at the content boundary. */
export function Prose({ narrow = false, className = '', ...props }: ProseProps) {
  return <div {...props} className={`nx-prose${narrow ? ' nx-prose--narrow' : ''} ${className}`.trim()} />;
}
