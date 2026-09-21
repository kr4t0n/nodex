'use client';

import { Component, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';

import { examples } from '@/generated/registry-examples.ts';
import { usePreviewStartup } from '@/lib/preview-startup.ts';
import type { Item } from '@/lib/registry.ts';

const FALLBACK_WIDTH = 660;
/** The common, unscaled gallery gutter around each specimen. */
const PREVIEW_INSET = 28;

interface PreviewProps {
  item: Item;
  language: string;
  className?: string;
  /** Fixed grid boxes keep labels aligned; detail previews follow their content. */
  boxHeight?: number;
}

class PreviewBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onError(); }

  override render() {
    return this.state.failed
      ? <p className="m-0 p-7 text-sm text-[var(--nx-muted)]" role="status">Preview unavailable.</p>
      : this.props.children;
  }
}

/** Effects run only after the lazy example has committed, including its CSS. */
function LiveExample({ Example, fluid, style, onMeasure, onReady }: {
  Example: ComponentType<{ animate?: boolean }> | undefined;
  fluid: boolean;
  style: CSSProperties;
  onMeasure: (height: number) => void;
  onReady: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let live = true;
    let frame = 0;
    let fallback = 0;
    // CSS height and ResizeObserver sizes stay in logical pixels under a scale.
    // getBoundingClientRect would feed scaled dimensions back into the layout.
    const measure = () => onMeasure(Math.ceil(Number.parseFloat(getComputedStyle(element).height)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const ready = () => {
      if (!live) return;
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(frame);
      measure();
      onReady();
    };
    void document.fonts.ready.then(() => {
      if (!live) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(ready);
        });
      });
      // Background tabs may suppress frames even after the example has mounted.
      fallback = window.setTimeout(ready, 1500);
    });
    return () => {
      live = false;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [onMeasure, onReady]);

  if (!Example) throw new Error('No React example in this website build');
  return (
    <div
      ref={ref}
      data-nx-example
      className="min-w-0 bg-[var(--nx-bg)] text-left text-base leading-normal font-normal tracking-normal text-[var(--nx-ink)] normal-case not-italic [font-family:var(--nx-font-sans)] antialiased"
      style={{ ...style, padding: fluid ? PREVIEW_INSET : 'var(--nx-space-pagePadding)' }}
      // Specimen links have no destination. They previously targeted only their
      // own document and must not jump the enclosing gallery back to the top.
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a[href="#"]')) event.preventDefault();
      }}
    >
      <Example />
    </div>
  );
}

/** Native examples share the website runtime; the queue defers offscreen work. */
export function Preview({ item, language, className, boxHeight }: PreviewProps) {
  const { width: previewWidth, height: previewHeight, insets } = item.meta.preview;
  const fluid = item.meta.tier === 'primitive';
  const exampleKey = `${item.meta.language}/${item.name}`;
  const request = `${exampleKey}:${language}`;
  const nearRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [measurement, setMeasurement] = useState<{ request: string; height: number }>();
  const [result, setResult] = useState<{ request: string; state: 'ready' | 'error' }>();
  const contentHeight = measurement?.request === request ? measurement.height : undefined;
  const state = result?.request === request ? result.state : undefined;
  const { started, complete } = usePreviewStartup(request, nearRef, fluid || width > 0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // Keep a synchronous first measurement: background tabs may delay observers.
    const initial = box.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const onMeasure = useCallback((height: number) => {
    if (Number.isFinite(height) && height > 0) {
      setMeasurement((previous) => previous?.request === request && previous.height === height ? previous : { request, height });
    }
  }, [request]);
  const onReady = useCallback(() => {
    setResult({ request, state: 'ready' });
    complete();
  }, [request, complete]);
  const onError = useCallback(() => {
    setResult({ request, state: 'error' });
    complete();
  }, [request, complete]);

  const rawRatio = item.meta.aspectRatio
    ? Number.parseFloat(item.meta.aspectRatio.split('/')[0] ?? '4') / Number.parseFloat(item.meta.aspectRatio.split('/')[1] ?? '3')
    : 4 / 3;
  const fallbackRatio = Number.isFinite(rawRatio) && rawRatio > 0 ? rawRatio : 4 / 3;
  const logicalWidth = previewWidth !== undefined && Number.isFinite(previewWidth) && previewWidth > 0 ? previewWidth : FALLBACK_WIDTH;
  const initialHeight = previewHeight !== undefined && Number.isFinite(previewHeight) && previewHeight > 0 ? previewHeight : logicalWidth / fallbackRatio;
  const logicalHeight = contentHeight ?? initialHeight;
  const framed = !fluid && insets !== undefined &&
    Object.values(insets).every((value) => Number.isFinite(value) && value >= 0) &&
    insets.left + insets.right < logicalWidth && insets.top + insets.bottom < logicalHeight;
  const contentWidth = framed ? logicalWidth - insets.left - insets.right : logicalWidth;
  const framedHeight = framed ? logicalHeight - insets.top - insets.bottom : logicalHeight;
  const inset = framed ? PREVIEW_INSET : 0;
  // Preserve the specimen's original geometry, fitting both axes of grid boxes.
  const scale = fluid ? 1 : width === 0 ? 0 : Math.min(
    1,
    Math.max(0, width - inset * 2) / contentWidth,
    boxHeight ? Math.max(0, boxHeight - inset * 2) / framedHeight : Infinity,
  );

  return (
    // Every grid ancestor must accept shrinking around the logical-width content.
    <div className={`min-w-0 ${className ?? ''}`}>
      <div
        ref={nearRef}
        data-nx-preview={exampleKey}
        data-nx-preview-state={state ?? (started ? 'loading' : 'waiting')}
        data-nx-scope={language}
        role="group"
        aria-label={item.title}
        className="nx-frame relative w-full overflow-hidden rounded-[var(--nx-radius-card)] [container-type:inline-size]"
        style={{ background: 'var(--nx-bg)', maxWidth: fluid ? undefined : contentWidth + inset * 2 }}
      >
        <div ref={boxRef} style={{ height: boxHeight ?? (fluid ? logicalHeight : framedHeight * scale + inset * 2) }}>
          {started && (fluid || scale > 0) ? (
            <PreviewBoundary key={request} onError={onError}>
              <Suspense fallback={null}>
                <LiveExample
                  Example={examples[exampleKey]}
                  fluid={fluid}
                  onMeasure={onMeasure}
                  onReady={onReady}
                  style={fluid ? { width: '100%' } : {
                    width: logicalWidth,
                    transform: `translate(${inset - (framed ? insets.left * scale : 0)}px, ${inset - (framed ? insets.top * scale : 0)}px) scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                />
              </Suspense>
            </PreviewBoundary>
          ) : null}
        </div>
        {!state ? (
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{
            background: 'linear-gradient(180deg, color-mix(in oklab, var(--nx-grid) 45%, transparent), transparent 55%)',
          }} />
        ) : null}
      </div>
    </div>
  );
}
