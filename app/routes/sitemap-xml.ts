import type { Route } from "./+types/sitemap-xml";
import { desaList, kecamatanList } from "~/data/banjarMap";
import { getSiteUrl } from "~/lib/site.server";
import { desaPath, kecamatanPath } from "~/lib/wilayah";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function loader({ request }: Route.LoaderArgs) {
  const siteUrl = getSiteUrl(request);

  const paths = [
    "/",
    ...kecamatanList.map((k) => kecamatanPath(k.id)),
    ...desaList.map((d) => desaPath(d.id)),
  ];

  const urls = paths
    .map((p) => `  <url><loc>${escapeXml(`${siteUrl}${p}`)}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
