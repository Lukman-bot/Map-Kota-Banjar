import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  Dices,
  Hand,
  Keyboard,
  Layers,
  Move,
  Search,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";

import type { Route } from "./+types/beranda";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { cn, stagger } from "~/lib/utils";
import { desaList, kecamatanList } from "~/data/banjarMap";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import { getSiteUrl } from "~/lib/site.server";
import { desaPath, kecamatanPath } from "~/lib/wilayah";

export function loader({ request }: Route.LoaderArgs) {
  return { siteUrl: getSiteUrl(request) };
}

export function meta({ data }: Route.MetaArgs) {
  const siteUrl = data?.siteUrl ?? "";
  const namaKecamatan = kecamatanList.map((k) => k.name).join(", ");

  return buildMeta({
    siteUrl,
    path: "/",
    title: `${SITE_NAME} — Peta Interaktif Kecamatan & Desa`,
    description: `Peta interaktif Kota Banjar, Jawa Barat. Zoom dan klik untuk menjelajahi ${kecamatanList.length} kecamatan dan ${desaList.length} desa/kelurahan: ${namaKecamatan}.`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: "id-ID",
      },
      {
        "@context": "https://schema.org",
        "@type": "AdministrativeArea",
        name: "Kota Banjar",
        url: siteUrl,
        containedInPlace: { "@type": "AdministrativeArea", name: "Jawa Barat" },
        containsPlace: kecamatanList.map((k) => ({
          "@type": "AdministrativeArea",
          name: `Kecamatan ${k.name}`,
          url: `${siteUrl}${kecamatanPath(k.id)}`,
        })),
      },
    ],
  });
}

const TIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Hand, text: "Putar peta: seret dengan mouse atau satu jari." },
  { icon: ZoomIn, text: "Zoom: scroll mouse, cubit dua jari, atau tombol + / −." },
  { icon: Move, text: "Geser: klik kanan lalu seret, atau seret dengan dua jari." },
  { icon: Keyboard, text: "Keyboard: + / − untuk zoom, 0 untuk reset tampilan." },
  { icon: Search, text: "Tekan / untuk langsung mencari desa atau kecamatan." },
];

function StatTile({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  index: number;
}) {
  return (
    <div
      className="group animate-pop-in relative overflow-hidden rounded-lg border bg-gradient-to-br from-card to-muted/60 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={stagger(index, 90, 150)}
    >
      <Icon
        aria-hidden
        className="absolute -top-1 -right-1 size-14 text-primary/5 transition-all duration-500 group-hover:rotate-12 group-hover:scale-125 group-hover:text-primary/10"
      />
      <AnimatedNumber
        value={value}
        duration={1100}
        className="relative text-3xl font-semibold tracking-tight"
      />
      <p className="relative text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Beranda() {
  const navigate = useNavigate();
  const [tipsOpen, setTipsOpen] = useState(true);
  const [rolling, setRolling] = useState(0);

  const acak = () => {
    const d = desaList[Math.floor(Math.random() * desaList.length)];
    setRolling((n) => n + 1); // memicu ulang animasi dadu
    navigate(desaPath(d.id), { preventScrollReset: true });
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-2 px-4">
        <h1 className="animate-fade-up text-xl font-semibold">Peta Kota Banjar</h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="animate-pop-in"
            style={stagger(0, 80, 100)}
          >
            {kecamatanList.length} kecamatan
          </Badge>
          <Badge
            variant="secondary"
            className="animate-pop-in"
            style={stagger(1, 80, 100)}
          >
            {desaList.length} desa/kelurahan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 text-sm">
        <p className="animate-fade-up text-muted-foreground" style={stagger(1, 80, 100)}>
          Peta interaktif wilayah Kota Banjar, Jawa Barat. Pilih desa atau
          kecamatan pada peta 3D untuk membuka halaman detailnya.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Layers} label="Kecamatan" value={kecamatanList.length} index={0} />
          <StatTile icon={Search} label="Desa/Kelurahan" value={desaList.length} index={1} />
        </div>

        <Button
          type="button"
          onClick={acak}
          className="animate-fade-up group w-full"
          style={stagger(3, 80, 150)}
        >
          <Dices
            key={rolling}
            className={cn("transition-transform", rolling > 0 && "animate-dice")}
          />
          Jelajahi desa acak
        </Button>

        {/* Panduan: bisa dilipat dengan transisi tinggi halus */}
        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setTipsOpen((v) => !v)}
            aria-expanded={tipsOpen}
            aria-controls="panduan-peta"
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Cara memakai peta
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-300",
                tipsOpen && "rotate-180"
              )}
            />
          </button>
          <div
            id="panduan-peta"
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              tipsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <ul className="min-h-0 space-y-0.5 overflow-hidden px-1.5">
              {TIPS.map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className={cn(
                    "group flex items-start gap-2.5 rounded-md px-1.5 py-1.5 text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground",
                    tipsOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                  )}
                  style={{ transitionDelay: tipsOpen ? `${i * 45}ms` : "0ms" }}
                >
                  <Icon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:text-primary"
                  />
                  <span>{text}</span>
                </li>
              ))}
              <li className="h-1" aria-hidden />
            </ul>
          </div>
        </div>

        <p className="text-muted-foreground">Belum ada wilayah yang dipilih.</p>
      </CardContent>
    </Card>
  );
}
