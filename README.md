# Peta Kota Banjar

Peta interaktif Kota Banjar (4 kecamatan, 25 desa/kelurahan).

- **React Router v7** (framework mode) dengan **SSR** — setiap halaman dirender di server
- **Tailwind CSS v4** untuk styling
- **shadcn/ui** (style `new-york`, base color `slate`) untuk komponen
- Peta **3D interaktif dengan Three.js** (satu-satunya peta): putar, zoom, geser, tampak atas, label HTML, pin & riak untuk wilayah terpilih

## Menjalankan

```bash
npm install          # memasang three + @types/three
npm run dev          # http://localhost:5173
```

Produksi:

```bash
cp .env.example .env # isi SITE_URL dengan domain Anda
npm run build
SITE_URL=https://domain-anda.id npm start
```

Cek tipe: `npm run typecheck`

## Kontrol peta

| Aksi | Cara |
| --- | --- |
| Putar / miringkan | Seret dengan mouse atau satu jari |
| Zoom | Scroll mouse, cubit dua jari, tombol + / − |
| Geser | Klik kanan lalu seret, atau seret dengan dua jari |
| Tampak atas ↔ 3D | Tombol kubus |
| Putar otomatis | Tombol 3D berputar |
| Reset | Tombol reset atau tombol `0` |
| Pilih wilayah | Klik / tap desa (atau kecamatan, sesuai "Mode klik") |

Di zoom terjauh, scroll ke bawah tetap menggulung halaman. Di layar potret (HP), peta otomatis diputar 90° agar memenuhi layar.

## SEO

- `ssr: true` di `react-router.config.ts`; crawler (via `isbot`) menunggu halaman selesai dirender di `entry.server.tsx`.
- Setiap wilayah punya URL sendiri: `/`, `/kecamatan/:slug`, `/desa/:slug`. Daftar tautan `<a>` ke semua kecamatan & desa dirender di HTML (tersembunyi secara visual) sehingga bisa diikuti crawler, pembaca layar, dan keyboard. Jika WebGL tidak tersedia, daftar itu ditampilkan sebagai fallback.
- Meta tag per halaman (title, description, canonical, Open Graph, Twitter Card) dan JSON-LD (`WebSite`, `AdministrativeArea`, `BreadcrumbList`) dibuat oleh `app/lib/seo.ts`.
- `/sitemap.xml` dan `/robots.txt` dibuat otomatis dari data wilayah.
- Wilayah yang tidak ada mengembalikan status HTTP 404.
- **Set `SITE_URL`** agar canonical, Open Graph, dan sitemap memakai domain yang benar.
- Gambar pratinjau: `public/og-image.png` (1200×630).

## Struktur

```
app/
  routes.ts
  root.tsx
  app.css
  entry.client.tsx
  entry.server.tsx
  routes/
    layout-peta.tsx
    beranda.tsx
    kecamatan-detail.tsx
    desa-detail.tsx
    sitemap-xml.ts
    robots-txt.ts
  components/
    three/
      banjar-map-3d.tsx        # komponen React: peta 3D + kontrol UI
      create-banjar-scene.ts   # scene Three.js (client-only, import dinamis)
    map/
      map-legend.tsx
    ui/
    wilayah-error.tsx
  lib/
    geometry.ts
    seo.ts
    site.server.ts
    utils.ts
    wilayah.ts
  data/
    banjarMap.ts
```

## Menambah komponen shadcn/ui

```bash
npx shadcn@latest add dialog
```

`components.json` sudah dikonfigurasi (alias `~/components`, `~/lib/utils`).

## Catatan data

Bentuk wilayah diekstrak dari gambar peta dan disederhanakan menjadi poligon, jadi bukan data administrasi resmi. Untuk akurasi penuh, ganti `desaList` di `app/data/banjarMap.ts` dengan hasil konversi GeoJSON batas desa (BIG/BPS) ke format `points`.

## Peta 3D (Three.js)

Kode di `app/components/three/`, memakai data poligon di `app/data/banjarMap.ts`.

- Desa di-extrude jadi peta timbul dan "tumbuh" dari tengah ke luar saat dimuat; tinggi per kecamatan bersifat ilustratif.
- Kontrol: `OrbitControls` (putar, zoom ke arah kursor, geser terbatas) + tombol zoom, tampak atas, putar otomatis, reset.
- Hover: desa terangkat + tooltip. Klik/tap: pindah halaman. Mode klik "Per Kecamatan" mengangkat seluruh kecamatan.
- Wilayah terpilih (dari URL) terangkat, menyala, diberi pin dan riak; wilayah lain meredup.
- Label desa/kecamatan berupa HTML (`CSS2DRenderer`), ukurannya mengikuti zoom; label desa disembunyikan saat terlalu kecil dan bisa dimatikan lewat switch.
- Responsif: tinggi peta menyesuaikan viewport, kamera dihitung ulang lewat `ResizeObserver`, peta diputar 90° di layar potret, tombol dan petunjuk menyesuaikan ukuran layar.
- Hemat daya: loop berhenti saat peta tidak terlihat atau tab tidak aktif; DPR dibatasi 2.
- Menghormati `prefers-reduced-motion` (tanpa animasi, render hanya saat ada interaksi).
- SSR-safe: `three` di-import dinamis di `useEffect`.
