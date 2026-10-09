import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { MAP_HEIGHT, MAP_WIDTH } from "~/data/banjarMap";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 10;
const ZOOM_STEP = 1.5;
/** Jarak geser (px) sebelum gerakan dianggap "drag", bukan klik. */
const DRAG_THRESHOLD = 5;

/** k = level zoom, (x, y) = pojok kiri-atas area yang terlihat (koordinat peta). */
export interface View {
  k: number;
  x: number;
  y: number;
}

export const INITIAL_VIEW: View = { k: 1, x: 0, y: 0 };

interface Point {
  x: number;
  y: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Pastikan zoom dalam batas dan area terlihat tidak keluar dari peta. */
function clampView(v: View): View {
  const k = clamp(v.k, MIN_ZOOM, MAX_ZOOM);
  const w = MAP_WIDTH / k;
  const h = MAP_HEIGHT / k;
  return {
    k,
    x: clamp(v.x, 0, MAP_WIDTH - w),
    y: clamp(v.y, 0, MAP_HEIGHT - h),
  };
}

/**
 * Zoom ke level `nextK`, dengan titik (fx, fy) — pecahan 0..1 dari lebar/tinggi
 * layar — tetap berada di bawah kursor/jari.
 */
function zoomAt(v: View, nextK: number, fx: number, fy: number): View {
  const k = clamp(nextK, MIN_ZOOM, MAX_ZOOM);
  const px = v.x + fx * (MAP_WIDTH / v.k);
  const py = v.y + fy * (MAP_HEIGHT / v.k);
  return clampView({
    k,
    x: px - fx * (MAP_WIDTH / k),
    y: py - fy * (MAP_HEIGHT / k),
  });
}

/** Geser peta sebanyak dx/dy piksel layar. */
function panByPixels(v: View, dx: number, dy: number, rect: DOMRect): View {
  return clampView({
    k: v.k,
    x: v.x - (dx * (MAP_WIDTH / v.k)) / rect.width,
    y: v.y - (dy * (MAP_HEIGHT / v.k)) / rect.height,
  });
}

function measure(pointers: Map<number, Point>) {
  const [a, b] = [...pointers.values()];
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

/**
 * Zoom + pan untuk <svg> peta:
 * - roda mouse / pinch trackpad (zoom ke arah kursor)
 * - seret untuk menggeser, pinch dua jari di layar sentuh
 * - tombol zoom in / out / reset dan pintasan keyboard
 */
export function usePanZoom() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(INITIAL_VIEW);

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /** true bila gesture terakhir adalah drag/pinch → klik harus diabaikan. */
  const movedRef = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const travel = useRef(0);
  const lastPinch = useRef<ReturnType<typeof measure> | null>(null);

  // Roda mouse harus non-passive agar bisa preventDefault (React tidak mendukungnya).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      // Sudah mentok di zoom minimum & scroll turun → biarkan halaman ter-scroll.
      if (e.deltaY > 0 && viewRef.current.k <= MIN_ZOOM) return;
      e.preventDefault();

      const rect = svg.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      const factor = clamp(Math.exp(-e.deltaY * unit * 0.002), 0.5, 2);
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;

      setView((v) => zoomAt(v, v.k * factor, fx, fy));
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      movedRef.current = false;
      travel.current = 0;
    } else if (pointers.current.size === 2) {
      movedRef.current = true;
      lastPinch.current = measure(pointers.current);
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const prev = pointers.current.get(e.pointerId);
    if (!svg || !prev) return;

    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    const rect = svg.getBoundingClientRect();

    if (pointers.current.size === 1) {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      travel.current += Math.abs(dx) + Math.abs(dy);
      if (travel.current < DRAG_THRESHOLD) return;

      if (!movedRef.current) {
        movedRef.current = true;
        try {
          svg.setPointerCapture(e.pointerId);
        } catch {
          /* pointer sudah dilepas */
        }
      }
      setView((v) => panByPixels(v, dx, dy, rect));
    } else if (pointers.current.size === 2 && lastPinch.current) {
      const last = lastPinch.current;
      const now = measure(pointers.current);
      lastPinch.current = now;
      if (last.dist === 0) return;

      const fx = (now.mx - rect.left) / rect.width;
      const fy = (now.my - rect.top) / rect.height;
      const ratio = now.dist / last.dist;

      setView((v) =>
        panByPixels(zoomAt(v, v.k * ratio, fx, fy), now.mx - last.mx, now.my - last.my, rect)
      );
    }
  }, []);

  const onPointerEnd = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    lastPinch.current = null;
    const svg = svgRef.current;
    try {
      if (svg?.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    } catch {
      /* abaikan */
    }
  }, []);

  const zoomIn = useCallback(
    () => setView((v) => zoomAt(v, v.k * ZOOM_STEP, 0.5, 0.5)),
    []
  );
  const zoomOut = useCallback(
    () => setView((v) => zoomAt(v, v.k / ZOOM_STEP, 0.5, 0.5)),
    []
  );
  const reset = useCallback(() => setView(INITIAL_VIEW), []);

  /** Geser sebesar pecahan area yang terlihat (mis. 0.2 = 20%). */
  const panBy = useCallback(
    (fx: number, fy: number) =>
      setView((v) =>
        clampView({
          k: v.k,
          x: v.x + fx * (MAP_WIDTH / v.k),
          y: v.y + fy * (MAP_HEIGHT / v.k),
        })
      ),
    []
  );

  return {
    svgRef,
    view,
    movedRef,
    zoomIn,
    zoomOut,
    reset,
    panBy,
    svgHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
