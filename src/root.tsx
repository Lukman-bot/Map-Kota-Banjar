import { Links, Meta, Outlet, Scripts, isRouteErrorResponse, Link, type LinksFunction, type MetaFunction } from "react-router";
import { SITE_NAME } from "./lib/seo";
import "./styles/base.css";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
  },
];

/** Cadangan bila sebuah route tidak mendefinisikan meta sendiri; juga dipakai saat halaman galat. */
export const meta: MetaFunction = ({ error }) => {
  if (error) {
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    return [{ title: `${notFound ? "Halaman tidak ditemukan" : "Terjadi kesalahan"} — ${SITE_NAME}` }, { name: "robots", content: "noindex" }];
  }
  return [{ title: SITE_NAME }];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0b1624" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? "Halaman tidak ditemukan" : "Terjadi kesalahan";
  const body = notFound
    ? "Alamat yang Anda buka tidak ada atau sudah dipindahkan."
    : isRouteErrorResponse(error)
      ? `Server mengembalikan status ${error.status}. Coba muat ulang beberapa saat lagi.`
      : "Halaman tidak dapat ditampilkan. Coba muat ulang beberapa saat lagi.";

  return (
    <main className="root-error">
      <h1>{title}</h1>
      <p>{body}</p>
      <p className="root-error-links">
        <Link to="/">Kembali ke peta</Link>
        <Link to="/open-data">Buka Open Data</Link>
      </p>
      {import.meta.env.DEV && error instanceof Error && <pre>{error.stack}</pre>}
    </main>
  );
}
