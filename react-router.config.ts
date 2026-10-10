import type { Config } from "@react-router/dev/config";

export default {
  /** Kode aplikasi ada di `src/` (bukan `app/` bawaan). */
  appDirectory: "src",
  /** SSR aktif: setiap halaman dirender di server → bisa diindex & preview share (OG tags) terbaca. */
  ssr: true,
} satisfies Config;
