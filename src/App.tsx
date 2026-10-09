import { useState } from "react";
import BanjarMap, { type MapMode } from "./components/BanjarMap";
import { desaList, kecamatanList, type Desa, type Kecamatan } from "./data/banjarMap";

export default function App() {
  const [mode, setMode] = useState<MapMode>("desa");
  const [showLabels, setShowLabels] = useState(true);
  const [selectedDesa, setSelectedDesa] = useState<Desa | null>(null);
  const [selectedKec, setSelectedKec] = useState<Kecamatan | null>(null);

  // ====== TEMPAT MENAMBAH AKSI LAIN ======
  const handleDesaClick = (desa: Desa, kec: Kecamatan) => {
    setSelectedDesa(desa);
    setSelectedKec(kec);
    // TODO: fetch data desa, buka modal, navigasi, dll.
    console.log("Desa diklik:", desa.name, "| Kecamatan:", kec.name);
  };

  const handleKecamatanClick = (kec: Kecamatan) => {
    setSelectedKec(kec);
    setSelectedDesa(null);
    // TODO: fetch data kecamatan, dll.
    console.log("Kecamatan diklik:", kec.name);
  };
  // ========================================

  const changeMode = (m: MapMode) => {
    setMode(m);
    setSelectedDesa(null);
    setSelectedKec(null);
  };

  const desaInKec = selectedKec
    ? desaList.filter((d) => d.kecamatanId === selectedKec.id)
    : [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Peta Kota Banjar</h1>
        <p>Klik desa atau kecamatan pada peta.</p>
      </header>

      <main className="layout">
        <section className="map-card">
          <BanjarMap
            mode={mode}
            showLabels={showLabels}
            selectedDesaId={selectedDesa?.id ?? null}
            selectedKecamatanId={mode === "kecamatan" ? selectedKec?.id ?? null : null}
            onDesaClick={handleDesaClick}
            onKecamatanClick={handleKecamatanClick}
          />
        </section>

        <aside className="side">
          <div className="panel">
            <h2>Mode klik</h2>
            <div className="segmented">
              <button className={mode === "desa" ? "active" : ""} onClick={() => changeMode("desa")}>
                Per Desa
              </button>
              <button
                className={mode === "kecamatan" ? "active" : ""}
                onClick={() => changeMode("kecamatan")}
              >
                Per Kecamatan
              </button>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Tampilkan nama desa
            </label>
          </div>

          <div className="panel">
            <h2>Terpilih</h2>
            {!selectedKec && <p className="muted">Belum ada yang dipilih.</p>}

            {selectedDesa && (
              <>
                <p className="big">{selectedDesa.name}</p>
                <p className="muted">Kecamatan {selectedKec?.name}</p>
              </>
            )}

            {!selectedDesa && selectedKec && (
              <>
                <p className="big">Kecamatan {selectedKec.name}</p>
                <p className="muted">{desaInKec.length} desa/kelurahan</p>
                <ul>
                  {desaInKec.map((d) => (
                    <li key={d.id}>{d.name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="panel">
            <h2>Jumlah desa per kecamatan</h2>
            <ul>
              {kecamatanList.map((k) => (
                <li key={k.id}>
                  <span className="dot" style={{ background: k.fill }} />
                  {k.name}: {desaList.filter((d) => d.kecamatanId === k.id).length}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
