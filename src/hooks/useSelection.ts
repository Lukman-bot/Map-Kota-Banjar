import { useCallback, useEffect, useState } from "react";
import { desaById, kecById } from "../utils/stats";

export type Selection =
  | { type: "none" }
  | { type: "kecamatan"; id: string }
  | { type: "desa"; id: string };

const NONE: Selection = { type: "none" };

function parse(hash: string): Selection {
  const m = hash.match(/^#\/(kecamatan|desa)\/([\w-]+)$/);
  if (!m) return NONE;
  if (m[1] === "kecamatan" && kecById.has(m[2])) return { type: "kecamatan", id: m[2] };
  if (m[1] === "desa" && desaById.has(m[2])) return { type: "desa", id: m[2] };
  return NONE;
}

const toHash = (s: Selection) => (s.type === "none" ? "" : `#/${s.type}/${s.id}`);

/** Pilihan wilayah disimpan di URL hash → bisa di-share & tombol Back berfungsi. */
export function useSelection() {
  const [selection, setSel] = useState<Selection>(() => parse(window.location.hash));

  useEffect(() => {
    const onHash = () => setSel(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = useCallback((s: Selection) => {
    const h = toHash(s);
    if (h === window.location.hash || (h === "" && !window.location.hash)) return;
    if (h === "") history.pushState(null, "", window.location.pathname + window.location.search);
    else window.location.hash = h;
    setSel(s); // hashchange tidak terpicu saat pushState
  }, []);

  return [selection, select] as const;
}
