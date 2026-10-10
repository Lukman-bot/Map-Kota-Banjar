# Peta Interaktif Kota Banjar

React + TypeScript + Vite + **GSAP ScrollTrigger** + **Three.js**.

## Alur penggunaan
1. **Selamat datang** — layar pembuka "Selamat datang di Peta Interaktif Kota Banjar".
2. **Scroll** — kecamatan muncul satu per satu (Banjar → Purwaharja → Pataruman → Langensari), kamera
   memperbesar tiap kecamatan, desa/kelurahannya muncul bergantian, sampai semuanya tampil.
3. **Three.js** — peta berubah menjadi balok 3D: hitungan **4 kecamatan**, lalu **25 desa/kelurahan**
   (tinggi balok desa mengikuti jumlah penduduk), kemudian kembali rata menjadi peta.
4. **"Ingin jelajahi data lain?"** — tombol *Ya, jelajahi peta* mengaktifkan peta.
5. **Klik kecamatan / desa** — kamera zoom in ke wilayah itu, lalu **card** muncul: penduduk, luas, pendidikan
   (TK/PAUD, SD, SMP, SMA, SMK, perguruan tinggi, lainnya), tempat ibadah, fasilitas kesehatan, pasar & ekonomi.

Selama pengantar, peta **tidak bisa diklik** dan **tidak ada card/panel**.

## Menjalankan
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil di dist/
npm run typecheck
```

## Struktur
| File | Fungsi |
|---|---|
| `src/hooks/useExperience.ts` | **Seluruh timeline ScrollTrigger** (pin + scrub). Atur urutan & durasi animasi di sini |
| `src/three/BanjarScene.ts` | Adegan Three.js: ekstrusi 3D desa/kecamatan, kamera ortografik yang disamakan dengan peta SVG |
| `src/components/MapSvg.tsx` | Peta SVG (kecamatan & desa), klik/hover, sorotan wilayah terpilih |
| `src/components/Beats.tsx` | Teks narasi: sambutan, keterangan kecamatan, hitungan, pertanyaan akhir |
| `src/components/InfoCard.tsx` | Card informasi kecamatan / desa |
| `src/components/ui.tsx` | Komponen kecil: statistik, batang rincian, daftar wilayah |
| `src/App.tsx` | Menyatukan semuanya: mode pengantar ↔ jelajah, kamera zoom, pencarian |
| `src/data/banjarMap.ts` | Poligon kecamatan & desa |
| `src/data/profiles.ts` | **Data per desa** (⚠️ masih DATA CONTOH → ganti dengan data resmi) |
| `src/utils/stats.ts` | Agregasi desa → kecamatan → kota, daftar jenis fasilitas |

## Mengatur animasi pengantar
Di `src/hooks/useExperience.ts`:
- `SCROLL_VH` = panjang scroll (kelipatan tinggi layar). Perbesar bila ingin lebih lambat.
- Posisi tiap tahap ditulis dalam satuan waktu timeline (`tl.to(S, {...}, waktuMulai)`).
- `scrub: 0.7` = kehalusan mengikuti scroll.

## Mengganti data
Edit `src/data/profiles.ts`. Tiap desa memiliki: `penduduk, lakiLaki, kk, luasKm2, rw, rt`, `sekolah`
(paud, sd, smp, sma, smk, pt, lainnya), `ibadah` (masjid, musholla, gereja, vihara, pura), `kesehatan`
(rumahSakit, puskesmas, pustu, klinik, apotek, posyandu), `ekonomi` (pasar, minimarket, bank).
Data kecamatan & kota dihitung otomatis. Set `DATA_CONTOH = false` bila sudah data asli.

Menambah jenis baru: tambah field di interface (`profiles.ts`), tambah daftar di `stats.ts`
(mis. `JENIS_KESEHATAN`) dan agregasinya, lalu tampilkan di `InfoCard.tsx`.

## Pintasan
`/` cari · `Esc` naik satu level · klik desa terpilih = kembali ke kecamatannya · tombol ↺ Pengantar = ulang dari awal
