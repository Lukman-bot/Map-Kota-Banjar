import * as THREE from "three";
import { desaList, kecamatanList } from "../data/banjarMap";
import { profilDesa } from "../data/profiles";
import type { Cam } from "../hooks/useCamera";

/**
 * Adegan 3D Kota Banjar (Three.js).
 * Setiap desa diekstrusi dari poligon peta yang SAMA dengan peta SVG, dan kamera
 * ortografiknya disamakan dengan kamera SVG → saat tidak miring & rata (flat = 1),
 * hasilnya menimpa peta 2D tepat di tempatnya, sehingga transisinya mulus.
 *
 *  - kProg 0→4  : 4 kecamatan "naik" satu per satu (hitungan kecamatan)
 *  - dProg 0→25 : 25 desa/kelurahan naik satu per satu, tinggi mengikuti jumlah penduduk
 *  - gap        : celah antar desa (0 = menempel, 1 = terpisah)
 *  - flat       : 0 = bertinggi penuh, 1 = rata dengan peta
 *  - tilt       : kemiringan kamera (radian), 0 = dilihat tepat dari atas
 */
export interface SceneParams {
  kProg: number;
  dProg: number;
  gap: number;
  flat: number;
  tilt: number;
}

interface Item {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  kec: number;
  idx: number;
  hd: number; // tinggi akhir (fase desa)
}

const H_KEC = 36; // tinggi balok saat fase kecamatan (satuan peta)
const H_MIN = 16;
const H_MAX = 74;
const GAP_SHRINK = 0.1;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ACCENT = new THREE.Color("#ffc857");

export class BanjarScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
  private items: Item[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private lineMat = new THREE.LineBasicMaterial({ color: 0x0b1624, transparent: true, opacity: 0.55 });
  private cam: Cam = { cx: 0, cy: 0, s: 1 };
  private size = { w: 1, h: 1 };
  private p: SceneParams = { kProg: 0, dProg: 0, gap: 0, flat: 1, tilt: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-260, -320, 520);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9cc8ff, 0.9);
    rim.position.set(300, 220, 260);
    this.scene.add(rim);

    const maxPop = Math.max(...desaList.map((d) => profilDesa[d.id].penduduk));
    const kecIdx = new Map(kecamatanList.map((k, i) => [k.id, i]));
    desaList.forEach((d, i) => {
      // titik tengah poligon → pusat mesh, supaya bisa mengecil menjauh dari desa tetangga
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of d.points) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const shape = new THREE.Shape(d.points.map(([x, y]) => new THREE.Vector2(x - cx, -(y - cy))));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
      this.geos.push(geo);

      const kec = kecamatanList[kecIdx.get(d.kecamatanId)!];
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(kec.fill),
        roughness: 0.72,
        metalness: 0.02,
        emissive: ACCENT,
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, -cy, 0);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), this.lineMat);
      this.geos.push(edges.geometry);
      mesh.add(edges);
      this.scene.add(mesh);

      const hd = H_MIN + (H_MAX - H_MIN) * Math.sqrt(profilDesa[d.id].penduduk / maxPop);
      this.items.push({ mesh, mat, kec: kecIdx.get(d.kecamatanId)!, idx: i, hd });
    });
    this.update(this.p);
  }

  resize(w: number, h: number) {
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.setCamera(this.cam);
  }

  /** Samakan dengan kamera SVG: (cx, cy) titik peta di tengah layar, s = piksel per satuan peta. */
  setCamera(c: Cam) {
    this.cam = c;
    const w = this.size.w / c.s;
    const h = this.size.h / c.s;
    const cam = this.camera;
    cam.left = -w / 2;
    cam.right = w / 2;
    cam.top = h / 2;
    cam.bottom = -h / 2;
    cam.updateProjectionMatrix();

    const D = 1200;
    const t = this.p.tilt;
    const target = new THREE.Vector3(c.cx, -c.cy, 0);
    cam.position.set(target.x, target.y - Math.sin(t) * D, Math.cos(t) * D);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
  }

  update(p: SceneParams) {
    this.p = p;
    const gapScale = 1 - GAP_SHRINK * clamp01(p.gap);
    for (const it of this.items) {
      const kj = smooth(clamp01(p.kProg - it.kec));
      const dj = smooth(clamp01(p.dProg - it.idx));
      const h = (H_KEC * kj + (it.hd - H_KEC * kj) * dj) * (1 - clamp01(p.flat));
      it.mesh.scale.set(gapScale, gapScale, Math.max(h, 0.001));
      // desa yang sedang naik menyala sebentar
      const raw = clamp01(p.dProg - it.idx);
      const rawK = clamp01(p.kProg - it.kec);
      const pulse = Math.max(raw > 0 && raw < 1 ? Math.sin(Math.PI * raw) : 0, rawK > 0 && rawK < 1 ? Math.sin(Math.PI * rawK) : 0);
      it.mat.emissiveIntensity = pulse * 0.55;
    }
    this.setCamera(this.cam);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.items.forEach((i) => i.mat.dispose());
    this.lineMat.dispose();
    this.renderer.dispose();
  }
}
