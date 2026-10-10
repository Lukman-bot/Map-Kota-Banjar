# Peta Interaktif Kota Banjar

React 18 + TypeScript + **React Router v7 (framework mode, SSR)** + Vite + GSAP ScrollTrigger + Three.js.

## Halaman

| URL | Isi | Template |
|---|---|---|
| `/` | Pengantar scroll → peta interaktif | Peta (gelap, imersif) |
| `/kecamatan/:id` | Peta zoom ke kecamatan + card | Peta |
| `/desa/:id` | Peta zoom ke desa/kelurahan + card | Peta |
| `/open-data` | Katalog dataset (cari, filter kategori, halaman) | **Open Data** (terang, tabel) — data dari API |
| `/open-data/:slug` | Detail dataset + pratinjau tabel + unduhan | Open Data |
| `/sitemap.xml`, `/robots.txt` | SEO (dibuat dinamis) | — |

Tautan lama berbentuk `#/desa/jajawar` otomatis dialihkan ke `/desa/jajawar`.

## Menjalankan
```bash
cp .env.example .env     # lalu isi SITE_URL dan (nanti) API_BASE_URL
npm install
npm run dev              # http://localhost:5173
npm run typecheck
npm run build && npm start   # produksi, http://localhost:3000
```
Produksi membaca env dari hosting/Docker. Bila memakai file `.env` di server:
```bash
node --env-file=.env node_modules/.bin/react-router-serve ./build/server/index.js
```

## SSR, indeks mesin pencari, dan pratinjau share
- `react-router.config.ts` → `ssr: true`. Setiap URL dirender di server menjadi HTML lengkap.
- `src/entry.server.tsx`: crawler (Googlebot, WhatsApp, Facebook, X, dll.) menunggu HTML selesai (`onAllReady`).
- Tiap halaman menghasilkan `<title>`, description, canonical, Open Graph, Twitter Card, dan JSON-LD lewat `meta()`
  (`src/lib/seo.ts`, `src/lib/map-seo.ts`). Gambar share: `public/og-image.png` (1200×630).
- Alamat tak dikenal / id wilayah salah / dataset tak ada → status HTTP **404** sungguhan. API mati → 502/504.
- Hasil pencarian & halaman lanjutan Open Data diberi `noindex`; canonical tetap `/open-data`.
- **Isi `SITE_URL`** di produksi, supaya canonical, `og:url`, `og:image`, dan sitemap memakai domain yang benar.

Cek cepat seperti yang dilihat crawler:
```bash
curl -s -A "facebookexternalhit/1.1" http://localhost:3000/desa/jajawar | grep -E "<title>|og:|canonical"
```

## Open Data & API
Semua panggilan API terjadi **di server** (loader route) — kunci API tidak pernah sampai ke browser dan tidak butuh CORS.

| File | Fungsi |
|---|---|
| `src/lib/api.server.ts` | **Konfigurasi API**: base URL, timeout, header kunci, path endpoint, nama parameter query + klien `apiGet()` |
| `src/lib/open-data.server.ts` | **Adapter**: memetakan respons API → tipe UI. Ubah di sini bila bentuk respons API berbeda |
| `src/lib/open-data.types.ts` | Tipe `Dataset`, `Column`, `Paged`, … |
| `src/routes/open-data-*.tsx` | Layout, katalog, detail |
| `src/components/open-data/` | Shell (header/footer), tabel, pagination |
| `src/styles/open-data.css` | Gaya Open Data (terpisah dari `map.css`) |

Env: `API_BASE_URL`, `API_TIMEOUT_MS`, `API_KEY`, `API_AUTH_HEADER`, `API_AUTH_SCHEME` (lihat `.env.example`).
**Bila `API_BASE_URL` kosong**, halaman memakai data contoh lokal yang diturunkan dari `data/profiles.ts`, jadi tampilan bisa dicoba sebelum API siap.

Kontrak API yang diasumsikan:
```
GET /datasets?q=&category=&page=&per_page=   → { data: Dataset[], meta: { page, per_page, total } }
GET /datasets/{slug}                          → { data: Dataset }
GET /datasets/{slug}/records?page=&per_page=  → { data: { ...kolom }[], meta: { page, per_page, total } }
GET /categories                               → { data: { name, count }[] }
Dataset = { id|slug, title|name, description, category, publisher|organization, updated_at,
            license, tags[], row_count, columns[{key,label,type}], resources[{format,url,name}] }
```

## Alias impor
`~/` menunjuk ke `src/` (mis. `import X from "~/components/X"`). Didefinisikan di `tsconfig.json` (`paths`) dan `vite.config.ts` (`resolve.alias`); keduanya harus sama.

## Struktur
```
src/
  root.tsx              dokumen HTML, font, ErrorBoundary
  routes.ts             tabel rute
  entry.client.tsx / entry.server.tsx
  routes/               map-layout (+ anak: home, kecamatan, desa), open-data-*, sitemap, robots, not-found
  components/           MapApp (dulu App.tsx), MapSvg, InfoCard, Beats, SearchBox, ui, open-data/
  hooks/                useExperience (timeline GSAP), useSelection (kini berbasis URL), …
  lib/                  seo, map-seo, api.server, open-data.server, format
  styles/               base.css, map.css, open-data.css
  data/ three/ utils/   (tidak berubah)
```
`/`, `/kecamatan/:id`, `/desa/:id` berbagi **satu layout route**, jadi pindah wilayah hanya mengganti URL; peta, kamera,
dan Three.js tidak dimuat ulang.

## Mengganti data peta
Edit `src/data/profiles.ts` (⚠️ saat ini **DATA CONTOH**) lalu set `DATA_CONTOH = false`. Selama masih `true`,
deskripsi SEO menambahkan "(data contoh)".

## Pintasan peta
`/` cari · `Esc` naik satu level · klik desa terpilih = kembali ke kecamatannya · ↺ Pengantar = ulang dari awal

## Troubleshooting: "Cannot find module '~/...' atau './+types/...'"
1. Jalankan `npm install` lalu `npm run typecheck` (menjalankan `react-router typegen` yang membuat folder `.react-router/types`; folder ini tidak ikut di-commit).
2. Pastikan editor memakai TypeScript proyek: VS Code → `Ctrl+Shift+P` → **TypeScript: Select TypeScript Version** → *Use Workspace Version*, lalu **TypeScript: Restart TS Server**.
3. Kode aplikasi hanya ada di `src/`. Jangan membuat folder `app/` lagi: file di luar `include` tsconfig tidak mengenal alias `~/` dan tipe `+types`.
