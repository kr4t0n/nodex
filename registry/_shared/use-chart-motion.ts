'use client';

import { useEffect, useRef, useState } from 'react';
import type { EasingInput } from 'recharts';
import { useReducedMotion } from './use-reduced-motion';

function durationInMs(value: string): number {
  const match = /^([\d.]+)(ms|s)$/.exec(value.trim());
  if (!match) return 0;
  const duration = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
  return Number.isFinite(duration) ? duration : 0;
}

function easingFromToken(value: string): EasingInput {
  const normalized = value.replace(/\s/g, '');
  if (['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(normalized)) {
    return normalized as EasingInput;
  }
  const match = /^cubic-bezier\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)$/.exec(normalized);
  if (match && match.slice(1).every((part) => Number.isFinite(Number(part)))
    && Number(match[1]) >= 0 && Number(match[1]) <= 1
    && Number(match[3]) >= 0 && Number(match[3]) <= 1) {
    return normalized as EasingInput;
  }
  return 'linear';
}

/**
 * Paint stays in CSS. Only JavaScript animation values are resolved here.
 * Observe this chart's token scope rather than maintaining a second theme object.
 * CSSOM-only edits can announce themselves with a `nodex:tokens-changed` event.
 */
export function useChartMotion(animate = true) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [timing, setTiming] = useState<{ duration: number; easing: EasingInput }>({ duration: 0, easing: 'linear' });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const read = () => {
      const style = getComputedStyle(node);
      const duration = durationInMs(style.getPropertyValue('--nx-motion-draw-duration'));
      const easing = easingFromToken(style.getPropertyValue('--nx-motion-draw-easing'));
      setTiming((previous) => previous.duration === duration && previous.easing === easing ? previous : { duration, easing });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    const observer = new MutationObserver(schedule);
    for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true });
    }
    observer.observe(document.head, { attributes: true, childList: true, subtree: true, characterData: true });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('load', schedule, true);
    document.addEventListener('nodex:tokens-changed', schedule);
    read();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scheme.removeEventListener('change', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('load', schedule, true);
      document.removeEventListener('nodex:tokens-changed', schedule);
    };
  }, []);

  return {
    ref,
    isAnimationActive: animate && !reduced && timing.duration > 0,
    animationDuration: timing.duration,
    animationEasing: timing.easing,
  };
}
