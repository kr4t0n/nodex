'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ForcePosition, createForceSimulation } from './force-layout';

interface ForceModel { simulation: ReturnType<typeof createForceSimulation>; settled: readonly ForcePosition[] }
/** Capture on the stable SVG: native Scatter remounts individual symbols when their coordinates change. */
export function useForceDrag(model: ForceModel) {
  const [change, setChange] = useState<{ model: ForceModel; positions: readonly ForcePosition[]; settledPositions: readonly ForcePosition[] } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => { cleanup.current?.(); cleanup.current = null; }, [model]);
  return {
    positions: change?.model === model ? change.positions : model.settled,
    settledPositions: change?.model === model ? change.settledPositions : model.settled,
    interacted: change?.model === model,
    start(event: ReactPointerEvent<SVGGElement>, index: number, position: (x: number, y: number) => ForcePosition | null) {
      if (event.button !== 0) return;
      const svg = event.currentTarget.ownerSVGElement; const point = position(event.clientX, event.clientY); if (!svg || !point) return;
      event.stopPropagation(); event.preventDefault(); cleanup.current?.();
      // Grabbing during entrance starts from this component's visible public marks.
      svg.querySelectorAll('[data-nx-force-position]').forEach(element => {
        const i = Number(element.getAttribute('data-nx-force-position')); const x = Number(element.getAttribute('data-nx-model-x')); const y = Number(element.getAttribute('data-nx-model-y'));
        if (Number.isSafeInteger(i) && Number.isFinite(x) && Number.isFinite(y)) { model.simulation.hold(i, { x, y }); model.simulation.release(i); }
      });
      let frame = 0; let pending: ForcePosition | null = null; const pointer = event.pointerId;
      // Keep the fitted viewport fixed while the pointer uses its captured inverse scales.
      const publish = (settled = false) => {
        const positions = model.simulation.snapshot();
        setChange(previous => ({ model, positions, settledPositions: settled ? positions : previous?.model === model ? previous.settledPositions : model.settled }));
      };
      const flush = () => { frame = 0; if (!pending) return; model.simulation.hold(index, pending); pending = null; model.simulation.warmUp(); for (let i = 0; i < 12; i++) model.simulation.step(); publish(); };
      const move = (input: PointerEvent) => { if (input.pointerId !== pointer) return; pending = position(input.clientX, input.clientY); if (!frame) frame = requestAnimationFrame(flush); };
      const clear = () => { cancelAnimationFrame(frame); model.simulation.release(index); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', end); svg.removeEventListener('pointercancel', end); svg.removeEventListener('lostpointercapture', end); if (svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer); };
      const end = (input: PointerEvent) => { if (input.pointerId !== pointer) return; cancelAnimationFrame(frame); flush(); clear(); cleanup.current = null; model.simulation.settle(); publish(true); };
      cleanup.current = clear; svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('lostpointercapture', end);
      svg.setPointerCapture(pointer); model.simulation.hold(index, point); model.simulation.warmUp(); publish();
    },
  };
}

export function pointerInForceSpace(element: SVGGraphicsElement, clientX: number, clientY: number, xInverse: (pixel: number) => unknown, yInverse: (pixel: number) => unknown): ForcePosition | null {
  const svg = element instanceof SVGSVGElement ? element : element.ownerSVGElement; const matrix = svg?.getScreenCTM(); if (!svg || !matrix) return null;
  const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY; const local = point.matrixTransform(matrix.inverse());
  const x = xInverse(local.x); const y = yInverse(local.y);
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
