import { data, Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { Route } from "./+types/desa-detail";
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
import { CopyLinkButton } from "~/components/copy-link-button";
import { breadcrumbJsonLd, buildMeta, SITE_NAME } from "~/lib/seo";
import { cn, stagger } from "~/lib/utils";
import { getSiteUrl } from "~/lib/site.server";
import {
  desaById,
  desaByKecamatan,
  desaPath,
  kecamatanById,
  kecamatanPath,
} from "~/lib/wilayah";

export function loader({ params, request }: Route.LoaderArgs) {
  const desa = desaById.get(params.desaSlug);
  const kecamatan = desa ? kecamatanById.get(desa.kecamatanId) : undefined;
  if (!desa || !kecamatan) throw data(null, { status: 404 });

  const semua = (desaByKecamatan.get(kecamatan.id) ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));
  const lainnya = semua.filter((d) => d.id !== desa.id);
  const indeks = semua.findIndex((d) => d.id === desa.id);
  const prev = semua.length > 1 ? semua[(indeks - 1 + semua.length) % semua.length] : null;
  const next = semua.length > 1 ? semua[(indeks + 1) % semua.length] : null;

  return {
    siteUrl: getSiteUrl(request),
    desa: { id: desa.id, name: desa.name },
    kecamatan: { id: kecamatan.id, name: kecamatan.name, fill: kecamatan.fill },
    lainnya,
    semua,
    indeks,
    prev,
    next,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [
      { title: `Wilayah tidak ditemukan | ${SITE_NAME}` },
      { name: "robots", content: "noindex" },
    ];
  }

  const { siteUrl, desa, kecamatan } = data;
  const path = desaPath(desa.id);

  return buildMeta({
    siteUrl,
    path,
    title: `${desa.name}, Kecamatan ${kecamatan.name} — ${SITE_NAME}`,
    description: `${desa.name} adalah salah satu desa/kelurahan di Kecamatan ${kecamatan.name}, Kota Banjar, Jawa Barat. Lihat letaknya pada peta interaktif beserta desa/kelurahan lain di kecamatan yang sama.`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AdministrativeArea",
        name: desa.name,
        url: `${siteUrl}${path}`,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `Kecamatan ${kecamatan.name}`,
          url: `${siteUrl}${kecamatanPath(kecamatan.id)}`,
        },
      },
      breadcrumbJsonLd(siteUrl, [
        { name: SITE_NAME, path: "/" },
        { name: `Kecamatan ${kecamatan.name}`, path: kecamatanPath(kecamatan.id) },
        { name: desa.name, path },
      ]),
    ],
  });
}

export default function DesaDetail({ loaderData }: Route.ComponentProps) {
  const { desa, kecamatan, lainnya, semua, indeks, prev, next } = loaderData;

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
              <BreadcrumbLink asChild>
                <Link to={kecamatanPath(kecamatan.id)} preventScrollReset>
                  Kec. {kecamatan.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{desa.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl font-semibold">{desa.name}</h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="animate-pop-in">
            Desa/Kelurahan
          </Badge>
          <Badge
            variant="outline"
            className="animate-pop-in"
            style={stagger(1, 80)}
          >
            <span
              aria-hidden
              className="size-2 rounded-full border border-black/25"
              style={{ background: kecamatan.fill }}
            />
            Kecamatan {kecamatan.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 text-sm">
        <p className="text-muted-foreground">
          {desa.name} berada di Kecamatan {kecamatan.name}, Kota Banjar, Jawa
          Barat. Wilayahnya disorot pada peta.
        </p>

        {lainnya.length > 0 && (
          <section aria-labelledby="desa-lain">
            <h2
              id="desa-lain"
              className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Desa/kelurahan lain di Kec. {kecamatan.name}
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {lainnya.map((d, i) => (
                <li
                  key={d.id}
                  className="animate-pop-in"
                  style={stagger(i, 45, 150)}
                >
                  <Badge
                    asChild
                    variant="outline"
                    className="px-2.5 py-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                  >
                    <Link to={desaPath(d.id)} preventScrollReset prefetch="intent">
                      {d.name}
                    </Link>
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Navigasi antar desa dalam kecamatan yang sama */}
        {prev && next && (
          <section
            aria-label={`Navigasi desa di Kecamatan ${kecamatan.name}`}
            className="animate-fade-up space-y-2 rounded-lg border bg-muted/40 p-2"
            style={stagger(0, 0, 200)}
          >
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="group size-8 shrink-0"
              >
                <Link
                  to={desaPath(prev.id)}
                  preventScrollReset
                  prefetch="intent"
                  aria-label={`Sebelumnya: ${prev.name}`}
                  title={prev.name}
                >
                  <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
                </Link>
              </Button>
              <p className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
                <span key={desa.id} className="animate-fade-in inline-block">
                  {indeks + 1} dari {semua.length} di Kec. {kecamatan.name}
                </span>
              </p>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="group size-8 shrink-0"
              >
                <Link
                  to={desaPath(next.id)}
                  preventScrollReset
                  prefetch="intent"
                  aria-label={`Berikutnya: ${next.name}`}
                  title={next.name}
                >
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            <ul className="flex items-center justify-center gap-1.5 pb-0.5">
              {semua.map((d, i) => (
                <li key={d.id}>
                  <Link
                    to={desaPath(d.id)}
                    preventScrollReset
                    aria-label={d.name}
                    aria-current={i === indeks ? "page" : undefined}
                    title={d.name}
                    className="block rounded-full py-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-all duration-300 hover:bg-primary/60",
                        i === indeks ? "w-6 bg-primary" : "w-1.5 bg-border"
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div
          className="animate-fade-up flex flex-wrap gap-2"
          style={stagger(0, 0, 280)}
        >
          <Button asChild variant="secondary" size="sm" className="group">
            <Link to={kecamatanPath(kecamatan.id)} preventScrollReset>
              Lihat Kecamatan {kecamatan.name}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <CopyLinkButton />
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <WilayahError error={error} />;
}
