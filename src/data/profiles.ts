/**
 * DATA PROFIL WILAYAH
 * ------------------------------------------------------------------
 * ⚠️  DATA CONTOH (placeholder). Angka di bawah dibuat otomatis agar
 * tampilan bisa diuji; luas diturunkan dari proporsi poligon peta
 * (total 131,97 km²), penduduk, sekolah, tempat ibadah, fasilitas kesehatan, dan pasar adalah ESTIMASI, bukan data resmi.
 *
 * Ganti per baris dengan data asli (BPS / Dapodik / Disdukcapil).
 * Profil kecamatan & kota TIDAK perlu diisi: dihitung otomatis dari
 * penjumlahan desa (lihat utils/stats.ts).
 *
 * Kunci objek = `id` desa di data/banjarMap.ts.
 */

export interface Sekolah {
  paud: number; // TK / PAUD / RA
  sd: number; // SD / MI
  smp: number; // SMP / MTs
  sma: number; // SMA / MA
  smk: number; // SMK
  pt: number; // Perguruan tinggi (universitas, institut, sekolah tinggi, politeknik, akademi)
  lainnya: number; // SLB, PKBM, pesantren, dll.
}

export interface Ibadah {
  masjid: number;
  musholla: number; // musholla / langgar / surau
  gereja: number; // gereja Kristen & Katolik
  vihara: number;
  pura: number;
}

export interface Kesehatan {
  rumahSakit: number;
  puskesmas: number;
  pustu: number; // puskesmas pembantu
  klinik: number; // klinik / praktik dokter
  apotek: number;
  posyandu: number;
}

export interface Ekonomi {
  pasar: number; // pasar tradisional
  minimarket: number; // minimarket / toko modern
  bank: number; // bank & koperasi
}

export interface Profil {
  penduduk: number;
  lakiLaki: number; // perempuan = penduduk - lakiLaki
  kk: number; // jumlah kepala keluarga
  luasKm2: number;
  rw: number;
  rt: number;
  sekolah: Sekolah;
  ibadah: Ibadah;
  kesehatan: Kesehatan;
  ekonomi: Ekonomi;
}

/** Ubah ke false bila data di bawah sudah data resmi (menghilangkan catatan "data contoh"). */
export const DATA_CONTOH = true;

export const profilDesa: Record<string, Profil> = {
  jajawar: { penduduk: 6469, lakiLaki: 3229, kk: 1903, luasKm2: 2.36, rw: 5, rt: 20,
    sekolah: { paud: 3, sd: 3, smp: 1, sma: 1, smk: 0, pt: 0, lainnya: 1 },
    ibadah: { masjid: 8, musholla: 22, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 2, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  cibeureum: { penduduk: 12046, lakiLaki: 5964, kk: 3543, luasKm2: 4.01, rw: 9, rt: 36,
    sekolah: { paud: 7, sd: 5, smp: 1, sma: 1, smk: 1, pt: 0, lainnya: 0 },
    ibadah: { masjid: 14, musholla: 38, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 3, klinik: 3, apotek: 3, posyandu: 14 },
    ekonomi: { pasar: 0, minimarket: 6, bank: 0 } },
  balokang: { penduduk: 18314, lakiLaki: 9164, kk: 5386, luasKm2: 4.7, rw: 13, rt: 52,
    sekolah: { paud: 10, sd: 8, smp: 2, sma: 1, smk: 1, pt: 1, lainnya: 1 },
    ibadah: { masjid: 20, musholla: 57, gereja: 2, vihara: 1, pura: 0 },
    kesehatan: { rumahSakit: 1, puskesmas: 1, pustu: 3, klinik: 5, apotek: 7, posyandu: 19 },
    ekonomi: { pasar: 1, minimarket: 8, bank: 2 } },
  banjar: { penduduk: 10733, lakiLaki: 5325, kk: 3157, luasKm2: 3.87, rw: 8, rt: 40,
    sekolah: { paud: 6, sd: 5, smp: 1, sma: 1, smk: 0, pt: 1, lainnya: 1 },
    ibadah: { masjid: 11, musholla: 37, gereja: 2, vihara: 1, pura: 0 },
    kesehatan: { rumahSakit: 1, puskesmas: 1, pustu: 3, klinik: 3, apotek: 5, posyandu: 13 },
    ekonomi: { pasar: 1, minimarket: 4, bank: 3 } },
  mekarsari: { penduduk: 7882, lakiLaki: 3955, kk: 2318, luasKm2: 2.74, rw: 6, rt: 24,
    sekolah: { paud: 4, sd: 4, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 9, musholla: 26, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 2, apotek: 2, posyandu: 9 },
    ekonomi: { pasar: 0, minimarket: 4, bank: 0 } },
  neglasari: { penduduk: 14959, lakiLaki: 7597, kk: 4400, luasKm2: 4.87, rw: 11, rt: 55,
    sekolah: { paud: 8, sd: 6, smp: 1, sma: 0, smk: 1, pt: 1, lainnya: 1 },
    ibadah: { masjid: 18, musholla: 46, gereja: 1, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 3, klinik: 4, apotek: 4, posyandu: 17 },
    ekonomi: { pasar: 1, minimarket: 6, bank: 2 } },
  situbatu: { penduduk: 10030, lakiLaki: 4997, kk: 2950, luasKm2: 4.81, rw: 7, rt: 21,
    sekolah: { paud: 6, sd: 5, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 13, musholla: 32, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 2, klinik: 2, apotek: 3, posyandu: 11 },
    ekonomi: { pasar: 0, minimarket: 5, bank: 0 } },
  purwaharja: { penduduk: 7939, lakiLaki: 3930, kk: 2335, luasKm2: 6.6, rw: 6, rt: 30,
    sekolah: { paud: 5, sd: 4, smp: 1, sma: 1, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 10, musholla: 27, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 2, klinik: 2, apotek: 2, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 3, bank: 0 } },
  mekarharja: { penduduk: 5968, lakiLaki: 3019, kk: 1755, luasKm2: 4.51, rw: 4, rt: 16,
    sekolah: { paud: 3, sd: 3, smp: 0, sma: 0, smk: 1, pt: 0, lainnya: 0 },
    ibadah: { masjid: 6, musholla: 19, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 1, apotek: 2, posyandu: 6 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  raharja: { penduduk: 4454, lakiLaki: 2234, kk: 1310, luasKm2: 2.99, rw: 4, rt: 12,
    sekolah: { paud: 2, sd: 2, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 6, musholla: 14, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 1, apotek: 1, posyandu: 6 },
    ekonomi: { pasar: 0, minimarket: 3, bank: 0 } },
  karangpanimbal: { penduduk: 2881, lakiLaki: 1473, kk: 847, luasKm2: 3.71, rw: 4, rt: 20,
    sekolah: { paud: 2, sd: 1, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 1 },
    ibadah: { masjid: 5, musholla: 9, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 1, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  pataruman: { penduduk: 8853, lakiLaki: 4420, kk: 2604, luasKm2: 7.89, rw: 6, rt: 30,
    sekolah: { paud: 5, sd: 4, smp: 1, sma: 0, smk: 1, pt: 1, lainnya: 1 },
    ibadah: { masjid: 10, musholla: 30, gereja: 1, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 2, klinik: 3, apotek: 3, posyandu: 10 },
    ekonomi: { pasar: 1, minimarket: 4, bank: 1 } },
  hegarsari: { penduduk: 4003, lakiLaki: 1987, kk: 1177, luasKm2: 4.57, rw: 4, rt: 16,
    sekolah: { paud: 2, sd: 1, smp: 0, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 6, musholla: 12, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 1, posyandu: 6 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  binangun: { penduduk: 13046, lakiLaki: 6640, kk: 3837, luasKm2: 7.64, rw: 9, rt: 45,
    sekolah: { paud: 8, sd: 5, smp: 1, sma: 1, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 15, musholla: 44, gereja: 1, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 3, klinik: 3, apotek: 4, posyandu: 15 },
    ekonomi: { pasar: 0, minimarket: 5, bank: 1 } },
  sukamukti: { penduduk: 8007, lakiLaki: 4052, kk: 2355, luasKm2: 5.09, rw: 6, rt: 24,
    sekolah: { paud: 5, sd: 3, smp: 1, sma: 1, smk: 1, pt: 0, lainnya: 0 },
    ibadah: { masjid: 9, musholla: 25, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 2, apotek: 2, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 4, bank: 0 } },
  batulawang: { penduduk: 6745, lakiLaki: 3390, kk: 1984, luasKm2: 8.23, rw: 5, rt: 20,
    sekolah: { paud: 3, sd: 3, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 9, musholla: 21, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 2, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 3, bank: 0 } },
  karyamukti: { penduduk: 16649, lakiLaki: 8519, kk: 4897, luasKm2: 8.73, rw: 12, rt: 48,
    sekolah: { paud: 10, sd: 7, smp: 2, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 20, musholla: 54, gereja: 1, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 3, klinik: 4, apotek: 5, posyandu: 18 },
    ekonomi: { pasar: 1, minimarket: 7, bank: 1 } },
  mulyasari: { penduduk: 11473, lakiLaki: 5816, kk: 3374, luasKm2: 6.08, rw: 8, rt: 24,
    sekolah: { paud: 7, sd: 4, smp: 1, sma: 0, smk: 1, pt: 0, lainnya: 0 },
    ibadah: { masjid: 14, musholla: 37, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 2, klinik: 3, apotek: 3, posyandu: 11 },
    ekonomi: { pasar: 0, minimarket: 4, bank: 0 } },
  sinartanjung: { penduduk: 10234, lakiLaki: 5079, kk: 3010, luasKm2: 6.7, rw: 7, rt: 28,
    sekolah: { paud: 6, sd: 5, smp: 2, sma: 1, smk: 1, pt: 0, lainnya: 1 },
    ibadah: { masjid: 12, musholla: 34, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 3, klinik: 2, apotek: 3, posyandu: 11 },
    ekonomi: { pasar: 0, minimarket: 5, bank: 0 } },
  langensari: { penduduk: 3804, lakiLaki: 1906, kk: 1119, luasKm2: 3.23, rw: 4, rt: 20,
    sekolah: { paud: 2, sd: 2, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 1 },
    ibadah: { masjid: 5, musholla: 12, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 1, pustu: 1, klinik: 1, apotek: 1, posyandu: 7 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  waringinsari: { penduduk: 5761, lakiLaki: 2853, kk: 1694, luasKm2: 7.61, rw: 4, rt: 16,
    sekolah: { paud: 4, sd: 2, smp: 0, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 8, musholla: 19, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 1, apotek: 2, posyandu: 7 },
    ekonomi: { pasar: 0, minimarket: 3, bank: 0 } },
  rejasari: { penduduk: 6117, lakiLaki: 3119, kk: 1799, luasKm2: 9.77, rw: 4, rt: 12,
    sekolah: { paud: 4, sd: 3, smp: 1, sma: 0, smk: 0, pt: 0, lainnya: 1 },
    ibadah: { masjid: 6, musholla: 21, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 2, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  bojongkantong: { penduduk: 4248, lakiLaki: 2140, kk: 1249, luasKm2: 3.87, rw: 4, rt: 20,
    sekolah: { paud: 3, sd: 2, smp: 0, sma: 0, smk: 1, pt: 0, lainnya: 0 },
    ibadah: { masjid: 6, musholla: 14, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 1, klinik: 1, apotek: 1, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
  muktisari: { penduduk: 2488, lakiLaki: 1259, kk: 732, luasKm2: 3.73, rw: 4, rt: 16,
    sekolah: { paud: 1, sd: 2, smp: 0, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 5, musholla: 9, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 1, apotek: 1, posyandu: 8 },
    ekonomi: { pasar: 0, minimarket: 1, bank: 0 } },
  kujangsari: { penduduk: 2896, lakiLaki: 1466, kk: 852, luasKm2: 3.68, rw: 4, rt: 12,
    sekolah: { paud: 2, sd: 2, smp: 0, sma: 0, smk: 0, pt: 0, lainnya: 0 },
    ibadah: { masjid: 3, musholla: 10, gereja: 0, vihara: 0, pura: 0 },
    kesehatan: { rumahSakit: 0, puskesmas: 0, pustu: 2, klinik: 1, apotek: 1, posyandu: 6 },
    ekonomi: { pasar: 0, minimarket: 2, bank: 0 } },
};
