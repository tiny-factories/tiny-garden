"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { LayoutGrid, LayoutList, Square } from "lucide-react";

export type ViewMode = "single" | "grid" | "list";

const VIEW_ICON = { size: 18, strokeWidth: 1.75, className: "shrink-0" as const };

const DRAG_THRESHOLD_PX = 6;

const THUMB_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const THUMB_DURATION_MS = 520;
const THUMB_DURATION_REDUCED_MS = 200;

/** Horizontal inset: thumb `left-0.5` + right margin (grid `inset-x-0.5`). */
const TRACK_EDGE_INSET_PX = 2;
const SEGMENT_TRACK_HORIZONTAL_INSET_PX = TRACK_EDGE_INSET_PX * 2;

function useSegmentWidth(
  trackRef: RefObject<HTMLElement | null>,
  segmentCount: number
) {
  const [segmentPx, setSegmentPx] = useState(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || segmentCount < 1) return;

    const measure = () => {
      const cw = el.clientWidth;
      const inner = Math.max(0, cw - SEGMENT_TRACK_HORIZONTAL_INSET_PX);
      setSegmentPx(inner / segmentCount);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [trackRef, segmentCount]);

  return segmentPx;
}

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
  className = "",
  labelClassName = "",
}: {
  segments: readonly SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
  /** Extra classes on each segment cell (e.g. `text-xs font-medium`) */
  labelClassName?: string;
}) {
  const n = segments.length;
  const maxIdx = Math.max(0, n - 1);

  const trackRef = useRef<HTMLDivElement>(null);
  const segmentPx = useSegmentWidth(trackRef, n);
  const indexRaw = segments.findIndex((s) => s.value === value);
  const index = indexRaw >= 0 ? indexRaw : 0;
  const restingX = index * segmentPx;

  const [dragThumbX, setDragThumbX] = useState<number | null>(null);
  const [settleX, setSettleX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMqChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onMqChange);
    return () => mq.removeEventListener("change", onMqChange);
  }, []);

  const dragThumbXRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDragGestureRef = useRef(false);

  useEffect(() => {
    const base = settleX !== null ? settleX : restingX;
    dragThumbXRef.current = dragThumbX ?? base;
  }, [dragThumbX, restingX, settleX]);

  useLayoutEffect(() => {
    if (settleX === null) return;
    if (segmentPx <= 0) {
      setSettleX(null);
      return;
    }
    if (Math.abs(settleX - restingX) < 0.5) {
      setSettleX(null);
    }
  }, [restingX, settleX, segmentPx, value]);

  const clampThumb = useCallback(
    (clientX: number, innerLeft: number) => {
      const w = segmentPx;
      if (w <= 0) return 0;
      const maxX = maxIdx * w;
      const x = clientX - innerLeft;
      return Math.max(0, Math.min(maxX, x - w / 2));
    },
    [segmentPx, maxIdx]
  );

  /** Viewport X where segment index 0 starts (padding edge + `left-0.5`). */
  const getSegmentTrackLeft = (track: HTMLDivElement) => {
    const rect = track.getBoundingClientRect();
    const bl = parseFloat(getComputedStyle(track).borderLeftWidth) || 0;
    return rect.left + bl + TRACK_EDGE_INSET_PX;
  };

  const endPointerSession = useCallback(
    (e: PointerEvent) => {
      const track = trackRef.current;
      if (track) {
        try {
          track.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }
      const w = segmentPx;
      const x = dragThumbXRef.current;
      const nearest = w > 0 ? Math.round(x / w) : 0;
      const idx = Math.max(0, Math.min(maxIdx, nearest));
      const nextVal = segments[idx]!.value;
      const snapPos = idx * w;

      setIsDragging(false);
      setSettleX(snapPos);
      setDragThumbX(null);
      pointerStartRef.current = null;
      isDragGestureRef.current = false;

      if (nextVal !== value) {
        onChange(nextVal);
      }
    },
    [maxIdx, onChange, segmentPx, segments, value]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || segmentPx <= 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDragGestureRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || segmentPx <= 0)
      return;
    const start = pointerStartRef.current;
    if (!start) return;

    const trackLeft = getSegmentTrackLeft(e.currentTarget);
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (!isDragGestureRef.current) {
      if (dist < DRAG_THRESHOLD_PX) return;
      isDragGestureRef.current = true;
      setIsDragging(true);
    }

    const thumbLeft = clampThumb(e.clientX, trackLeft);
    dragThumbXRef.current = thumbLeft;
    setDragThumbX(thumbLeft);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const w = segmentPx;
    const trackLeft = getSegmentTrackLeft(e.currentTarget);

    if (!isDragGestureRef.current && w > 0) {
      const segmentIndex = Math.min(
        maxIdx,
        Math.max(0, Math.floor((e.clientX - trackLeft) / w))
      );
      const tapVal = segments[segmentIndex]!.value;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setIsDragging(false);
      setDragThumbX(null);
      pointerStartRef.current = null;
      isDragGestureRef.current = false;
      if (tapVal !== value) {
        setSettleX(segmentIndex * w);
        onChange(tapVal);
      }
      return;
    }

    endPointerSession(e.nativeEvent);
  };

  const thumbX =
    dragThumbX !== null ? dragThumbX : settleX !== null ? settleX : restingX;
  const thumbTransform =
    segmentPx > 0 ? `translate3d(${thumbX}px, 0, 0)` : undefined;
  const previewIndex =
    segmentPx > 0
      ? Math.max(0, Math.min(maxIdx, Math.round(thumbX / segmentPx)))
      : index;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(maxIdx, index + 1);
      if (next !== index) onChange(segments[next]!.value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(0, index - 1);
      if (next !== index) onChange(segments[next]!.value);
    }
  };

  const thumbTransition = isDragging
    ? "none"
    : prefersReducedMotion
      ? `transform ${THUMB_DURATION_REDUCED_MS}ms ease-out`
      : `transform ${THUMB_DURATION_MS}ms ${THUMB_EASE}`;

  const thumbWidthFallback =
    n > 0 ? `calc((100% - 4px) / ${n})` : "33.333%";

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`relative h-9 touch-none overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-0.5 py-0.5 box-border select-none [-webkit-tap-highlight-color:transparent] outline-none transition-colors duration-150 hover:bg-neutral-100/90 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => endPointerSession(e.nativeEvent)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded bg-neutral-900 will-change-transform backface-hidden"
        style={{
          width: segmentPx > 0 ? `${segmentPx}px` : thumbWidthFallback,
          transform:
            thumbTransform ?? `translate3d(calc(${index} * 100%), 0, 0)`,
          transition: thumbTransition,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0.5 inset-x-0.5 z-10 grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {segments.map((seg, i) => (
          <span
            key={seg.value}
            className={`flex min-w-0 items-center justify-center transition-colors duration-520 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-200 motion-reduce:ease-out ${
              previewIndex === i ? "text-white" : "text-neutral-500"
            } ${labelClassName}`}
          >
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LayoutModeSwitch({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}) {
  return (
    <SegmentedControl<ViewMode>
      segments={[
        { value: "single", label: <Square {...VIEW_ICON} aria-hidden /> },
        { value: "grid", label: <LayoutGrid {...VIEW_ICON} aria-hidden /> },
        { value: "list", label: <LayoutList {...VIEW_ICON} aria-hidden /> },
      ]}
      value={viewMode}
      onChange={onViewModeChange}
      ariaLabel="Layout"
      className="min-w-23 shrink-0"
    />
  );
}

interface ToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  children?: React.ReactNode;
}

const searchInputClassName =
  "h-9 min-w-0 flex-1 w-full box-border text-sm px-3 border border-neutral-200 rounded outline-none focus:border-neutral-400 transition-colors";

export function Toolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode,
  onViewModeChange,
  children,
}: ToolbarProps) {
  const hasViewSwitch = Boolean(onViewModeChange && viewMode);
  const hasSearch = onSearchChange !== undefined;
  const hasChildren = children != null;

  const searchInput = onSearchChange ? (
    <input
      type="text"
      value={search || ""}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={searchPlaceholder}
      className={searchInputClassName}
    />
  ) : null;

  if (hasSearch && hasViewSwitch && !hasChildren && viewMode && onViewModeChange) {
    return (
      <div className="mb-4 flex items-center gap-2">
        {searchInput}
        <LayoutModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    );
  }

  const hasTopRow = hasChildren || hasViewSwitch;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {hasTopRow && (
        <div className="flex items-center gap-2 justify-between">
          <div className="flex min-w-0 items-center gap-2">{children}</div>
          {hasViewSwitch && viewMode && onViewModeChange && (
            <LayoutModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
          )}
        </div>
      )}
      {searchInput}
    </div>
  );
}
