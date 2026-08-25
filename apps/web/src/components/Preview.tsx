'use client';

import { ArrowsClockwise } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useNearViewport } from '@/lib/hooks.ts';

/**
 * The logical width every preview is rendered at before being scaled down.
 *
 * Components were authored for a full page, so embedding one directly in a
 * 320px card shows the top-left corner of a 1400px layout. Rendering at a fixed
 * wide viewport and scaling the whole frame keeps the composition intact and the
 * type proportional, which is how a thumbnail should behave.
 */
const LOGICAL_WIDTH = 1180;

interface PreviewProps {
  src: string;
  title: string;
  /** From meta.aspectRatio. Only reserves initial space; real height is measured. */
  aspectRatio?: string;
  className?: string;
  replayable?: boolean;
  /**
   * Fixed thumbnail height. In a grid, content-driven heights leave every card
   * a different size and the titles beneath them fall out of alignment, which
   * reads as broken. Constraining the box and letterboxing the content keeps the
   * grid tidy without cropping anything. Omit it on a detail page, where the
   * component should take the room it needs.
   */
  boxHeight?: number;
  /**
   * Render at the container's own width with no scaling.
   *
   * Charts are authored for a full page, so they must be rendered wide and
   * scaled down. Primitives are small already, and scaling a button down to a
   * quarter size makes it illegible and misrepresents it. A button should be
   * shown at the size a button actually is.
   */
  fluid?: boolean;
}

/**
 * A component preview, in an iframe pointed at the generated standalone
 * document.
 *
 * An iframe rather than inline markup because React does not execute `<script>`
 * inserted via innerHTML, so inlining sixty-odd chart scripts would mean
 * hand-evaluating and tearing them down on every route change. Pointing at a
 * real URL rather than using srcdoc also lets the browser cache ECharts and the
 * fonts once across every preview instead of per frame.
 */
export function Preview({
  src,
  title,
  aspectRatio,
  className,
  replayable = false,
  boxHeight,
  fluid = false,
}: PreviewProps) {
  const [nearRef, near] = useNearViewport<HTMLDivElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState(0);
  const [width, setWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState<number>();
  const [loaded, setLoaded] = useState(false);

  // Track the rendered width so the fixed-width frame can be scaled to fit.
  //
  // The initial read is deliberate rather than leaving it to the observer.
  // ResizeObserver, like IntersectionObserver, does not deliver in a tab that
  // is never painted, and the scale gates whether the frame mounts at all. One
  // synchronous measurement means the preview is correct immediately and the
  // observer is only responsible for later changes.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const initial = box.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);
    const ro = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // The preview document posts its true content height, so the card never clips
  // a caption and never leaves dead space below a short chart.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === 'nx-preview-size' && typeof data.height === 'number') {
        setContentHeight(data.height);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const replay = useCallback(() => {
    setLoaded(false);
    setContentHeight(undefined);
    setNonce((n) => n + 1);
  }, []);

  const fallbackRatio = aspectRatio
    ? Number.parseFloat(aspectRatio.split('/')[0] ?? '4') /
      Number.parseFloat(aspectRatio.split('/')[1] ?? '3')
    : 4 / 3;
  const logicalHeight = contentHeight ?? LOGICAL_WIDTH / fallbackRatio;

  // Fit to width, or to the smaller of width and box when a height is fixed.
  const scale = fluid
    ? 1
    : width === 0
      ? 0
      : boxHeight
        ? Math.min(width / LOGICAL_WIDTH, boxHeight / logicalHeight)
        : width / LOGICAL_WIDTH;

  const ready = fluid ? near : near && scale > 0;
  const frameHeight = fluid ? (contentHeight ?? 160) : logicalHeight;

  return (
    // min-w-0 is load-bearing, not defensive. This sits inside a grid, and a
    // grid item's default minimum is its content size. The iframe is rendered at
    // a fixed wide logical width, so without this the item refuses to shrink,
    // blows the column open, and reports that inflated width back as the
    // measurement scale is computed from, which cancels the scaling entirely.
    <div className={`min-w-0 ${className ?? ''}`}>
      <div
        ref={nearRef}
        className="nx-frame relative w-full overflow-hidden rounded-[var(--radius-card)]"
        style={{ background: 'var(--nx-bg)' }}
      >
        <div
          ref={boxRef}
          style={{ height: fluid ? frameHeight : (boxHeight ?? logicalHeight * scale) }}
        >
          {ready ? (
            <iframe
              key={nonce}
              ref={frameRef}
              src={src}
              title={title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              // Scripts are required (the charts draw themselves). Same-origin
              // is required for the preview's relative token and stylesheet
              // references, and for the height message.
              sandbox="allow-scripts allow-same-origin"
              style={
                fluid
                  ? { width: '100%', height: frameHeight, border: 0, display: 'block' }
                  : {
                      width: LOGICAL_WIDTH,
                      height: logicalHeight,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      border: 0,
                      display: 'block',
                    }
              }
            />
          ) : null}
        </div>

        {/* Skeleton in the final shape rather than a spinner, so a grid of
            streaming frames still reads as settled. */}
        {!loaded ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in oklab, var(--nx-grid) 45%, transparent), transparent 55%)',
            }}
          />
        ) : null}
      </div>

      {replayable ? (
        <div className="mt-3 flex justify-end">
          <button className="nx-btn nx-btn--quiet" type="button" onClick={replay}>
            <ArrowsClockwise size={13} weight="bold" aria-hidden />
            Replay
          </button>
        </div>
      ) : null}
    </div>
  );
}
