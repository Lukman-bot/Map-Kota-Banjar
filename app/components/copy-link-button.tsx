import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Button } from "~/components/ui/button";

/** Menyalin alamat halaman saat ini, dengan umpan balik ikon yang beranimasi. */
export function CopyLinkButton({ label = "Salin tautan" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard tidak tersedia (mis. konteks tidak aman) — abaikan saja.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-live="polite"
      className={copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
    >
      <span key={String(copied)} className="animate-pop-in inline-flex">
        {copied ? <Check /> : <Link2 />}
      </span>
      {copied ? "Tersalin!" : label}
    </Button>
  );
}
