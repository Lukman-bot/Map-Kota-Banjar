import {
  desaList,
  kecamatanList,
  type Desa,
  type Kecamatan,
} from "~/data/banjarMap";

/** Lookup berbasis Map (aman dari key seperti "constructor"). */
export const kecamatanById = new Map<string, Kecamatan>(
  kecamatanList.map((k) => [k.id, k])
);

export const desaById = new Map<string, Desa>(desaList.map((d) => [d.id, d]));

export const desaByKecamatan = new Map<string, Desa[]>(
  kecamatanList.map((k) => [k.id, desaList.filter((d) => d.kecamatanId === k.id)])
);

export const kecamatanPath = (id: string) => `/kecamatan/${id}`;
export const desaPath = (id: string) => `/desa/${id}`;
