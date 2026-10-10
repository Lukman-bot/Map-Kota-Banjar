import { useEffect } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "./useCamera";

/** Konstanta waktu inersia (detik). Makin besar = scroll terasa makin berat & meluncur lama. */
const TAU = 0.18;
/** Pengali jarak per putaran roda mouse. < 1 = tiap gulir menempuh jarak lebih pendek (lebih "berat"). */
const WHEEL_GAIN = 0.75;
/** Batas delta per event, supaya mouse dengan roda "liar" tidak melompat jauh. */
const MAX_STEP = 160;

/**
 * Scroll berinersia untuk roda mouse / trackpad.
 * Event wheel ditangkap, lalu posisi scroll "mengejar" target dengan easing eksponensial
 * (independen dari frame-rate). Scroll sentuh, keyboard, dan tween GSAP tetap bekerja normal:
 * posisi disinkronkan ulang setiap kali scroll berasal dari sumber lain.
 */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;

    let target = window.scrollY;
    let current = window.scrollY;
    let lastSet = window.scrollY;
    let last = 0;
    let raf = 0;

    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(target - current) < 0.3) current = target;
      lastSet = current;
      window.scrollTo(0, current);
      raf = current !== target ? requestAnimationFrame(tick) : 0;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return; // pinch-zoom / sudah ditangani
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // gesture horizontal

      e.preventDefault();
      gsap.killTweensOf(window); // batalkan "Lewati/Ulangi" yang sedang berjalan

      if (!raf) {
        current = target = window.scrollY;
        last = performance.now();
      }

      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16; // baris → piksel
      else if (e.deltaMode === 2) d *= window.innerHeight; // halaman → piksel
      d = Math.max(-MAX_STEP, Math.min(MAX_STEP, d)) * WHEEL_GAIN;

      target = Math.min(maxScroll(), Math.max(0, target + d));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Scroll dari sumber lain (keyboard, sentuh, tween GSAP, tombol) → sinkronkan posisi
    const onScroll = () => {
      const y = window.scrollY;
      if (raf && Math.abs(y - lastSet) <= 3) return; // ini scroll buatan kita sendiri
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      target = current = lastSet = y;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
