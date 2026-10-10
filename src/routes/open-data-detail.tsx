import { Link, useLoaderData, useNavigation } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import DataTable from "../components/open-data/DataTable";
import Pagination from "../components/open-data/Pagination";
import { fmtDate, fmtNum } from "../lib/format";
import { getDataset, getRecords, toErrorResponse } from "../lib/open-data.server";
import { originOf, seoMeta } from "../lib/seo";

const PER_PAGE = 25;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const page = Math.max(1, parseInt(new URL(request.url).searchParams.get("halaman") ?? "1", 10) || 1);
  try {
    // Metadata wajib ada (404 bila tidak); pratinjau data opsional — bila gagal, halaman tetap tampil.
    const [dataset, records] = await Promise.all([
      getDataset(slug),
      getRecords(slug, { page, perPage: PER_PAGE }).catch((err: unknown) => {
        console.error("[open-data] pratinjau gagal:", err instanceof Error ? err.message : err);
        return null;
      }),
    ]);
    return { origin: originOf(request), dataset, records };
  } catch (err) {
    throw toErrorResponse(err);
  }
}

export const headers: HeadersFunction = () => ({
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
});

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { dataset: d, origin } = data;
  const path = `/open-data/${encodeURIComponent(d.slug)}`;
  return seoMeta({
    title: `${d.title} — Open Data Kota Banjar`,
    description: d.description || `Dataset ${d.title} dari ${d.publisher}.`,
    origin,
    path,
    jsonLd: {
      "@type": "Dataset",
      name: d.title,
      description: d.description || undefined,
      url: `${origin}${path}`,
      inLanguage: "id",
      isAccessibleForFree: true,
      dateModified: d.updatedAt ?? undefined,
      license: d.license ?? undefined,
      keywords: d.tags.length ? d.tags : undefined,
      creator: { "@type": "Organization", name: d.publisher },
      distribution: d.resources.length ? d.resources.map((r) => ({ "@type": "DataDownload", encodingFormat: r.format, contentUrl: r.url })) : undefined,
    },
  });
};

export default function OpenDataDetail() {
  const { dataset: d, records } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const loading = navigation.state === "loading";

  return (
    <div className="od-wrap od-detail">
      <nav aria-label="Jejak halaman" className="od-crumbs">
        <Link to="/open-data">Open Data</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{d.category}</span>
      </nav>

      <header className="od-detail-head">
        <h1>{d.title}</h1>
        {d.description && <p>{d.description}</p>}
      </header>

      <div className="od-detail-grid">
        <section className={`od-preview${loading ? " is-loading" : ""}`} aria-labelledby="od-preview-h">
          <h2 id="od-preview-h">Pratinjau data</h2>
          {records ? (
            <>
              <DataTable columns={d.columns} rows={records.items} caption={d.title} />
              <p className="od-range">
                Menampilkan {fmtNum((records.page - 1) * records.perPage + Math.min(1, records.items.length))}–
                {fmtNum((records.page - 1) * records.perPage + records.items.length)} dari {fmtNum(records.total)} baris
              </p>
              <Pagination page={records.page} totalPages={records.totalPages} hrefFor={(p) => `?halaman=${p}`} />
            </>
          ) : (
            <p className="od-empty">Pratinjau data belum tersedia untuk dataset ini.</p>
          )}
        </section>

        <aside className="od-side" aria-label="Keterangan dataset">
          <h2>Keterangan</h2>
          <dl className="od-meta">
            <div>
              <dt>Penerbit</dt>
              <dd>{d.publisher}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{d.category}</dd>
            </div>
            {d.updatedAt && fmtDate(d.updatedAt) && (
              <div>
                <dt>Diperbarui</dt>
                <dd>
                  <time dateTime={d.updatedAt}>{fmtDate(d.updatedAt)}</time>
                </dd>
              </div>
            )}
            {d.license && (
              <div>
                <dt>Lisensi</dt>
                <dd>{d.license}</dd>
              </div>
            )}
            {(d.rowCount ?? records?.total) != null && (
              <div>
                <dt>Jumlah baris</dt>
                <dd>{fmtNum((d.rowCount ?? records?.total) as number)}</dd>
              </div>
            )}
            {d.columns.length > 0 && (
              <div>
                <dt>Jumlah kolom</dt>
                <dd>{fmtNum(d.columns.length)}</dd>
              </div>
            )}
          </dl>

          {d.resources.length > 0 && (
            <>
              <h2>Unduh</h2>
              <ul className="od-files">
                {d.resources.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} download rel="noopener">
                      <b>{r.format}</b>
                      <span>{r.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {d.tags.length > 0 && (
            <>
              <h2>Kata kunci</h2>
              <ul className="od-tags">
                {d.tags.map((t) => (
                  <li key={t}>
                    <Link to={`/open-data?q=${encodeURIComponent(t)}`}>{t}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
