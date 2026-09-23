'use client';

import { useEffect, useState, type RefObject } from 'react';

export interface SketchSettings {
  roughness: number;
  axisRoughness: number;
  bowing: number;
  fillWeight: number;
  hachureAngle: number;
  hachureGap: number;
  fillStyle: 'hachure' | 'cross-hatch' | 'solid';
}

/** Rough.js needs numeric geometry. Paint and rendered stroke widths stay in CSS. */
export function useSketchSettings(ref: RefObject<HTMLDivElement | null>): SketchSettings | null {
  const [settings, setSettings] = useState<SketchSettings | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const read = () => {
      const style = getComputedStyle(node);
      const numeric = (name: string) => {
        const value = style.getPropertyValue(name).trim();
        return value === '' ? NaN : Number(value);
      };
      const roughness = numeric('--nx-sketch-roughness');
      const axisRoughness = numeric('--nx-sketch-axisRoughness');
      const bowing = numeric('--nx-sketch-bowing');
      const fillWeight = numeric('--nx-sketch-fillWeight');
      const hachureAngle = numeric('--nx-sketch-hachureAngle');
      const hachureGap = numeric('--nx-sketch-hachureGap');
      const fillStyle = style.getPropertyValue('--nx-sketch-fillStyle').trim();
      // Reject malformed geometry instead of inheriting invisible library defaults.
      const valid = [roughness, axisRoughness, bowing, fillWeight, hachureAngle, hachureGap].every(Number.isFinite)
        && roughness >= 0 && roughness <= 10 && axisRoughness >= 0 && axisRoughness <= 10
        && bowing >= 0 && bowing <= 10 && fillWeight > 0 && hachureGap >= 1;
      const next = valid && (fillStyle === 'hachure' || fillStyle === 'cross-hatch' || fillStyle === 'solid')
        ? { roughness, axisRoughness, bowing, fillWeight, hachureAngle, hachureGap, fillStyle } as SketchSettings : null;
      setSettings((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
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
  }, [ref]);
  return settings;
}
