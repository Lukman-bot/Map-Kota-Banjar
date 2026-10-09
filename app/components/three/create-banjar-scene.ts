import type * as T from "three";
import type { OrbitControls as OrbitControlsT } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  CSS2DObject as CSS2DObjectT,
  CSS2DRenderer as CSS2DRendererT,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

import {
  desaList,
  kecamatanList,
  MAP_HEIGHT,
  MAP_WIDTH,
} from "~/data/banjarMap";
import { desaPath, kecamatanById, kecamatanPath } from "~/lib/wilayah";

/**
 * Pabrik scene Three.js untuk peta 3D Kota Banjar (tanpa React).
 * Dipanggil dari <BanjarMap3D /> setelah modul three di-import dinamis.
 */

export interface Libs {
  THREE: typeof T;
  OrbitControls: typeof OrbitControlsT;
  CSS2DRenderer: typeof CSS2DRendererT;
  CSS2DObject: typeof CSS2DObjectT;
}

export type MapMode = "desa" | "kecamatan";

export interface Selection {
  desaId: string | null;
  kecamatanId: string | null;
}

export interface SceneState {
  selection: Selection;
  mode: MapMode;
  showLabels: boolean;
  autoRotate: boolean;
}

export interface SceneIO {
  initial: SceneState;
  goTo: (path: string) => void;
  onHover: (id: string | null) => void;
  onView: (info: { zoomPercent: number; topView: boolean }) => void;
}

export interface SceneApi {
  setSelection: (s: Selection) => void;
  setMode: (m: MapMode) => void;
  setShowLabels: (v: boolean) => void;
  setAutoRotate: (v: boolean) => void;
  setExternalHover: (id: string | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  toggleTilt: () => void;
  dispose: () => void;
}

/* ---------- Konstanta ---------- */
const SCALE = 0.02; // unit peta → unit dunia
const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
const WORLD_W = MAP_WIDTH * SCALE;
const WORLD_D = MAP_HEIGHT * SCALE;
const ROSE = 0xe11d48;
const DEFAULT_ELEV = (50 * Math.PI) / 180;
const DEFAULT_POLAR = Math.PI / 2 - DEFAULT_ELEV;
const TOP_POLAR = 0.06;

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
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const hash01 = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};
const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const LABEL_STYLE =
  "pointer-events:none;user-select:none;white-space:nowrap;line-height:1;" +
  "color:#1b2512;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff,0 0 2px #fff;";

/* ====================================================================== */

export function createBanjarScene(
  libs: Libs,
  host: HTMLElement,
  tooltip: HTMLElement,
  io: SceneIO
): SceneApi {
  const { THREE, OrbitControls, CSS2DRenderer, CSS2DObject } = libs;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state: SceneState = { ...io.initial };

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;outline:none;";
  host.insertBefore(canvas, host.firstChild);

  const labelRenderer = new CSS2DRenderer();
  const labelDom = labelRenderer.domElement;
  labelDom.style.cssText =
    "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  host.insertBefore(labelDom, canvas.nextSibling);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);

  /* ---------- Cahaya ---------- */
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(-7, 11, 7);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7dd3fc, 0.8);
  rim.position.set(8, 4, -8);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  /* ---------- Wilayah ---------- */
  interface Item {
    id: string;
    kecId: string;
    mesh: T.Mesh<T.ExtrudeGeometry, T.MeshStandardMaterial>;
    height: number;
    baseColor: T.Color;
    dimColor: T.Color;
    delay: number;
    lift: number;
    glow: number;
    grow: number; // 0..1+ (progres intro)
    label: T.Object3D;
    labelEl: HTMLElement;
    labelSize: number;
    labelPx: number;
    labelOn: boolean;
  }

  const items: Item[] = [];
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
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);

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
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMaterial));
    world.add(mesh);

    const [lx, lz] = toWorld(desa.labelPos[0], desa.labelPos[1]);
    const labelEl = document.createElement("div");
    labelEl.textContent = desa.name;
    labelEl.style.cssText = LABEL_STYLE + "font-weight:600;";
    const label = new CSS2DObject(labelEl);
    label.position.set(lx, height + 0.04, lz);
    label.visible = false;
    world.add(label);

    items.push({
      id: desa.id,
      kecId: desa.kecamatanId,
      mesh,
      height,
      baseColor,
      dimColor: baseColor.clone().lerp(dimTarget, 0.55),
      delay: 0.1 + (Math.hypot(lx, lz) / maxDist) * 0.9 + hash01(desa.id + "d") * 0.15,
      lift: 0,
      glow: 0,
      grow: 0,
      label,
      labelEl,
      labelSize: desa.labelSize,
      labelPx: 0,
      labelOn: false,
    });
  }
  const itemById = new Map(items.map((it) => [it.id, it]));

  /* Label kecamatan */
  const kecLabels = kecamatanList.map((k) => {
    const el = document.createElement("div");
    el.textContent = `KEC. ${k.name.toUpperCase()}`;
    el.style.cssText = LABEL_STYLE + "font-weight:800;letter-spacing:0.08em;";
    const obj = new CSS2DObject(el);
    const [x, z] = toWorld(k.labelPos[0], k.labelPos[1]);
    obj.position.set(x, (KEC_HEIGHT[k.id] ?? 0.6) + 0.06, z);
    world.add(obj);
    return { el, obj, kecId: k.id, px: 0 };
  });

  /* ---------- Lantai ---------- */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(maxDist * 1.6, 80),
    new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.55 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  world.add(floor);

  /* ---------- Riak ---------- */
  interface Ripple {
    mesh: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>;
    start: number;
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
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
    );
    mesh.position.y = 0.01;
    mesh.visible = false;
    world.add(mesh);
    return {
      mesh,
      start: loop ? 0 : -1,
      duration: loop ? 6 : 1.6,
      radius: loop ? maxDist * 1.4 : 3.2,
      peak: loop ? 0.26 : 0.85,
      loop,
    };
  };
  const ambientRipples = [0, 2, 4].map((o) => {
    const r = makeRipple(0x7dd3fc, true);
    r.start = -o;
    return r;
  });
  const selectRipple = makeRipple(0xfb7185, false);
  const allRipples = [...ambientRipples, selectRipple];

  /* ---------- Pin ---------- */
  const pin = new THREE.Group();
  const pinMat = new THREE.MeshStandardMaterial({
    color: ROSE,
    emissive: ROSE,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const pinCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 20), pinMat);
  pinCone.rotation.x = Math.PI;
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

  /* ---------- Partikel ---------- */
  const PARTICLES = 160;
  const pPos = new Float32Array(PARTICLES * 3);
  const pSeed = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * WORLD_W * 1.5;
    pPos[i * 3 + 1] = 0.3 + Math.random() * 4.5;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_D * 1.7;
    pSeed[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xbfe3ff,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  world.add(particles);

  /* ---------- Kontrol kamera ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.zoomToCursor = true;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = TOP_POLAR;
  controls.maxPolarAngle = Math.PI / 2 - 0.15;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.autoRotateSpeed = 0.8;
  controls.autoRotate = state.autoRotate && !reduced;

  let defaultDist = 20;
  let defaultAz = 0;
  let lastSwap: boolean | null = null;
  let interacted = false;

  const sph = new THREE.Spherical();
  const off = new THREE.Vector3();
  const getView = () => {
    off.copy(camera.position).sub(controls.target);
    sph.setFromVector3(off);
    return { az: sph.theta, polar: sph.phi, r: sph.radius };
  };
  const applyView = (az: number, polar: number, r: number, target: T.Vector3) => {
    controls.target.copy(target);
    sph.set(r, polar, az);
    off.setFromSpherical(sph);
    camera.position.copy(target).add(off);
    camera.lookAt(target);
  };

  interface View {
    az: number;
    polar: number;
    r: number;
    target: T.Vector3;
  }
  let tween: { start: number; dur: number; from: View; to: View } | null = null;
  const goView = (to: View) => {
    if (reduced) {
      tween = null;
      applyView(to.az, to.polar, to.r, to.target);
      controls.update();
      invalidate();
      return;
    }
    tween = {
      start: clock,
      dur: 0.75,
      from: { ...getView(), target: controls.target.clone() },
      to,
    };
  };

  controls.addEventListener("start", () => {
    tween = null;
    interacted = true;
  });
  controls.addEventListener("change", () => invalidate());

  // Di zoom terjauh, scroll ke bawah menggulung halaman (bukan menelan event).
  canvas.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.deltaY > 0 && getView().r >= controls.maxDistance - 0.02) {
        e.stopImmediatePropagation();
      }
    },
    { capture: true, passive: true }
  );

  /* ---------- Layout / resize ---------- */
  const fit = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const vTan = Math.tan((camera.fov * Math.PI) / 360);
    const hTan = vTan * camera.aspect;
    const calc = (swap: boolean) => {
      const spanH = (swap ? WORLD_D : WORLD_W) * 1.12;
      const spanD = swap ? WORLD_W : WORLD_D;
      const dV = (spanD * Math.sin(DEFAULT_ELEV) + 1.2 * Math.cos(DEFAULT_ELEV) + 1.5) / 2 / vTan;
      const dH = spanH / 2 / hTan;
      return Math.max(dV, dH);
    };
    const a = calc(false);
    const b = calc(true);
    // Layar potret: putar peta 90° agar sisi panjangnya memanjang ke bawah.
    const swap = b < a * 0.9;
    defaultDist = swap ? b : a;
    defaultAz = swap ? Math.PI / 2 : 0;

    controls.maxDistance = defaultDist;
    controls.minDistance = defaultDist * 0.2;

    if (lastSwap === null || swap !== lastSwap || !interacted) {
      tween = null;
      applyView(defaultAz, DEFAULT_POLAR, defaultDist, new THREE.Vector3(0, 0.2, 0));
    } else {
      const v = getView();
      applyView(v.az, v.polar, Math.min(v.r, defaultDist), controls.target.clone());
    }
    lastSwap = swap;
    controls.update();
    invalidate();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);

  /* ---------- Seleksi ---------- */
  let pinTarget: { topY: number } | null = null;
  let clock = 0;

  const applySelection = (s: Selection, animate: boolean) => {
    state.selection = s;
    const desa = s.desaId ? desaList.find((d) => d.id === s.desaId) : undefined;
    const kec = s.kecamatanId ? kecamatanById.get(s.kecamatanId) : undefined;
    const anchor = desa?.labelPos ?? kec?.labelPos ?? null;
    const kecForHeight = desa?.kecamatanId ?? kec?.id ?? null;

    if (anchor && kecForHeight) {
      const [x, z] = toWorld(anchor[0], anchor[1]);
      pinTarget = { topY: (KEC_HEIGHT[kecForHeight] ?? 0.6) + 0.35 };
      pin.position.set(x, pinTarget.topY, z);
      pin.visible = true;
      if (animate) {
        pin.scale.setScalar(0.001);
        selectRipple.start = clock;
        selectRipple.mesh.position.set(x, 0.01, z);
      }
    } else {
      pinTarget = null;
      pin.visible = false;
    }
    invalidate();
  };

  /* ---------- Interaksi pointer ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const meshes = items.map((i) => i.mesh);
  let pointerHover: string | null = null;
  let externalHover: string | null = null;
  let reportedHover: string | null = null;
  const currentHover = () => pointerHover ?? externalHover;

  const pick = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    camera.updateMatrixWorld();
    world.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? (items.find((i) => i.mesh === hit.object)?.id ?? null) : null;
  };

  const hoverText = (id: string) => {
    const it = itemById.get(id)!;
    const kecName = kecamatanById.get(it.kecId)?.name ?? "";
    if (state.mode === "kecamatan") return `Kecamatan ${kecName}`;
    const desa = desaList.find((d) => d.id === id)!;
    return `${desa.name} · Kec. ${kecName}`;
  };

  const showTooltip = (id: string | null, cx: number, cy: number) => {
    if (!id) {
      tooltip.style.display = "none";
      return;
    }
    tooltip.textContent = hoverText(id);
    const rect = host.getBoundingClientRect();
    const x = clamp(cx - rect.left + 14, 4, rect.width - 8);
    const y = clamp(cy - rect.top + 16, 4, rect.height - 30);
    tooltip.style.display = "block";
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
  };

  const pointers = new Set<number>();
  let down: { x: number; y: number } | null = null;
  let multi = false;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.buttons !== 0) return;
    const id = pick(e.clientX, e.clientY);
    if (id !== pointerHover) {
      pointerHover = id;
      canvas.style.cursor = id ? "pointer" : "grab";
    }
    showTooltip(id, e.clientX, e.clientY);
    invalidate();
  };
  const onLeave = () => {
    pointerHover = null;
    canvas.style.cursor = "grab";
    showTooltip(null, 0, 0);
    invalidate();
  };
  const onDown = (e: PointerEvent) => {
    pointers.add(e.pointerId);
    if (pointers.size > 1) multi = true;
    else {
      multi = false;
      down = { x: e.clientX, y: e.clientY };
    }
    if (e.pointerType !== "touch") {
      showTooltip(null, 0, 0);
      canvas.style.cursor = "grabbing";
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (multi) {
      if (pointers.size === 0) multi = false;
      down = null;
      return;
    }
    if (e.pointerType !== "touch") canvas.style.cursor = pointerHover ? "pointer" : "grab";
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 8) return;
    const id = pick(e.clientX, e.clientY);
    if (!id) return;
    const it = itemById.get(id)!;
    io.goTo(state.mode === "kecamatan" ? kecamatanPath(it.kecId) : desaPath(id));
  };
  const onCancel = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    down = null;
  };
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

  /* ---------- Update per frame ---------- */
  const tmpColor = new THREE.Color();
  const tmpTarget = new THREE.Vector3();
  let lastPct = -1;
  let lastTop: boolean | null = null;

  const update = (dt: number) => {
    clock += dt;
    const t = reduced ? 100 : clock;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 9);

    // Tween kamera (reset / zoom tombol / tampak atas).
    if (tween) {
      const p = clamp01((clock - tween.start) / tween.dur);
      const e = easeInOut(p);
      const { from, to } = tween;
      tmpTarget.lerpVectors(from.target, to.target, e);
      applyView(
        from.az + shortestAngle(from.az, to.az) * e,
        from.polar + (to.polar - from.polar) * e,
        from.r + (to.r - from.r) * e,
        tmpTarget
      );
      if (p >= 1) tween = null;
    }
    controls.update(dt);

    // Batasi geseran supaya peta tidak hilang dari layar.
    const tg = controls.target;
    const cx = clamp(tg.x, -WORLD_W * 0.5, WORLD_W * 0.5);
    const cz = clamp(tg.z, -WORLD_D * 0.5, WORLD_D * 0.5);
    const cy = clamp(tg.y, 0, 0.6);
    if (cx !== tg.x || cz !== tg.z || cy !== tg.y) {
      const dx = cx - tg.x;
      const dy = cy - tg.y;
      const dz = cz - tg.z;
      tg.set(cx, cy, cz);
      camera.position.add(off.set(dx, dy, dz));
    }

    // Info zoom / tampak atas ke UI.
    const v = getView();
    const pct = Math.round((defaultDist / v.r) * 100);
    const top = v.polar < 0.3;
    if (pct !== lastPct || top !== lastTop) {
      lastPct = pct;
      lastTop = top;
      io.onView({ zoomPercent: pct, topView: top });
    }

    // Hover.
    const hid = currentHover();
    if (hid !== reportedHover) {
      reportedHover = hid;
      io.onHover(hid);
    }
    const hoverItem = hid ? itemById.get(hid) : undefined;
    const { selection, mode } = state;
    const hasSelection = !!selection.desaId || !!selection.kecamatanId;
    const selDesaKec = selection.desaId ? itemById.get(selection.desaId)?.kecId : undefined;
    const pulse = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 3);

    for (const it of items) {
      const p = clamp01((t - it.delay) / 0.9);
      it.grow = p;
      it.mesh.scale.y = Math.max(0.001, easeOutBack(p));

      const isSelDesa = !!selection.desaId && it.id === selection.desaId;
      const inSelKec = !!selection.kecamatanId && it.kecId === selection.kecamatanId;
      const selected = isSelDesa || (!selection.desaId && inSelKec);
      const sameKec = !!selDesaKec && selDesaKec === it.kecId;
      const isHover = hoverItem
        ? mode === "kecamatan"
          ? hoverItem.kecId === it.kecId
          : hoverItem.id === it.id
        : false;

      const liftTarget = selected ? 0.5 : isHover ? 0.28 : sameKec ? 0.08 : 0;
      it.lift += (liftTarget - it.lift) * k;
      it.mesh.position.y = it.lift;

      const glowTarget = selected ? 0.22 + 0.12 * pulse : isHover ? 0.14 : 0;
      it.glow += (glowTarget - it.glow) * k;
      it.mesh.material.emissiveIntensity = it.glow;

      const dim = hasSelection && !selected && !isHover && !sameKec;
      tmpColor.copy(dim ? it.dimColor : it.baseColor);
      it.mesh.material.color.lerp(tmpColor, k);
    }

    // Label: ukuran font mengikuti zoom (seperti label SVG sebelumnya).
    const hPx = Math.max(1, host.clientHeight);
    const pxPerUnit = (hPx / (2 * v.r * Math.tan((camera.fov * Math.PI) / 360))) * SCALE;
    for (const it of items) {
      const raw = it.labelSize * pxPerUnit * 1.2;
      const px = Math.round(Math.min(16, raw) * 2) / 2;
      const on = state.showLabels && raw >= 7 && it.grow > 0.7;
      it.label.visible = on;
      if (on) {
        it.label.position.y = it.height * it.mesh.scale.y + it.lift + 0.04;
        if (px !== it.labelPx) {
          it.labelPx = px;
          it.labelEl.style.fontSize = `${px}px`;
        }
        const op = it.grow > 0.95 ? "1" : String((it.grow - 0.7) / 0.25);
        if (op !== it.labelEl.style.opacity) it.labelEl.style.opacity = op;
      }
    }
    for (const kl of kecLabels) {
      const px = Math.round(clamp(10.5 * pxPerUnit * 1.1, 9, 15) * 2) / 2;
      if (px !== kl.px) {
        kl.px = px;
        kl.el.style.fontSize = `${px}px`;
      }
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
        p = ((((t - r.start) % r.duration) + r.duration) % r.duration) / r.duration;
      } else {
        p = (t - r.start) / r.duration;
        if (reduced || p >= 1 || p < 0) {
          r.mesh.visible = false;
          continue;
        }
      }
      r.mesh.visible = true;
      const s = Math.max(0.01, (1 - Math.pow(1 - p, 2)) * r.radius);
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = (1 - p) * r.peak;
    }

    // Pin.
    if (pinTarget && pin.visible) {
      const bob = reduced ? 0 : Math.sin(t * 2.4) * 0.08;
      const sel = selection.desaId ? itemById.get(selection.desaId) : undefined;
      pin.position.y = pinTarget.topY + (sel ? sel.lift : 0.5) + bob;
      pin.scale.setScalar(
        pin.scale.x + (1 - pin.scale.x) * (reduced ? 1 : 1 - Math.exp(-dt * 7))
      );
      pin.rotation.y = reduced ? 0 : t * 1.2;
    }

    // Partikel.
    if (!reduced) {
      for (let i = 0; i < PARTICLES; i++) {
        const o = i * 3;
        pPos[o + 1] += dt * (0.12 + (i % 5) * 0.025);
        pPos[o] += Math.sin(t * 0.4 + pSeed[i]) * dt * 0.12;
        pPos[o + 2] += Math.cos(t * 0.35 + pSeed[i]) * dt * 0.1;
        if (pPos[o + 1] > 4.8) pPos[o + 1] = 0.25;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  };

  /* ---------- Loop ---------- */
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
    labelRenderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(tick);
  };
  function invalidate() {
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

  const visObs = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0.01 }
  );
  visObs.observe(host);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);

  /* ---------- Mulai ---------- */
  fit();
  applySelection(state.selection, false);
  if (reduced) {
    update(0);
    invalidate();
  } else {
    start();
  }

  /* ---------- API ---------- */
  const viewNow = (): View => ({ ...getView(), target: controls.target.clone() });

  return {
    setSelection: (s) => applySelection(s, true),
    setMode: (m) => {
      state.mode = m;
      invalidate();
    },
    setShowLabels: (v) => {
      state.showLabels = v;
      invalidate();
    },
    setAutoRotate: (v) => {
      state.autoRotate = v;
      controls.autoRotate = v && !reduced;
      invalidate();
    },
    setExternalHover: (id) => {
      externalHover = id;
      invalidate();
    },
    zoomIn: () => {
      const v = viewNow();
      goView({ ...v, r: clamp(v.r * 0.62, controls.minDistance, controls.maxDistance) });
    },
    zoomOut: () => {
      const v = viewNow();
      goView({ ...v, r: clamp(v.r / 0.62, controls.minDistance, controls.maxDistance) });
    },
    reset: () => {
      interacted = false;
      goView({
        az: defaultAz,
        polar: DEFAULT_POLAR,
        r: defaultDist,
        target: new THREE.Vector3(0, 0.2, 0),
      });
    },
    toggleTilt: () => {
      const v = viewNow();
      goView({ ...v, polar: v.polar < 0.3 ? DEFAULT_POLAR : TOP_POLAR });
    },
    dispose: () => {
      stop();
      ro.disconnect();
      visObs.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      controls.dispose();

      scene.traverse((obj) => {
        const o = obj as T.Mesh;
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
      labelDom.remove();
      tooltip.style.display = "none";
    },
  };
}
