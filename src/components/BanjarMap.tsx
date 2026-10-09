import { useMemo, useState } from "react";
import {
  desaList,
  kecamatanList,
  MAP_HEIGHT,
  MAP_WIDTH,
  type Desa,
  type Kecamatan,
} from "../data/banjarMap";
import { kecamatanBorderPath, outlinePath, toPath } from "../utils/geometry";

export type MapMode = "desa" | "kecamatan";

interface Props {
  mode?: MapMode;
  showLabels?: boolean;
  selectedDesaId?: string | null;
  selectedKecamatanId?: string | null;
  onDesaClick?: (desa: Desa, kecamatan: Kecamatan) => void;
  onKecamatanClick?: (kecamatan: Kecamatan) => void;
  onDesaHover?: (desa: Desa | null) => void;
}

const kecById: Record<string, Kecamatan> = Object.fromEntries(
  kecamatanList.map((k) => [k.id, k])
);

export default function BanjarMap({
  mode = "desa",
  showLabels = true,
  selectedDesaId = null,
  selectedKecamatanId = null,
  onDesaClick,
  onKecamatanClick,
  onDesaHover,
}: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Dihitung sekali saja
  const kecBorders = useMemo(() => kecamatanBorderPath(desaList), []);
  const labels = useMemo(
    () =>
      desaList.map((d) => ({
        id: d.id,
        name: d.name,
        x: d.labelPos[0],
        y: d.labelPos[1],
        size: d.labelSize,
      })),
    []
  );

  const hoveredDesa = desaList.find((d) => d.id === hoverId) ?? null;
  const selectedDesa = desaList.find((d) => d.id === selectedDesaId) ?? null;
  const selectedKecDesa = selectedKecamatanId
    ? desaList.filter((d) => d.kecamatanId === selectedKecamatanId)
    : [];

  const isHover = (d: Desa) => {
    if (!hoveredDesa) return false;
    return mode === "kecamatan"
      ? hoveredDesa.kecamatanId === d.kecamatanId
      : hoveredDesa.id === d.id;
  };

  const handleClick = (d: Desa) => {
    const kec = kecById[d.kecamatanId];
    if (mode === "kecamatan") onKecamatanClick?.(kec);
    else onDesaClick?.(d, kec);
  };

  const setHover = (d: Desa | null) => {
    setHoverId(d ? d.id : null);
    onDesaHover?.(d);
  };

  return (
    <svg
      className="banjar-map"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label="Peta Kota Banjar"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bcd7f0" />
          <stop offset="55%" stopColor="#e4eef9" />
          <stop offset="100%" stopColor="#dcebd0" />
        </linearGradient>
        <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1c2b12" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Latar */}
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sky)" />

      {/* Judul */}
      <text x={MAP_WIDTH - 24} y="36" textAnchor="end" className="map-title">
        PETA KOTA BANJAR
      </text>
      <text x={MAP_WIDTH - 24} y="54" textAnchor="end" className="map-subtitle">
        4 Kecamatan · 25 Desa/Kelurahan
      </text>

      {/* Lapisan desa (bisa diklik) */}
      <g filter="url(#mapShadow)" strokeLinejoin="round">
        {desaList.map((d) => {
          const kec = kecById[d.kecamatanId];
          return (
            <path
              key={d.id}
              d={toPath(d.points)}
              fill={kec.fill}
              stroke={kec.stroke}
              strokeWidth={0.9}
              className={`desa-path${isHover(d) ? " is-hover" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={`Desa ${d.name}, Kecamatan ${kec.name}`}
              onClick={() => handleClick(d)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick(d);
                }
              }}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d)}
              onBlur={() => setHover(null)}
            >
              <title>{`${d.name} — Kec. ${kec.name}`}</title>
            </path>
          );
        })}
      </g>

      {/* Garis batas antar kecamatan */}
      <path
        d={kecBorders}
        fill="none"
        stroke="#34402a"
        strokeOpacity={0.6}
        strokeWidth={1.8}
        strokeLinecap="round"
        pointerEvents="none"
      />

      {/* Sorotan pilihan */}
      {selectedKecDesa.length > 0 && (
        <path
          d={outlinePath(selectedKecDesa)}
          fill="none"
          stroke="#e11d48"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
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
          pointerEvents="none"
        />
      )}

      {/* Label desa */}
      {showLabels &&
        labels.map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            fontSize={l.size}
            textAnchor="middle"
            dominantBaseline="middle"
            className="desa-label"
          >
            {l.name}
          </text>
        ))}

      {/* Label kecamatan */}
      {kecamatanList.map((k) => (
        <text
          key={k.id}
          x={k.labelPos[0]}
          y={k.labelPos[1]}
          textAnchor="middle"
          className="kec-label"
        >
          KEC. {k.name.toUpperCase()}
        </text>
      ))}

      {/* Legenda */}
      <g transform="translate(556, 324)" pointerEvents="none">
        <rect x="-12" y="-18" width="170" height="104" rx="8" fill="rgba(255,255,255,0.72)" />
        <text x="0" y="-3" className="legend-title">Kecamatan</text>
        {kecamatanList.map((k, i) => (
          <g key={k.id} transform={`translate(0, ${10 + i * 18})`}>
            <rect width="14" height="12" rx="3" fill={k.fill} stroke="#4b5a3a" strokeOpacity="0.5" />
            <text x="22" y="10" className="legend-text">{k.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
