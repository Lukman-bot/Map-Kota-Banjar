import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { desaList, kecamatanList, type Desa } from "../data/banjarMap";
import { bboxOf, kecamatanBorderPath, outlinePath, toPath } from "../utils/geometry";
import { desaById, desaByKec, kecById } from "../utils/stats";
import { fitCamera, useCamera, type Cam } from "../hooks/useCamera";
import type { Selection } from "../hooks/useSelection";

export type MapMode = "desa" | "kecamatan";
export interface Visible {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Props {
  size: { w: number; h: number };
  vis: Visible;
  selection: Selection;
  hover: Selection;
  mode: MapMode;
  showLabels: boolean;
  onSelect: (s: Selection) => void;
  onHover: (s: Selection, e?: PointerEvent) => void;
}

const FULL_BBOX = bboxOf(desaList);

function MapCanvas({ size, vis, selection, hover, mode, showLabels, onSelect, onHover }: Props) {
  const baseRef = useRef<SVGSVGElement>(null);
  const focusRef = useRef<SVGSVGElement>(null);

  const hasFocus = selection.type !== "none";
  const activeKecId =
    selection.type === "kecamatan"
      ? selection.id
      : selection.type === "desa"
        ? desaById.get(selection.id)?.kecamatanId ?? null
        : null;

  // Simpan kecamatan terakhir supaya lapisan fokus bisa memudar keluar dengan isi yang sama.
  const [focusKecId, setFocusKecId] = useState<string | null>(activeKecId);
  useEffect(() => {
    if (activeKecId) setFocusKecId(activeKecId);
  }, [activeKecId]);

  // ---------- Kamera ----------
  const target: Cam | null = useMemo(() => {
    if (size.w === 0) return null;
    if (selection.type === "none") return fitCamera(FULL_BBOX, size, vis, 0.95);
    if (selection.type === "kecamatan")
      return fitCamera(bboxOf(desaByKec.get(selection.id) ?? []), size, vis, 0.86);
    const d = desaById.get(selection.id);
    return fitCamera(bboxOf(d ? [d] : []), size, vis, 0.74);
  }, [selection, size, vis]);

  useCamera(target, size, (c, sz) => {
    const w = sz.w / c.s;
    const h = sz.h / c.s;
    const vb = `${c.cx - w / 2} ${c.cy - h / 2} ${w} ${h}`;
    baseRef.current?.setAttribute("viewBox", vb);
    focusRef.current?.setAttribute("viewBox", vb);
  });

  // ---------- Geometri (dihitung sekali) ----------
  const kecBorders = useMemo(() => kecamatanBorderPath(desaList), []);
  const focusDesa = focusKecId ? desaByKec.get(focusKecId) ?? [] : [];
  const focusOutline = useMemo(() => outlinePath(focusDesa), [focusKecId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDesaId = selection.type === "desa" ? selection.id : null;

  const isBaseHover = (d: Desa) =>
    (hover.type === "kecamatan" && hover.id === d.kecamatanId) ||
    (hover.type === "desa" && hover.id === d.id);

  const clickBase = (d: Desa) =>
    onSelect(mode === "kecamatan" ? { type: "kecamatan", id: d.kecamatanId } : { type: "desa", id: d.id });

  // Klik desa yang sedang dipilih → naik satu level ke kecamatannya.
  const clickFocus = (d: Desa) =>
    onSelect(
      selectedDesaId === d.id
        ? { type: "kecamatan", id: d.kecamatanId }
        : { type: "desa", id: d.id }
    );

  const hoverHandlers = (sel: Selection) => ({
    onPointerEnter: (e: PointerEvent) => onHover(sel, e),
    onPointerMove: (e: PointerEvent) => onHover(sel, e),
    onPointerLeave: () => onHover({ type: "none" }),
    onFocus: () => onHover(sel),
    onBlur: () => onHover({ type: "none" }),
  });

  const keyActivate = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const focusKec = focusKecId ? kecById.get(focusKecId) : undefined;

  return (
    <>
      {/* ===== Lapisan dasar: seluruh peta (diburamkan saat ada pilihan) ===== */}
      <svg
        ref={baseRef}
        className={`layer base${hasFocus ? " is-blurred" : ""}`}
        preserveAspectRatio="none"
        role="group"
        aria-label="Peta Kota Banjar"
      >
        <g strokeLinejoin="round">
          {desaList.map((d, i) => {
            const kec = kecById.get(d.kecamatanId)!;
            return (
              <path
                key={d.id}
                d={toPath(d.points)}
                fill={kec.fill}
                stroke={kec.stroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className={`desa-path${isBaseHover(d) ? " is-hover" : ""}`}
                style={{ animationDelay: `${300 + i * 45}ms` }}
                tabIndex={hasFocus ? -1 : 0}
                role="button"
                aria-label={`Desa ${d.name}, Kecamatan ${kec.name}`}
                onClick={() => clickBase(d)}
                onKeyDown={keyActivate(() => clickBase(d))}
                {...hoverHandlers(
                  mode === "kecamatan"
                    ? { type: "kecamatan", id: d.kecamatanId }
                    : { type: "desa", id: d.id }
                )}
              />
            );
          })}
        </g>

        <path
          d={kecBorders}
          fill="none"
          stroke="#1d2b3a"
          strokeOpacity={0.55}
          strokeWidth={1.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        <g className={`labels${hasFocus ? " is-hidden" : ""}`} pointerEvents="none">
          {showLabels &&
            desaList.map((d) => (
              <text
                key={d.id}
                x={d.labelPos[0]}
                y={d.labelPos[1]}
                fontSize={d.labelSize}
                textAnchor="middle"
                dominantBaseline="middle"
                className="desa-label"
              >
                {d.name}
              </text>
            ))}
          {kecamatanList.map((k) => (
            <text key={k.id} x={k.labelPos[0]} y={k.labelPos[1]} textAnchor="middle" className="kec-label">
              KEC. {k.name.toUpperCase()}
            </text>
          ))}
        </g>
      </svg>

      {/* Peredup tepi (vignette) */}
      <div className={`veil${hasFocus ? " on" : ""}`} aria-hidden />

      {/* ===== Lapisan fokus: wilayah terpilih, tajam & menonjol ===== */}
      <svg
        ref={focusRef}
        className={`layer focus${hasFocus ? " on" : ""}`}
        preserveAspectRatio="none"
        aria-hidden={!hasFocus}
      >
        <g strokeLinejoin="round">
          {focusDesa.map((d) => {
            const kec = kecById.get(d.kecamatanId)!;
            const isSel = d.id === selectedDesaId;
            const dim = selectedDesaId !== null && !isSel;
            const hov = hover.type === "desa" && hover.id === d.id;
            return (
              <path
                key={d.id}
                d={toPath(d.points)}
                fill={kec.fill}
                stroke={kec.stroke === "#ffffff" ? "#e9d3d1" : kec.stroke}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                className={`f-path${isSel ? " is-selected" : ""}${dim ? " is-dim" : ""}${hov ? " is-hover" : ""}`}
                tabIndex={hasFocus ? 0 : -1}
                role="button"
                aria-label={`Desa ${d.name}, Kecamatan ${kec.name}`}
                aria-pressed={isSel}
                onClick={() => clickFocus(d)}
                onKeyDown={keyActivate(() => clickFocus(d))}
                {...hoverHandlers({ type: "desa", id: d.id })}
              />
            );
          })}
        </g>

        {/* Garis tepi kecamatan (berjalan) */}
        {focusOutline && (
          <path
            d={focusOutline}
            fill="none"
            className={`kec-outline${selection.type === "kecamatan" ? " strong" : ""}`}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {/* Desa terpilih: kontur menyala */}
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

        {showLabels && (
          <g pointerEvents="none">
            {focusDesa.map((d) => (
              <text
                key={d.id}
                x={d.labelPos[0]}
                y={d.labelPos[1]}
                fontSize={d.labelSize}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`desa-label f-label${d.id === selectedDesaId ? " is-selected" : ""}${
                  selectedDesaId && d.id !== selectedDesaId ? " is-dim" : ""
                }`}
              >
                {d.name}
              </text>
            ))}
          </g>
        )}
        {focusKec && <title>{`Kecamatan ${focusKec.name}`}</title>}
      </svg>
    </>
  );
}

export default memo(MapCanvas);
