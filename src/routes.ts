import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // ── Peta interaktif: satu layout, jadi pindah wilayah TIDAK me-remount peta/Three.js ──
  layout("routes/map-layout.tsx", [
    index("routes/map-home.tsx"),
    route("kecamatan/:id", "routes/map-kecamatan.tsx"),
    route("desa/:id", "routes/map-desa.tsx"),
  ]),

  // ── Open Data: template tersendiri (header, footer, CSS sendiri), data dari API ──
  route("open-data", "routes/open-data-layout.tsx", [
    index("routes/open-data-index.tsx"),
    route(":slug", "routes/open-data-detail.tsx"),
  ]),

  // ── SEO ──
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),

  // ── Selain itu: 404 sungguhan (status HTTP 404) ──
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
