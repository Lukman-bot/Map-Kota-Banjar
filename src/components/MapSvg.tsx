import { memo, useMemo, type KeyboardEvent, type PointerEvent } from "react";
import { MAP_HEIGHT, MAP_WIDTH, desaList, kecamatanList, type Desa } from "../data/banjarMap";
import { kecamatanBorderPath, outlinePath, toPath } from "../utils/geometry";
import { desaById, desaByKec, kecById } from "../utils/stats";
import type { Selection } from "../hooks/useSelection";

export type MapMode = "desa" | "kecamatan";

interface Props {
  selection: Selection;
  hover: Selection;
  mode: MapMode;
  showLabels: boolean;
  /** true = pengantar selesai & peta boleh diklik */
  exploring: boolean;
  onSelect: (s: Selection) => void;
  onHover: (s: Selection, e?: PointerEvent) => void;
}

const NONE: Selection = { type: "none" };

/**
 * Peta SVG. Atribut `data-*` dipakai timeline scroll (useExperience) untuk memunculkan
 * kecamatan/desa satu per satu; viewBox ditulis langsung oleh kamera (tanpa re-render React).
 * Opasitas isi (fill) per desa SENGAJA hanya diatur lewat timeline, bukan lewat class/props.
 */
function MapSvg({ selection, hover, mode, showLabels, exploring, onSelect, onHover }: Props) {
  const kecBorders = useMemo(() => kecamatanBorderPath(desaList), []);
  const kecOutlines = useMemo(() => kecamatanList.map((k) => outlinePath(desaByKec.get(k.id) ?? [])), []);

  const selectedDesaId = selection.type === "desa" ? selection.id : null;
  const activeKecId =
    selection.type === "kecamatan"
      ? selection.id
      : selection.type === "desa"
        ? desaById.get(selection.id)?.kecamatanId ?? null
        : null;
  const hasFocus = activeKecId !== null;
  const activeOutline = activeKecId ? kecOutlines[kecamatanList.findIndex((k) => k.id === activeKecId)] : "";

  /** Apa yang terpilih bila desa ini diklik? */
  const targetOf = (d: Desa): Selection => {
    if (selectedDesaId === d.id) return { type: "kecamatan", id: d.kecamatanId }; // klik lagi → naik satu level
    if (mode === "desa" || d.kecamatanId === activeKecId) return { type: "desa", id: d.id };
    return { type: "kecamatan", id: d.kecamatanId };
  };

  const hoverTargetOf = (d: Desa): Selection => {
    const t = targetOf(d);
    return t.type === "kecamatan" && selectedDesaId === d.id ? { type: "desa", id: d.id } : t;
  };

  const isHover = (d: Desa) =>
    (hover.type === "kecamatan" && hover.id === d.kecamatanId) || (hover.type === "desa" && hover.id === d.id);

  const keyActivate = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  /** Wilayah yang sedang "terangkat" (digambar sebagai balok 3D oleh canvas di atas peta). */
  const isLifted = (d: Desa) =>
    exploring && (selectedDesaId !== null ? d.id === selectedDesaId : selection.type === "kecamatan" && d.kecamatanId === selection.id);

  // Wilayah terangkat digambar paling akhir agar area kliknya (yang bergeser ke atas) tidak tertutup tetangganya
  const ordered = useMemo(
    () => (exploring && hasFocus ? [...desaList.filter((d) => !isLifted(d)), ...desaList.filter(isLifted)] : desaList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exploring, hasFocus, selectedDesaId, activeKecId]
  );

  const labelCls = (d: Desa) => {
    const dimKec = hasFocus && d.kecamatanId !== activeKecId;
    const dimDesa = selectedDesaId !== null && d.id !== selectedDesaId && d.kecamatanId === activeKecId;
    return `desa-label${dimKec ? " is-dim" : ""}${dimDesa ? " is-soft" : ""}${d.id === selectedDesaId ? " is-selected" : ""}${isLifted(d) ? " is-lifted" : ""}`;
  };

  return (
    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className={`map${exploring ? " is-explore" : ""}${hasFocus ? " has-focus" : ""}${showLabels ? "" : " no-labels"}`} preserveAspectRatio="none" role="group" aria-label="Peta Kota Banjar">
      <g strokeLinejoin="round">
        {ordered.map((d) => {
          const kec = kecById.get(d.kecamatanId)!;
          const dimKec = hasFocus && d.kecamatanId !== activeKecId;
          const dimDesa = selectedDesaId !== null && d.id !== selectedDesaId && d.kecamatanId === activeKecId;
          const cls = `desa-path${isHover(d) ? " is-hover" : ""}${dimKec ? " is-dim" : ""}${dimDesa ? " is-soft" : ""}${d.id === selectedDesaId ? " is-selected" : ""}`;
          return (
            <path
              key={d.id}
              data-desa={d.id}
              d={toPath(d.points)}
              fill={kec.fill}
              stroke={kec.stroke}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              className={cls}
              style={{ fillOpacity: 0, strokeOpacity: 0.16 }}
              tabIndex={exploring ? 0 : -1}
              role="button"
              aria-label={`Desa ${d.name}, Kecamatan ${kec.name}`}
              onClick={() => exploring && onSelect(targetOf(d))}
              onKeyDown={keyActivate(() => exploring && onSelect(targetOf(d)))}
              onPointerEnter={(e) => exploring && onHover(hoverTargetOf(d), e)}
              onPointerMove={(e) => exploring && onHover(hoverTargetOf(d), e)}
              onPointerLeave={() => onHover(NONE)}
              onFocus={() => exploring && onHover(hoverTargetOf(d))}
              onBlur={() => onHover(NONE)}
            />
          );
        })}
      </g>

      {/* batas antar kecamatan */}
      <path
        data-kec-border
        d={kecBorders}
        fill="none"
        stroke="#1d2b3a"
        strokeOpacity={0.55}
        strokeWidth={1.8}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ opacity: 0 }}
      />

      {/* garis tepi per kecamatan: menyala saat narasi membahas kecamatan itu */}
      {kecamatanList.map((k, i) => (
        <path
          key={k.id}
          data-kec-line={k.id}
          d={kecOutlines[i]}
          fill="none"
          className="kec-line"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
          style={{ opacity: 0 }}
        />
      ))}

      {/* tepi kecamatan terpilih + kontur desa terpilih (mode jelajah) */}
      {activeOutline && (
        <path
          key={`o-${activeKecId}`}
          d={activeOutline}
          fill="none"
          className={`kec-outline${selection.type === "kecamatan" ? " strong" : ""}`}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
      {selectedDesaId && desaById.get(selectedDesaId) && (
        <path
          key={selectedDesaId}
          d={toPath(desaById.get(selectedDesaId)!.points)}
          fill="none"
          className="sel-outline"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      <g pointerEvents="none">
        {desaList.map((d) => (
          <text
            key={d.id}
            data-desa-label={d.id}
            x={d.labelPos[0]}
            y={d.labelPos[1]}
            fontSize={d.labelSize}
            textAnchor="middle"
            dominantBaseline="middle"
            className={labelCls(d)}
            style={{ opacity: 0 }}
          >
            {d.name}
          </text>
        ))}
        {kecamatanList.map((k) => (
          <text
            key={k.id}
            data-kec-label={k.id}
            x={k.labelPos[0]}
            y={k.labelPos[1]}
            textAnchor="middle"
            className={`kec-label${hasFocus ? " is-hidden" : ""}`}
            style={{ opacity: 0 }}
          >
            KEC. {k.name.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default memo(MapSvg);
