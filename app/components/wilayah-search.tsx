import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, Home, Search, X } from "lucide-react";

import { desaList, kecamatanList } from "~/data/banjarMap";
import { cn } from "~/lib/utils";
import { desaPath, kecamatanById, kecamatanPath } from "~/lib/wilayah";

interface Hasil {
  key: string;
  type: "kecamatan" | "desa";
  name: string;
  sub: string;
  fill: string;
  to: string;
}

const SEMUA: Hasil[] = [
  ...kecamatanList.map<Hasil>((k) => ({
    key: `k-${k.id}`,
    type: "kecamatan",
    name: k.name,
    sub: "Kecamatan",
    fill: k.fill,
    to: kecamatanPath(k.id),
  })),
  ...desaList.map<Hasil>((d) => {
    const kec = kecamatanById.get(d.kecamatanId);
    return {
      key: `d-${d.id}`,
      type: "desa",
      name: d.name,
      sub: `Kec. ${kec?.name ?? ""}`,
      fill: kec?.fill ?? "#ccc",
      to: desaPath(d.id),
    };
  }),
];

/** Sorot bagian teks yang cocok dengan kata kunci. */
function highlight(text: string, q: string): ReactNode {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-200/80 px-0.5 text-foreground">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Kotak pencarian desa/kecamatan dengan hasil langsung.
 * - Ketik untuk menyaring, ↑ ↓ untuk memilih, Enter untuk membuka, Esc untuk menutup.
 * - Tekan "/" di mana saja untuk fokus ke kotak pencarian.
 */
export function WilayahSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim();
  const hasil = useMemo(() => {
    const lower = q.toLowerCase();
    const matched = lower
      ? SEMUA.filter(
          (h) =>
            h.name.toLowerCase().includes(lower) ||
            h.sub.toLowerCase().includes(lower)
        ).sort((a, b) => {
          // Nama yang diawali kata kunci tampil lebih dulu.
          const as = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
          const bs = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
          return as - bs;
        })
      : SEMUA.filter((h) => h.type === "kecamatan");
    return matched.slice(0, 7);
  }, [q]);

  // Pintasan keyboard "/".
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pilih = (h: Hasil) => {
    navigate(h.to, { preventScrollReset: true });
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (hasil.length ? (i + 1) % hasil.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (hasil.length ? (i - 1 + hasil.length) % hasil.length : 0));
    } else if (e.key === "Enter") {
      const h = hasil[active];
      if (open && h) {
        e.preventDefault();
        pilih(h);
      }
    } else if (e.key === "Escape") {
      if (query) setQuery("");
      else {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border bg-background px-3 shadow-xs transition-all duration-200",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
          open && "shadow-md"
        )}
      >
        <Search
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-focus-within:scale-110 group-focus-within:text-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && hasil[active] ? `${listId}-${hasil[active].key}` : undefined
          }
          aria-label="Cari desa atau kecamatan"
          placeholder="Cari desa atau kecamatan…"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="animate-pop-in grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground transition-opacity group-focus-within:opacity-0 sm:block">
            /
          </kbd>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="animate-pop-in absolute inset-x-0 top-[calc(100%+6px)] z-30 origin-top overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
        >
          {!q && (
            <li
              role="presentation"
              className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Kecamatan
            </li>
          )}
          {hasil.length === 0 && (
            <li
              role="presentation"
              className="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              Tidak ada wilayah untuk &ldquo;{q}&rdquo;.
            </li>
          )}
          {hasil.map((h, i) => (
            <li
              key={h.key}
              id={`${listId}-${h.key}`}
              role="option"
              aria-selected={i === active}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 25}ms`, animationDuration: "0.3s" }}
            >
              <Link
                to={h.to}
                preventScrollReset
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  i === active ? "bg-accent" : "hover:bg-accent"
                )}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-md border border-black/10"
                  style={{ background: h.fill }}
                >
                  {h.type === "kecamatan" ? (
                    <Building2 className="size-3.5 text-slate-700" />
                  ) : (
                    <Home className="size-3.5 text-slate-700" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {highlight(h.name, q)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {h.sub}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
