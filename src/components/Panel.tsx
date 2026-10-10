import { useEffect, useRef, useState } from "react";
import { DATA_CONTOH } from "../data/profiles";
import { desaList, kecamatanList } from "../data/banjarMap";
import { profilDesa } from "../data/profiles";
import type { Selection } from "../hooks/useSelection";
import {
  density,
  desaById,
  desaByKec,
  fmt,
  kecById,
  profilKec,
  profilKota,
  sumSekolah,
} from "../utils/stats";
import type { Profil } from "../data/profiles";
import {
  GenderBar,
  Icon,
  Num,
  RegionList,
  SchoolBreakdown,
  Section,
  ShareBar,
  StatTile,
  type Row,
} from "./ui";

interface Props {
  selection: Selection;
  onSelect: (s: Selection) => void;
  onHover: (s: Selection) => void;
  /** Mobile: bottom sheet bisa dilipat */
  sheet?: { expanded: boolean; toggle: () => void } | null;
}

const NONE: Selection = { type: "none" };

/** Blok statistik yang dipakai bersama oleh kota, kecamatan, dan desa. */
function ProfileBody({ profil, extraTile }: { profil: Profil; extraTile: { label: string; value: React.ReactNode; unit?: string } }) {
  return (
    <>
      <div className="tiles">
        <StatTile label="Jumlah penduduk" unit="jiwa" index={0}>
          <Num value={profil.penduduk} />
        </StatTile>
        <StatTile label="Luas wilayah" unit="km²" index={1}>
          <Num value={profil.luasKm2} decimals={2} />
        </StatTile>
        <StatTile label="Kepadatan" unit="jiwa / km²" index={2}>
          <Num value={density(profil)} />
        </StatTile>
        <StatTile label={extraTile.label} unit={extraTile.unit} index={3}>
          {extraTile.value}
        </StatTile>
      </div>

      <Section title="Kependudukan">
        <GenderBar profil={profil} />
        <dl className="facts">
          <div>
            <dt>Kepala keluarga</dt>
            <dd>{fmt(profil.kk)}</dd>
          </div>
          <div>
            <dt>RW</dt>
            <dd>{fmt(profil.rw)}</dd>
          </div>
          <div>
            <dt>RT</dt>
            <dd>{fmt(profil.rt)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Sekolah menurut jenis">
        <SchoolBreakdown profil={profil} />
      </Section>
    </>
  );
}

const kecRows = (activeId?: string): Row[] =>
  kecamatanList.map((k) => ({
    key: k.id,
    sel: { type: "kecamatan", id: k.id },
    name: `Kecamatan ${k.name}`,
    sub: `${desaByKec.get(k.id)?.length ?? 0} desa/kel.`,
    color: k.fill,
    profil: profilKec.get(k.id)!,
    active: k.id === activeId,
  }));

const desaRows = (ids: string[], withKec: boolean, activeId?: string): Row[] =>
  ids.map((id) => {
    const d = desaById.get(id)!;
    return {
      key: d.id,
      sel: { type: "desa", id: d.id },
      name: d.name,
      sub: withKec ? `Kec. ${kecById.get(d.kecamatanId)!.name}` : undefined,
      color: kecById.get(d.kecamatanId)!.fill,
      profil: profilDesa[d.id],
      active: d.id === activeId,
    };
  });

/* ===================== Beranda: seluruh kota ===================== */
function Overview({ onSelect, onHover }: Pick<Props, "onSelect" | "onHover">) {
  const [tab, setTab] = useState<"kec" | "desa">("kec");
  return (
    <div className="view">
      <header className="head">
        <p className="eyebrow">Provinsi Jawa Barat</p>
        <h2 className="title">Kota Banjar</h2>
        <p className="lede">Pilih kecamatan atau desa pada peta, atau dari daftar di bawah, untuk melihat profilnya.</p>
      </header>

      <ProfileBody
        profil={profilKota}
        extraTile={{ label: "Desa / Kelurahan", value: <Num value={desaList.length} />, unit: `di ${kecamatanList.length} kecamatan` }}
      />

      <Section title="Daftar wilayah">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "kec"} className={tab === "kec" ? "on" : ""} onClick={() => setTab("kec")}>
            Kecamatan <span>{kecamatanList.length}</span>
          </button>
          <button role="tab" aria-selected={tab === "desa"} className={tab === "desa" ? "on" : ""} onClick={() => setTab("desa")}>
            Desa / Kelurahan <span>{desaList.length}</span>
          </button>
        </div>
        {tab === "kec" ? (
          <RegionList key="kec" rows={kecRows()} onSelect={onSelect} onHover={onHover} />
        ) : (
          <RegionList key="desa" rows={desaRows(desaList.map((d) => d.id), true)} onSelect={onSelect} onHover={onHover} />
        )}
      </Section>
    </div>
  );
}

/* ===================== Profil kecamatan ===================== */
function KecamatanView({ id, onSelect, onHover }: { id: string } & Pick<Props, "onSelect" | "onHover">) {
  const kec = kecById.get(id)!;
  const profil = profilKec.get(id)!;
  const list = desaByKec.get(id) ?? [];

  return (
    <div className="view">
      <header className="head">
        <nav className="crumbs" aria-label="Lokasi">
          <button onClick={() => onSelect(NONE)}>Kota Banjar</button>
        </nav>
        <h2 className="title">
          <span className="swatch" style={{ background: kec.fill }} />
          Kecamatan {kec.name}
        </h2>
        <p className="lede">
          Terdiri dari {list.length} desa/kelurahan dengan {sumSekolah(profil.sekolah)} satuan pendidikan.
        </p>
      </header>

      <ProfileBody
        profil={profil}
        extraTile={{ label: "Desa / Kelurahan", value: <Num value={list.length} />, unit: "wilayah" }}
      />

      <Section title="Porsi terhadap Kota Banjar">
        <ShareBar label="Jumlah penduduk" part={profil.penduduk} whole={profilKota.penduduk} unit="jiwa" />
        <ShareBar label="Luas wilayah" part={profil.luasKm2} whole={profilKota.luasKm2} unit="km²" decimals={2} />
        <ShareBar label="Satuan pendidikan" part={sumSekolah(profil.sekolah)} whole={sumSekolah(profilKota.sekolah)} unit="sekolah" />
      </Section>

      <Section title={`Desa / Kelurahan (${list.length})`}>
        <RegionList rows={desaRows(list.map((d) => d.id), false)} onSelect={onSelect} onHover={onHover} />
      </Section>
    </div>
  );
}

/* ===================== Profil desa ===================== */
function DesaView({ id, onSelect, onHover }: { id: string } & Pick<Props, "onSelect" | "onHover">) {
  const desa = desaById.get(id)!;
  const kec = kecById.get(desa.kecamatanId)!;
  const profil = profilDesa[id];
  const siblings = desaByKec.get(kec.id) ?? [];
  const idx = siblings.findIndex((d) => d.id === id);
  const prev = siblings[(idx - 1 + siblings.length) % siblings.length];
  const next = siblings[(idx + 1) % siblings.length];
  const rank = [...siblings].sort((a, b) => profilDesa[b.id].penduduk - profilDesa[a.id].penduduk).findIndex((d) => d.id === id) + 1;
  const kp = profilKec.get(kec.id)!;

  return (
    <div className="view">
      <header className="head">
        <nav className="crumbs" aria-label="Lokasi">
          <button onClick={() => onSelect(NONE)}>Kota Banjar</button>
          <i>›</i>
          <button onClick={() => onSelect({ type: "kecamatan", id: kec.id })}>Kec. {kec.name}</button>
        </nav>
        <div className="title-row">
          <h2 className="title">
            <span className="swatch" style={{ background: kec.fill }} />
            {desa.name}
          </h2>
          {siblings.length > 1 && (
            <div className="pager" role="group" aria-label="Desa lainnya di kecamatan ini">
              <button onClick={() => onSelect({ type: "desa", id: prev.id })} title={`Sebelumnya: ${prev.name}`} aria-label={`Sebelumnya: ${prev.name}`}>
                {Icon.left}
              </button>
              <span>
                {idx + 1}/{siblings.length}
              </span>
              <button onClick={() => onSelect({ type: "desa", id: next.id })} title={`Berikutnya: ${next.name}`} aria-label={`Berikutnya: ${next.name}`}>
                {Icon.right}
              </button>
            </div>
          )}
        </div>
        <p className="lede">Desa/kelurahan di Kecamatan {kec.name}, Kota Banjar.</p>
      </header>

      <ProfileBody
        profil={profil}
        extraTile={{
          label: "Peringkat penduduk",
          value: (
            <>
              #<Num value={rank} />
            </>
          ),
          unit: `dari ${siblings.length} di kecamatan`,
        }}
      />

      <Section title={`Porsi terhadap Kec. ${kec.name}`}>
        <ShareBar label="Jumlah penduduk" part={profil.penduduk} whole={kp.penduduk} unit="jiwa" />
        <ShareBar label="Luas wilayah" part={profil.luasKm2} whole={kp.luasKm2} unit="km²" decimals={2} />
        <ShareBar label="Satuan pendidikan" part={sumSekolah(profil.sekolah)} whole={sumSekolah(kp.sekolah)} unit="sekolah" />
      </Section>

      <Section title={`Desa lain di Kec. ${kec.name}`}>
        <RegionList
          rows={desaRows(siblings.map((d) => d.id), false, id)}
          onSelect={onSelect}
          onHover={onHover}
        />
      </Section>
    </div>
  );
}

/* ===================== Kerangka panel ===================== */
export default function Panel({ selection, onSelect, onHover, sheet }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const key = selection.type === "none" ? "kota" : `${selection.type}:${selection.id}`;

  // Setiap pindah wilayah, gulir kembali ke atas.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [key]);

  const goBack = () =>
    onSelect(
      selection.type === "desa"
        ? { type: "kecamatan", id: desaById.get(selection.id)!.kecamatanId }
        : NONE
    );

  return (
    <aside className={`panel${sheet && !sheet.expanded ? " collapsed" : ""}`} aria-label="Profil wilayah">
      {sheet && (
        <button className="grab" onClick={sheet.toggle} aria-label={sheet.expanded ? "Ciutkan panel" : "Perluas panel"}>
          <span />
        </button>
      )}

      <div className="panel-bar">
        <span className="panel-bar-title">
          {selection.type === "none"
            ? "Ringkasan"
            : selection.type === "kecamatan"
              ? "Profil kecamatan"
              : "Profil desa / kelurahan"}
        </span>
        {selection.type !== "none" && (
          <div className="panel-bar-actions">
            <button onClick={goBack} title="Kembali (Esc)">
              {Icon.left} <span>Kembali</span>
            </button>
            <button className="icon" onClick={() => onSelect(NONE)} title="Tutup & lihat semua wilayah" aria-label="Tutup">
              {Icon.close}
            </button>
          </div>
        )}
      </div>

      <div className="panel-scroll" ref={scroller}>
        <div key={key} className="view-anim">
          {selection.type === "none" && <Overview onSelect={onSelect} onHover={onHover} />}
          {selection.type === "kecamatan" && <KecamatanView id={selection.id} onSelect={onSelect} onHover={onHover} />}
          {selection.type === "desa" && <DesaView id={selection.id} onSelect={onSelect} onHover={onHover} />}
          {DATA_CONTOH && (
            <p className="note">
              <b>Data contoh.</b> Penduduk, sekolah, dan data lain masih berupa estimasi placeholder; ganti di{" "}
              <code>src/data/profiles.ts</code>. Batas wilayah hasil digitalisasi gambar, bukan data administrasi resmi.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
