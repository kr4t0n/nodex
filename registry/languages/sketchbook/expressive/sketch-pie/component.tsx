'use client';

import { useMemo } from 'react';
import { SketchPolar } from '../../../../_shared/sketch/polar';
import { sketchSeed, type SketchTone } from '../../../../_shared/sketch/identity';
import type { SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchPieDatum { id: string; label: string; value: number | null; tone?: SketchTone }
export interface SketchPieProps extends SketchPresentationProps { data: readonly SketchPieDatum[] }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };

export function SketchPie({ data, ...props }: SketchPieProps) {
  const parts = useMemo(() => data.map(part => ({ ...part, paint: part.tone ? paints[part.tone] : Object.values(paints)[sketchSeed(part.id) % 9]! })), [data]);
  return <SketchPolar {...props} data={parts} kind="pie" hatchWidth="var(--nx-sketch-fillWeight)" />;
}
