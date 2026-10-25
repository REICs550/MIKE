import * as THREE from "three";
import { num, wheelRadius } from "../catalog";
import { parametricSheet } from "../lib/sheet";
import type { Finish, Part } from "../types";

const SEL = new THREE.Color("#1a4e86");
const BLACK = new THREE.Color("#000000");
const MIRROR_KINDS = new Set<Part["kind"]>(["door", "fender", "quarter", "skirt", "mirror", "glass"]);

function paint(finish: Finish, opts?: { lamp?: boolean; roughness?: number; metalness?: number; color?: string; opacity?: number }): THREE.MeshPhysicalMaterial {
  const opacity = opts?.opacity ?? finish.opacity;
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts?.color ?? finish.color,
    metalness: opts?.metalness ?? finish.metalness,
    roughness: opts?.roughness ?? finish.roughness,
    clearcoat: finish.clearcoat,
    clearcoatRoughness: 0.18,
    opacity,
    transparent: opacity < 0.98,
    depthWrite: opacity >= 0.85,
    side: THREE.DoubleSide,
    emissive: opts?.lamp ? (opts.color ?? finish.color) : "#000000",
    emissiveIntensity: opts?.lamp ? 1.6 : 0,
  });
  mat.userData.lamp = Boolean(opts?.lamp);
  return mat;
}

function shade(hex: string, delta: number): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + delta)));
  return `#${color.getHexString()}`;
}

function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  pos?: [number, number, number],
  rot?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(Math.max(0.5, w), Math.max(0.5, h), Math.max(0.5, d));
}

function cylX(radius: number, length: number, segs = 28) {
  const geo = new THREE.CylinderGeometry(Math.max(0.5, radius), Math.max(0.5, radius), Math.max(0.5, length), segs);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function cylY(radius: number, length: number, segs = 24) {
  return new THREE.CylinderGeometry(Math.max(0.5, radius), Math.max(0.5, radius), Math.max(0.5, length), segs);
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private turns: number,
    private radius: number,
    private length: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, t * this.length, Math.sin(a) * this.radius);
  }
}

function crownedPanel(length: number, width: number, rake: number, crown: number, thickness: number) {
  return parametricSheet(22, 14, (u, v) => {
    const x = (u - 0.5) * width;
    const z = (v - 0.5) * length;
    const edge = Math.abs(u - 0.5) * 2;
    const y = (0.5 - v) * rake + crown * (1 - edge * edge) * Math.sin(Math.PI * v);
    return new THREE.Vector3(x, y, z);
  }, thickness);
}

function archPanel(length: number, top: number, arch: number, archZ: number, flare: number, sill: number, thickness: number) {
  return parametricSheet(30, 16, (u, v) => {
    const z = (u - 0.5) * length;
    const zr = z - archZ;
    const open = arch > 8 && Math.abs(zr) < arch;
    const circle = open ? Math.sqrt(Math.max(0, arch * arch - zr * zr)) : sill;
    const bottom = open ? Math.max(sill, circle) : sill;
    const span = Math.max(20, top - bottom);
    const y = bottom + v * span;
    const influence = arch > 8 ? Math.exp(-(zr * zr) / (arch * arch * 0.5)) * (1 - v * 0.25) : 0;
    const x = flare * influence;
    return new THREE.Vector3(x, y, z);
  }, thickness);
}

function buildChassis(part: Part, group: THREE.Group) {
  const L = num(part, "length");
  const W = num(part, "width");
  const rw = num(part, "railWidth");
  const rh = num(part, "railHeight");
  const c = num(part, "clearance");
  const crosses = Math.round(num(part, "crossCount"));
  const tw = num(part, "tunnelWidth");
  const th = num(part, "tunnelHeight");
  const fw = num(part, "firewall");
  const steel = paint(part.finish);
  const dark = paint(part.finish, { color: shade(part.finish.color, -0.12), roughness: 0.5 });
  const y = c + rh / 2;
  add(group, box(rw, rh, L), steel, [-(W / 2 - rw / 2), y, 0]);
  add(group, box(rw, rh, L), steel, [W / 2 - rw / 2, y, 0]);
  for (let i = 0; i < crosses; i++) {
    const z = -L / 2 + ((i + 0.5) * L) / crosses;
    add(group, box(W - rw * 2, rh * 0.72, rw), dark, [0, y, z]);
  }
  const floorZ0 = Math.max(-L / 2, Math.min(L / 2 - 200, fw));
  const floorLen = L / 2 - floorZ0;
  add(group, box(W - 20, 8, floorLen), dark, [0, c + rh + 4, floorZ0 + floorLen / 2]);
  const tunnelLen = Math.max(200, floorLen * 0.72);
  add(group, box(tw, th, tunnelLen), steel, [0, c + rh + th / 2, floorZ0 + tunnelLen / 2 + 40]);
  const fwZ = Math.max(-L / 2 + 40, Math.min(L / 2 - 40, fw));
  add(group, box(W, 520, 16), steel, [0, c + rh + 260, fwZ]);
  add(group, box(W * 0.7, rh * 0.8, rw), dark, [0, y, L / 2 - rw]);
  add(group, box(W * 0.86, rh, rw), dark, [0, y, -L / 2 + rw]);
}

function buildWheel(part: Part, group: THREE.Group) {
  const rimIn = num(part, "rim");
  const width = num(part, "width");
  const offset = num(part, "offset");
  const spokes = Math.max(3, Math.round(num(part, "spokes")));
  const lip = num(part, "lip");
  const radius = wheelRadius(part.params);
  const rimR = (rimIn * 25.4) / 2;
  const face = -offset;
  const rubber = paint(part.finish, { color: "#141414", metalness: 0.05, roughness: 0.9, opacity: 1 });
  const rimMat = paint(part.finish);
  const inner = paint(part.finish, { color: shade(part.finish.color, -0.18), roughness: 0.45 });

  const profile: THREE.Vector2[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -width / 2 + width * t;
    const edge = Math.abs(t - 0.5) * 2;
    const shoulder = Math.max(0, (edge - 0.42) / 0.58);
    let r = rimR + (radius - rimR) * (1 - Math.pow(shoulder, 1.15));
    if (edge > 0.9) r = rimR + 8 + (1 - (edge - 0.9) / 0.1) * (r - rimR - 8) * 0.3 + (r - rimR) * 0.15;
    profile.push(new THREE.Vector2(Math.max(rimR + 6, r), y));
  }
  const tire = new THREE.LatheGeometry(profile, 40);
  tire.rotateZ(-Math.PI / 2);
  tire.translate(face, 0, 0);
  add(group, tire, rubber);

  add(group, cylX(rimR - 6, width * 0.78, 40), inner, [face, 0, 0]);
  add(group, cylX(rimR + lip * 0.15, lip, 40), rimMat, [face + width * 0.34, 0, 0]);
  add(group, cylX(rimR * 0.22, 24, 24), rimMat, [face + width * 0.12, 0, 0]);

  const spokeLen = rimR * 0.62;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const geo = box(i % 2 === 0 ? 18 : 11, spokeLen, 14);
    geo.translate(0, rimR * 0.22 + spokeLen / 2, 0);
    add(group, geo, rimMat, [face + (i % 2) * 6, 0, 0], [a, 0, 0]);
  }
  add(group, cylX(36, 18, 20), rimMat, [face + width * 0.16, 0, 0]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(group, cylX(7, 16, 10), inner, [face + width * 0.2, Math.sin(a) * 48, Math.cos(a) * 48]);
  }
}

function buildBrake(part: Part, group: THREE.Group) {
  const dia = num(part, "diameter");
  const thick = num(part, "thickness");
  const scale = num(part, "caliper") / 100;
  const iron = paint(part.finish, { color: "#6e7278", metalness: 0.7, roughness: 0.42, opacity: 1 });
  const hat = paint(part.finish, { color: "#8a8f96", metalness: 0.85, roughness: 0.3, opacity: 1 });
  const cal = paint(part.finish);
  add(group, cylX(dia / 2, thick, 48), iron, [-36, 0, 0]);
  add(group, cylX(dia * 0.28, 22, 28), hat, [-16, 0, 0]);
  add(group, cylX(dia * 0.16, 18, 20), hat, [-4, 0, 0]);
  const cw = 78 * scale;
  const ch = 54 * scale;
  const cd = 110 * scale;
  add(group, box(cw, ch, cd), cal, [-40, dia * 0.28, 10]);
  add(group, cylX(11 * scale, cw * 0.7, 12), paint(part.finish, { color: shade(part.finish.color, 0.08) }), [-40 + cw * 0.2, dia * 0.28, 28]);
  add(group, cylX(11 * scale, cw * 0.7, 12), paint(part.finish, { color: shade(part.finish.color, 0.08) }), [-40 + cw * 0.2, dia * 0.28, -8]);
}

function buildSuspension(part: Part, group: THREE.Group) {
  const arm = num(part, "arm");
  const springLen = num(part, "spring");
  const coils = Math.max(3, Math.round(num(part, "coils")));
  const uprightH = num(part, "upright");
  const steel = paint(part.finish, { color: "#9aa1a8", metalness: 0.9, roughness: 0.34, opacity: 1 });
  const dark = paint(part.finish, { color: "#5c636b", metalness: 0.8, roughness: 0.4, opacity: 1 });
  const coil = paint(part.finish);
  add(group, box(22, uprightH, 36), dark, [-10, 10, 0]);
  const lower = new THREE.Group();
  add(lower, box(arm, 14, 16), steel, [-arm / 2, -70, 70]);
  add(lower, box(arm, 14, 16), steel, [-arm / 2, -70, -70]);
  add(lower, box(16, 14, 150), steel, [-arm + 8, -70, 0]);
  group.add(lower);
  add(group, box(arm * 0.72, 12, 14), steel, [-arm * 0.36, uprightH * 0.38, 48]);
  add(group, box(arm * 0.72, 12, 14), steel, [-arm * 0.36, uprightH * 0.38, -48]);
  const helix = new Helix(coils, 32, springLen);
  const tube = new THREE.TubeGeometry(helix, coils * 18, 5.5, 8, false);
  add(group, tube, coil, [-arm * 0.42, -80, 0]);
  add(group, cylY(16, springLen * 0.62), dark, [-arm * 0.42, -40 + springLen * 0.15, 0]);
  add(group, cylY(8, springLen * 0.55), steel, [-arm * 0.42, 10 + springLen * 0.2, 0]);
}

function buildEngine(part: Part, group: THREE.Group) {
  const layout = Math.round(num(part, "layout"));
  const s = num(part, "scale") / 100;
  const block = paint(part.finish);
  const dark = paint(part.finish, { color: shade(part.finish.color, -0.16), roughness: 0.55 });
  const cover = paint(part.finish, { color: "#1c1e22", metalness: 0.4, roughness: 0.45, opacity: 1 });
  const pulley = paint(part.finish, { color: "#c8ccd2", metalness: 0.85, roughness: 0.3, opacity: 1 });
  if (layout === 0) {
    add(group, box(220 * s, 280 * s, 560 * s), block);
    add(group, box(180 * s, 70 * s, 500 * s), cover, [0, 170 * s, 0]);
    add(group, box(70 * s, 80 * s, 420 * s), dark, [130 * s, 40 * s, -20 * s]);
  } else if (layout === 3) {
    add(group, box(520 * s, 160 * s, 620 * s), block);
    add(group, box(200 * s, 60 * s, 480 * s), cover, [180 * s, 90 * s, 0]);
    add(group, box(200 * s, 60 * s, 480 * s), cover, [-180 * s, 90 * s, 0]);
  } else {
    const len = (layout === 2 ? 640 : 540) * s;
    const bank = layout === 2 ? 250 : 220;
    add(group, box(260 * s, 220 * s, len), block);
    const left = new THREE.Group();
    left.rotation.z = 0.7;
    add(left, box(150 * s, 70 * s, len * 0.86), cover);
    left.position.set(-bank * s * 0.35, 150 * s, 0);
    group.add(left);
    const right = new THREE.Group();
    right.rotation.z = -0.7;
    add(right, box(150 * s, 70 * s, len * 0.86), cover);
    right.position.set(bank * s * 0.35, 150 * s, 0);
    group.add(right);
    add(group, box(120 * s, 80 * s, len * 0.55), dark, [0, 210 * s, 0]);
  }
  const frontZ = (layout === 2 ? 340 : layout === 3 ? 330 : 300) * s;
  add(group, cylX(70 * s, 28 * s, 24), pulley, [0, -20 * s, frontZ]);
  add(group, cylX(28 * s, 22 * s, 16), pulley, [90 * s, 40 * s, frontZ]);
  add(group, box(360 * s, 160 * s, 40 * s), dark, [0, 40 * s, frontZ + 50 * s]);
  add(group, box(140 * s, 140 * s, 180 * s), dark, [0, -10 * s, -((layout === 0 ? 300 : 340) * s)]);
}

function buildExhaust(part: Part, group: THREE.Group) {
  const length = num(part, "length");
  const dia = num(part, "diameter");
  const muffler = num(part, "muffler");
  const tips = Math.round(num(part, "tips"));
  const metal = paint(part.finish);
  const tipMat = paint(part.finish, { color: "#d7d3cc", metalness: 0.9, roughness: 0.25, opacity: 1 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 40, length / 2),
    new THREE.Vector3(40, -10, length / 2 - 280),
    new THREE.Vector3(160, -30, length * 0.15),
    new THREE.Vector3(180, -24, -length * 0.22),
    new THREE.Vector3(120, -10, -length / 2 + muffler),
  ]);
  add(group, new THREE.TubeGeometry(curve, 60, dia / 2, 10, false), metal);
  add(group, box(160, dia * 1.7, muffler), metal, [90, -8, -length / 2 + muffler * 0.55]);
  const tipZ = -length / 2 + 20;
  const tipGeo = new THREE.CylinderGeometry(dia * 0.42, dia * 0.55, 150, 16);
  tipGeo.rotateX(Math.PI / 2);
  if (tips === 1) {
    add(group, tipGeo, tipMat, [90, -8, tipZ]);
  } else {
    add(group, tipGeo, tipMat, [40, -8, tipZ]);
    add(group, tipGeo.clone(), tipMat, [150, -8, tipZ]);
  }
}

function buildSeat(part: Part, group: THREE.Group) {
  const w = num(part, "width");
  const d = num(part, "depth");
  const back = num(part, "back");
  const b = num(part, "bolster");
  const cloth = paint(part.finish, { roughness: Math.max(0.55, part.finish.roughness) });
  const insert = paint(part.finish, { color: shade(part.finish.color, 0.06), roughness: 0.6 });
  add(group, box(w, 90, d), cloth, [0, 45, 0]);
  add(group, box(w * 0.55, 70, d * 0.72), insert, [0, 80, 10]);
  add(group, box(b, 130, d * 0.8), cloth, [-w / 2 + b / 2, 100, 0]);
  add(group, box(b, 130, d * 0.8), cloth, [w / 2 - b / 2, 100, 0]);
  const backrest = new THREE.Group();
  add(backrest, box(w, back, 80), cloth, [0, back / 2, 0]);
  add(backrest, box(w * 0.5, back * 0.62, 30), insert, [0, back * 0.48, 40]);
  add(backrest, box(b, back * 0.7, 90), cloth, [-w / 2 + b / 2, back * 0.4, 10]);
  add(backrest, box(b, back * 0.7, 90), cloth, [w / 2 - b / 2, back * 0.4, 10]);
  add(backrest, box(w * 0.46, 110, 70), cloth, [0, back + 20, -10]);
  backrest.position.set(0, 80, -d / 2 + 30);
  backrest.rotation.x = -0.28;
  group.add(backrest);
}

function buildSteering(part: Part, group: THREE.Group) {
  const dia = num(part, "diameter");
  const dish = num(part, "dish");
  const spokes = Math.max(2, Math.round(num(part, "spokes")));
  const rim = paint(part.finish, { roughness: 0.55 });
  const hub = paint(part.finish, { color: "#2a2a2a", metalness: 0.6, roughness: 0.4, opacity: 1 });
  const torus = new THREE.TorusGeometry(dia / 2, 16, 12, 36);
  torus.rotateY(Math.PI / 2);
  torus.translate(-dish, 0, 0);
  add(group, torus, rim);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const len = dia / 2 - 20;
    add(group, box(12, 18, len), rim, [-dish * 0.6, Math.sin(a) * len * 0.45, Math.cos(a) * len * 0.45], [a, 0, 0]);
  }
  add(group, cylX(42, 36, 20), hub, [-10, 0, 0]);
  add(group, cylX(16, 280, 12), hub, [120, -40, 0], [0, 0, 0.5]);
}

function buildHood(part: Part, group: THREE.Group) {
  const geo = crownedPanel(num(part, "length"), num(part, "width"), num(part, "rake"), num(part, "crown"), num(part, "thickness"));
  add(group, geo, paint(part.finish));
}

function buildDoor(part: Part, group: THREE.Group) {
  const length = num(part, "length");
  const height = num(part, "height");
  const windowH = Math.min(num(part, "window"), height - 180);
  const bulge = num(part, "bulge");
  const thick = num(part, "thickness");
  const skinH = height - windowH;
  const mat = paint(part.finish);
  const trim = paint(part.finish, { color: "#121212", metalness: 0.3, roughness: 0.5, opacity: 1 });
  const glass = paint(
    { ...part.finish, color: "#b7d4de", metalness: 0.05, roughness: 0.04, clearcoat: 1, opacity: 0.35 },
    { opacity: 0.35 },
  );
  const skin = parametricSheet(16, 10, (u, v) => {
    const z = (u - 0.5) * length;
    const y = -height / 2 + v * skinH;
    const edge = Math.sin(Math.PI * v);
    const x = bulge * edge * Math.sin(Math.PI * u);
    return new THREE.Vector3(x, y, z);
  }, thick);
  add(group, skin, mat);
  const yWin = -height / 2 + skinH;
  add(group, box(8, 36, length), trim, [bulge * 0.3, yWin, 0]);
  add(group, box(10, windowH, 28), trim, [4, yWin + windowH / 2, length / 2 - 16]);
  add(group, box(10, windowH, 28), trim, [4, yWin + windowH / 2, -length / 2 + 16]);
  add(group, box(10, 24, length - 30), trim, [2, yWin + windowH - 12, 0]);
  add(group, box(4, windowH - 36, length - 70), glass, [-6, yWin + windowH / 2 - 6, 0]);
  add(group, box(16, 22, 90), trim, [bulge + 6, -height * 0.05, length * 0.12]);
  add(group, cylY(10, 28, 12), trim, [8, 20, length / 2 - 10]);
  add(group, cylY(10, 28, 12), trim, [8, -30, length / 2 - 10]);
}

function buildFenderLike(part: Part, group: THREE.Group) {
  const geo = archPanel(
    num(part, "length"),
    num(part, "top"),
    num(part, "arch"),
    num(part, "archZ"),
    num(part, "flare"),
    num(part, "sill"),
    num(part, "thickness"),
  );
  add(group, geo, paint(part.finish));
}

function buildRoof(part: Part, group: THREE.Group) {
  const length = num(part, "length");
  const width = num(part, "width");
  const crown = num(part, "crown");
  const geo = parametricSheet(18, 12, (u, v) => {
    const x = (u - 0.5) * width;
    const z = (v - 0.5) * length;
    const edge = Math.abs(u - 0.5) * 2;
    const y = crown * (1 - edge * edge) + crown * 0.25 * Math.sin(Math.PI * v);
    return new THREE.Vector3(x, y, z);
  }, num(part, "thickness"));
  add(group, geo, paint(part.finish));
}

function buildBumper(part: Part, group: THREE.Group) {
  const width = num(part, "width");
  const height = num(part, "height");
  const depth = num(part, "depth");
  const crown = num(part, "crown");
  const geo = parametricSheet(20, 8, (u, v) => {
    const x = (u - 0.5) * width;
    const y = (v - 0.5) * height;
    const end = Math.pow(Math.abs(u - 0.5) * 2, 1.6);
    const vert = Math.pow(Math.abs(v - 0.5) * 2, 1.8);
    const z = crown * 0.15 - crown * end - depth * 0.15 * vert;
    return new THREE.Vector3(x, y, z);
  }, Math.max(depth * 0.35, num(part, "thickness")));
  add(group, geo, paint(part.finish));
  add(group, box(width * 0.55, 16, 10), paint(part.finish, { color: "#111111", roughness: 0.7, metalness: 0.2, opacity: 1 }), [0, -height * 0.28, 8]);
}

function buildSkirt(part: Part, group: THREE.Group) {
  const length = num(part, "length");
  const height = num(part, "height");
  const bulge = num(part, "bulge");
  const geo = parametricSheet(16, 4, (u, v) => {
    const z = (u - 0.5) * length;
    const y = (v - 0.5) * height;
    const x = bulge * Math.sin(Math.PI * u) * (0.4 + v);
    return new THREE.Vector3(x, y, z);
  }, num(part, "thickness"));
  add(group, geo, paint(part.finish));
}

function buildSpoiler(part: Part, group: THREE.Group) {
  const span = num(part, "span");
  const chord = num(part, "chord");
  const rise = num(part, "rise");
  const attack = (num(part, "attack") * Math.PI) / 180;
  const endplate = num(part, "endplate");
  const thick = num(part, "thickness");
  const mat = paint(part.finish);
  const wing = parametricSheet(18, 8, (u, v) => {
    const x = (u - 0.5) * span;
    const z = (v - 0.5) * chord;
    const camber = Math.sin(v * Math.PI) * thick * 0.35;
    const y = camber + z * Math.sin(attack);
    return new THREE.Vector3(x, y, z * Math.cos(attack));
  }, thick);
  const wingMesh = add(group, wing, mat, [0, rise, 0]);
  wingMesh.position.y = rise;
  if (endplate > 4) {
    add(group, box(8, endplate, chord * 0.9), mat, [-span / 2, rise - endplate * 0.2, 0]);
    add(group, box(8, endplate, chord * 0.9), mat, [span / 2, rise - endplate * 0.2, 0]);
  }
  add(group, box(28, rise, 18), mat, [-span * 0.28, rise / 2, 10]);
  add(group, box(28, rise, 18), mat, [span * 0.28, rise / 2, 10]);
}

function buildDiffuser(part: Part, group: THREE.Group) {
  const width = num(part, "width");
  const length = num(part, "length");
  const height = num(part, "height");
  const strakes = Math.round(num(part, "strakes"));
  const angle = (num(part, "angle") * Math.PI) / 180;
  const mat = paint(part.finish);
  const geo = parametricSheet(12, 8, (u, v) => {
    const x = (u - 0.5) * width;
    const z = (v - 0.5) * length;
    const y = (0.5 - v) * length * Math.tan(angle) + Math.sin(u * Math.PI) * 6;
    return new THREE.Vector3(x, y, z);
  }, 8);
  add(group, geo, mat);
  for (let i = 0; i < strakes; i++) {
    const x = -width / 2 + ((i + 0.5) * width) / strakes;
    add(group, box(6, height, length * 0.92), mat, [x, height / 2, 0]);
  }
}

function buildGlass(part: Part, group: THREE.Group) {
  const style = Math.round(num(part, "style"));
  const width = num(part, "width");
  const length = num(part, "length");
  const angle = (num(part, "angle") * Math.PI) / 180;
  const bulge = num(part, "bulge");
  const mat = paint(part.finish, { opacity: part.finish.opacity });
  const geo = parametricSheet(16, 10, (u, v) => {
    if (style === 1) {
      const z = (u - 0.5) * width;
      const y = (v - 0.5) * length;
      const x = bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return new THREE.Vector3(x, y, z);
    }
    const x = (u - 0.5) * width;
    const along = (v - 0.5) * length;
    const bow = bulge * (1 - Math.pow(Math.abs(u - 0.5) * 2, 2));
    const y = along * Math.sin(angle) + bow;
    const z = -along * Math.cos(angle);
    return new THREE.Vector3(x, y, z);
  }, num(part, "thickness"));
  add(group, geo, mat);
}

function buildLamp(part: Part, group: THREE.Group, red: boolean) {
  const w = num(part, "width");
  const h = num(part, "height");
  const d = num(part, "depth");
  const housing = paint(part.finish, { color: "#121212", metalness: 0.4, roughness: 0.5, opacity: 1 });
  const lens = paint(part.finish, { lamp: true, opacity: Math.min(0.95, part.finish.opacity) });
  add(group, box(w, h, d), housing);
  add(group, box(w * 0.86, h * 0.72, 8), lens, [0, 0, d / 2]);
  if (!red) {
    add(group, box(w * 0.55, 8, 6), paint(part.finish, { color: "#dce7ff", lamp: true, opacity: 1 }), [0, -h * 0.16, d / 2 + 2]);
  }
}

function buildGrille(part: Part, group: THREE.Group) {
  const w = num(part, "width");
  const h = num(part, "height");
  const slats = Math.max(2, Math.round(num(part, "slats")));
  const d = num(part, "depth");
  const mat = paint(part.finish);
  const dark = paint(part.finish, { color: "#0c0c0c", roughness: 0.7, metalness: 0.2, opacity: 1 });
  add(group, box(w, h, 8), dark, [0, 0, -d / 2]);
  add(group, box(w, 12, d), mat, [0, h / 2 - 6, 0]);
  add(group, box(w, 12, d), mat, [0, -h / 2 + 6, 0]);
  add(group, box(12, h, d), mat, [-w / 2 + 6, 0, 0]);
  add(group, box(12, h, d), mat, [w / 2 - 6, 0, 0]);
  for (let i = 0; i < slats; i++) {
    const y = -h / 2 + ((i + 0.5) * h) / slats;
    add(group, box(w - 24, 6, d * 0.6), mat, [0, y, 2]);
  }
}

function buildMirror(part: Part, group: THREE.Group) {
  const w = num(part, "width");
  const h = num(part, "height");
  const d = num(part, "depth");
  const body = paint(part.finish);
  const glass = paint(
    { ...part.finish, color: "#9bb7c4", metalness: 0.2, roughness: 0.05, clearcoat: 1, opacity: 0.7 },
    { opacity: 0.7 },
  );
  add(group, box(w, h, d), body, [w * 0.15, 0, 0]);
  add(group, box(w * 0.82, h * 0.7, 4), glass, [w * 0.15, 0, -d / 2]);
  add(group, box(14, 16, 80), body, [-10, -h * 0.2, -20]);
}

function buildBed(part: Part, group: THREE.Group) {
  const length = num(part, "length");
  const width = num(part, "width");
  const side = num(part, "side");
  const arch = num(part, "arch");
  const archZ = num(part, "archZ");
  const mat = paint(part.finish);
  const liner = paint(part.finish, { color: shade(part.finish.color, -0.08), roughness: 0.7 });
  add(group, box(width - 16, 18, length), liner, [0, 9, 0]);
  add(group, box(28, side, length), mat, [-width / 2 + 14, side / 2, 0]);
  add(group, box(28, side, length), mat, [width / 2 - 14, side / 2, 0]);
  add(group, box(width, side, 28), mat, [0, side / 2, length / 2 - 14]);
  add(group, box(width - 40, side * 0.72, 20), mat, [0, side * 0.36, -length / 2 + 10]);
  if (arch > 20) {
    const house = cylX(arch, width * 0.55, 28);
    add(group, house, liner, [0, 0, archZ]);
  }
}

const BUILDERS: Record<Part["kind"], (part: Part, group: THREE.Group) => void> = {
  chassis: buildChassis,
  wheel: buildWheel,
  brake: buildBrake,
  suspension: buildSuspension,
  engine: buildEngine,
  exhaust: buildExhaust,
  seat: buildSeat,
  steering: buildSteering,
  hood: buildHood,
  door: buildDoor,
  fender: buildFenderLike,
  roof: buildRoof,
  bumper: buildBumper,
  decklid: buildHood,
  quarter: buildFenderLike,
  skirt: buildSkirt,
  spoiler: buildSpoiler,
  diffuser: buildDiffuser,
  glass: buildGlass,
  headlight: (part, group) => buildLamp(part, group, false),
  taillight: (part, group) => buildLamp(part, group, true),
  grille: buildGrille,
  mirror: buildMirror,
  bed: buildBed,
};

export function buildPart(part: Part): THREE.Group {
  const group = new THREE.Group();
  group.name = part.name;
  BUILDERS[part.kind](part, group);
  if (MIRROR_KINDS.has(part.kind) && num(part, "mirror") >= 0.5) group.scale.x = -1;
  return group;
}

export function markSelected(root: THREE.Object3D, selected: boolean) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((material) => {
      const mat = material as THREE.MeshPhysicalMaterial;
      if (!mat?.emissive || mat.userData.lamp) return;
      mat.emissive.copy(selected ? SEL : BLACK);
      mat.emissiveIntensity = selected ? 0.45 : 0;
    });
  });
}

export function applyClipping(root: THREE.Object3D, planes: THREE.Plane[]) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((material) => {
      material.clippingPlanes = planes;
      material.clipShadows = true;
      material.needsUpdate = true;
    });
  });
}
