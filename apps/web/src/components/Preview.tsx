'use client';

import { useEffect, useRef, useState } from 'react';

import { useNearViewport } from '@/lib/hooks.ts';

/**
 * The logical width every preview is rendered at before being scaled down.
 *
 * Components were authored for a full page, so embedding one directly in a
 * 320px card shows the top-left corner of a much wider layout. Rendering at a
 * fixed viewport and scaling the whole frame keeps the composition intact and
 * the type proportional, which is how a thumbnail should behave.
 *
 * The value is the width the charts were drawn for, not a guess at a desktop
 * viewport. They came from a two-column grid capped at 1400px, so a card was
 * about 690px and a full-width one about 1400px.
 *
 * This was 1180 and letterboxed almost everything. An expressive SVG carries
 * `max-height: 330px` with `preserveAspectRatio="xMidYMid meet"`, so past a
 * certain width the height caps first and its aspect ratio decides how much of
 * the box it can occupy — the browser pads the rest to centre it. At 1180 the
 * box was 1044px and a 400x320 chart drew 488px of it. Measured fill going to
 * 660: dotty-matrix 34 to 68%, arc-matrix 41 to 82%, hairline-line 47 to 93%,
 * and the wide charts from ~95 to 100%. Nothing regresses.
 *
 * Do not fix letterboxing by removing `max-height` from the components. That
 * cap is what stops a chart being ~900px tall in a consumer's wide container;
 * dropping it would degrade what the registry ships in order to flatter this
 * preview. The width belongs here, where it only affects previews.
 *
 * Lower bound: below about 550 the width binds before the height cap and charts
 * start shrinking again rather than filling.
 */
const LOGICAL_WIDTH = 660;

interface PreviewProps {
  src: string;
  title: string;
  /** From meta.aspectRatio. Only reserves initial space; real height is measured. */
  aspectRatio?: string;
  className?: string;
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
  boxHeight,
  fluid = false,
}: PreviewProps) {
  const [nearRef, near] = useNearViewport<HTMLDivElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
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

  const fallbackRatio = aspectRatio
    ? Number.parseFloat(aspectRatio.split('/')[0] ?? '4') /
      Number.parseFloat(aspectRatio.split('/')[1] ?? '3')
    : 4 / 3;
  const logicalHeight = contentHeight ?? LOGICAL_WIDTH / fallbackRatio;

  /**
   * Fit to width, or to the smaller of width and box when a height is fixed.
   *
   * Capped at 1, so a preview shrinks but never enlarges. Past that the frame
   * would show the component bigger than its own container could ever draw it,
   * which is a size the reader cannot reproduce by copying it. Below the cap
   * the frame is a faithful scale model; above it, it is a magnifying glass.
   */
  const scale = fluid
    ? 1
    : width === 0
      ? 0
      : Math.min(
          1,
          boxHeight
            ? Math.min(width / LOGICAL_WIDTH, boxHeight / logicalHeight)
            : width / LOGICAL_WIDTH,
        );

    const ready = fluid ? near : near && scale > 0;

    /**
     * A fluid preview normally sizes to its content, which is right on a detail
     * page and wrong in a grid: four primitives at true size come out four
     * different heights and the row reads as broken.
     *
     * With `boxHeight` the frame is pinned and the content sits at the top of
     * it, still unscaled. The spare room fills with the preview's own
     * background, so the box reads as one surface rather than as a letterbox.
     * Pick a height that clears the tallest component in the row: anything
     * taller than the box is clipped, not shrunk.
     */
    const frameHeight = fluid
      ? (boxHeight ?? contentHeight ?? 160)
      : logicalHeight;

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
        // Never wider than the document inside it. Once the scale is capped at
        // 1 a wide column would otherwise leave a band of empty frame beside a
        // component already at full size. This converges rather than looping:
        // the frame settles at the logical width, and the measurement taken
        // inside it then agrees.
        style={{ background: 'var(--nx-bg)', maxWidth: fluid ? undefined : LOGICAL_WIDTH }}
      >
        <div
          ref={boxRef}
          style={{ height: fluid ? frameHeight : (boxHeight ?? logicalHeight * scale) }}
        >
          {ready ? (
            <iframe
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

    </div>
  );
}
