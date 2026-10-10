import { Link } from "react-router";

interface Props {
  page: number;
  totalPages: number;
  /** Bangun URL untuk nomor halaman tertentu (mempertahankan filter lain) */
  hrefFor: (page: number) => string;
}

export default function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav className="od-pager" aria-label="Halaman hasil">
      {page > 1 ? (
        <Link to={hrefFor(page - 1)} rel="prev">
          Sebelumnya
        </Link>
      ) : (
        <span aria-disabled="true">Sebelumnya</span>
      )}
      <p>
        Halaman {page} dari {totalPages}
      </p>
      {page < totalPages ? (
        <Link to={hrefFor(page + 1)} rel="next">
          Berikutnya
        </Link>
      ) : (
        <span aria-disabled="true">Berikutnya</span>
      )}
    </nav>
  );
}
