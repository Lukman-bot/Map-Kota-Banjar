import { useEffect, useRef } from "react";
import { DATA_CONTOH, profilDesa, type Profil } from "../data/profiles";
import type { Selection } from "../hooks/useSelection";
import {
  JENIS_EKONOMI,
  JENIS_IBADAH,
  JENIS_KESEHATAN,
  density,
  desaById,
  desaByKec,
  fmt,
  kecById,
  profilKec,
  profilKota,
  sumSekolah,
} from "../utils/stats";
import { Breakdown, GenderBar, Icon, Num, RegionList, SchoolBreakdown, Section, ShareBar, StatTile, type Row } from "./ui";

interface Props {
  selection: Selection;
  onSelect: (s: Selection) => void;
  onHover: (s: Selection) => void;
  /** Mobile: bottom sheet yang bisa dilipat */
  sheet?: { expanded: boolean; toggle: () => void } | null;
}

const NONE: Selection = { type: "none" };

const desaRows = (ids: string[], activeId?: string): Row[] =>
  ids.map((id) => {
    const d = desaById.get(id)!;
    return {
      key: d.id,
      sel: { type: "desa", id: d.id },
      name: d.name,
      color: kecById.get(d.kecamatanId)!.fill,
      profil: profilDesa[d.id],
      active: d.id === activeId,
    };
  });

/** Blok data yang sama untuk kecamatan maupun desa. */
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

      <Section title="Pendidikan">
        <SchoolBreakdown profil={profil} />
      </Section>

      <Section title="Tempat ibadah">
        <Breakdown
          totalLabel="tempat ibadah"
          items={JENIS_IBADAH.map((j) => ({ key: j.key, label: j.label, color: j.color, n: profil.ibadah[j.key] }))}
        />
      </Section>

      <Section title="Fasilitas kesehatan">
        <Breakdown
          totalLabel="fasilitas kesehatan"
          items={JENIS_KESEHATAN.map((j) => ({ key: j.key, label: j.label, color: j.color, n: profil.kesehatan[j.key] }))}
        />
      </Section>

      <Section title="Pasar & ekonomi">
        <Breakdown
          totalLabel="pasar, toko modern & lembaga keuangan"
          items={JENIS_EKONOMI.map((j) => ({ key: j.key, label: j.label, color: j.color, n: profil.ekonomi[j.key] }))}
        />
      </Section>
    </>
  );
}

/* ===================== Kecamatan ===================== */
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
          Terdiri dari {list.length} desa/kelurahan dengan {sumSekolah(profil.sekolah)} satuan pendidikan. Klik salah satu desa di peta atau di daftar bawah untuk melihat rinciannya.
        </p>
      </header>

      <ProfileBody profil={profil} extraTile={{ label: "Desa / Kelurahan", value: <Num value={list.length} />, unit: "wilayah" }} />

      <Section title="Porsi terhadap Kota Banjar">
        <ShareBar label="Jumlah penduduk" part={profil.penduduk} whole={profilKota.penduduk} unit="jiwa" />
        <ShareBar label="Luas wilayah" part={profil.luasKm2} whole={profilKota.luasKm2} unit="km²" decimals={2} />
        <ShareBar label="Satuan pendidikan" part={sumSekolah(profil.sekolah)} whole={sumSekolah(profilKota.sekolah)} unit="sekolah" />
      </Section>

      <Section title={`Desa / Kelurahan (${list.length})`}>
        <RegionList rows={desaRows(list.map((d) => d.id))} onSelect={onSelect} onHover={onHover} />
      </Section>
    </div>
  );
}

/* ===================== Desa ===================== */
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
        <RegionList rows={desaRows(siblings.map((d) => d.id), id)} onSelect={onSelect} onHover={onHover} />
      </Section>
    </div>
  );
}

/* ===================== Kerangka card ===================== */
export default function InfoCard({ selection, onSelect, onHover, sheet }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const key = selection.type === "none" ? "none" : `${selection.type}:${selection.id}`;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [key]);

  if (selection.type === "none") return null;

  const goBack = () =>
    onSelect(selection.type === "desa" ? { type: "kecamatan", id: desaById.get(selection.id)!.kecamatanId } : NONE);

  return (
    <aside className={`panel${sheet && !sheet.expanded ? " collapsed" : ""}`} aria-label="Profil wilayah">
      {sheet && (
        <button className="grab" onClick={sheet.toggle} aria-label={sheet.expanded ? "Ciutkan kartu" : "Perluas kartu"}>
          <span />
        </button>
      )}

      <div className="panel-bar">
        <span className="panel-bar-title">{selection.type === "kecamatan" ? "Profil kecamatan" : "Profil desa / kelurahan"}</span>
        <div className="panel-bar-actions">
          <button onClick={goBack} title="Kembali (Esc)">
            {Icon.left} <span>Kembali</span>
          </button>
          <button className="icon" onClick={() => onSelect(NONE)} title="Tutup & lihat seluruh peta" aria-label="Tutup">
            {Icon.close}
          </button>
        </div>
      </div>

      <div className="panel-scroll" ref={scroller}>
        <div key={key} className="view-anim">
          {selection.type === "kecamatan" && <KecamatanView id={selection.id} onSelect={onSelect} onHover={onHover} />}
          {selection.type === "desa" && <DesaView id={selection.id} onSelect={onSelect} onHover={onHover} />}
          {DATA_CONTOH && (
            <p className="note">
              <b>Data contoh.</b> Penduduk, sekolah, tempat ibadah, fasilitas kesehatan, dan pasar masih berupa estimasi placeholder; ganti di{" "}
              <code>src/data/profiles.ts</code>. Batas wilayah hasil digitalisasi gambar, bukan data administrasi resmi.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

