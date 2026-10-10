import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Beats from "./components/Beats";
import InfoCard from "./components/InfoCard";
import MapSvg, { type MapMode } from "./components/MapSvg";
import SearchBox from "./components/SearchBox";
import { Icon } from "./components/ui";
import { desaList, kecamatanList } from "./data/banjarMap";
import { profilDesa } from "./data/profiles";
import { fitCamera, type Cam, type Visible } from "./hooks/useCamera";
import { useElementSize } from "./hooks/useElementSize";
import { useExperience } from "./hooks/useExperience";
import { useSelection, type Selection } from "./hooks/useSelection";
import { bboxOf } from "./utils/geometry";
import { desaById, desaByKec, fmt, kecById, profilKec, sumSekolah } from "./utils/stats";

const NONE: Selection = { type: "none" };
const PANEL_W = 420; // lebar card (desktop)
const MOBILE_BP = 820;

export default function App() {
  const [root, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selection, select] = useSelection();

  /** false = masih pengantar (scroll); true = peta bisa diklik */
  const [explore, setExplore] = useState(selection.type !== "none");
  const exploringRef = useRef(explore);
  exploringRef.current = explore;

  const [hover, setHover] = useState<Selection>(NONE);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<MapMode>("kecamatan");
  const [showLabels, setShowLabels] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(true);

  const mobile = size.w > 0 && size.w < MOBILE_BP;
  const sheetH = mobile ? (sheetExpanded ? Math.round(size.h * 0.52) : 92) : 0;
  const hasFocus = selection.type !== "none";

  // ---------- Area peta yang tidak tertutup teks / card ----------
  const visFull: Visible = useMemo(
    () => (mobile ? { left: 12, top: 96, right: size.w - 12, bottom: size.h - 24 } : { left: 24, top: 84, right: size.w - 24, bottom: size.h - 24 }),
    [mobile, size.w, size.h]
  );
  /** Saat narasi tampil: desktop → teks di kiri, peta di kanan; mobile → teks di bawah, peta di atas. */
  const visStory: Visible = useMemo(
    () =>
      mobile
        ? { left: 12, top: 70, right: size.w - 12, bottom: Math.round(size.h * 0.56) }
        : { left: Math.round(size.w * 0.36), top: 60, right: size.w - 30, bottom: size.h - 60 },
    [mobile, size.w, size.h]
  );
  /** Pertanyaan akhir: peta di bagian atas, teks di bawah. */
  const visEnd: Visible = useMemo(
    () =>
      mobile
        ? { left: 12, top: 60, right: size.w - 12, bottom: Math.round(size.h * 0.5) }
        : { left: 24, top: 56, right: size.w - 24, bottom: size.h - 250 },
    [mobile, size.w, size.h]
  );
  const visCard: Visible = useMemo(
    () =>
      mobile
        ? { left: 12, top: 118, right: size.w - 12, bottom: size.h - sheetH - 20 }
        : { left: 24, top: 92, right: size.w - PANEL_W - 40, bottom: size.h - 24 },
    [mobile, size.w, size.h, sheetH]
  );

  const exp = useExperience({ root, canvas, size, visFull, visStory, visEnd, exploringRef });

  // ---------- Kamera mengikuti pilihan (zoom in / zoom out) ----------
  const lastSize = useRef({ w: 0, h: 0 });
  const wasExplore = useRef(false);
  useEffect(() => {
    if (!explore || size.w === 0) {
      wasExplore.current = false;
      return;
    }
    const resized = lastSize.current.w !== size.w || lastSize.current.h !== size.h;
    lastSize.current = { w: size.w, h: size.h };

    let target: Cam;
    if (selection.type === "none") target = exp.fullCam();
    else if (selection.type === "kecamatan") target = fitCamera(bboxOf(desaByKec.get(selection.id) ?? []), size, visCard, 0.86);
    else {
      const d = desaById.get(selection.id);
      target = fitCamera(bboxOf(d ? [d] : []), size, visCard, 0.74);
    }
    // loncat langsung bila: ukuran layar berubah, atau baru masuk mode jelajah dari tautan
    const instant = resized || (!wasExplore.current && selection.type !== "none");
    wasExplore.current = true;
    exp.flyTo(target, { instant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explore, selection, size.w, size.h, visCard]);

  // ---------- Kunci scroll saat jelajah ----------
  useEffect(() => {
    document.documentElement.classList.toggle("lock", explore);
    return () => document.documentElement.classList.remove("lock");
  }, [explore]);

  // Dibuka lewat tombol Back / tautan ke wilayah → otomatis masuk mode jelajah
  useEffect(() => {
    if (selection.type !== "none" && !explore) {
      setExplore(true);
      exp.skip(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const onSelect = useCallback(
    (s: Selection) => {
      select(s);
      setHover(NONE);
      setPointer(null);
      if (s.type !== "none") setSheetExpanded(true);
    },
    [select]
  );

  const onHover = useCallback((s: Selection, e?: PointerEvent) => {
    setHover(s);
    if (e && e.pointerType === "mouse") setPointer({ x: e.clientX, y: e.clientY });
    else setPointer(null);
  }, []);

  const startExplore = () => {
    setExplore(true);
  };

  const restart = () => {
    onSelect(NONE);
    setExplore(false);
    exp.restart();
  };

  // Esc = naik satu level
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!explore || e.key !== "Escape" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (selection.type === "desa") onSelect({ type: "kecamatan", id: desaById.get(selection.id)!.kecamatanId });
      else if (selection.type === "kecamatan") onSelect(NONE);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [explore, selection, onSelect]);

  useEffect(() => {
    document.title =
      selection.type === "none"
        ? "Peta Interaktif Kota Banjar"
        : selection.type === "kecamatan"
          ? `Kecamatan ${kecById.get(selection.id)!.name} — Peta Kota Banjar`
          : `${desaById.get(selection.id)!.name} — Peta Kota Banjar`;
  }, [selection]);

  // ---------- Tooltip ----------
  const tip = (() => {
    if (!explore || !pointer || hover.type === "none") return null;
    if (hover.type === "kecamatan") {
      const k = kecById.get(hover.id)!;
      const p = profilKec.get(hover.id)!;
      return { title: `Kecamatan ${k.name}`, color: k.fill, line: `${fmt(p.penduduk)} jiwa · ${sumSekolah(p.sekolah)} sekolah` };
    }
    const d = desaById.get(hover.id)!;
    const p = profilDesa[d.id];
    return { title: d.name, color: kecById.get(d.kecamatanId)!.fill, line: `Kec. ${kecById.get(d.kecamatanId)!.name} · ${fmt(p.penduduk)} jiwa` };
  })();

  const fx = (visCard.left + visCard.right) / 2;
  const fy = (visCard.top + visCard.bottom) / 2;

  return (
    <div
      ref={root}
      className={`app${mobile ? " is-mobile" : ""}${explore ? " is-explore" : ""}${hasFocus ? " has-card" : ""}`}
      style={{ "--panel-w": `${PANEL_W}px`, "--sheet-h": `${sheetH}px`, "--fx": `${fx}px`, "--fy": `${fy}px` } as React.CSSProperties}
    >
      {/* ===== Panggung: latar + peta SVG + adegan Three.js ===== */}
      <div className="stage">
        <div className="backdrop" aria-hidden />
        <MapSvg
          selection={selection}
          hover={hover}
          mode={mode}
          showLabels={showLabels}
          exploring={explore}
          onSelect={onSelect}
          onHover={onHover}
        />
        <canvas ref={canvas} className="three" aria-hidden />
        <div className={`veil${hasFocus ? " on" : ""}`} aria-hidden />
        <div className="shade" aria-hidden />
      </div>

      {/* ===== Narasi pengantar (digerakkan ScrollTrigger) ===== */}
      <Beats onExplore={startExplore} onRestart={restart} />

      {!explore && (
        <>
          <div className="scroll-progress" aria-hidden>
            <i data-progress />
          </div>
          <button className="skip" onClick={() => exp.skip()}>
            Lewati pengantar {Icon.right}
          </button>
        </>
      )}

      {/* ===== Mode jelajah ===== */}
      {explore && (
        <>
          <header className="topbar">
            <button className="brand" onClick={() => onSelect(NONE)} title="Kembali ke seluruh Kota Banjar">
              <span className="brand-mark">{Icon.pin}</span>
              <span className="brand-text">
                <b>Peta Kota Banjar</b>
                <small>
                  {kecamatanList.length} kecamatan · {desaList.length} desa/kelurahan
                </small>
              </span>
            </button>

            <SearchBox onSelect={onSelect} />

            <div className="controls">
              <div className="seg" role="group" aria-label="Mode klik peta">
                <i style={{ transform: mode === "desa" ? "translateX(100%)" : "none" }} />
                <button className={mode === "kecamatan" ? "on" : ""} onClick={() => setMode("kecamatan")}>
                  Kecamatan
                </button>
                <button className={mode === "desa" ? "on" : ""} onClick={() => setMode("desa")}>
                  Desa
                </button>
              </div>
              <label className="switch" title="Tampilkan nama desa di peta">
                <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                <span className="track">
                  <span />
                </span>
                <span className="switch-text">Nama</span>
              </label>
              <button className="replay" onClick={restart} title="Putar ulang pengantar">
                ↺ <span>Pengantar</span>
              </button>
            </div>
          </header>

          {!mobile && (
            <div className="legend">
              {hasFocus && (
                <button className="reset" onClick={() => onSelect(NONE)}>
                  {Icon.fit} Semua wilayah
                </button>
              )}
              <ul>
                {kecamatanList.map((k) => (
                  <li key={k.id}>
                    <button
                      onClick={() => onSelect({ type: "kecamatan", id: k.id })}
                      onPointerEnter={() => setHover({ type: "kecamatan", id: k.id })}
                      onPointerLeave={() => setHover(NONE)}
                    >
                      <span className="dot" style={{ background: k.fill }} />
                      {k.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasFocus && (
            <p className="hint" key="hint">
              {mode === "kecamatan" ? "Klik sebuah kecamatan pada peta" : "Klik sebuah desa / kelurahan pada peta"}
            </p>
          )}

          <InfoCard
            selection={selection}
            onSelect={onSelect}
            onHover={(s) => {
              setHover(s);
              setPointer(null);
            }}
            sheet={mobile ? { expanded: sheetExpanded, toggle: () => setSheetExpanded((v) => !v) } : null}
          />
        </>
      )}

      {tip && pointer && (
        <div className="tip" style={{ transform: `translate(${pointer.x + 16}px, ${pointer.y + 18}px)` }}>
          <span className="dot" style={{ background: tip.color }} />
          <div>
            <b>{tip.title}</b>
            <small>{tip.line}</small>
          </div>
        </div>
      )}
    </div>
  );
}
