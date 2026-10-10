import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { desaById, kecById } from "../utils/stats";

export type Selection =
  | { type: "none" }
  | { type: "kecamatan"; id: string }
  | { type: "desa"; id: string };

const NONE: Selection = { type: "none" };

/** `/kecamatan/banjar` · `/desa/jajawar` · selain itu = seluruh kota. */
export function parsePath(pathname: string): Selection {
  const m = pathname.match(/^\/(kecamatan|desa)\/([\w-]+)\/?$/);
  if (!m) return NONE;
  if (m[1] === "kecamatan" && kecById.has(m[2])) return { type: "kecamatan", id: m[2] };
  if (m[1] === "desa" && desaById.has(m[2])) return { type: "desa", id: m[2] };
  return NONE;
}

export const selectionPath = (s: Selection) => (s.type === "none" ? "/" : `/${s.type}/${s.id}`);

/** Tautan lama berbentuk `#/desa/jajawar` */
const LEGACY_HASH = /^#(\/(?:kecamatan|desa)\/[\w-]+)$/;

/**
 * Pilihan wilayah = URL asli (`/desa/jajawar`), dirender di server, bisa diindex & di-share,
 * dan tombol Back berfungsi. Pindah antar wilayah tidak me-remount peta (semuanya satu layout route).
 */
export function useSelection() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const selection = useMemo(() => parsePath(pathname), [pathname]);

  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Tautan lama (#/desa/x) → arahkan ke URL baru
  useEffect(() => {
    const m = hash.match(LEGACY_HASH);
    if (!m) return;
    const target = parsePath(m[1]);
    if (target.type !== "none") navigate(selectionPath(target), { replace: true, preventScrollReset: true });
  }, [hash, navigate]);

  const select = useCallback(
    (s: Selection) => {
      const to = selectionPath(s);
      if (to === pathRef.current) return;
      navigate(to, { preventScrollReset: true });
    },
    [navigate]
  );

  return [selection, select] as const;
}
