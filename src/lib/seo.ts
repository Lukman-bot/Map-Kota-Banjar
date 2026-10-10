import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "Peta Interaktif Kota Banjar";
export const OG_IMAGE_PATH = "/og-image.png"; // 1200×630, ada di public/

/**
 * Origin situs untuk URL absolut (canonical, og:url, og:image, sitemap).
 * Server: pakai env SITE_URL bila ada (penting di belakang reverse proxy), jika tidak, origin permintaan.
 * Browser: origin halaman.
 */
export function originOf(request: Request): string {
  const fromEnv = typeof process !== "undefined" ? process.env?.SITE_URL : undefined;
  return (fromEnv || new URL(request.url).origin).replace(/\/+$/, "");
}

export const truncate = (text: string, max = 160) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};

export interface SeoInput {
  title: string;
  description: string;
  origin: string;
  /** Path kanonik, mis. "/desa/jajawar" */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** true = jangan diindex (mis. hasil pencarian internal) */
  noindex?: boolean;
  /** Data terstruktur schema.org */
  jsonLd?: Record<string, unknown>;
}

/** Seluruh tag <head> untuk satu halaman: title, description, canonical, Open Graph, Twitter Card, JSON-LD. */
export function seoMeta(i: SeoInput): MetaDescriptor[] {
  const url = `${i.origin}${i.path === "/" ? "/" : i.path}`;
  const image = i.image ?? `${i.origin}${OG_IMAGE_PATH}`;
  const description = truncate(i.description);
  const tags: MetaDescriptor[] = [
    { title: i.title },
    { name: "description", content: description },
    { name: "robots", content: i.noindex ? "noindex,follow" : "index,follow,max-image-preview:large" },
    { tagName: "link", rel: "canonical", href: url },

    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "id_ID" },
    { property: "og:type", content: i.type ?? "website" },
    { property: "og:title", content: i.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: SITE_NAME },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: i.title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  if (i.jsonLd) tags.push({ "script:ld+json": { "@context": "https://schema.org", ...i.jsonLd } } as MetaDescriptor);
  return tags;
}
