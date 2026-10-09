import { useEffect, useState } from "react";

const TIPS = [
  "Putar, zoom, dan klik wilayah pada peta 3D.",
  "Tekan / untuk mencari desa atau kecamatan.",
  "Tekan 0 pada peta untuk mengembalikan tampilan.",
];

/** Petunjuk singkat di header yang berganti tiap beberapa detik. */
export function RotatingHint() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="ml-auto hidden overflow-hidden text-sm text-muted-foreground sm:block">
      <span key={i} className="animate-fade-up block">
        {TIPS[i]}
      </span>
    </p>
  );
}
