import { Link, Outlet, isRouteErrorResponse, useRouteError } from "react-router";
import Shell from "../components/open-data/Shell";
import "../styles/open-data.css";

/**
 * Template Open Data — terpisah dari peta: header/footer sendiri, CSS sendiri (open-data.css),
 * dan semua datanya berasal dari API (lihat lib/api.server.ts & lib/open-data.server.ts).
 */
export default function OpenDataLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const title = status === 404 ? "Data tidak ditemukan" : "Data belum bisa dimuat";
  const body =
    status === 404
      ? "Dataset yang Anda cari tidak ada atau sudah dihapus."
      : "Layanan data sedang tidak dapat dihubungi. Muat ulang halaman ini beberapa saat lagi.";
  return (
    <Shell>
      <div className="od-wrap od-state">
        <h1>{title}</h1>
        <p>{body}</p>
        <p>
          <Link to="/open-data">Lihat semua dataset</Link>
        </p>
      </div>
    </Shell>
  );
}
