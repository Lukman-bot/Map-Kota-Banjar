import { useEffect, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";

/** Kerangka halaman Open Data: header, area konten, footer. Dipakai juga oleh ErrorBoundary-nya. */
export default function Shell({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();

  // Halaman baru / hasil pencarian baru → mulai dari atas; keluar ke peta → kembalikan ke 0 agar pengantar mulai dari awal.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  useEffect(() => () => window.scrollTo(0, 0), []);

  return (
    <div className="od">
      <a className="od-skip" href="#konten">
        Lewati ke konten
      </a>

      <header className="od-header">
        <div className="od-wrap od-header-row">
          <Link to="/" className="od-brand" aria-label="Peta Kota Banjar, ke beranda">
            <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#0e1b2a" />
              <path d="M32 11c-8.3 0-15 6.5-15 14.6C17 37 32 53 32 53s15-16 15-27.4C47 17.5 40.300 11 32 11z" fill="#ffc857" />
              <circle cx="32" cy="25.5" r="6" fill="#0e1b2a" />
            </svg>
            <span>Kota Banjar</span>
          </Link>
          <nav aria-label="Menu utama" className="od-nav">
            <NavLink to="/" end>
              Peta
            </NavLink>
            <NavLink to="/open-data">Open Data</NavLink>
          </nav>
        </div>
      </header>

      <main id="konten" className="od-main">
        {children}
      </main>

      <footer className="od-footer">
        <div className="od-wrap od-footer-row">
          <p>Data terbuka Kota Banjar untuk dipakai ulang oleh warga, peneliti, jurnalis, dan pengembang.</p>
          <Link to="/">Kembali ke peta interaktif</Link>
        </div>
      </footer>
    </div>
  );
}
