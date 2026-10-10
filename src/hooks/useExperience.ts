import { useCallback, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { desaList, kecamatanList } from "../data/banjarMap";
import { BanjarScene } from "../three/BanjarScene";
import { bboxOf } from "../utils/geometry";
import { desaById, desaByKec } from "../utils/stats";
import { fitCamera, lerpCam, prefersReducedMotion, type Cam, type Visible } from "./useCamera";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

// Plugin hanya didaftarkan di browser (modul ini ikut diimpor saat SSR).
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/**
 * Panjang scroll pengantar (kelipatan tinggi layar).
 * Makin besar = animasi terasa makin "berat" / lambat (butuh lebih banyak gulir per adegan).
 * Sebelumnya 11. Di layar sentuh dibuat sedikit lebih pendek agar tidak melelahkan.
 */
const SCROLL_VH_DESKTOP = 38;
const SCROLL_VH_MOBILE = 28;
/** Awal adegan kecamatan pertama & panjang "slot" tiap kecamatan (satuan timeline). */
const KEC_START = 1.2;
const KEC_SLOT = 9;
/** Kemiringan kamera (radian) saat wilayah terpilih diangkat di mode jelajah. */
const EXPLORE_TILT = 0.6;
const MOBILE_BP = 820;
/** Waktu (detik) animasi "mengejar" posisi scroll. Makin besar = makin halus & melayang. */
const SCRUB = 1.5;
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

/** Wilayah yang diangkat di mode jelajah. */
export interface Focus {
  /** id desa → tinggi angkatan (satuan peta) */
  heights: Map<string, number>;
  /** desa terpilih (kontur sorotnya ikut terangkat) */
  selDesa: string | null;
  /** salah satu desa dari kecamatan terpilih (kontur kecamatan ikut terangkat) */
  kecDesa: string | null;
}

export interface Experience {
  /** Angkat wilayah terpilih seperti balok 3D (null = turunkan semuanya). */
  setFocus: (focus: Focus | null, instant?: boolean) => void;
  /** Sorot desa-desa ini (hover) pada balok yang terangkat. */
  setHover: (ids: string[]) => void;
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

  // --- mode jelajah: wilayah terpilih terangkat ---
  const exRef = useRef({ t: 1, tilt: 0 }); // progres angkat & kemiringan kamera saat ini
  const exTweenRef = useRef<gsap.core.Tween | null>(null);
  const focusRef = useRef<Focus | null>(null);
  const shiftedRef = useRef<Set<SVGElement>>(new Set());
  const paintRef = useRef<() => void>(() => {});

  const apply = useCallback(
    (c: Cam) => {
      camRef.current = c;
      const { w, h } = sizeRef.current;
      const svg = root.current?.querySelector<SVGSVGElement>("svg.map");
      svg?.setAttribute("viewBox", `${c.cx - w / c.s / 2} ${c.cy - h / c.s / 2} ${w / c.s} ${h / c.s}`);
      sceneRef.current?.setCamera(c);
      if (exploringRef.current) paintRef.current();
    },
    [root, exploringRef]
  );

  /**
   * Menggambar keadaan "terangkat" di mode jelajah.
   * Kamera ortografik yang dimiringkan memetakan bidang peta (z = 0) ke layar sebagai
   * skala-Y sebesar cos(tilt) dan tinggi z ke geser-atas sebesar z·sin(tilt). Jadi peta SVG cukup
   * diberi scaleY(cos) agar sejajar dengan adegan Three.js, dan balok yang terangkat digambar
   * canvas di atasnya. Area klik & label wilayah yang terangkat digeser sebesar angkatannya.
   */
  const paintExplore = useCallback(() => {
    const el = root.current;
    const scene = sceneRef.current;
    const cam = camRef.current;
    if (!el || !scene) return;
    const { t, tilt } = exRef.current;
    const { w, h } = sizeRef.current;
    const focus = focusRef.current;

    scene.setLiftProgress(t);
    const any = scene.maxLift() > 0.01;
    scene.update({ kProg: 0, dProg: 0, gap: 0, flat: 1, tilt, only: true });
    if (any) scene.render();
    if (canvas.current) canvas.current.style.opacity = any ? "1" : "0";

    const svg = el.querySelector<SVGSVGElement>("svg.map");
    if (svg) svg.style.transform = tilt > 0.001 ? `scaleY(${Math.cos(tilt)})` : "";

    // geser area klik / kontur sebesar angkatan (dalam satuan peta: lift · tan(tilt))
    const tan = Math.tan(tilt);
    const next = new Set<SVGElement>();
    const shift = (node: Element | null, lift: number) => {
      if (!(node instanceof SVGElement) || lift <= 0.01 || tan <= 0.001) return;
      node.style.transform = `translateY(${(-lift * tan).toFixed(3)}px)`;
      next.add(node);
    };
    el.querySelectorAll<SVGPathElement>("path[data-desa]").forEach((p) => {
      const id = p.getAttribute("data-desa") ?? "";
      shift(p, scene.getLift(id));
    });
    if (focus?.selDesa) shift(el.querySelector(".sel-outline"), scene.getLift(focus.selDesa));
    if (focus?.kecDesa) shift(el.querySelector(".kec-outline"), scene.getLift(focus.kecDesa));
    shiftedRef.current.forEach((n) => {
      if (!next.has(n)) n.style.transform = "";
    });
    shiftedRef.current = next;

    // label HTML di atas balok yang terangkat
    if (cam) {
      el.querySelectorAll<HTMLElement>("[data-lift-label]").forEach((n) => {
        const d = desaById.get(n.dataset.liftLabel ?? "");
        if (!d) return;
        const x = w / 2 + (d.labelPos[0] - cam.cx) * cam.s;
        const y = h / 2 + (d.labelPos[1] - cam.cy) * cam.s * Math.cos(tilt) - scene.getLift(d.id) * cam.s * Math.sin(tilt);
        n.style.fontSize = `${(d.labelSize * cam.s).toFixed(2)}px`;
        n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
        n.style.opacity = "1";
      });
    }
  }, [root, canvas]);
  paintRef.current = paintExplore;

  // ---------- Adegan Three.js ----------
  useIsoLayoutEffect(() => {
    if (!canvas.current) return;
    const scene = new BanjarScene(canvas.current);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [canvas]);

  useIsoLayoutEffect(() => {
    if (size.w > 0) sceneRef.current?.resize(size.w, size.h);
  }, [size.w, size.h]);

  // ---------- Timeline scroll ----------
  useIsoLayoutEffect(() => {
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

        // sedang di mode jelajah (mis. layar di-resize) → pertahankan wilayah yang terangkat
        if (exploringRef.current) paintRef.current();
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: render,
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < MOBILE_BP ? SCROLL_VH_MOBILE : SCROLL_VH_DESKTOP))}`,
          pin: true,
          scrub: prefersReducedMotion() ? true : SCRUB,
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
        tl.fromTo(q(sel), { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out" }, at);
      const beatOut = (sel: string, at: number) =>
        tl.to(q(sel), { autoAlpha: 0, y: -44, duration: 0.95, ease: "power1.inOut" }, at);

      // 1) Selamat datang
      tl.to(q('[data-beat="welcome"]'), { autoAlpha: 0, y: -50, duration: 1.1, ease: "power1.inOut" }, 0.6);

      // 2) Kecamatan satu per satu. Tiap kecamatan: kamera terbang pelan → jeda sebentar →
      //    desa-desanya muncul bergantian dengan lambat → tahan → teks keluar.
      kecamatanList.forEach((_, j) => {
        const ts = KEC_START + j * KEC_SLOT;
        tl.to(S, { cam: j + 1, duration: 2.6, ease: "power3.inOut" }, ts);
        beatIn(`[data-beat="kec-${j}"]`, ts + 1.8);
        tl.to(S, { rev: j + 1, duration: 5.5, ease: "none" }, ts + 2.2);
        beatOut(`[data-beat="kec-${j}"]`, ts + 7.7);
      });

      // A = awal bagian "semua kecamatan tampil"
      const A = KEC_START + kecamatanList.length * KEC_SLOT;

      // 3) Semua kecamatan tampil → kamera mundur ke seluruh kota
      tl.to(S, { cam: 5, duration: 2.6, ease: "power3.inOut" }, A);

      // 4) Three.js: 4 kecamatan naik satu per satu
      tl.to(S, { three: 1, duration: 1.4, ease: "sine.inOut" }, A + 2.8);
      tl.to(S, { cam: 6, duration: 2.4, ease: "power3.inOut" }, A + 2.8);
      tl.to(S, { tilt: 0.95, flat: 0, duration: 2.8, ease: "power3.inOut" }, A + 3);
      beatIn('[data-beat="count-kec"]', A + 4.2);
      tl.to(S, { kProg: kecamatanList.length, duration: 9, ease: "none" }, A + 5);
      beatOut('[data-beat="count-kec"]', A + 14.6);

      // 5) Three.js: 25 desa / kelurahan naik satu per satu (pelan)
      tl.to(S, { gap: 1, duration: 1.6, ease: "sine.inOut" }, A + 15.2);
      beatIn('[data-beat="count-desa"]', A + 16.6);
      tl.to(S, { dProg: desaList.length, duration: 18, ease: "none" }, A + 16.8);
      beatOut('[data-beat="count-desa"]', A + 35.4);

      // 6) Meratakan kembali menjadi peta 2D
      tl.to(S, { flat: 1, gap: 0, tilt: 0, cam: 7, duration: 2.8, ease: "power3.inOut" }, A + 36.2);
      tl.to(S, { three: 0, duration: 1.2, ease: "sine.inOut" }, A + 38);

      // 7) Pertanyaan akhir
      beatIn('[data-beat="final"]', A + 39.6);
      tl.to({}, { duration: 1 }, A + 40.2); // jeda penutup

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
        duration: opts?.duration ?? 1.7,
        ease: "power3.inOut",
        onUpdate: () => apply(lerpCam(from, target, p.t)),
      });
    },
    [apply]
  );

  const setFocus = useCallback<Experience["setFocus"]>((focus, instant) => {
    const scene = sceneRef.current;
    if (!scene) return;
    exTweenRef.current?.kill();
    focusRef.current = focus;
    scene.setLiftTargets(focus?.heights ?? new Map());
    const targetTilt = focus && focus.heights.size > 0 ? EXPLORE_TILT : 0;
    const ex = exRef.current;
    if (instant || prefersReducedMotion()) {
      ex.t = 1;
      ex.tilt = targetTilt;
      paintRef.current();
      return;
    }
    ex.t = 0;
    exTweenRef.current = gsap.to(ex, {
      t: 1,
      tilt: targetTilt,
      duration: 1.6,
      ease: "power3.inOut",
      onUpdate: () => paintRef.current(),
      onComplete: () => paintRef.current(),
    });
  }, []);

  const setHover = useCallback<Experience["setHover"]>(
    (ids) => {
      sceneRef.current?.setHighlight(new Set(ids));
      if (exploringRef.current) paintRef.current();
    },
    [exploringRef]
  );

  const fullCam = useCallback(() => fitCamera(FULL_BBOX, sizeRef.current, visFull, 0.95), [visFull]);
  /** Gulir halaman dengan easing GSAP (lebih lambat & halus daripada scroll "smooth" bawaan browser). */
  const scrollToY = useCallback((y: number, instant?: boolean) => {
    gsap.killTweensOf(window);
    if (instant || prefersReducedMotion()) {
      window.scrollTo(0, y);
      return;
    }
    const dist = Math.abs(y - window.scrollY);
    const duration = Math.min(5.5, Math.max(1.4, (dist / window.innerHeight) * 0.24));
    gsap.to(window, { scrollTo: { y, autoKill: false }, duration, ease: "power2.inOut", overwrite: true });
  }, []);

  const restart = useCallback(() => scrollToY(0), [scrollToY]);
  const skip = useCallback(
    (instant?: boolean) => {
      const st = stRef.current;
      if (st) scrollToY(st.end, instant);
    },
    [scrollToY]
  );

  return { flyTo, fullCam, restart, skip, setFocus, setHover };
}
