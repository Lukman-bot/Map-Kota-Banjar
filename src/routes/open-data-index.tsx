import { Form, Link, useLoaderData, useNavigation } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import Pagination from "../components/open-data/Pagination";
import { fmtDate, fmtNum } from "../lib/format";
import { dataSource, getCatalog, getCategories, toErrorResponse } from "../lib/open-data.server";
import { SITE_NAME, originOf, seoMeta } from "../lib/seo";

const PER_PAGE = 10;

export async function loader({ request }: LoaderFunctionArgs) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const category = (sp.get("kategori") ?? "").trim().slice(0, 60);
  const page = Math.max(1, parseInt(sp.get("halaman") ?? "1", 10) || 1);

  try {
    const [catalog, categories] = await Promise.all([getCatalog({ q, category, page, perPage: PER_PAGE }), getCategories()]);
    return { origin: originOf(request), q, category, catalog, categories, source: dataSource };
  } catch (err) {
    throw toErrorResponse(err);
  }
}

/** HTML boleh di-cache CDN beberapa menit; browser selalu memeriksa ulang. */
export const headers: HeadersFunction = () => ({
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
});

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  return seoMeta({
    title: `Open Data Kota Banjar — ${SITE_NAME}`,
    description: "Katalog data terbuka Kota Banjar: kependudukan, pendidikan, kesehatan, keagamaan, dan ekonomi per desa/kelurahan. Cari, pratinjau, dan gunakan kembali.",
    origin: data.origin,
    path: "/open-data",
    // Hasil pencarian/filter/halaman lanjutan tidak perlu diindex; URL kanonik tetap /open-data
    noindex: Boolean(data.q || data.category || data.catalog.page > 1),
    jsonLd: { "@type": "DataCatalog", name: "Open Data Kota Banjar", inLanguage: "id", url: `${data.origin}/open-data` },
  });
};

function hrefWith(q: string, category: string, page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (category) p.set("kategori", category);
  if (page > 1) p.set("halaman", String(page));
  const s = p.toString();
  return `/open-data${s ? `?${s}` : ""}`;
}

export default function OpenDataIndex() {
  const { q, category, catalog, categories, source } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const loading = navigation.state === "loading" && navigation.location?.pathname === "/open-data";
  const filtered = Boolean(q || category);

  return (
    <>
      <section className="od-hero">
        <div className="od-wrap">
          <h1>Data terbuka Kota Banjar</h1>
          <p>Cari data kependudukan, pendidikan, kesehatan, dan lainnya per desa dan kelurahan. Pratinjau tabelnya, lalu pakai ulang sesuai kebutuhan Anda.</p>

          <Form method="get" role="search" className="od-search">
            <label htmlFor="od-q" className="od-sr">
              Cari dataset
            </label>
            <input id="od-q" name="q" type="search" defaultValue={q} placeholder="Contoh: penduduk, sekolah, puskesmas" autoComplete="off" />
            {category && <input type="hidden" name="kategori" value={category} />}
            <button type="submit">Cari dataset</button>
          </Form>

          {import.meta.env.DEV && source === "mock" && (
            <p className="od-devnote">Mode pengembangan: menampilkan data contoh lokal. Isi API_BASE_URL di file .env untuk memakai API.</p>
          )}
        </div>
      </section>

      <div className="od-wrap od-catalog">
        <aside className="od-rail" aria-label="Filter kategori">
          <h2>Kategori</h2>
          <ul>
            <li>
              <Link to={hrefWith(q, "", 1)} aria-current={!category ? "true" : undefined}>
                <span>Semua</span>
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.name}>
                <Link to={hrefWith(q, c.name, 1)} aria-current={category.toLowerCase() === c.name.toLowerCase() ? "true" : undefined}>
                  <span>{c.name}</span>
                  <span className="n">{fmtNum(c.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`od-results${loading ? " is-loading" : ""}`} aria-live="polite" aria-busy={loading}>
          <h2 className="od-count">
            {fmtNum(catalog.total)} dataset{q ? <> untuk “{q}”</> : null}
            {category ? <> dalam kategori {category}</> : null}
          </h2>

          {catalog.items.length === 0 ? (
            <div className="od-empty">
              <p>Tidak ada dataset yang cocok.</p>
              {filtered && (
                <p>
                  <Link to="/open-data">Hapus pencarian dan filter</Link> atau coba kata kunci yang lebih umum.
                </p>
              )}
            </div>
          ) : (
            <ol className="od-list">
              {catalog.items.map((d) => (
                <li key={d.slug} className="od-item">
                  <h3>
                    <Link to={`/open-data/${encodeURIComponent(d.slug)}`} prefetch="intent">
                      {d.title}
                    </Link>
                  </h3>
                  {d.description && <p className="od-desc">{d.description}</p>}
                  <dl className="od-facts">
                    <div>
                      <dt>Kategori</dt>
                      <dd>{d.category}</dd>
                    </div>
                    <div>
                      <dt>Penerbit</dt>
                      <dd>{d.publisher}</dd>
                    </div>
                    {d.updatedAt && fmtDate(d.updatedAt) && (
                      <div>
                        <dt>Diperbarui</dt>
                        <dd>
                          <time dateTime={d.updatedAt}>{fmtDate(d.updatedAt)}</time>
                        </dd>
                      </div>
                    )}
                    {d.rowCount !== null && (
                      <div>
                        <dt>Baris</dt>
                        <dd>{fmtNum(d.rowCount)}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          )}

          <Pagination page={catalog.page} totalPages={catalog.totalPages} hrefFor={(p) => hrefWith(q, category, p)} />
        </section>
      </div>
    </>
  );
}
