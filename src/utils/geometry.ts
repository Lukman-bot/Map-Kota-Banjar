import type { Desa, Pt } from "../data/banjarMap";

/** Ubah daftar titik menjadi atribut `d` untuk <path> */
export const toPath = (pts: Pt[]): string =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

/** Luas poligon (selalu positif) */
export function polygonArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

/** Titik tengah (centroid) poligon, dipakai untuk posisi label */
export function centroid(pts: Pt[]): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

interface Edge {
  a: Pt;
  b: Pt;
  kec: Set<string>;
  count: number;
}

/** Kumpulkan semua sisi poligon; sisi yang dipakai bersama digabung. */
function collectEdges(list: Desa[]): Edge[] {
  const map = new Map<string, Edge>();
  for (const d of list) {
    const n = d.points.length;
    for (let i = 0; i < n; i++) {
      const a = d.points[i];
      const b = d.points[(i + 1) % n];
      const ka = `${a[0]},${a[1]}`;
      const kb = `${b[0]},${b[1]}`;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = map.get(key);
      if (e) {
        e.count++;
        e.kec.add(d.kecamatanId);
      } else {
        map.set(key, { a, b, kec: new Set([d.kecamatanId]), count: 1 });
      }
    }
  }
  return [...map.values()];
}

const edgesToPath = (edges: Edge[]) =>
  edges.map((e) => `M${e.a[0]},${e.a[1]} L${e.b[0]},${e.b[1]}`).join(" ");

/** Garis batas antar KECAMATAN (sisi luar + sisi yang memisahkan dua kecamatan) */
export const kecamatanBorderPath = (all: Desa[]): string =>
  edgesToPath(collectEdges(all).filter((e) => e.count === 1 || e.kec.size > 1));

/** Garis tepi luar dari sekumpulan desa (mis. satu kecamatan utuh) */
export const outlinePath = (list: Desa[]): string =>
  edgesToPath(collectEdges(list).filter((e) => e.count === 1));
