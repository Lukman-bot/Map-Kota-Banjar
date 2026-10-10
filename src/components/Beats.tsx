import { desaList, kecamatanList } from "../data/banjarMap";
import { desaByKec, fmt, profilKota } from "../utils/stats";

/**
 * Teks narasi pengantar. Semua elemen `data-beat` dimunculkan/disembunyikan oleh timeline scroll
 * (lihat hooks/useExperience.ts); di sini hanya markup-nya.
 */
export default function Beats({ onExplore, onRestart }: { onExplore: () => void; onRestart: () => void }) {
  return (
    <div className="beats">
      {/* 1. Selamat datang */}
      <div className="beat welcome" data-beat="welcome">
        <p className="kicker">Provinsi Jawa Barat · 7°22′ LS · 108°32′ BT</p>
        <h1>
          Selamat datang di <em>Peta Interaktif</em> Kota Banjar
        </h1>
        <p className="sub">
          Gulir ke bawah untuk mengenal wilayahnya: dari kecamatan, desa dan kelurahan, hingga data kependudukan dan fasilitasnya.
        </p>
        <div className="scroll-cue" aria-hidden>
          <span>Gulir</span>
          <i />
        </div>
      </div>

      {/* 2. Kecamatan satu per satu */}
      {kecamatanList.map((k, j) => {
        const list = desaByKec.get(k.id) ?? [];
        return (
          <div className="beat cap" data-beat={`kec-${j}`} key={k.id}>
            <p className="kicker">
              Kecamatan ke-{j + 1} dari {kecamatanList.length}
            </p>
            <h2>
              <span className="swatch" style={{ background: k.fill }} />
              Kecamatan {k.name}
            </h2>
            <p className="sub">
              {list.length} desa/kelurahan
            </p>
            <ul className="chips">
              {list.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* 3. Hitungan Three.js */}
      <div className="beat count" data-beat="count-kec">
        <p className="kicker">Dalam tiga dimensi</p>
        <div className="big">
          <b data-kec-num>0</b>
          <span>Kecamatan</span>
        </div>
        <p className="sub">{kecamatanList.map((k) => k.name).join(", ").replace(/, ([^,]*)$/, ", dan $1")} menyusun Kota Banjar.</p>
      </div>

      <div className="beat count" data-beat="count-desa">
        <p className="kicker">Dan di dalamnya</p>
        <div className="big">
          <b data-desa-num>0</b>
          <span>Desa & Kelurahan</span>
        </div>
        <p className="sub">Tinggi balok mengikuti jumlah penduduk; dari total {fmt(profilKota.penduduk)} jiwa (data contoh).</p>
      </div>

      {/* 4. Pertanyaan akhir */}
      <div className="beat final" data-beat="final">
        <p className="kicker">
          {kecamatanList.length} kecamatan · {desaList.length} desa/kelurahan · {fmt(profilKota.luasKm2, 2)} km²
        </p>
        <h2>Ingin jelajahi data lain?</h2>
        <p className="sub">
          Klik kecamatan atau desa pada peta untuk memperbesar wilayahnya dan melihat jumlah penduduk, sekolah, tempat ibadah, fasilitas kesehatan, pasar, dan lainnya.
        </p>
        <div className="actions">
          <button className="btn primary" onClick={onExplore}>
            Ya, jelajahi peta
          </button>
          <button className="btn ghost" onClick={onRestart}>
            Ulangi pengantar
          </button>
        </div>
      </div>
    </div>
  );
}
