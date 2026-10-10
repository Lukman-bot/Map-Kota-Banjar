import type { MetaDescriptor } from "react-router";
import { desaList, kecamatanList } from "../data/banjarMap";
import { DATA_CONTOH, profilDesa } from "../data/profiles";
import { desaById, fmt, kecById, profilKec, profilKota, sumEkonomi, sumIbadah, sumKesehatan, sumSekolah } from "../utils/stats";
import { SITE_NAME, seoMeta } from "./seo";

const CATATAN = DATA_CONTOH ? " (data contoh)" : "";

/** Meta untuk halaman peta: beranda, kecamatan, atau desa/kelurahan. */
export function mapMeta(origin: string, sel: { type: "none" } | { type: "kecamatan" | "desa"; id: string }): MetaDescriptor[] {
  if (sel.type === "kecamatan") {
    const k = kecById.get(sel.id);
    const p = profilKec.get(sel.id);
    if (!k || !p) return [{ title: `Tidak ditemukan — ${SITE_NAME}` }];
    const n = desaList.filter((d) => d.kecamatanId === k.id).length;
    return seoMeta({
      title: `Kecamatan ${k.name}, Kota Banjar — ${SITE_NAME}`,
      description: `Kecamatan ${k.name} di Kota Banjar memiliki ${n} desa/kelurahan dan ${fmt(p.penduduk)} penduduk${CATATAN} pada wilayah seluas ${fmt(p.luasKm2, 2)} km². Lihat sekolah, tempat ibadah, fasilitas kesehatan, dan pasar.`,
      origin,
      path: `/kecamatan/${k.id}`,
      jsonLd: { "@type": "AdministrativeArea", name: `Kecamatan ${k.name}`, containedInPlace: { "@type": "City", name: "Kota Banjar" } },
    });
  }
  if (sel.type === "desa") {
    const d = desaById.get(sel.id);
    const p = profilDesa[sel.id];
    if (!d || !p) return [{ title: `Tidak ditemukan — ${SITE_NAME}` }];
    const kec = kecById.get(d.kecamatanId)!;
    return seoMeta({
      title: `${d.name}, Kecamatan ${kec.name} — ${SITE_NAME}`,
      description: `${d.name}, Kecamatan ${kec.name}, Kota Banjar: ${fmt(p.penduduk)} penduduk${CATATAN}, luas ${fmt(p.luasKm2, 2)} km², ${sumSekolah(p.sekolah)} sekolah, ${sumIbadah(p.ibadah)} tempat ibadah, ${sumKesehatan(p.kesehatan)} fasilitas kesehatan, ${sumEkonomi(p.ekonomi)} fasilitas ekonomi.`,
      origin,
      path: `/desa/${d.id}`,
      jsonLd: { "@type": "AdministrativeArea", name: d.name, containedInPlace: { "@type": "AdministrativeArea", name: `Kecamatan ${kec.name}` } },
    });
  }
  return seoMeta({
    title: `${SITE_NAME} — Kecamatan, Desa, dan Data Wilayah`,
    description: `Peta interaktif Kota Banjar, Jawa Barat: ${kecamatanList.length} kecamatan dan ${desaList.length} desa/kelurahan, dengan data penduduk${CATATAN}, pendidikan, tempat ibadah, kesehatan, dan pasar.`,
    origin,
    path: "/",
    jsonLd: { "@type": "WebSite", name: SITE_NAME, inLanguage: "id", about: { "@type": "City", name: "Kota Banjar", description: `${fmt(profilKota.penduduk)} penduduk${CATATAN}` } },
  });
}
