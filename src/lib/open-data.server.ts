/**
 * ADAPTER OPEN DATA
 * ------------------------------------------------------------------
 * Satu-satunya tempat yang tahu bentuk respons API. Bila API Anda berbeda, ubah HANYA file ini
 * (dan path/parameter di `api.server.ts`); UI tidak perlu disentuh.
 *
 * Kontrak yang diasumsikan (toleran terhadap beberapa variasi nama field):
 *
 *   GET /datasets?q=&category=&page=&per_page=
 *     → { data: Dataset[], meta: { page, per_page, total } }
 *   GET /datasets/{slug}
 *     → { data: Dataset }                (atau Dataset langsung)
 *   GET /datasets/{slug}/records?page=&per_page=
 *     → { data: Record<string, scalar>[], meta: { page, per_page, total } }
 *   GET /categories
 *     → { data: { name, count }[] }
 *
 *   Dataset = { id|slug, title|name, description, category, publisher|organization,
 *               updated_at|modified, license, tags[], row_count, columns[{key,label,type}],
 *               resources[{format,url,name}] }
 *
 * Bila API_BASE_URL kosong, adapter memakai data contoh lokal yang diturunkan dari data/profiles.ts.
 */
import { DATA_CONTOH, profilDesa } from "../data/profiles";
import { desaList } from "../data/banjarMap";
import { density, kecById, perempuan, sumEkonomi, sumIbadah, sumKesehatan, sumSekolah } from "../utils/stats";
import { ApiError, apiConfig, apiGet, mockMode } from "./api.server";
import type { Category, Cell, Column, DataRow, Dataset, Paged, Resource } from "./open-data.types";

export const dataSource: "api" | "mock" = mockMode ? "mock" : "api";

// ───────────────────────── pembantu normalisasi ─────────────────────────
type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const pick = (o: Raw, ...keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
/** string, atau objek { name | title } (mis. organization: { name: "Dinas ..." }) */
const label = (v: unknown, fallback = ""): string => (isObj(v) ? str(pick(v, "name", "title", "label"), fallback) : str(v, fallback));
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Ambil daftar item dari respons: array langsung, atau di dalam data / results / items. */
function rowsOf(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (isObj(body)) return list(pick(body, "data", "results", "items"));
  return [];
}

function pagedOf<T>(body: unknown, items: T[], page: number, perPage: number): Paged<T> {
  const root = isObj(body) ? body : {};
  const m = isObj(root.meta) ? root.meta : isObj(root.pagination) ? root.pagination : root;
  const total = num(pick(m, "total", "total_count", "count")) ?? items.length;
  const pp = num(pick(m, "per_page", "perPage", "page_size")) ?? perPage;
  const p = num(pick(m, "page", "current_page")) ?? page;
  return { items, page: p, perPage: pp, total, totalPages: Math.max(1, Math.ceil(total / Math.max(1, pp))) };
}

function normalizeColumn(raw: unknown): Column | null {
  if (typeof raw === "string") return { key: raw, label: raw, type: "text" };
  if (!isObj(raw)) return null;
  const key = str(pick(raw, "key", "name", "id"));
  if (!key) return null;
  const t = str(pick(raw, "type", "data_type")).toLowerCase();
  return { key, label: str(pick(raw, "label", "title"), key), type: ["number", "integer", "float", "numeric", "decimal"].includes(t) ? "number" : "text" };
}

function normalizeResource(raw: unknown): Resource | null {
  if (!isObj(raw)) return null;
  const url = str(pick(raw, "url", "download_url", "href"));
  if (!url) return null;
  return { url, format: str(pick(raw, "format", "type"), "FILE").toUpperCase(), name: str(pick(raw, "name", "title"), url) };
}

export function normalizeDataset(raw: unknown): Dataset {
  const r = isObj(raw) ? raw : {};
  const slug = str(pick(r, "slug", "id"));
  return {
    id: str(pick(r, "id", "slug")),
    slug,
    title: str(pick(r, "title", "name"), slug),
    description: str(pick(r, "description", "notes", "abstract")),
    category: label(pick(r, "category", "theme", "group"), "Lainnya"),
    publisher: label(pick(r, "publisher", "organization", "owner", "source"), "Pemerintah Kota Banjar"),
    updatedAt: str(pick(r, "updated_at", "updatedAt", "modified", "last_updated")) || null,
    license: label(pick(r, "license", "licence")) || null,
    tags: list(r.tags).map((t) => label(t)).filter(Boolean),
    rowCount: num(pick(r, "row_count", "rowCount", "records", "num_records")),
    columns: list(pick(r, "columns", "fields")).map(normalizeColumn).filter((c): c is Column => c !== null),
    resources: list(pick(r, "resources", "files")).map(normalizeResource).filter((x): x is Resource => x !== null),
  };
}

function normalizeRecord(raw: unknown): DataRow {
  const out: DataRow = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : (v as Cell);
  }
  return out;
}

// ───────────────────────── data contoh lokal (mode mock) ─────────────────────────
interface MockDataset extends Dataset {
  rows: DataRow[];
}

const MOCK_UPDATED = "2026-01-15T00:00:00Z";
const col = (key: string, label: string, type: Column["type"] = "number"): Column => ({ key, label, type });
const WILAYAH: Column[] = [col("kecamatan", "Kecamatan", "text"), col("desa", "Desa/Kelurahan", "text")];

function buildMock(): MockDataset[] {
  const base = desaList.map((d) => ({ p: profilDesa[d.id], wilayah: { kecamatan: kecById.get(d.kecamatanId)!.name, desa: d.name } }));
  const note = DATA_CONTOH ? " Data contoh untuk pengembangan, bukan data resmi." : "";

  const make = (slug: string, title: string, category: string, description: string, metrics: Column[], tags: string[], row: (p: (typeof base)[number]["p"]) => DataRow): MockDataset => {
    const rows = base.map((b) => ({ ...b.wilayah, ...row(b.p) }));
    const columns = [...WILAYAH, ...metrics];
    return {
      id: slug, slug, title, category, tags, columns, rows,
      description: description + note,
      publisher: "Pemerintah Kota Banjar",
      updatedAt: MOCK_UPDATED,
      license: "CC BY 4.0",
      rowCount: rows.length,
      resources: [],
    };
  };

  return [
    make("penduduk-per-desa", "Jumlah penduduk per desa/kelurahan", "Kependudukan",
      "Jumlah penduduk menurut jenis kelamin, kepala keluarga, luas wilayah, dan kepadatan untuk setiap desa dan kelurahan.",
      [col("penduduk", "Penduduk"), col("laki_laki", "Laki-laki"), col("perempuan", "Perempuan"), col("kk", "Kepala keluarga"), col("luas_km2", "Luas (km²)"), col("kepadatan", "Kepadatan (jiwa/km²)")],
      ["penduduk", "kependudukan", "kepadatan"],
      (p) => ({ penduduk: p.penduduk, laki_laki: p.lakiLaki, perempuan: perempuan(p), kk: p.kk, luas_km2: p.luasKm2, kepadatan: Math.round(density(p)) })),
    make("sekolah-per-desa", "Jumlah satuan pendidikan per desa/kelurahan", "Pendidikan",
      "Jumlah TK/PAUD, SD, SMP, SMA, SMK, perguruan tinggi, dan satuan pendidikan lainnya di tiap desa dan kelurahan.",
      [col("paud", "TK/PAUD"), col("sd", "SD/MI"), col("smp", "SMP/MTs"), col("sma", "SMA/MA"), col("smk", "SMK"), col("pt", "Perguruan tinggi"), col("lainnya", "Lainnya"), col("total", "Total")],
      ["sekolah", "pendidikan"],
      (p) => ({ ...p.sekolah, total: sumSekolah(p.sekolah) })),
    make("tempat-ibadah-per-desa", "Jumlah tempat ibadah per desa/kelurahan", "Keagamaan",
      "Jumlah masjid, musholla, gereja, vihara, dan pura di tiap desa dan kelurahan.",
      [col("masjid", "Masjid"), col("musholla", "Musholla/langgar"), col("gereja", "Gereja"), col("vihara", "Vihara"), col("pura", "Pura"), col("total", "Total")],
      ["ibadah", "agama"],
      (p) => ({ ...p.ibadah, total: sumIbadah(p.ibadah) })),
    make("fasilitas-kesehatan-per-desa", "Jumlah fasilitas kesehatan per desa/kelurahan", "Kesehatan",
      "Jumlah rumah sakit, puskesmas, pustu, klinik, apotek, dan posyandu di tiap desa dan kelurahan.",
      [col("rumah_sakit", "Rumah sakit"), col("puskesmas", "Puskesmas"), col("pustu", "Pustu"), col("klinik", "Klinik/praktik dokter"), col("apotek", "Apotek"), col("posyandu", "Posyandu"), col("total", "Total")],
      ["kesehatan", "puskesmas", "posyandu"],
      (p) => ({ rumah_sakit: p.kesehatan.rumahSakit, puskesmas: p.kesehatan.puskesmas, pustu: p.kesehatan.pustu, klinik: p.kesehatan.klinik, apotek: p.kesehatan.apotek, posyandu: p.kesehatan.posyandu, total: sumKesehatan(p.kesehatan) })),
    make("pasar-dan-ekonomi-per-desa", "Jumlah pasar dan sarana ekonomi per desa/kelurahan", "Ekonomi",
      "Jumlah pasar tradisional, minimarket, dan bank/koperasi di tiap desa dan kelurahan.",
      [col("pasar", "Pasar tradisional"), col("minimarket", "Minimarket"), col("bank", "Bank/koperasi"), col("total", "Total")],
      ["pasar", "ekonomi", "umkm"],
      (p) => ({ ...p.ekonomi, total: sumEkonomi(p.ekonomi) })),
  ];
}

let mockCache: MockDataset[] | null = null;
const mock = () => (mockCache ??= buildMock());
const stripRows = ({ rows: _rows, ...d }: MockDataset): Dataset => d;

function paginate<T>(all: T[], page: number, perPage: number): Paged<T> {
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const p = Math.min(Math.max(1, page), totalPages);
  return { items: all.slice((p - 1) * perPage, p * perPage), page: p, perPage, total: all.length, totalPages };
}

// ───────────────────────── fungsi publik (dipakai loader route) ─────────────────────────
export interface CatalogQuery {
  q?: string;
  category?: string;
  page: number;
  perPage: number;
}

export async function getCatalog({ q = "", category = "", page, perPage }: CatalogQuery): Promise<Paged<Dataset>> {
  if (mockMode) {
    const t = q.trim().toLowerCase();
    const all = mock()
      .filter((d) => !category || d.category.toLowerCase() === category.toLowerCase())
      .filter((d) => !t || `${d.title} ${d.description} ${d.category} ${d.tags.join(" ")}`.toLowerCase().includes(t))
      .map(stripRows);
    return paginate(all, page, perPage);
  }
  const { params, endpoints } = apiConfig;
  const body = await apiGet<unknown>(endpoints.datasets, {
    [params.search]: q,
    [params.category]: category,
    [params.page]: page,
    [params.perPage]: perPage,
  });
  return pagedOf(body, rowsOf(body).map(normalizeDataset), page, perPage);
}

/** Kategori hanya pelengkap filter: bila gagal, halaman tetap tampil tanpa filter kategori. */
export async function getCategories(): Promise<Category[]> {
  if (mockMode) {
    const counts = new Map<string, number>();
    for (const d of mock()) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count }));
  }
  try {
    const body = await apiGet<unknown>(apiConfig.endpoints.categories);
    return rowsOf(body)
      .map((r): Category => ({ name: label(isObj(r) ? pick(r, "name", "title", "category") : r), count: isObj(r) ? (num(pick(r, "count", "dataset_count", "datasets")) ?? 0) : 0 }))
      .filter((c) => c.name !== "");
  } catch (err) {
    console.error("[open-data] kategori gagal dimuat:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getDataset(slug: string): Promise<Dataset> {
  if (mockMode) {
    const d = mock().find((x) => x.slug === slug);
    if (!d) throw new ApiError(404, `Dataset ${slug} tidak ada`);
    return stripRows(d);
  }
  const body = await apiGet<unknown>(apiConfig.endpoints.dataset(slug));
  const raw = isObj(body) && isObj(body.data) ? body.data : body;
  const d = normalizeDataset(raw);
  if (!d.slug) throw new ApiError(404, `Dataset ${slug} tidak ada`);
  return d;
}

export async function getRecords(slug: string, { page, perPage }: { page: number; perPage: number }): Promise<Paged<DataRow>> {
  if (mockMode) {
    const d = mock().find((x) => x.slug === slug);
    if (!d) throw new ApiError(404, `Dataset ${slug} tidak ada`);
    return paginate(d.rows, page, perPage);
  }
  const body = await apiGet<unknown>(apiConfig.endpoints.records(slug), {
    [apiConfig.params.page]: page,
    [apiConfig.params.perPage]: perPage,
  });
  return pagedOf(body, rowsOf(body).map(normalizeRecord), page, perPage);
}

/** Ubah galat API menjadi Response HTTP yang jujur (404 tetap 404; sisanya 502/504) untuk ErrorBoundary. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof Response) return err;
  const status = err instanceof ApiError ? (err.status === 404 ? 404 : err.status === 504 ? 504 : 502) : 502;
  console.error("[open-data]", err instanceof Error ? err.message : err);
  const text = status === 404 ? "Data tidak ditemukan" : status === 504 ? "Layanan data terlalu lama merespons" : "Layanan data tidak dapat dihubungi";
  return new Response(text, { status, statusText: text });
}
