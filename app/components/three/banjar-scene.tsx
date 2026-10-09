import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
  desaList,
  MAP_HEIGHT,
  MAP_WIDTH,
} from "~/data/banjarMap";
import { desaPath, kecamatanById } from "~/lib/wilayah";
import { cn } from "~/lib/utils";

/**
 * Peta Kota Banjar versi 3D (Three.js).
 *
 * - Poligon desa yang sama dengan peta SVG di-extrude menjadi peta timbul.
 * - Saat dimuat, desa "tumbuh" dari tengah ke luar.
 * - Hover = desa terangkat + tooltip; klik/tap = pindah ke halaman desa.
 * - Wilayah terpilih (dari URL) terangkat, menyala, diberi pin dan riak.
 * - Riak air + partikel halus sebagai latar.
 *
 * Komponen ini murni dekoratif/pelengkap: peta SVG (dengan <a> sungguhan)
 * tetap menjadi sumber navigasi utama dan aksesibilitas, sehingga canvas
 * ditandai aria-hidden. Three.js di-import dinamis di dalam useEffect
 * sehingga aman untuk SSR dan tidak membebani bundle awal.
 */

type ThreeLib = typeof import("three");

interface Selection {
  desaId: string | null;
  kecamatanId: string | null;
}

interface SceneApi {
  setSelection: (s: Selection) => void;
  dispose: () => void;
}

interface BanjarSceneProps {
  selectedDesaId: string | null;
  selectedKecamatanId: string | null;
  /**
   * true  → peta digeser ke kanan supaya teks di sisi kiri tidak tertutup
   *         (dipakai saat teks menumpuk di atas canvas, layar >= sm).
   * false → peta di tengah canvas.
   */
  offsetForOverlay: boolean;
  className?: string;
}

/* ---------- Konstanta tampilan ---------- */
const SCALE = 0.02; // unit peta → unit dunia (lebar 753 → ±15)
const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
const WORLD_W = MAP_WIDTH * SCALE;
const WORLD_D = MAP_HEIGHT * SCALE;
const ROSE = 0xe11d48;

/** Tinggi extrude per kecamatan (ilustratif, bukan data elevasi). */
const KEC_HEIGHT: Record<string, number> = {
  banjar: 0.5,
  purwaharja: 0.95,
  pataruman: 0.65,
  langensari: 0.8,
};

const toWorld = (px: number, py: number): [number, number] => [
  (px - CX) * SCALE,
  (py - CY) * SCALE,
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Hash string → 0..1 (stabil), untuk variasi warna antar desa. */
const hash01 = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};

/* ====================================================================== */
/*                               React wrapper                            */
/* ====================================================================== */

export default function BanjarScene({
  selectedDesaId,
  selectedKecamatanId,
  offsetForOverlay,
  className,
}: BanjarSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  // Nilai terbaru disimpan di ref agar scene tidak dibuat ulang saat berubah.
  const selectionRef = useRef<Selection>({ desaId: null, kecamatanId: null });
  const navigateRef = useRef(navigate);
  const overlayRef = useRef(offsetForOverlay);
  const resizeRef = useRef<(() => void) | null>(null);

  navigateRef.current = navigate;
  selectionRef.current = {
    desaId: selectedDesaId,
    kecamatanId: selectedKecamatanId,
  };

  useEffect(() => {
    const host = hostRef.current;
    const tooltip = tooltipRef.current;
    if (!host || !tooltip) return;

    let disposed = false;

    (async () => {
      let THREE: ThreeLib;
      try {
        THREE = await import("three");
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;

      try {
        const api = createScene(THREE, host, tooltip, {
          getSelection: () => selectionRef.current,
          getOverlay: () => overlayRef.current,
          goTo: (path) => navigateRef.current(path, { preventScrollReset: true }),
          registerResize: (fn) => {
            resizeRef.current = fn;
          },
        });
        apiRef.current = api;
      } catch {
        // WebGL tidak tersedia / konteks gagal dibuat → sembunyikan saja.
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
      resizeRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setSelection({
      desaId: selectedDesaId,
      kecamatanId: selectedKecamatanId,
    });
  }, [selectedDesaId, selectedKecamatanId]);

  useEffect(() => {
    overlayRef.current = offsetForOverlay;
    resizeRef.current?.();
  }, [offsetForOverlay]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("relative overflow-hidden", failed && "hidden", className)}
    >
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute top-0 left-0 z-10 hidden max-w-[70%] rounded-md bg-slate-950/85 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg backdrop-blur-sm"
      />
    </div>
  );
}

/* ====================================================================== */
/*                               Scene factory                            */
/* ====================================================================== */

interface SceneIO {
  getSelection: () => Selection;
  getOverlay: () => boolean;
  goTo: (path: string) => void;
  registerResize: (fn: () => void) => void;
}

function createScene(
  THREE: ThreeLib,
  host: HTMLDivElement,
  tooltip: HTMLDivElement,
  io: SceneIO
): SceneApi {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Renderer / kamera ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "display:block;width:100%;height:100%;touch-action:pan-y;outline:none;";
  host.insertBefore(canvas, host.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  /* ---------- Cahaya ---------- */
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(-7, 11, 7);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7dd3fc, 0.8);
  rim.position.set(8, 4, -8);
  scene.add(rim);

  /* ---------- Grup peta ---------- */
  const world = new THREE.Group(); // digeser/diputar sesuai layout & pointer
  scene.add(world);
  const map = new THREE.Group();
  world.add(map);

  interface DesaMesh {
    id: string;
    kecId: string;
    mesh: import("three").Mesh<
      import("three").ExtrudeGeometry,
      import("three").MeshStandardMaterial
    >;
    height: number;
    baseColor: import("three").Color;
    dimColor: import("three").Color;
    delay: number;
    lift: number;
    glow: number;
  }

  const items: DesaMesh[] = [];
  const maxDist = Math.hypot(WORLD_W / 2, WORLD_D / 2);
  const dimTarget = new THREE.Color(0x334155);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.35,
  });

  for (const desa of desaList) {
    const kec = kecamatanById.get(desa.kecamatanId)!;
    const height = KEC_HEIGHT[desa.kecamatanId] ?? 0.6;

    const shape = new THREE.Shape();
    desa.points.forEach(([px, py], i) => {
      const [x, z] = toWorld(px, py);
      // Setelah rotateX(-π/2): y bentuk → -z dunia, jadi balik tandanya.
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2); // ekstrusi (z) → naik (y)

    const baseColor = new THREE.Color(kec.fill);
    baseColor.offsetHSL(0, 0, (hash01(desa.id) - 0.5) * 0.06);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: 0.8,
      metalness: 0.02,
      emissive: new THREE.Color(ROSE),
      emissiveIntensity: 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.y = 0.001;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      edgeMaterial
    );
    mesh.add(edges);
    map.add(mesh);

    const [lx, lz] = toWorld(desa.labelPos[0], desa.labelPos[1]);
    const dist = Math.hypot(lx, lz) / maxDist;

    items.push({
      id: desa.id,
      kecId: desa.kecamatanId,
      mesh,
      height,
      baseColor,
      dimColor: baseColor.clone().lerp(dimTarget, 0.55),
      delay: 0.1 + dist * 0.9 + hash01(desa.id + "d") * 0.15,
      lift: 0,
      glow: 0,
    });
  }
  const itemById = new Map(items.map((it) => [it.id, it]));

  /* ---------- Dasar / lantai ---------- */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(maxDist * 1.35, 72),
    new THREE.MeshBasicMaterial({
      color: 0x0b1220,
      transparent: true,
      opacity: 0.55,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  world.add(floor);

  /* ---------- Riak (ambient + saat memilih wilayah) ---------- */
  interface Ripple {
    mesh: import("three").Mesh<
      import("three").RingGeometry,
      import("three").MeshBasicMaterial
    >;
    start: number; // detik; < 0 = tidak aktif
    duration: number;
    radius: number;
    peak: number;
    loop: boolean;
  }
  const ringGeo = new THREE.RingGeometry(0.97, 1, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const makeRipple = (color: number, loop: boolean): Ripple => {
    const mesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    mesh.position.y = 0.01;
    mesh.visible = false;
    world.add(mesh);
    return {
      mesh,
      start: loop ? 0 : -1,
      duration: loop ? 6 : 1.6,
      radius: loop ? maxDist * 1.25 : 3.2,
      peak: loop ? 0.28 : 0.85,
      loop,
    };
  };
  const ambientRipples = [0, 2, 4].map((offset) => {
    const r = makeRipple(0x7dd3fc, true);
    r.start = -offset; // saling berselang
    return r;
  });
  const selectRipple = makeRipple(0xfb7185, false);
  const allRipples = [...ambientRipples, selectRipple];

  /* ---------- Pin lokasi (wilayah terpilih) ---------- */
  const pin = new THREE.Group();
  const pinMat = new THREE.MeshStandardMaterial({
    color: ROSE,
    emissive: ROSE,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const pinCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 20), pinMat);
  pinCone.rotation.x = Math.PI; // ujung runcing ke bawah
  pinCone.position.y = 0.275;
  const pinBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), pinMat);
  pinBall.position.y = 0.7;
  const pinDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  pinDot.position.y = 0.7;
  pin.add(pinCone, pinBall, pinDot);
  pin.visible = false;
  pin.scale.setScalar(0.001);
  world.add(pin);

  /* ---------- Partikel (kunang-kunang / kabut tipis) ---------- */
  const PARTICLES = 120;
  const pPos = new Float32Array(PARTICLES * 3);
  const pSeed = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * WORLD_W * 1.25;
    pPos[i * 3 + 1] = 0.3 + Math.random() * 4.2;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_D * 1.4;
    pSeed[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xbfe3ff,
    size: 0.07,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(pGeo, pMat);
  world.add(particles);

  /* ---------- State ---------- */
  let selection: Selection = { desaId: null, kecamatanId: null };
  let pinTarget: { x: number; z: number; topY: number } | null = null;
  let hoverId: string | null = null;
  const pointer = { nx: 0, ny: 0, inside: false }; // -1..1
  let overlayShift = 0;

  const applySelection = (s: Selection, animate: boolean) => {
    selection = s;
    const desa = s.desaId ? desaList.find((d) => d.id === s.desaId) : undefined;
    const kec = s.kecamatanId ? kecamatanById.get(s.kecamatanId) : undefined;

    let anchor: [number, number] | null = null;
    let kecForHeight: string | null = null;
    if (desa) {
      anchor = desa.labelPos;
      kecForHeight = desa.kecamatanId;
    } else if (kec) {
      anchor = kec.labelPos;
      kecForHeight = kec.id;
    }

    if (anchor && kecForHeight) {
      const [x, z] = toWorld(anchor[0], anchor[1]);
      pinTarget = { x, z, topY: (KEC_HEIGHT[kecForHeight] ?? 0.6) + 0.35 };
      pin.position.set(x, pinTarget.topY, z);
      pin.visible = true;
      if (animate) {
        pin.scale.setScalar(0.001);
        selectRipple.start = clock; // letakkan riak di lokasi baru
        selectRipple.mesh.position.set(x, 0.01, z);
      }
    } else {
      pinTarget = null;
      pin.visible = false;
    }
    invalidate();
  };

  /* ---------- Layout / resize ---------- */
  const fit = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    const overlay =
      io.getOverlay() && window.matchMedia("(min-width: 640px)").matches;
    const frac = overlay ? 0.62 : 1; // porsi lebar yang boleh dipakai peta
    const vTan = Math.tan((camera.fov * Math.PI) / 360);
    const hTan = vTan * camera.aspect;
    const elev = (38 * Math.PI) / 180;

    // Tinggi proyeksi kira-kira: kedalaman*sin(elev) + tinggi*cos(elev)
    const projH = WORLD_D * Math.sin(elev) + 1.2 * Math.cos(elev) + 1.6;
    const distV = projH / 2 / vTan;
    const distH = (WORLD_W * 1.2) / 2 / (hTan * frac);
    const dist = Math.max(distV, distH);

    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, 0.3, 0);
    camera.updateProjectionMatrix();

    const visibleW = 2 * hTan * dist;
    overlayShift = overlay ? ((1 - frac) / 2) * visibleW : 0;
    invalidate();
  };
  io.registerResize(fit);

  const ro = new ResizeObserver(fit);
  ro.observe(host);

  /* ---------- Raycast / interaksi ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const meshes = items.map((i) => i.mesh);

  const pick = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    world.updateMatrixWorld(true);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return items.find((i) => i.mesh === hit.object)?.id ?? null;
  };

  const showTooltip = (id: string | null, clientX: number, clientY: number) => {
    if (!id) {
      tooltip.style.display = "none";
      return;
    }
    const desa = desaList.find((d) => d.id === id)!;
    tooltip.textContent = `${desa.name} · Kec. ${kecamatanById.get(desa.kecamatanId)?.name}`;
    const rect = host.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left + 12, 4), rect.width - 8);
    const y = Math.min(Math.max(clientY - rect.top + 14, 4), rect.height - 28);
    tooltip.style.display = "block";
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
  };

  let down: { x: number; y: number } | null = null;

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.inside = true;
    pointer.nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    if (e.pointerType === "touch") {
      invalidate();
      return;
    }
    const id = pick(e.clientX, e.clientY);
    if (id !== hoverId) {
      hoverId = id;
      canvas.style.cursor = id ? "pointer" : "";
    }
    showTooltip(id, e.clientX, e.clientY);
    invalidate();
  };
  const onLeave = () => {
    pointer.inside = false;
    hoverId = null;
    canvas.style.cursor = "";
    showTooltip(null, 0, 0);
    invalidate();
  };
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 8) return;
    const id = pick(e.clientX, e.clientY);
    if (id) io.goTo(desaPath(id));
  };
  const onCancel = () => {
    down = null;
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

  /* ---------- Update per frame ---------- */
  let clock = 0; // detik sejak scene dibuat
  const tmpColor = new THREE.Color();
  let rotY = 0;
  let rotX = 0;

  const update = (dt: number) => {
    clock += dt;
    const t = reduced ? 100 : clock;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 9);

    // Parallax: sedikit goyang otomatis + mengikuti pointer.
    const sway = reduced ? 0 : Math.sin(t * 0.25) * 0.18;
    const targetY = sway + (pointer.inside ? pointer.nx * 0.28 : 0);
    const targetX = pointer.inside ? pointer.ny * 0.08 : 0;
    rotY += (targetY - rotY) * (reduced ? 1 : 1 - Math.exp(-dt * 3));
    rotX += (targetX - rotX) * (reduced ? 1 : 1 - Math.exp(-dt * 3));
    world.rotation.y = rotY;
    world.rotation.x = rotX;
    world.position.x += (overlayShift - world.position.x) * (reduced ? 1 : k);

    // Peta timbul.
    const hoverItem = hoverId ? itemById.get(hoverId) : undefined;
    const pulse = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 3);

    for (const it of items) {
      const p = clamp01((t - it.delay) / 0.9);
      it.mesh.scale.y = Math.max(0.001, easeOutBack(p));

      const inSelKec =
        !!selection.kecamatanId && it.kecId === selection.kecamatanId;
      const isSelDesa = !!selection.desaId && it.id === selection.desaId;
      const isHover = hoverItem?.id === it.id;
      const hasSelection = !!selection.desaId || !!selection.kecamatanId;
      const selected = isSelDesa || (!selection.desaId && inSelKec);
      const sameKecAsSelDesa =
        !!selection.desaId &&
        itemById.get(selection.desaId)?.kecId === it.kecId;

      const liftTarget = selected ? 0.5 : isHover ? 0.28 : sameKecAsSelDesa ? 0.08 : 0;
      it.lift += (liftTarget - it.lift) * k;
      it.mesh.position.y = it.lift;

      const glowTarget = selected ? 0.22 + 0.12 * pulse : isHover ? 0.14 : 0;
      it.glow += (glowTarget - it.glow) * k;
      it.mesh.material.emissiveIntensity = it.glow;

      // Wilayah lain meredup sedikit saat ada pilihan.
      const dim = hasSelection && !selected && !isHover && !sameKecAsSelDesa;
      tmpColor.copy(dim ? it.dimColor : it.baseColor);
      it.mesh.material.color.lerp(tmpColor, k);
    }

    // Riak.
    for (const r of allRipples) {
      if (r.start < 0 && !r.loop) {
        r.mesh.visible = false;
        continue;
      }
      let p: number;
      if (r.loop) {
        if (reduced) {
          r.mesh.visible = false;
          continue;
        }
        p = (((t - r.start) % r.duration) + r.duration) % r.duration / r.duration;
      } else {
        p = (t - r.start) / r.duration;
        if (reduced || p >= 1 || p < 0) {
          r.mesh.visible = false;
          continue;
        }
      }
      r.mesh.visible = true;
      const eased = 1 - Math.pow(1 - p, 2);
      const s = Math.max(0.01, eased * r.radius);
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = (1 - p) * r.peak;
    }

    // Pin.
    if (pinTarget && pin.visible) {
      const bob = reduced ? 0 : Math.sin(t * 2.4) * 0.08;
      const sel = selection.desaId ? itemById.get(selection.desaId) : undefined;
      const lift = sel ? sel.lift : 0.5;
      pin.position.y = pinTarget.topY + lift + bob;
      const s = pin.scale.x + (1 - pin.scale.x) * (reduced ? 1 : 1 - Math.exp(-dt * 7));
      pin.scale.setScalar(s);
      pin.rotation.y = reduced ? 0 : t * 1.2;
    }

    // Partikel.
    if (!reduced) {
      for (let i = 0; i < PARTICLES; i++) {
        const o = i * 3;
        pPos[o + 1] += dt * (0.12 + (i % 5) * 0.025);
        pPos[o] += Math.sin(t * 0.4 + pSeed[i]) * dt * 0.12;
        pPos[o + 2] += Math.cos(t * 0.35 + pSeed[i]) * dt * 0.1;
        if (pPos[o + 1] > 4.6) pPos[o + 1] = 0.25;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  };

  /* ---------- Loop (hanya berjalan saat terlihat) ---------- */
  let raf = 0;
  let running = false;
  let visible = true;
  let last = performance.now();

  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(tick);
  };

  function invalidate() {
    // Mode gerak dikurangi: render hanya saat ada perubahan.
    if (!running && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  const start = () => {
    if (reduced || running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const io2 = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0.01 }
  );
  io2.observe(host);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);

  // Mulai.
  fit();
  world.position.x = overlayShift;
  applySelection(io.getSelection(), false);
  if (reduced) {
    update(0);
    invalidate();
  } else {
    start();
  }

  /* ---------- Bersihkan ---------- */
  const dispose = () => {
    stop();
    ro.disconnect();
    io2.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onCancel);

    scene.traverse((obj) => {
      const o = obj as import("three").Mesh;
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else if (m) m.dispose();
    });
    edgeMaterial.dispose();
    ringGeo.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    tooltip.style.display = "none";
  };

  return {
    setSelection: (s) => applySelection(s, true),
    dispose,
  };
}
