/**
 * URL publik situs. Set `SITE_URL` di environment (mis. https://petabanjar.id)
 * agar canonical, Open Graph, dan sitemap selalu memakai domain yang benar,
 * terutama bila aplikasi berjalan di belakang reverse proxy.
 * Tanpa `SITE_URL`, dipakai origin dari request.
 */
export function getSiteUrl(request: Request): string {
  const configured = process.env.SITE_URL?.trim();
  const base = configured ? configured : new URL(request.url).origin;
  return base.replace(/\/+$/, "");
}
