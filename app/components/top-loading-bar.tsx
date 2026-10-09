import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

/** Garis kemajuan tipis di tepi bawah header saat berpindah halaman. */
export function TopLoadingBar() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  // Tunda sedikit agar tidak berkedip pada navigasi yang sangat cepat.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="animate-loading-bar h-full w-1/4 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400" />
    </div>
  );
}
