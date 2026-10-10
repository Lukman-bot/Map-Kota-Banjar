import { useEffect, useMemo, useRef, useState } from "react";
import { desaList, kecamatanList } from "../data/banjarMap";
import type { Selection } from "../hooks/useSelection";
import { kecById } from "../utils/stats";
import { Icon } from "./ui";

interface Item {
  sel: Selection;
  label: string;
  sub: string;
  color: string;
  hay: string;
}

const ITEMS: Item[] = [
  ...kecamatanList.map<Item>((k) => ({
    sel: { type: "kecamatan", id: k.id },
    label: `Kecamatan ${k.name}`,
    sub: "Kecamatan",
    color: k.fill,
    hay: `kecamatan ${k.name}`.toLowerCase(),
  })),
  ...desaList.map<Item>((d) => ({
    sel: { type: "desa", id: d.id },
    label: d.name,
    sub: `Desa/Kel. · Kec. ${kecById.get(d.kecamatanId)!.name}`,
    color: kecById.get(d.kecamatanId)!.fill,
    hay: `${d.name} ${kecById.get(d.kecamatanId)!.name}`.toLowerCase(),
  })),
];

export default function SearchBox({ onSelect }: { onSelect: (s: Selection) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return ITEMS.filter((i) => i.hay.includes(t))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(t)) - Number(a.label.toLowerCase().startsWith(t)))
      .slice(0, 8);
  }, [q]);

  // Pintasan "/" untuk fokus ke pencarian
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const pick = (i: Item) => {
    onSelect(i.sel);
    setQ("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="search" ref={box}>
      <span className="search-icon">{Icon.search}</span>
      <input
        ref={input}
        value={q}
        placeholder="Cari kecamatan atau desa…"
        aria-label="Cari wilayah"
        role="combobox"
        aria-expanded={open && results.length > 0}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && results[active]) {
            pick(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      <kbd>/</kbd>

      {open && q.trim() !== "" && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="empty">Tidak ditemukan.</li>}
          {results.map((r, i) => (
            <li key={`${r.sel.type}:${(r.sel as { id: string }).id}`} role="option" aria-selected={i === active}>
              <button
                className={i === active ? "on" : ""}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(r)}
              >
                <span className="row-dot" style={{ background: r.color }} />
                <span>
                  <b>{r.label}</b>
                  <small>{r.sub}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
