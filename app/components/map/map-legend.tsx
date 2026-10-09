import { Card } from "~/components/ui/card";
import { kecamatanList } from "~/data/banjarMap";

/** Legenda warna kecamatan (HTML, bukan SVG, agar tidak ikut ter-zoom). */
export function MapLegend() {
  return (
    <Card
      aria-label="Legenda peta"
      className="pointer-events-none gap-1.5 bg-card/80 px-3 py-2 text-[11px] shadow-none backdrop-blur-sm sm:text-xs"
    >
      <p className="font-semibold">Kecamatan</p>
      <ul className="space-y-1">
        {kecamatanList.map((k) => (
          <li key={k.id} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-[3px] border border-black/25"
              style={{ background: k.fill }}
            />
            {k.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}
