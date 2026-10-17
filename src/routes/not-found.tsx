/** Menangkap semua alamat yang tidak dikenal dan menjawab dengan status HTTP 404 (ditampilkan oleh ErrorBoundary di root.tsx). */
export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export default function NotFound() {
  return null;
}
