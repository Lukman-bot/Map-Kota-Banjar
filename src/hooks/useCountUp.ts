import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./useCamera";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

/**
 * Angka yang beranimasi (count-up) setiap `value` berubah.
 *
 * SSR: nilai awal = `value` yang sebenarnya, sehingga HTML dari server (yang dibaca mesin pencari
 * dan pratinjau share) berisi angka asli, bukan 0. Di browser, sebelum frame pertama digambar,
 * angka diturunkan ke 0 lalu dianimasikan naik seperti sebelumnya.
 */
export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const first = useRef(true);

  useIsoLayoutEffect(() => {
    if (!first.current) return;
    first.current = false;
    if (prefersReducedMotion()) return;
    from.current = 0;
    setShown(0);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 4); // easeOutQuart
      const v = start + (value - start) * e;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}
