'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

// One gallery row can start together; the rest waits for actual React readiness.
const STARTUP_LIMIT = 3;
const NEAR_MARGIN = 300;
const OBSERVER_FALLBACK_MS = 1500;
const STARTUP_TIMEOUT_MS = 15_000;

interface Job {
  element: HTMLElement;
  start: () => void;
  started: boolean;
  release?: () => void;
}

/** Measure current geometry, including local scrollers and the moving belt. */
function priority(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  if (!element.isConnected || rect.width <= 0 || rect.height <= 0) return Infinity;
  let left = -NEAR_MARGIN;
  let right = window.innerWidth + NEAR_MARGIN;
  let top = -NEAR_MARGIN;
  let bottom = window.innerHeight + NEAR_MARGIN;
  if (rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom) return Infinity;

  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
    const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
    if (!clipsX && !clipsY) continue;
    const bounds = parent.getBoundingClientRect();
    if (clipsX) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    if (clipsY) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  }
  if (rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom || left >= right || top >= bottom) return Infinity;
  // Visible previews precede preloading candidates, even after a fast scroll.
  return Math.hypot(
    Math.max(0, -rect.right, rect.left - window.innerWidth),
    Math.max(0, -rect.bottom, rect.top - window.innerHeight),
  );
}

/** One coordinator per mounted page, independent of React's render cycle. */
function createStartupQueue() {
  const jobs = new Set<Job>();
  let active = 0;
  let frame = 0;
  let fallback = 0;
  const observer = typeof IntersectionObserver === 'undefined'
    ? undefined
    : new IntersectionObserver(schedule, { rootMargin: `${NEAR_MARGIN}px` });

  function clearScheduled() {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(fallback);
    frame = fallback = 0;
  }

  function pump() {
    clearScheduled();
    if (active >= STARTUP_LIMIT) return;
    const candidates = [...jobs].filter((job) => !job.started)
      .map((job) => ({ job, priority: priority(job.element) }))
      .filter((entry) => Number.isFinite(entry.priority))
      .sort((a, b) => a.priority - b.priority);
    for (const { job } of candidates) {
      if (active >= STARTUP_LIMIT) break;
      job.started = true;
      active += 1;
      observer?.unobserve(job.element);
      const timer = window.setTimeout(() => job.release?.(), STARTUP_TIMEOUT_MS);
      job.release = () => {
        window.clearTimeout(timer);
        job.release = undefined;
        active -= 1;
        schedule();
      };
      job.start();
    }
  }

  function schedule() {
    if (frame || ![...jobs].some((job) => !job.started)) return;
    frame = window.requestAnimationFrame(pump);
    // A never-painted tab may deliver neither observer nor animation frames.
    // Recheck bounds on a timer, rather than making every distant item eligible.
    fallback = window.setTimeout(pump, OBSERVER_FALLBACK_MS);
  }

  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);

  return {
    add(element: HTMLElement, start: () => void) {
      const job: Job = { element, start, started: false };
      jobs.add(job);
      observer?.observe(element);
      schedule();
      return {
        complete: () => job.release?.(),
        cancel: () => {
          jobs.delete(job);
          observer?.unobserve(element);
          job.release?.();
          if (!jobs.size) {
            clearScheduled();
            observer?.disconnect();
            window.removeEventListener('scroll', schedule, true);
            window.removeEventListener('resize', schedule);
            document.removeEventListener('visibilitychange', schedule);
            queue = undefined;
          }
        },
      };
    },
  };
}

let queue: ReturnType<typeof createStartupQueue> | undefined;

/** Keep admitted examples mounted so scrolling never loses their live state. */
export function usePreviewStartup(key: string, element: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const request = useMemo(() => ({ key }), [key]);
  const [started, setStarted] = useState<typeof request>();
  const lease = useRef<{ complete: () => void; cancel: () => void } | null>(null);

  useEffect(() => {
    if (!enabled || !element.current) return;
    queue ??= createStartupQueue();
    const entry = queue.add(element.current, () => setStarted(request));
    lease.current = entry;
    return () => {
      lease.current = null;
      entry.cancel();
    };
  }, [element, enabled, request]);

  const complete = useCallback(() => lease.current?.complete(), []);
  return { started: started === request, complete };
}
