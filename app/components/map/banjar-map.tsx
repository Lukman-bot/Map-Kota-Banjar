import { memo, useMemo, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { Link } from "react-router";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  desaList,
  kecamatanList,
  MAP_HEIGHT,
  MAP_WIDTH,
} from "~/data/banjarMap";
import { kecamatanBorderPath, outlinePath, toPath } from "~/lib/geometry";
import { cn } from "~/lib/utils";
import {
  desaById,
  desaByKecamatan,
  desaPath,
  kecamatanById,
  kecamatanPath,
} from "~/lib/wilayah";
import { MapLegend } from "./map-legend";
import { MAX_ZOOM, MIN_ZOOM, usePanZoom } from "./use-pan-zoom";

export type MapMode = "desa" | "kecamatan";

interface BanjarMapProps {
  mode: MapMode;
  showLabels: boolean;
  selectedDesaId: string | null;
  selectedKecamatanId: string | null;
}

/* ---------- Data statis: dihitung sekali di level modul ---------- */
const kecamatanBorders = kecamatanBorderPath(desaList);
const desaShapes = desaList.map((desa) => ({
  desa,
  d: toPath(desa.points),
  kec: kecamatanById.get(desa.kecamatanId)!,
}));

/* ---------- Lapisan desa (klik = pindah halaman, tetap <a> untuk SEO) ---------- */
interface DesaLayerProps {
  mode: MapMode;
  hoverId: string | null;
  movedRef: RefObject<boolean>;
  onHover: (id: string | null) => void;
}

const DesaLayer = memo(function DesaLayer({
  mode,
  hoverId,
  movedRef,
  onHover,
}: DesaLayerProps) {
  const hovered = hoverId ? desaById.get(hoverId) : undefined;

  return (
    <g filter="url(#mapShadow)" strokeLinejoin="round">
      {desaShapes.map(({ desa, d, kec }) => {
        const active =
          !!hovered &&
          (mode === "kecamatan"
            ? hovered.kecamatanId === desa.kecamatanId
            : hovered.id === desa.id);

        const to =
          mode === "kecamatan" ? kecamatanPath(kec.id) : desaPath(desa.id);
        const label =
          mode === "kecamatan"
            ? `Kecamatan ${kec.name}`
            : `Desa/Kelurahan ${desa.name}, Kecamatan ${kec.name}`;

        return (
          <Link
            key={desa.id}
            to={to}
            preventScrollReset
            draggable={false}
            aria-label={label}
            className="group outline-none"
            onClick={(e) => {
              // Gesture drag/pinch tidak boleh berubah menjadi navigasi.
              if (movedRef.current) e.preventDefault();
            }}
            onMouseEnter={() => onHover(desa.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(desa.id)}
            onBlur={() => onHover(null)}
          >
            <path
              d={d}
              fill={kec.fill}
              stroke={kec.stroke}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
              className={cn(
                "cursor-pointer transition-[filter] duration-150",
                "group-focus-visible:[filter:brightness(0.92)_saturate(1.25)]",
                active && "[filter:brightness(0.92)_saturate(1.25)]"
              )}
            >
              <title>{`${desa.name} — Kec. ${kec.name}`}</title>
            </path>
          </Link>
        );
      })}
    </g>
  );
});

/* ---------- Label ---------- */
const LabelLayer = memo(function LabelLayer({
  showLabels,
  zoom,
}: {
  showLabels: boolean;
  zoom: number;
}) {
  // Label kecamatan dikecilkan sebagian saat zoom agar tidak menutupi peta.
  const kecScale = 1 / Math.sqrt(zoom);

  return (
    <g className="pointer-events-none select-none">
      {showLabels &&
        desaList.map((d) => (
          <text
            key={d.id}
            x={d.labelPos[0]}
            y={d.labelPos[1]}
            fontSize={d.labelSize}
            textAnchor="middle"
            dominantBaseline="middle"
            strokeWidth={0.7}
            paintOrder="stroke"
            className="fill-[#1f2a1a] stroke-white/75 font-medium"
          >
            {d.name}
          </text>
        ))}

      {kecamatanList.map((k) => (
        <text
          key={k.id}
          x={k.labelPos[0]}
          y={k.labelPos[1]}
          fontSize={10.5 * kecScale}
          textAnchor="middle"
          strokeWidth={2.4 * kecScale}
          paintOrder="stroke"
          className="fill-[#22331a] stroke-white/85 font-extrabold tracking-wider"
        >
          KEC. {k.name.toUpperCase()}
        </text>
      ))}
    </g>
  );
});

/* ---------- Komponen utama ---------- */
export default function BanjarMap({
  mode,
  showLabels,
  selectedDesaId,
  selectedKecamatanId,
}: BanjarMapProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { svgRef, view, movedRef, zoomIn, zoomOut, reset, panBy, svgHandlers } =
    usePanZoom();

  const selectedDesa = selectedDesaId ? desaById.get(selectedDesaId) : undefined;
  const selectedKecamatan = selectedKecamatanId
    ? kecamatanById.get(selectedKecamatanId)
    : undefined;

  const kecamatanOutline = useMemo(
    () =>
      selectedKecamatanId
        ? outlinePath(desaByKecamatan.get(selectedKecamatanId) ?? [])
        : null,
    [selectedKecamatanId]
  );

  const hoveredDesa = hoverId ? desaById.get(hoverId) : undefined;
  const statusText = hoveredDesa
    ? `${hoveredDesa.name} · Kec. ${kecamatanById.get(hoveredDesa.kecamatanId)?.name}`
    : selectedDesa
      ? `${selectedDesa.name} · Kec. ${kecamatanById.get(selectedDesa.kecamatanId)?.name}`
      : selectedKecamatan
        ? `Kecamatan ${selectedKecamatan.name}`
        : "Klik wilayah untuk melihat detail";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case "+":
      case "=":
        zoomIn();
        break;
      case "-":
      case "_":
        zoomOut();
        break;
      case "0":
        reset();
        break;
      case "ArrowLeft":
        panBy(-0.2, 0);
        break;
      case "ArrowRight":
        panBy(0.2, 0);
        break;
      case "ArrowUp":
        panBy(0, -0.2);
        break;
      case "ArrowDown":
        panBy(0, 0.2);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const vbW = MAP_WIDTH / view.k;
  const vbH = MAP_HEIGHT / view.k;

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${vbW} ${vbH}`}
          role="group"
          aria-label="Peta Kota Banjar"
          className="size-full cursor-grab touch-none select-none active:cursor-grabbing"
          onDragStart={(e) => e.preventDefault()}
          {...svgHandlers}
        >
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bcd7f0" />
              <stop offset="55%" stopColor="#e4eef9" />
              <stop offset="100%" stopColor="#dcebd0" />
            </linearGradient>
            <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="125%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="4"
                floodColor="#1c2b12"
                floodOpacity="0.3"
              />
            </filter>
          </defs>

          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sky)" />

          <DesaLayer
            mode={mode}
            hoverId={hoverId}
            movedRef={movedRef}
            onHover={setHoverId}
          />

          {/* Garis batas antar kecamatan */}
          <path
            d={kecamatanBorders}
            fill="none"
            stroke="#34402a"
            strokeOpacity={0.6}
            strokeWidth={1.8}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {/* Sorotan pilihan */}
          {kecamatanOutline && (
            <path
              d={kecamatanOutline}
              fill="none"
              stroke="#e11d48"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
          {selectedDesa && (
            <path
              d={toPath(selectedDesa.points)}
              fill="rgba(225, 29, 72, 0.12)"
              stroke="#e11d48"
              strokeWidth={2.4}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

          <LabelLayer showLabels={showLabels} zoom={view.k} />
        </svg>

        {/* Status pilihan / hover */}
        <Badge
          variant="secondary"
          aria-live="polite"
          className="pointer-events-none absolute top-3 left-3 max-w-[60%] truncate bg-card/90 px-2.5 py-1 text-xs shadow-sm backdrop-blur-sm"
        >
          {statusText}
        </Badge>

        {/* Kontrol zoom */}
        <div
          className="absolute top-3 right-3 flex flex-col gap-1.5"
          role="group"
          aria-label="Kontrol zoom peta"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-card/90 backdrop-blur-sm"
            onClick={zoomIn}
            disabled={view.k >= MAX_ZOOM}
            aria-label="Perbesar peta"
            title="Perbesar (+)"
          >
            <ZoomIn />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-card/90 backdrop-blur-sm"
            onClick={zoomOut}
            disabled={view.k <= MIN_ZOOM}
            aria-label="Perkecil peta"
            title="Perkecil (−)"
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-card/90 backdrop-blur-sm"
            onClick={reset}
            disabled={view.k === MIN_ZOOM}
            aria-label="Reset tampilan peta"
            title="Reset (0)"
          >
            <RotateCcw />
          </Button>
          <Badge
            variant="outline"
            className="justify-center bg-card/90 tabular-nums backdrop-blur-sm"
            aria-label={`Zoom ${Math.round(view.k * 100)} persen`}
          >
            {Math.round(view.k * 100)}%
          </Badge>
        </div>

        {/* Petunjuk + legenda */}
        <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-md bg-card/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm sm:block">
          Scroll untuk zoom · seret untuk menggeser
        </p>
        <div className="absolute right-3 bottom-3">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
