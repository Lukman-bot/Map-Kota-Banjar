import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "Peta Kota Banjar";
export const OG_IMAGE_PATH = "/og-image.png";

export type JsonLd = Record<string, unknown>;

/** Potong teks agar aman untuk meta description (~160 karakter). */
export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

interface BuildMetaOptions {
  siteUrl: string;
  /** Path halaman, mis. "/" atau "/desa/jajawar" */
  path: string;
  title: string;
  description: string;
  jsonLd?: JsonLd[];
  noindex?: boolean;
}

/**
 * Meta tag lengkap untuk satu halaman: title, description, canonical,
 * Open Graph, Twitter Card, dan JSON-LD.
 *
 * React Router memakai `meta` dari route paling dalam saja, jadi setiap route
 * memanggil helper ini agar tag tidak ada yang hilang.
 */
export function buildMeta({
  siteUrl,
  path,
  title,
  description,
  jsonLd = [],
  noindex = false,
}: BuildMetaOptions): MetaDescriptor[] {
  const url = `${siteUrl}${path}`;
  const image = `${siteUrl}${OG_IMAGE_PATH}`;
  const desc = truncate(description);

  return [
    { title },
    { name: "description", content: desc },
    {
      name: "robots",
      content: noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large",
    },
    { tagName: "link", rel: "canonical", href: url },

    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "id_ID" },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Peta wilayah Kota Banjar berdasarkan kecamatan" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: desc },
    { name: "twitter:image", content: image },

    ...jsonLd.map((ld) => ({ "script:ld+json": ld })),
  ];
}

export function breadcrumbJsonLd(
  siteUrl: string,
  items: { name: string; path: string }[]
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}
