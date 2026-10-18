import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  /** Kode aplikasi ada di `src/` (bukan `app/` bawaan). */
  appDirectory: "src",
  /** SSR aktif: setiap halaman dirender di server → bisa diindex & preview share (OG tags) terbaca. */
  ssr: true,
  /** Preset Vercel: build SSR dijalankan sebagai serverless function di Vercel. */
  presets: [vercelPreset()],
} satisfies Config;
