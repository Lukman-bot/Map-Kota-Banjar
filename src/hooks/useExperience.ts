import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { desaList, kecamatanList } from "../data/banjarMap";
import { BanjarScene } from "../three/BanjarScene";
import { bboxOf } from "../utils/geometry";
import { desaByKec } from "../utils/stats";
import { fitCamera, lerpCam, prefersReducedMotion, type Cam, type Visible } from "./useCamera";

gsap.registerPlugin(ScrollTrigger);

/** Panjang scroll pengantar (kelipatan tinggi layar). */
const SCROLL_VH = 11;
const FULL_BBOX = bboxOf(desaList);
const KEC_BBOX = kecamatanList.map((k) => bboxOf(desaByKec.get(k.id) ?? []));

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Args {
  root: RefObject<HTMLDivElement>;
  canvas: RefObject<HTMLCanvasElement>;
  size: { w: number; h: number };
  /** Area peta yang kosong saat seluruh kota ditampilkan */
  visFull: Visible;
  /** Area peta yang kosong saat teks narasi tampil di sisi kiri / bawah */
  visStory: Visible;
  /** Area peta saat pertanyaan akhir tampil (peta di atas, teks di bawah) */
  visEnd: Visible;
  /** true bila pengguna sudah memilih "jelajahi" (pengantar dianggap selesai) */
  exploringRef: RefObject<boolean>;
}

export interface Experience {
  /** Animasikan kamera peta ke target (atau langsung loncat bila instant). */
  flyTo: (target: Cam, opts?: { instant?: boolean; duration?: number }) => void;
  /** Kamera yang pas untuk seluruh kota (dipakai saat tidak ada pilihan). */
  fullCam: () => Cam;
  /** Gulir kembali ke awal pengantar. */
  restart: () => void;
  /** Lompat ke akhir pengantar (smooth, atau langsung bila instant). */
  skip: (instant?: boolean) => void;
}

/**
 * Seluruh animasi pengantar digerakkan oleh SATU timeline GSAP + ScrollTrigger (scrub, pin).
 * Timeline hanya mengubah objek state `S`; fungsi render() menerjemahkan S ke DOM SVG,
 * kamera, dan adegan Three.js. Dengan begitu mundur/maju saat scroll selalu konsisten.
 */
export function useExperience({ root, canvas, size, visFull, visStory, visEnd, exploringRef }: Args): Experience {
  const sceneRef = useRef<BanjarScene | null>(null);
  const camRef = useRef<Cam | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const flyRef = useRef<gsap.core.Tween | null>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  const apply = useCallback(
    (c: Cam) => {
      camRef.current = c;
      const { w, h } = sizeRef.current;
      const svg = root.current?.querySelector<SVGSVGElement>("svg.map");
      svg?.setAttribute("viewBox", `${c.cx - w / c.s / 2} ${c.cy - h / c.s / 2} ${w / c.s} ${h / c.s}`);
      sceneRef.current?.setCamera(c);
    },
    [root]
  );

  // ---------- Adegan Three.js ----------
  useLayoutEffect(() => {
    if (!canvas.current) return;
    const scene = new BanjarScene(canvas.current);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [canvas]);

  useLayoutEffect(() => {
    if (size.w > 0) sceneRef.current?.resize(size.w, size.h);
  }, [size.w, size.h]);

  // ---------- Timeline scroll ----------
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || size.w === 0) return;

    const ctx = gsap.context(() => {
      const q = <T extends Element>(sel: string) => el.querySelector<T>(sel)!;

      // --- kamera tiap tahap: [kota, kec×4, kota, kota (geser, untuk 3D), kota] ---
      const full = fitCamera(FULL_BBOX, size, visFull, 0.95);
      const fullShift = fitCamera(FULL_BBOX, size, visStory, 0.86);
      const end = fitCamera(FULL_BBOX, size, visEnd, 0.95);
      const cams: Cam[] = [full, ...KEC_BBOX.map((b) => fitCamera(b, size, visStory, 0.8)), full, fullShift, end];

      // --- elemen peta ---
      const desaEls = kecamatanList.map((k) =>
        (desaByKec.get(k.id) ?? []).map((d) => ({
          path: q<SVGPathElement>(`path[data-desa="${d.id}"]`),
          label: el.querySelector<SVGTextElement>(`text[data-desa-label="${d.id}"]`),
        }))
      );
      const kecLabels = kecamatanList.map((k) => q<SVGTextElement>(`text[data-kec-label="${k.id}"]`));
      const kecLines = kecamatanList.map((k) => q<SVGPathElement>(`path[data-kec-line="${k.id}"]`));
      const kecBorder = q<SVGPathElement>("path[data-kec-border]");
      const svg = q<SVGSVGElement>("svg.map");
      const kecNum = q<HTMLElement>("[data-kec-num]");
      const desaNum = q<HTMLElement>("[data-desa-num]");
      const bar = el.querySelector<HTMLElement>("[data-progress]");
      const scene = sceneRef.current;
      const cv = canvas.current;

      const S = { cam: 0, rev: 0, three: 0, kProg: 0, dProg: 0, gap: 0, flat: 1, tilt: 0 };

      const render = () => {
        // kamera
        const i = Math.min(cams.length - 2, Math.floor(S.cam));
        apply(lerpCam(cams[i], cams[i + 1], S.cam - i));

        // kecamatan & desa muncul satu per satu
        desaEls.forEach((list, j) => {
          const kj = clamp01(S.rev - j);
          const n = list.length;
          list.forEach(({ path, label }, m) => {
            const op = clamp01(kj * (n + 1.5) - m);
            path.style.fillOpacity = String(op);
            path.style.strokeOpacity = String(0.16 + 0.84 * op);
            if (label) label.style.opacity = String(op);
          });
          kecLabels[j].style.opacity = String(clamp01((kj - 0.5) * 2));
          // garis tepi kecamatan menyala saat kamera berada di kecamatan itu
          const near = clamp01(1 - Math.abs(S.cam - (j + 1)) * 1.6);
          kecLines[j].style.opacity = String(near * (S.three > 0.01 ? 0 : 1));
        });
        kecBorder.style.opacity = String(clamp01((S.rev - 0.4) / 3.2));

        // Three.js
        svg.style.opacity = String(1 - S.three);
        if (cv) cv.style.opacity = String(S.three);
        if (scene && S.three > 0.001) {
          scene.update({ kProg: S.kProg, dProg: S.dProg, gap: S.gap, flat: S.flat, tilt: S.tilt });
          scene.render();
        }
        kecNum.textContent = String(Math.min(kecamatanList.length, Math.ceil(S.kProg - 1e-6)));
        desaNum.textContent = String(Math.min(desaList.length, Math.ceil(S.dProg - 1e-6)));
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: render,
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * SCROLL_VH)}`,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar) bar.style.transform = `scaleY(${self.progress})`;
          },
        },
      });
      stRef.current = tl.scrollTrigger ?? null;

      // pembantu: teks masuk / keluar
      const beatIn = (sel: string, at: number) =>
        tl.fromTo(q(sel), { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, at);
      const beatOut = (sel: string, at: number) =>
        tl.to(q(sel), { autoAlpha: 0, y: -36, duration: 0.7, ease: "power2.in" }, at);

      // 1) Selamat datang
      tl.to(q('[data-beat="welcome"]'), { autoAlpha: 0, y: -50, duration: 0.9, ease: "power2.in" }, 0.6);

      // 2) Kecamatan muncul satu per satu
      kecamatanList.forEach((_, j) => {
        const ts = 1.2 + j * 5;
        tl.to(S, { cam: j + 1, duration: 1.6, ease: "power2.inOut" }, ts);
        tl.to(S, { rev: j + 1, duration: 2.6 }, ts + 0.9);
        beatIn(`[data-beat="kec-${j}"]`, ts + 0.9);
        beatOut(`[data-beat="kec-${j}"]`, ts + 4.2);
      });

      // 3) Semua kecamatan tampil → kamera mundur ke seluruh kota
      tl.to(S, { cam: 5, duration: 2, ease: "power2.inOut" }, 20.6);

      // 4) Three.js: 4 kecamatan
      tl.to(S, { three: 1, duration: 1, ease: "power1.inOut" }, 22.8);
      tl.to(S, { cam: 6, duration: 2, ease: "power2.inOut" }, 22.8);
      tl.to(S, { tilt: 0.95, flat: 0, duration: 2.2, ease: "power2.inOut" }, 23);
      beatIn('[data-beat="count-kec"]', 23.8);
      tl.to(S, { kProg: kecamatanList.length, duration: 4 }, 24.2);
      beatOut('[data-beat="count-kec"]', 28.2);

      // 5) Three.js: 25 desa / kelurahan
      tl.to(S, { gap: 1, duration: 1, ease: "power2.inOut" }, 28.8);
      beatIn('[data-beat="count-desa"]', 29.5);
      tl.to(S, { dProg: desaList.length, duration: 7 }, 29.6);
      beatOut('[data-beat="count-desa"]', 37);

      // 6) Meratakan kembali menjadi peta 2D
      tl.to(S, { flat: 1, gap: 0, tilt: 0, cam: 7, duration: 2.2, ease: "power2.inOut" }, 37.4);
      tl.to(S, { three: 0, duration: 1, ease: "power1.inOut" }, 39);

      // 7) Pertanyaan akhir
      beatIn('[data-beat="final"]', 39.6);
      tl.to({}, { duration: 0.8 }, 40); // jeda penutup

      render();

      // Dibuka dari tautan (#/desa/…): langsung ke akhir pengantar.
      if (exploringRef.current) {
        tl.progress(1);
        stRef.current?.scroll(stRef.current.end);
      }
    }, el);

    return () => {
      ctx.revert();
      stRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, visFull.left, visFull.right, visFull.top, visFull.bottom, visStory.left, visStory.right, visStory.top, visStory.bottom, visEnd.bottom, visEnd.top]);

  // ---------- API ----------
  const flyTo = useCallback<Experience["flyTo"]>(
    (target, opts) => {
      flyRef.current?.kill();
      const from = camRef.current;
      if (!from || opts?.instant || prefersReducedMotion()) {
        apply(target);
        return;
      }
      const p = { t: 0 };
      flyRef.current = gsap.to(p, {
        t: 1,
        duration: opts?.duration ?? 1.4,
        ease: "power3.inOut",
        onUpdate: () => apply(lerpCam(from, target, p.t)),
      });
    },
    [apply]
  );

  const fullCam = useCallback(() => fitCamera(FULL_BBOX, sizeRef.current, visFull, 0.95), [visFull]);
  const restart = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);
  const skip = useCallback((instant?: boolean) => {
    const st = stRef.current;
    if (st) window.scrollTo({ top: st.end, behavior: instant ? "auto" : "smooth" });
  }, []);

  return { flyTo, fullCam, restart, skip };
}
