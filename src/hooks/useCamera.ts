/** Kamera peta: (cx, cy) = titik peta di tengah layar, s = piksel per satuan peta. */
export interface Cam {
  cx: number;
  cy: number;
  s: number;
}

export interface Visible {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Interpolasi antar dua kamera. Zoom eksponensial; posisi mengikuti 1/s
 * sehingga titik fokus bergerak mulus (tidak "melayang") saat zoom in/out.
 */
export function lerpCam(a: Cam, b: Cam, f: number): Cam {
  if (f <= 0) return a;
  if (f >= 1) return b;
  const s = a.s * Math.pow(b.s / a.s, f);
  const ia = 1 / a.s;
  const ib = 1 / b.s;
  const g = Math.abs(ib - ia) < 1e-9 ? f : (1 / s - ia) / (ib - ia);
  return { cx: a.cx + (b.cx - a.cx) * g, cy: a.cy + (b.cy - a.cy) * g, s };
}

/** Dari ukuran layar & area yang kosong (tidak tertutup card), hitung kamera yang pas. */
export function fitCamera(
  bbox: { x: number; y: number; w: number; h: number },
  size: { w: number; h: number },
  vis: Visible,
  fill: number
): Cam {
  const vw = Math.max(50, vis.right - vis.left);
  const vh = Math.max(50, vis.bottom - vis.top);
  const s = Math.min((vw * fill) / bbox.w, (vh * fill) / bbox.h);
  const bcx = bbox.x + bbox.w / 2;
  const bcy = bbox.y + bbox.h / 2;
  const visCx = (vis.left + vis.right) / 2;
  const visCy = (vis.top + vis.bottom) / 2;
  return { s, cx: bcx + (size.w / 2 - visCx) / s, cy: bcy + (size.h / 2 - visCy) / s };
}
