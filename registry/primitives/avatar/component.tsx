'use client';

import { useState } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type AvatarProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & {
  name: string;
  src?: string;
  fallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  tone?: 1 | 2 | 3 | 4;
  variant?: 'filled' | 'outline' | 'count';
};

export function Avatar({ name, src, fallback, size = 'md', shape = 'circle', tone = 1, variant = 'filled', className = '', ...props }: AvatarProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
  return (
    <span
      {...props}
      role="img"
      aria-label={name}
      className={[
        'nx-avatar', `nx-avatar--tone-${tone}`, size !== 'md' && `nx-avatar--${size}`,
        shape === 'square' && 'nx-avatar--square', variant !== 'filled' && `nx-avatar--${variant}`, className,
      ].filter(Boolean).join(' ')}
    >
      {src && src !== failedSource
        ? <img src={src} alt="" onError={() => setFailedSource(src)} />
        : <span aria-hidden="true">{fallback ?? initials}</span>}
    </span>
  );
}

export function AvatarGroup({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div role="group" {...props} className={`nx-avatar-group ${className}`.trim()} />;
}
