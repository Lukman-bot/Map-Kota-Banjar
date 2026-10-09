import { data, Link } from "react-router";
import { ArrowRight } from "lucide-react";

import type { Route } from "./+types/kecamatan-detail";
import { WilayahError } from "~/components/wilayah-error";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { breadcrumbJsonLd, buildMeta, SITE_NAME } from "~/lib/seo";
import { stagger } from "~/lib/utils";
import { getSiteUrl } from "~/lib/site.server";
import {
  desaByKecamatan,
  desaPath,
  kecamatanById,
  kecamatanPath,
} from "~/lib/wilayah";

export function loader({ params, request }: Route.LoaderArgs) {
  const kecamatan = kecamatanById.get(params.kecamatanSlug);
  if (!kecamatan) throw data(null, { status: 404 });

  const desa = (desaByKecamatan.get(kecamatan.id) ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return {
    siteUrl: getSiteUrl(request),
    kecamatan: { id: kecamatan.id, name: kecamatan.name, fill: kecamatan.fill },
    desa,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [
      { title: `Wilayah tidak ditemukan | ${SITE_NAME}` },
      { name: "robots", content: "noindex" },
    ];
  }

  const { siteUrl, kecamatan, desa } = data;
  const path = kecamatanPath(kecamatan.id);
  const namaDesa = desa.map((d) => d.name).join(", ");

  return buildMeta({
    siteUrl,
    path,
    title: `Kecamatan ${kecamatan.name}, Kota Banjar — ${desa.length} Desa/Kelurahan`,
    description: `Kecamatan ${kecamatan.name} di Kota Banjar, Jawa Barat, terdiri dari ${desa.length} desa/kelurahan: ${namaDesa}.`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AdministrativeArea",
        name: `Kecamatan ${kecamatan.name}`,
        url: `${siteUrl}${path}`,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: "Kota Banjar",
          url: siteUrl,
        },
        containsPlace: desa.map((d) => ({
          "@type": "AdministrativeArea",
          name: d.name,
          url: `${siteUrl}${desaPath(d.id)}`,
        })),
      },
      breadcrumbJsonLd(siteUrl, [
        { name: SITE_NAME, path: "/" },
        { name: `Kecamatan ${kecamatan.name}`, path },
      ]),
    ],
  });
}

export default function KecamatanDetail({ loaderData }: Route.ComponentProps) {
  const { kecamatan, desa } = loaderData;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-2 px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" preventScrollReset>
                  Beranda
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Kecamatan {kecamatan.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl font-semibold">Kecamatan {kecamatan.name}</h1>
        <div>
          <Badge variant="secondary" className="animate-pop-in">
            <span
              aria-hidden
              className="size-2 rounded-full border border-black/25"
              style={{ background: kecamatan.fill }}
            />
            {desa.length} desa/kelurahan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 text-sm">
        <p className="text-muted-foreground">
          Kecamatan {kecamatan.name} adalah salah satu kecamatan di Kota
          Banjar, Jawa Barat. Pilih desa/kelurahan untuk melihat detailnya.
        </p>
        <ul className="grid grid-cols-2 gap-1.5">
          {desa.map((d, i) => (
            <li
              key={d.id}
              className="animate-fade-up"
              style={stagger(i, 55, 120)}
            >
              <Button
                asChild
                variant="outline"
                size="sm"
                className="group w-full justify-start overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link to={desaPath(d.id)} preventScrollReset prefetch="intent">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full border border-black/25 transition-transform duration-200 group-hover:scale-150"
                    style={{ background: kecamatan.fill }}
                  />
                  <span className="truncate">{d.name}</span>
                  <ArrowRight className="ml-auto -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <WilayahError error={error} />;
}
