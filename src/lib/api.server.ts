/**
 * KONFIGURASI & KLIEN API
 * ------------------------------------------------------------------
 * File `.server.ts` → TIDAK PERNAH ikut ke bundel browser. Semua panggilan API dilakukan dari server
 * (loader route), jadi kunci API aman dan tidak perlu mengatur CORS. Hasilnya dirender sebagai HTML
 * (bisa diindex) dan dikirim ke browser lewat mekanisme data bawaan React Router.
 *
 * Atur lewat environment variable (lihat .env.example):
 *   API_BASE_URL      URL dasar API, mis. https://api.banjarkota.go.id/v1   (kosong = data contoh lokal)
 *   API_TIMEOUT_MS    batas waktu per permintaan (default 8000)
 *   API_KEY           kunci API (opsional)
 *   API_AUTH_HEADER   nama header kunci (default "Authorization")
 *   API_AUTH_SCHEME   awalan nilai header (default "Bearer"; kosongkan untuk kunci polos, mis. X-API-Key)
 *
 * Path endpoint & nama parameter query bisa diubah di `apiConfig` di bawah bila API berbeda.
 */

const env = process.env;

export const apiConfig = {
  baseUrl: (env.API_BASE_URL ?? "").trim().replace(/\/+$/, ""),
  timeoutMs: Number(env.API_TIMEOUT_MS) > 0 ? Number(env.API_TIMEOUT_MS) : 8000,
  apiKey: env.API_KEY ?? "",
  authHeader: env.API_AUTH_HEADER || "Authorization",
  authScheme: env.API_AUTH_SCHEME === undefined ? "Bearer" : env.API_AUTH_SCHEME,

  /** Path endpoint (relatif terhadap baseUrl) */
  endpoints: {
    datasets: "/datasets",
    dataset: (slug: string) => `/datasets/${encodeURIComponent(slug)}`,
    records: (slug: string) => `/datasets/${encodeURIComponent(slug)}/records`,
    categories: "/categories",
  },

  /** Nama parameter query yang dipakai API */
  params: { search: "q", category: "category", page: "page", perPage: "per_page" },
};

/** true bila API_BASE_URL belum diisi → pakai data contoh lokal (lihat open-data.server.ts) */
export const mockMode = apiConfig.baseUrl === "";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Query = Record<string, string | number | null | undefined>;

/** GET JSON dari API, lengkap dengan header kunci, batas waktu, dan galat yang seragam. */
export async function apiGet<T>(path: string, query: Query = {}): Promise<T> {
  const url = new URL(apiConfig.baseUrl + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiConfig.apiKey) {
    headers[apiConfig.authHeader] = apiConfig.authScheme ? `${apiConfig.authScheme} ${apiConfig.apiKey}` : apiConfig.apiKey;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), apiConfig.timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new ApiError(res.status, `API ${res.status} ${res.statusText} — ${url.pathname}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new ApiError(504, `API timeout setelah ${apiConfig.timeoutMs} ms — ${url.pathname}`);
    throw new ApiError(502, `API tidak dapat dihubungi — ${url.pathname}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
