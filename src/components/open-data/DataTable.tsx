import { fmtNum } from "../../lib/format";
import type { Column, DataRow } from "../../lib/open-data.types";

/** Tabel pratinjau data. Kolom diambil dari metadata dataset; bila kosong, dari kunci baris pertama. */
export default function DataTable({ columns, rows, caption }: { columns: Column[]; rows: DataRow[]; caption: string }) {
  const cols: Column[] =
    columns.length > 0
      ? columns
      : Object.keys(rows[0] ?? {}).map((key) => ({
          key,
          label: key,
          type: typeof rows[0]?.[key] === "number" ? ("number" as const) : ("text" as const),
        }));

  if (rows.length === 0) return <p className="od-empty">Dataset ini belum memiliki baris data.</p>;

  return (
    <div className="od-table-wrap" tabIndex={0} role="region" aria-label={`Pratinjau: ${caption}`}>
      <table className="od-table">
        <caption className="od-sr">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={c.type === "number" ? "num" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const v = r[c.key];
                const text = v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? fmtNum(v, 2) : String(v);
                return (
                  <td key={c.key} className={c.type === "number" || typeof v === "number" ? "num" : undefined}>
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
