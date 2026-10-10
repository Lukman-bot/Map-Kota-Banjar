import MapApp from "../components/MapApp";
import "../styles/map.css";

/**
 * Layout untuk `/`, `/kecamatan/:id`, dan `/desa/:id`.
 * Peta dirender SEKALI di sini; route anak hanya menyumbang meta SEO + validasi id (404).
 * Karena itu pindah wilayah hanya mengganti URL — kamera & Three.js tidak dimuat ulang.
 */
export default function MapLayout() {
  return <MapApp />;
}
