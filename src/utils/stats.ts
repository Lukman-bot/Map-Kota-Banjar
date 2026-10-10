import { desaList, kecamatanList, type Desa, type Kecamatan } from "../data/banjarMap";
import { profilDesa, type Ekonomi, type Ibadah, type Kesehatan, type Profil, type Sekolah } from "../data/profiles";

export const kecById = new Map<string, Kecamatan>(kecamatanList.map((k) => [k.id, k]));
export const desaById = new Map<string, Desa>(desaList.map((d) => [d.id, d]));
export const desaByKec = new Map<string, Desa[]>(
  kecamatanList.map((k) => [k.id, desaList.filter((d) => d.kecamatanId === k.id)])
);

export const JENIS_SEKOLAH: { key: keyof Sekolah; label: string; hint: string; color: string }[] = [
  { key: "paud", label: "TK / PAUD", hint: "TK, PAUD, RA", color: "#ff9f6b" },
  { key: "sd", label: "SD / MI", hint: "Sekolah Dasar, Madrasah Ibtidaiyah", color: "#ffc857" },
  { key: "smp", label: "SMP / MTs", hint: "Sekolah Menengah Pertama, Madrasah Tsanawiyah", color: "#9be28a" },
  { key: "sma", label: "SMA / MA", hint: "Sekolah Menengah Atas, Madrasah Aliyah", color: "#5fd0c5" },
  { key: "smk", label: "SMK", hint: "Sekolah Menengah Kejuruan", color: "#6aa9ff" },
  { key: "pt", label: "Perguruan Tinggi", hint: "Universitas, institut, sekolah tinggi, politeknik, akademi", color: "#c39bff" },
  { key: "lainnya", label: "Lainnya", hint: "SLB, PKBM, pesantren", color: "#ff8fb1" },
];

export interface Item<T> {
  key: keyof T;
  label: string;
  color: string;
}

export const JENIS_IBADAH: Item<Ibadah>[] = [
  { key: "masjid", label: "Masjid", color: "#5fd0c5" },
  { key: "musholla", label: "Musholla / Langgar", color: "#9be28a" },
  { key: "gereja", label: "Gereja", color: "#6aa9ff" },
  { key: "vihara", label: "Vihara", color: "#ffc857" },
  { key: "pura", label: "Pura", color: "#ff9f6b" },
];

export const JENIS_KESEHATAN: Item<Kesehatan>[] = [
  { key: "rumahSakit", label: "Rumah Sakit", color: "#ff7a7a" },
  { key: "puskesmas", label: "Puskesmas", color: "#ff9f6b" },
  { key: "pustu", label: "Pustu", color: "#ffc857" },
  { key: "klinik", label: "Klinik / Praktik Dokter", color: "#9be28a" },
  { key: "apotek", label: "Apotek", color: "#5fd0c5" },
  { key: "posyandu", label: "Posyandu", color: "#c39bff" },
];

export const JENIS_EKONOMI: Item<Ekonomi>[] = [
  { key: "pasar", label: "Pasar Tradisional", color: "#ffc857" },
  { key: "minimarket", label: "Minimarket", color: "#6aa9ff" },
  { key: "bank", label: "Bank / Koperasi", color: "#9be28a" },
];

const sumObj = (o: object) => (Object.values(o) as number[]).reduce((a, b) => a + b, 0);
export const sumSekolah = (s: Sekolah) => sumObj(s);
export const sumIbadah = (s: Ibadah) => sumObj(s);
export const sumKesehatan = (s: Kesehatan) => sumObj(s);
export const sumEkonomi = (s: Ekonomi) => sumObj(s);
export const density = (p: Profil) => (p.luasKm2 > 0 ? p.penduduk / p.luasKm2 : 0);
export const perempuan = (p: Profil) => p.penduduk - p.lakiLaki;

export function aggregate(list: Profil[]): Profil {
  const z: Profil = {
    penduduk: 0, lakiLaki: 0, kk: 0, luasKm2: 0, rw: 0, rt: 0,
    sekolah: { paud: 0, sd: 0, smp: 0, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 0, musholla: 0, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 0, klinik: 0, apotek: 0, posyandu: 0 },
    ekonomi: { pasar: 0, minimarket: 0, bank: 0 },
  };
  for (const p of list) {
    z.penduduk += p.penduduk;
    z.lakiLaki += p.lakiLaki;
    z.kk += p.kk;
    z.luasKm2 += p.luasKm2;
    z.rw += p.rw;
    z.rt += p.rt;
    for (const j of JENIS_SEKOLAH) z.sekolah[j.key] += p.sekolah[j.key];
    for (const j of JENIS_IBADAH) z.ibadah[j.key] += p.ibadah[j.key];
    for (const j of JENIS_KESEHATAN) z.kesehatan[j.key] += p.kesehatan[j.key];
    for (const j of JENIS_EKONOMI) z.ekonomi[j.key] += p.ekonomi[j.key];
  }
  z.luasKm2 = Math.round(z.luasKm2 * 100) / 100;
  return z;
}

export const profilKec = new Map<string, Profil>(
  kecamatanList.map((k) => [k.id, aggregate((desaByKec.get(k.id) ?? []).map((d) => profilDesa[d.id]))])
);
export const profilKota: Profil = aggregate([...profilKec.values()]);

export type SortKey = "nama" | "penduduk" | "luas" | "sekolah";

export const SORT_LABEL: Record<SortKey, string> = {
  nama: "Nama",
  penduduk: "Penduduk",
  luas: "Luas",
  sekolah: "Sekolah",
};

export const metricOf = (p: Profil, k: SortKey): number =>
  k === "penduduk" ? p.penduduk : k === "luas" ? p.luasKm2 : k === "sekolah" ? sumSekolah(p.sekolah) : 0;

export const fmt = (n: number, d = 0) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
