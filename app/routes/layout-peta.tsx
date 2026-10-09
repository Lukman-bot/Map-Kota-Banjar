import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useNavigation,
  useParams,
} from "react-router";
import { Eye, EyeOff, MapPin } from "lucide-react";

import { RotatingHint } from "~/components/rotating-hint";
import { TopLoadingBar } from "~/components/top-loading-bar";
import BanjarMap3D, { type MapMode } from "~/components/three/banjar-map-3d";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { WilayahSearch } from "~/components/wilayah-search";
import { kecamatanList } from "~/data/banjarMap";
import { cn, stagger } from "~/lib/utils";
import {
  desaById,
  desaByKecamatan,
  kecamatanById,
  kecamatanPath,
} from "~/lib/wilayah";

const MAX_DESA = Math.max(
  ...kecamatanList.map((k) => desaByKecamatan.get(k.id)?.length ?? 0)
);

export default function LayoutPeta() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();

  const [preferredMode, setPreferredMode] = useState<MapMode>("desa");
  const [showLabels, setShowLabels] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // URL adalah sumber kebenaran untuk pilihan wilayah.
  const selectedDesa = params.desaSlug ? desaById.get(params.desaSlug) : undefined;
  const selectedKecamatan = params.kecamatanSlug
    ? kecamatanById.get(params.kecamatanSlug)
    : undefined;
  const activeKecamatanId =
    selectedKecamatan?.id ?? selectedDesa?.kecamatanId ?? null;

  const mode: MapMode = params.kecamatanSlug
    ? "kecamatan"
    : params.desaSlug
      ? "desa"
      : preferredMode;

  const handleModeChange = (value: string) => {
    if (value !== "desa" && value !== "kecamatan") return;
    setPreferredMode(value);

    if (value === "kecamatan" && selectedDesa) {
      navigate(kecamatanPath(selectedDesa.kecamatanId), { preventScrollReset: true });
    } else if (value === "desa" && params.kecamatanSlug) {
      navigate("/", { preventScrollReset: true });
    }
  };

  return (
    <div className="min-h-svh">
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md transition-shadow duration-300",
          scrolled && "shadow-md"
        )}
      >
        <div className="mx-auto flex max-w-[88rem] items-center gap-2 px-3 py-3 sm:px-4">
          <Link
            to="/"
            className="group flex items-center gap-2.5 rounded-md font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="relative grid size-8 place-items-center">
              <span
                aria-hidden
                className="animate-ping-soft absolute inset-1 rounded-full bg-sky-400/50"
              />
              <span className="relative grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <MapPin className="animate-float size-4.5" aria-hidden />
              </span>
            </span>
            <span className="transition-colors group-hover:text-primary/80">
              Peta Kota Banjar
            </span>
          </Link>
          <RotatingHint />
        </div>
        <TopLoadingBar />
      </header>

      <main className="mx-auto grid max-w-[88rem] items-start gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="animate-fade-in">
          <BanjarMap3D
            mode={mode}
            showLabels={showLabels}
            selectedDesaId={selectedDesa?.id ?? null}
            selectedKecamatanId={selectedKecamatan?.id ?? null}
            className="h-[68svh] min-h-[420px] sm:h-[72svh] lg:sticky lg:top-[4.5rem] lg:h-[calc(100svh-5.5rem)] lg:min-h-[560px]"
          />
        </div>

        <aside className="flex flex-col gap-4" aria-label="Informasi wilayah">
          {/* Pencarian */}
          <Card
            className="animate-fade-up relative z-30 gap-0 p-3"
            style={stagger(0, 70, 100)}
          >
            <WilayahSearch />
          </Card>

          {/* Mode klik */}
          <Card
            className="animate-fade-up gap-3 py-4"
            style={stagger(1, 70, 100)}
          >
            <CardHeader className="px-4">
              <CardTitle className="text-xs tracking-wider text-muted-foreground uppercase">
                Mode klik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={handleModeChange}
                className="relative w-full gap-0 rounded-lg bg-muted p-1"
                aria-label="Mode klik peta"
              >
                {/* Pil yang meluncur ke pilihan aktif */}
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-card shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
                  style={{
                    transform: mode === "kecamatan" ? "translateX(100%)" : "translateX(0)",
                  }}
                />
                {(
                  [
                    ["desa", "Per Desa"],
                    ["kecamatan", "Per Kecamatan"],
                  ] as const
                ).map(([value, label]) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    className={cn(
                      "relative z-10 rounded-md text-muted-foreground transition-colors duration-300",
                      "hover:bg-transparent hover:text-foreground",
                      "data-[state=on]:bg-transparent data-[state=on]:text-foreground"
                    )}
                  >
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="h-px bg-border" />

              <div className="flex items-center gap-2">
                <Switch
                  id="toggle-label-desa"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <Label
                  htmlFor="toggle-label-desa"
                  className={cn(
                    "flex-1 transition-colors duration-300",
                    !showLabels && "text-muted-foreground"
                  )}
                >
                  Tampilkan nama desa
                </Label>
                <span
                  key={String(showLabels)}
                  aria-hidden
                  className="animate-pop-in text-muted-foreground"
                >
                  {showLabels ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Konten halaman (beranda / kecamatan / desa).
              `key` membuat panel masuk dengan animasi setiap pindah halaman. */}
          <div
            key={location.pathname}
            className={cn(
              "animate-slide-in transition-opacity duration-200",
              navigation.state === "loading" && "opacity-60"
            )}
          >
            <Outlet />
          </div>

          {/* Daftar kecamatan */}
          <Card
            className="animate-fade-up gap-3 py-4"
            style={stagger(3, 70, 100)}
          >
            <CardHeader className="px-4">
              <CardTitle className="text-xs tracking-wider text-muted-foreground uppercase">
                Jumlah desa per kecamatan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <nav aria-label="Daftar kecamatan">
                <ul className="space-y-0.5">
                  {kecamatanList.map((k, i) => {
                    const jumlah = desaByKecamatan.get(k.id)?.length ?? 0;
                    const active = activeKecamatanId === k.id;
                    return (
                      <li
                        key={k.id}
                        className="animate-fade-up"
                        style={stagger(i, 70, 350)}
                      >
                        <Link
                          to={kecamatanPath(k.id)}
                          preventScrollReset
                          prefetch="intent"
                          data-active={active || undefined}
                          className={cn(
                            "group relative flex flex-col gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none",
                            "transition-all duration-200 hover:translate-x-0.5 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            "data-active:bg-accent data-active:font-medium"
                          )}
                        >
                          {/* Penanda aktif di sisi kiri */}
                          <span
                            aria-hidden
                            className="absolute top-1/2 left-0 h-0 w-[3px] -translate-y-1/2 rounded-full bg-primary opacity-0 transition-all duration-300 group-hover:h-4 group-hover:opacity-60 group-data-active:h-7 group-data-active:opacity-100"
                          />
                          <span className="flex items-center gap-2">
                            <span className="relative grid size-3 shrink-0 place-items-center">
                              {active && (
                                <span
                                  aria-hidden
                                  className="animate-ping-soft absolute inset-0 rounded-full"
                                  style={{ background: k.fill }}
                                />
                              )}
                              <span
                                className="relative size-2.5 rounded-full border border-black/25 transition-transform duration-200 group-hover:scale-125"
                                style={{ background: k.fill }}
                                aria-hidden
                              />
                            </span>
                            <span className="flex-1">{k.name}</span>
                            <Badge
                              variant="secondary"
                              className="transition-colors group-hover:bg-background"
                            >
                              <AnimatedNumber value={jumlah} />
                            </Badge>
                          </span>
                          {/* Batang proporsi jumlah desa */}
                          <span
                            aria-hidden
                            className="h-1 w-full overflow-hidden rounded-full bg-muted"
                          >
                            <span
                              className="animate-grow-x block h-full origin-left rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                              style={{
                                width: `${(jumlah / MAX_DESA) * 100}%`,
                                background: k.fill,
                                animationDelay: `${450 + i * 80}ms`,
                              }}
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer
        className="animate-fade-in mx-auto max-w-[88rem] px-3 pb-8 sm:px-4 text-xs text-muted-foreground"
        style={{ animationDelay: "700ms" }}
      >
        Batas wilayah pada peta ini bersifat ilustratif (hasil digitalisasi dari
        gambar peta), bukan data administrasi resmi.
      </footer>
    </div>
  );
}
