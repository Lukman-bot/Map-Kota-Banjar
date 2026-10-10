import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Profil } from "../data/profiles";
import type { Selection } from "../hooks/useSelection";
import { useCountUp } from "../hooks/useCountUp";
import {
  JENIS_SEKOLAH,
  SORT_LABEL,
  fmt,
  metricOf,
  perempuan,
  sumSekolah,
  type SortKey,
} from "../utils/stats";

/* ---------- Angka beranimasi ---------- */
export function Num({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useCountUp(value);
  return <>{fmt(v, decimals)}</>;
}

/* ---------- Ikon kecil (inline SVG) ---------- */
export const Icon = {
  close: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  fit: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
};

/* ---------- Kartu statistik ---------- */
export function StatTile({
  label,
  children,
  unit,
  index = 0,
}: {
  label: string;
  children: ReactNode;
  unit?: string;
  index?: number;
}) {
  return (
    <div className="tile" style={{ animationDelay: `${index * 60}ms` }}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{children}</span>
      {unit && <span className="tile-unit">{unit}</span>}
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ---------- Rincian per jenis (sekolah, ibadah, kesehatan, ekonomi) ---------- */
export interface BreakItem {
  key: string;
  label: string;
  hint?: string;
  color: string;
  n: number;
}

export function Breakdown({ items, totalLabel }: { items: BreakItem[]; totalLabel: string }) {
  const total = items.reduce((a, b) => a + b.n, 0);
  const max = Math.max(1, ...items.map((j) => j.n));

  return (
    <div className="schools">
      <div className="schools-total">
        <strong>
          <Num value={total} />
        </strong>
        <span>{totalLabel}</span>
      </div>

      <div className="stack" role="img" aria-label={`Komposisi ${totalLabel}`}>
        {items.map((j, i) =>
          j.n ? (
            <span
              key={j.key}
              className="stack-seg"
              style={{ "--w": `${(j.n / Math.max(1, total)) * 100}%`, background: j.color, animationDelay: `${200 + i * 70}ms` } as CSSProperties}
              title={`${j.label}: ${j.n}`}
            />
          ) : null
        )}
      </div>

      <ul className="school-rows">
        {items.map((j, i) => (
          <li key={j.key} title={j.hint} className={j.n === 0 ? "zero" : ""} style={{ animationDelay: `${150 + i * 50}ms` }}>
            <span className="dot" style={{ background: j.color }} />
            <span className="school-name">{j.label}</span>
            <span className="school-bar">
              <i style={{ "--w": `${(j.n / max) * 100}%`, background: j.color, animationDelay: `${300 + i * 70}ms` } as CSSProperties} />
            </span>
            <b>{fmt(j.n)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SchoolBreakdown({ profil }: { profil: Profil }) {
  return (
    <Breakdown
      totalLabel="sekolah / satuan pendidikan"
      items={JENIS_SEKOLAH.map((j) => ({ key: j.key, label: j.label, hint: j.hint, color: j.color, n: profil.sekolah[j.key] }))}
    />
  );
}

/* ---------- Laki-laki / perempuan ---------- */
export function GenderBar({ profil }: { profil: Profil }) {
  const p = perempuan(profil);
  const l = profil.lakiLaki;
  const pctL = (l / profil.penduduk) * 100;
  return (
    <div className="gender">
      <div className="gender-bar">
        <span className="g-l" style={{ "--w": `${pctL}%` } as CSSProperties} />
        <span className="g-p" />
      </div>
      <div className="gender-legend">
        <span>
          <i className="g-dot g-l" /> Laki-laki <b>{fmt(l)}</b> <em>({pctL.toFixed(1)}%)</em>
        </span>
        <span>
          <i className="g-dot g-p" /> Perempuan <b>{fmt(p)}</b> <em>({(100 - pctL).toFixed(1)}%)</em>
        </span>
      </div>
    </div>
  );
}

/* ---------- Bar porsi ---------- */
export function ShareBar({ label, part, whole, unit, decimals = 0 }: { label: string; part: number; whole: number; unit: string; decimals?: number }) {
  const pct = whole > 0 ? (part / whole) * 100 : 0;
  return (
    <div className="share">
      <div className="share-top">
        <span>{label}</span>
        <b>{pct.toFixed(1)}%</b>
      </div>
      <div className="share-track">
        <i style={{ "--w": `${Math.max(1.5, pct)}%` } as CSSProperties} />
      </div>
      <small>
        {fmt(part, decimals)} dari {fmt(whole, decimals)} {unit}
      </small>
    </div>
  );
}

/* ---------- Daftar wilayah (dapat diurutkan) ---------- */
export interface Row {
  key: string;
  sel: Selection;
  name: string;
  sub?: string;
  color: string;
  profil: Profil;
  active?: boolean;
}

const SORTS: SortKey[] = ["nama", "penduduk", "luas", "sekolah"];

export function RegionList({
  rows,
  onSelect,
  onHover,
  defaultSort = "nama",
}: {
  rows: Row[];
  onSelect: (s: Selection) => void;
  onHover: (s: Selection) => void;
  defaultSort?: SortKey;
}) {
  const [sort, setSort] = useState<SortKey>(defaultSort);

  const sorted = useMemo(() => {
    const r = [...rows];
    if (sort === "nama") r.sort((a, b) => a.name.localeCompare(b.name, "id"));
    else r.sort((a, b) => metricOf(b.profil, sort) - metricOf(a.profil, sort));
    return r;
  }, [rows, sort]);

  const shownMetric: SortKey = sort === "nama" ? "penduduk" : sort;
  const max = Math.max(1, ...rows.map((r) => metricOf(r.profil, shownMetric)));
  const unit = shownMetric === "penduduk" ? "jiwa" : shownMetric === "luas" ? "km²" : "sekolah";

  return (
    <div className="region-list">
      <div className="sorts" role="group" aria-label="Urutkan daftar">
        <span>Urutkan</span>
        {SORTS.map((k) => (
          <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
            {SORT_LABEL[k]}
          </button>
        ))}
      </div>

      <ul>
        {sorted.map((r, i) => {
          const m = metricOf(r.profil, shownMetric);
          return (
            <li key={r.key} className="row-wrap" style={{ animationDelay: `${Math.min(i, 14) * 28}ms` }}>
              <button
                className={`row${r.active ? " active" : ""}`}
                onClick={() => onSelect(r.sel)}
                onPointerEnter={() => onHover(r.sel)}
                onPointerLeave={() => onHover({ type: "none" })}
                onFocus={() => onHover(r.sel)}
                onBlur={() => onHover({ type: "none" })}
              >
                <span className="row-dot" style={{ background: r.color }} />
                <span className="row-main">
                  <span className="row-name">{r.name}</span>
                  <span className="row-meta">
                    {r.sub ? `${r.sub} · ` : ""}
                    {fmt(r.profil.penduduk)} jiwa · {fmt(r.profil.luasKm2, 2)} km² · {sumSekolah(r.profil.sekolah)} sekolah
                  </span>
                </span>
                <span className="row-val">
                  <b>{fmt(m, shownMetric === "luas" ? 2 : 0)}</b>
                  <em>{unit}</em>
                </span>
                <span className="row-bar">
                  <i
                    key={shownMetric}
                    style={{ "--w": `${(m / max) * 100}%`, background: r.color } as CSSProperties}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
