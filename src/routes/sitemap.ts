import type { LoaderFunctionArgs } from "react-router";
import { desaList, kecamatanList } from "../data/banjarMap";
import { getCatalog } from "../lib/open-data.server";
import { originOf } from "../lib/seo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = originOf(request);
  const urls: { path: string; lastmod?: string }[] = [
    { path: "/" },
    { path: "/open-data" },
    ...kecamatanList.map((k) => ({ path: `/kecamatan/${k.id}` })),
    ...desaList.map((d) => ({ path: `/desa/${d.id}` })),
  ];

  // Dataset dari API (bila API sedang bermasalah, sitemap tetap jalan tanpa bagian ini)
  try {
    const catalog = await getCatalog({ page: 1, perPage: 100 });
    for (const d of catalog.items) {
      urls.push({ path: `/open-data/${encodeURIComponent(d.slug)}`, lastmod: d.updatedAt?.slice(0, 10) });
    }
  } catch (err) {
    console.error("[sitemap] gagal memuat dataset:", err);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${esc(origin + u.path)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
