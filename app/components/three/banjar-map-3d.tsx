import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Box, Rotate3d, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { MapLegend } from "~/components/map/map-legend";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { desaList, kecamatanList } from "~/data/banjarMap";
import { cn } from "~/lib/utils";
import {
  desaById,
  desaByKecamatan,
  desaPath,
  kecamatanById,
  kecamatanPath,
} from "~/lib/wilayah";
import type { MapMode, SceneApi, SceneState } from "./create-banjar-scene";

export type { MapMode };

interface BanjarMap3DProps {
  mode: MapMode;
  showLabels: boolean;
  selectedDesaId: string | null;
  selectedKecamatanId: string | null;
  className?: string;
}

/**
 * Satu-satunya peta: model 3D Kota Banjar (Three.js).
 *
 * - Seret: putar · klik kanan / dua jari: geser · scroll / cubit: zoom.
 * - Klik/tap wilayah: pindah ke halaman desa (atau kecamatan, sesuai mode).
 * - Three.js di-import dinamis di useEffect → aman untuk SSR dan tidak
 *   membebani bundle awal.
 * - Daftar tautan <a> ke semua wilayah tetap dirender di HTML (sr-only) untuk
 *   SEO, pembaca layar, dan navigasi keyboard. Jika WebGL gagal, daftar itu
 *   ditampilkan sebagai fallback.
 */
export default function BanjarMap3D({
  mode,
  showLabels,
  selectedDesaId,
  selectedKecamatanId,
  className,
}: BanjarMap3DProps) {
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [view, setView] = useState({ zoomPercent: 100, topView: false });
  const [spinning, setSpinning] = useState(false);

  // Nilai terbaru → ref, supaya scene tidak dibuat ulang.
  const latest = useRef<SceneState>({
    selection: { desaId: selectedDesaId, kecamatanId: selectedKecamatanId },
    mode,
    showLabels,
    autoRotate: false,
  });
  latest.current = {
    selection: { desaId: selectedDesaId, kecamatanId: selectedKecamatanId },
    mode,
    showLabels,
    autoRotate: spinning,
  };
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const host = hostRef.current;
    const tooltip = tooltipRef.current;
    if (!host || !tooltip) return;
    let disposed = false;

    (async () => {
      try {
        const [THREE, controlsMod, labelMod, sceneMod] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/renderers/CSS2DRenderer.js"),
          import("./create-banjar-scene"),
        ]);
        if (disposed) return;

        apiRef.current = sceneMod.createBanjarScene(
          {
            THREE,
            OrbitControls: controlsMod.OrbitControls,
            CSS2DRenderer: labelMod.CSS2DRenderer,
            CSS2DObject: labelMod.CSS2DObject,
          },
          host,
          tooltip,
          {
            initial: latest.current,
            goTo: (path) =>
              navigateRef.current(path, { preventScrollReset: true }),
            onHover: setHoverId,
            onView: setView,
          }
        );
        setReady(true);
      } catch {
        // WebGL tidak tersedia / modul gagal dimuat.
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setSelection({
      desaId: selectedDesaId,
      kecamatanId: selectedKecamatanId,
    });
  }, [selectedDesaId, selectedKecamatanId]);
  useEffect(() => apiRef.current?.setMode(mode), [mode]);
  useEffect(() => apiRef.current?.setShowLabels(showLabels), [showLabels]);
  useEffect(() => apiRef.current?.setAutoRotate(spinning), [spinning]);

  const selectedDesa = selectedDesaId ? desaById.get(selectedDesaId) : undefined;
  const selectedKecamatan = selectedKecamatanId
    ? kecamatanById.get(selectedKecamatanId)
    : undefined;
  const hoveredDesa = hoverId ? desaById.get(hoverId) : undefined;
  const kecName = (id?: string) => (id ? kecamatanById.get(id)?.name : undefined);

  const statusText = hoveredDesa
    ? mode === "kecamatan"
      ? `Kecamatan ${kecName(hoveredDesa.kecamatanId)}`
      : `${hoveredDesa.name} · Kec. ${kecName(hoveredDesa.kecamatanId)}`
    : selectedDesa
      ? `${selectedDesa.name} · Kec. ${kecName(selectedDesa.kecamatanId)}`
      : selectedKecamatan
        ? `Kecamatan ${selectedKecamatan.name}`
        : "Klik wilayah untuk melihat detail";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const api = apiRef.current;
    if (!api) return;
    switch (e.key) {
      case "+":
      case "=":
        api.zoomIn();
        break;
      case "-":
      case "_":
        api.zoomOut();
        break;
      case "0":
        api.reset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const atMin = view.zoomPercent <= 100;
  const atMax = view.zoomPercent >= 500;

  const controlBtn =
    "size-9 border-white/15 bg-slate-900/70 text-slate-100 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-sky-300/40 hover:bg-slate-800 hover:text-white active:scale-90 disabled:opacity-40 disabled:hover:scale-100 sm:size-10";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-sm",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(90% 90% at 50% 45%, rgba(56,189,248,0.16) 0%, rgba(15,23,42,0) 65%), linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Kanvas 3D + label HTML + tooltip */}
      <div
        ref={hostRef}
        role="img"
        aria-label="Peta 3D Kota Banjar. Gunakan daftar tautan wilayah untuk navigasi."
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          !ready && "opacity-0",
          failed && "hidden"
        )}
      >
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute top-0 left-0 z-10 hidden max-w-[80%] rounded-md bg-slate-950/90 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg"
        />
      </div>

      {!failed && (
        <div
          aria-hidden={ready}
          className={cn(
            "pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-300 transition-opacity duration-700",
            ready ? "opacity-0" : "opacity-100"
          )}
        >
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-slate-500 border-t-sky-300" />
            Memuat peta 3D…
          </span>
        </div>
      )}

      {/* Status pilihan / hover */}
      {!failed && (
        <Badge
          variant="secondary"
          aria-live="polite"
          className="animate-pop-in pointer-events-none absolute top-3 left-3 max-w-[58%] truncate bg-card/90 px-2.5 py-1 text-xs shadow-sm backdrop-blur-sm"
        >
          <span key={statusText} className="animate-fade-in truncate">
            {statusText}
          </span>
        </Badge>
      )}

      {/* Kontrol */}
      {!failed && (
        <div
          className="animate-slide-in absolute top-3 right-3 flex flex-col gap-1.5"
          role="group"
          aria-label="Kontrol peta"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={controlBtn}
            onClick={() => apiRef.current?.zoomIn()}
            disabled={!ready || atMax}
            aria-label="Perbesar peta"
            title="Perbesar (+)"
          >
            <ZoomIn />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={controlBtn}
            onClick={() => apiRef.current?.zoomOut()}
            disabled={!ready || atMin}
            aria-label="Perkecil peta"
            title="Perkecil (−)"
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={controlBtn}
            onClick={() => apiRef.current?.toggleTilt()}
            disabled={!ready}
            aria-pressed={view.topView}
            aria-label={view.topView ? "Kembali ke tampilan 3D" : "Tampak atas"}
            title={view.topView ? "Tampilan 3D" : "Tampak atas"}
          >
            <Box />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(controlBtn, spinning && "bg-sky-500/30 text-sky-100")}
            onClick={() => setSpinning((v) => !v)}
            disabled={!ready}
            aria-pressed={spinning}
            aria-label="Putar otomatis"
            title="Putar otomatis"
          >
            <Rotate3d />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={controlBtn}
            onClick={() => apiRef.current?.reset()}
            disabled={!ready}
            aria-label="Reset tampilan peta"
            title="Reset (0)"
          >
            <RotateCcw />
          </Button>
          <Badge
            variant="outline"
            className="justify-center border-white/15 bg-slate-900/70 text-slate-100 tabular-nums backdrop-blur-sm"
            aria-label={`Zoom ${view.zoomPercent} persen`}
          >
            {view.zoomPercent}%
          </Badge>
        </div>
      )}

      {/* Petunjuk + legenda */}
      {!failed && (
        <>
          <p className="animate-fade-up pointer-events-none absolute bottom-3 left-3 hidden max-w-[55%] rounded-md bg-slate-900/70 px-2 py-1 text-xs text-slate-300 backdrop-blur-sm sm:block">
            Seret: putar · klik kanan / dua jari: geser · scroll / cubit: zoom
          </p>
          <p className="animate-fade-up pointer-events-none absolute bottom-3 left-3 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300 backdrop-blur-sm sm:hidden">
            Seret: putar · cubit: zoom
          </p>
          <div
            className="animate-fade-up absolute right-3 bottom-3 hidden sm:block"
            style={{ animationDelay: "250ms" }}
          >
            <MapLegend />
          </div>
        </>
      )}

      {/* Tautan wilayah: SEO + aksesibilitas + fallback tanpa WebGL */}
      <nav
        aria-label="Daftar wilayah"
        className={cn(
          failed
            ? "relative z-10 max-h-full overflow-auto p-4 text-slate-100"
            : "sr-only"
        )}
      >
        {failed && (
          <p className="mb-3 text-sm text-slate-300">
            Peta 3D tidak dapat ditampilkan di perangkat ini. Pilih wilayah
            dari daftar berikut.
          </p>
        )}
        <ul className={cn(failed && "grid gap-3 sm:grid-cols-2")}>
          {kecamatanList.map((k) => (
            <li key={k.id}>
              <Link
                to={kecamatanPath(k.id)}
                preventScrollReset
                className={cn(failed && "font-semibold underline-offset-2 hover:underline")}
              >
                Kecamatan {k.name}
              </Link>
              <ul className={cn(failed && "mt-1 space-y-0.5 pl-3 text-sm text-slate-300")}>
                {(desaByKecamatan.get(k.id) ?? []).map((d) => (
                  <li key={d.id}>
                    <Link
                      to={desaPath(d.id)}
                      preventScrollReset
                      className={cn(failed && "underline-offset-2 hover:underline")}
                      onFocus={() => apiRef.current?.setExternalHover(d.id)}
                      onBlur={() => apiRef.current?.setExternalHover(null)}
                    >
                      Desa/Kelurahan {d.name}, Kecamatan {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="sr-only">{desaList.length} desa/kelurahan.</p>
      </nav>
    </div>
  );
}
