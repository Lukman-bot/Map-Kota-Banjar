import { useEffect, useRef, useState } from "react";

/**
 * Menganimasikan angka dari nilai sebelumnya ke `target`.
 * - Render pertama (SSR/hidrasi) langsung memakai `target`, sehingga HTML server
 *   tetap berisi angka yang benar.
 * - Setelah mount, angka dihitung naik dari 0.
 * - Jika pengguna memilih "kurangi gerakan", angka langsung tampil.
 */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    // Mount pertama mulai dari 0; perubahan berikutnya dari nilai terakhir.
    const from = mounted.current ? fromRef.current : 0;
    mounted.current = true;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = Math.round(from + (target - from) * eased);
      fromRef.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
