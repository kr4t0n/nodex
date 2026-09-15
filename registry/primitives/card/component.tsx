import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type CardProps = ComponentPropsWithRef<'div'> & {
  variant?: 'default' | 'inverted' | 'plain';
};

function cardClasses(variant: CardProps['variant']) {
  return `nx-card${variant === 'inverted' ? ' nx-card--invert' : variant === 'plain' ? ' nx-card--plain' : ''}`;
}

export function Card({ variant = 'default', className = '', ...props }: CardProps) {
  return <div {...props} className={`${cardClasses(variant)} ${className}`.trim()} />;
}

export type CardLinkProps = ComponentPropsWithRef<'a'> & { variant?: CardProps['variant'] };

/** Use for a card with one navigation target; avoid interactive children inside the link. */
export function CardLink({ variant = 'default', className = '', ...props }: CardLinkProps) {
  return <a {...props} className={`${cardClasses(variant)} nx-card--link ${className}`.trim()} />;
}

export function CardTitle({ className = '', ...props }: ComponentPropsWithRef<'h3'>) {
  return <h3 {...props} className={`nx-card__title ${className}`.trim()} />;
}

export function CardSubtitle({ className = '', ...props }: ComponentPropsWithRef<'p'>) {
  return <p {...props} className={`nx-card__sub ${className}`.trim()} />;
}

export function CardBody({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`nx-card__body ${className}`.trim()} />;
}

export function CardCaption({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`nx-card__caption ${className}`.trim()} />;
}
