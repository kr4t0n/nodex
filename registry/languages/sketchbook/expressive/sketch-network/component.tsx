'use client';

import { useMemo } from 'react';
import { SketchForceLayout, type SketchNetworkLink as NetworkLink } from '../../../../_shared/sketch/force';
import { sketchSeed, type SketchTone } from '../../../../_shared/sketch/identity';
import type { SketchPresentationProps } from '../../../../_shared/sketch/frame';

export interface SketchNetworkDatum { id: string; label: string; value: number | null; tone?: SketchTone }
export type SketchNetworkLink = NetworkLink;
export interface SketchNetworkProps extends SketchPresentationProps { data: readonly SketchNetworkDatum[]; links: readonly SketchNetworkLink[]; }
const paints = { a: 'var(--nx-seriesA)', b: 'var(--nx-seriesB)', c: 'var(--nx-seriesC)', d: 'var(--nx-seriesD)', e: 'var(--nx-seriesE)', f: 'var(--nx-seriesF)', g: 'var(--nx-seriesG)', h: 'var(--nx-seriesH)', i: 'var(--nx-seriesI)' };

export function SketchNetwork({ data, ...props }: SketchNetworkProps) {
  const nodes = useMemo(() => data.map(node => ({ ...node, paint: node.tone ? paints[node.tone] : Object.values(paints)[sketchSeed(node.id) % 9]! })), [data]);
  return <SketchForceLayout {...props} data={nodes} kind="network" hatchWidth="var(--nx-sketch-fillWeight)" />;
}
