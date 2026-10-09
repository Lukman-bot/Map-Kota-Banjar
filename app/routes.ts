import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("routes/layout-peta.tsx", [
    index("routes/beranda.tsx"),
    route("kecamatan/:kecamatanSlug", "routes/kecamatan-detail.tsx"),
    route("desa/:desaSlug", "routes/desa-detail.tsx"),
  ]),
  route("sitemap.xml", "routes/sitemap-xml.ts"),
  route("robots.txt", "routes/robots-txt.ts"),
] satisfies RouteConfig;
