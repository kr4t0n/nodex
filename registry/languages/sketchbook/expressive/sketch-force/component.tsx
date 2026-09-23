'use client';

import { useMemo } from 'react';
import { SketchForceLayout } from '../../../../_shared/sketch/force';
import { sketchSeed, type SketchTone } from '../../../../_shared/sketch/identity';
import type { SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchForceDatum { id: string; label: string; value: number | null; tone?: SketchTone }
export interface SketchForceProps extends SketchPresentationProps { data: readonly SketchForceDatum[];  }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };

export function SketchForce({ data, ...props }: SketchForceProps) {
  const nodes = useMemo(() => data.map(node => ({ ...node, paint: node.tone ? paints[node.tone] : Object.values(paints)[sketchSeed(node.id) % 9]! })), [data]);
  return <SketchForceLayout {...props} data={nodes} kind="force" hatchWidth="var(--nx-sketch-fillWeight)" />;
}
