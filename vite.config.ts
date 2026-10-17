import { reactRouter } from "@react-router/dev/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

/** Folder kode aplikasi (react-router.config.ts → appDirectory: "src"). */
const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(({ mode }) => {
  // Vite tidak mengisi process.env dari file .env untuk kode server, padahal loader (SITE_URL, API_*) membacanya.
  // Di produksi, isi env dari hosting/Docker atau jalankan dengan `node --env-file=.env` (lihat README).
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;

  return {
    plugins: [reactRouter()],
    resolve: {
      // Alias "~/" → "src/". Harus sama dengan "paths" di tsconfig.json.
      alias: [{ find: /^~\//, replacement: `${srcDir}/` }],
    },
    ssr: {
      // GSAP memakai subpath tanpa ekstensi (gsap/ScrollTrigger); dibundel agar resolusi ESM di Node aman.
      noExternal: ["gsap"],
    },
  };
});
