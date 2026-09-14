'use client';

import { useEffect, useRef, useState } from 'react';

import { useNearViewport } from '@/lib/hooks.ts';

/** Used only when preview metadata is unavailable or invalid. */
const FALLBACK_WIDTH = 660;
/** Matches the native-size primitive examples' visible gallery inset. */
const PREVIEW_INSET = 28;

interface PreviewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface PreviewProps {
  src: string;
  title: string;
  /** Explicit example dimensions from item.meta.preview. */
  width?: number;
  height?: number;
  /** Build-measured page/card space surrounding a chart's composition. */
  insets?: PreviewInsets;
  /** Secondary height fallback; the document reports its measured content height. */
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
   * Chart thumbnails preserve the declared example composition by scaling.
   * Primitives stay at their natural size so controls remain legible.
   */
  fluid?: boolean;
}

/**
 * An isolated React example with a browser-rendered initial snapshot. Its
 * generated document and bundle are static assets, so the app and a CDN serve
 * the same preview. The iframe keeps each example's tokens and styles local.
 */
export function Preview({
  src,
  title,
  width: previewWidth,
  height: previewHeight,
  insets,
  aspectRatio,
  className,
  boxHeight,
  fluid = false,
}: PreviewProps) {
  const [nearRef, near] = useNearViewport<HTMLDivElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState(0);
  const [measurement, setMeasurement] = useState<{ src: string; height: number }>();
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const contentHeight = measurement?.src === src ? measurement.height : undefined;
  const loaded = loadedSrc === src;

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
      if (data?.type === 'nx-preview-size' && typeof data.height === 'number' && Number.isFinite(data.height) && data.height > 0) {
        setMeasurement({ src, height: data.height });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [src]);

  const rawRatio = aspectRatio
    ? Number.parseFloat(aspectRatio.split('/')[0] ?? '4') /
      Number.parseFloat(aspectRatio.split('/')[1] ?? '3')
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

  /**
   * Fit the composition inside the common inset, respecting a fixed box's
   * height as well as its width. Older previews fit their whole document.
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
            ? Math.min(Math.max(0, width - inset * 2) / contentWidth, Math.max(0, boxHeight - inset * 2) / framedHeight)
            : Math.max(0, width - inset * 2) / contentWidth,
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
  const frameHeight = fluid ? (boxHeight ?? logicalHeight) : logicalHeight;

  return (
    // min-w-0 is load-bearing, not defensive. This sits inside a grid, and a
    // grid item's default minimum is its content size. The iframe is rendered at
    // a fixed wide logical width, so without this the item refuses to shrink,
    // blows the column open, and reports that inflated width back as the
    // measurement scale is computed from, which cancels the scaling entirely.
    <div className={`min-w-0 ${className ?? ''}`}>
      <div
        ref={nearRef}
        className="nx-frame relative w-full overflow-hidden rounded-[var(--nx-radius-card)]"
        // Cap the frame at the composition's native width plus its gallery
        // inset, so a wide column cannot add space beside a full-size chart.
        style={{ background: 'var(--nx-bg)', maxWidth: fluid ? undefined : contentWidth + inset * 2 }}
      >
        <div
          ref={boxRef}
          style={{ height: fluid ? frameHeight : (boxHeight ?? framedHeight * scale + inset * 2) }}
        >
          {ready ? (
            <iframe
              key={src}
              ref={frameRef}
              src={src}
              title={title}
              loading="lazy"
              onLoad={() => setLoadedSrc(src)}
              // Registry-authored example bundles run inside an isolated
              // document and may fetch their declared static assets.
              sandbox="allow-scripts allow-same-origin"
              style={
                fluid
                  ? { width: '100%', height: frameHeight, border: 0, display: 'block' }
                  : {
                      width: logicalWidth,
                      height: logicalHeight,
                      // Move only the surrounding page space out of the view.
                      // Internal chart coordinates, labels and interactions
                      // still use the original logical document dimensions.
                      transform: `translate(${inset - (framed ? insets.left * scale : 0)}px, ${inset - (framed ? insets.top * scale : 0)}px) scale(${scale})`,
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
