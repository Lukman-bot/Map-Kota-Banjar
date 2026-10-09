import { Layers, MousePointerClick } from "lucide-react";

import BanjarScene from "~/components/three/banjar-scene";
import { desaList, kecamatanList, type Desa, type Kecamatan } from "~/data/banjarMap";
import { kecamatanById } from "~/lib/wilayah";

interface BanjarHeroProps {
  selectedDesa?: Desa;
  selectedKecamatan?: Kecamatan;
}

/**
 * Banner 3D di atas peta. Responsif:
 * - < sm : teks di atas, canvas di bawahnya (tinggi tetap), peta di tengah.
 * - >= sm: canvas memenuhi banner, teks menumpuk di kiri, peta bergeser ke kanan.
 */
export function BanjarHero({ selectedDesa, selectedKecamatan }: BanjarHeroProps) {
  const kecOfDesa = selectedDesa
    ? kecamatanById.get(selectedDesa.kecamatanId)
    : undefined;

  const title = selectedDesa
    ? selectedDesa.name
    : selectedKecamatan
      ? `Kecamatan ${selectedKecamatan.name}`
      : "Jelajahi Kota Banjar";

  const subtitle = selectedDesa
    ? `Desa/Kelurahan di Kecamatan ${kecOfDesa?.name ?? ""}`
    : selectedKecamatan
      ? "Wilayah terpilih diangkat dan diberi penanda pada model 3D."
      : "Model 3D ilustratif. Arahkan kursor atau ketuk sebuah wilayah, lalu klik untuk membuka detailnya.";

  return (
    <section
      aria-label="Model 3D Kota Banjar"
      className="relative flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 text-slate-50 shadow-sm sm:h-64 lg:h-72"
      style={{
        backgroundImage:
          "radial-gradient(120% 140% at 80% 40%, rgba(56,189,248,0.18) 0%, rgba(15,23,42,0) 60%), linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <BanjarScene
        selectedDesaId={selectedDesa?.id ?? null}
        selectedKecamatanId={selectedKecamatan?.id ?? null}
        offsetForOverlay
        className="h-52 w-full sm:absolute sm:inset-0 sm:h-full"
      />

      <div className="pointer-events-none relative z-10 order-first flex flex-col gap-2 p-4 sm:absolute sm:inset-y-0 sm:left-0 sm:max-w-[40%] sm:justify-center sm:p-6 lg:max-w-[36%]">
        <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-sky-300 uppercase">
          <Layers className="size-3.5" aria-hidden />
          Peta 3D interaktif
        </p>
        <p className="text-xl leading-tight font-semibold text-balance sm:text-2xl lg:text-3xl">
          {title}
        </p>
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          {subtitle}
        </p>

        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
          {kecamatanList.map((k) => (
            <li key={k.id} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full border border-white/30"
                style={{ background: k.fill }}
                aria-hidden
              />
              {k.name}
            </li>
          ))}
        </ul>

        <p className="mt-1 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
          <MousePointerClick className="size-3.5" aria-hidden />
          {kecamatanList.length} kecamatan · {desaList.length} desa/kelurahan
        </p>
      </div>
    </section>
  );
}
