import { num, wheelRadius } from "./catalog";
import type { Part, PartKind, Xform } from "./types";

const STEEL = 7850 / 1e9;

export interface Box {
  min: [number, number, number];
  max: [number, number, number];
}

function box(min: [number, number, number], max: [number, number, number]): Box {
  return { min, max };
}

/** Local-space extent of a part, used for framing and dimension notes. */
export function partLocalBox(part: Part): Box {
  const n = (key: string) => num(part, key);
  switch (part.kind) {
    case "chassis": {
      const top = n("clearance") + n("railHeight") + 560;
      return box([-n("width") / 2, 0, -n("length") / 2], [n("width") / 2, top, n("length") / 2]);
    }
    case "wheel": {
      const r = wheelRadius(part.params);
      const w = n("width") / 2 + Math.abs(n("offset")) + 16;
      return box([-w, -r, -r], [w, r, r]);
    }
    case "brake": {
      const r = n("diameter") / 2 + 20;
      return box([-90, -r, -r], [40, r, r]);
    }
    case "suspension":
      return box([-n("arm") - 20, -140, -120], [40, n("spring") + 40, 120]);
    case "engine": {
      const s = n("scale") / 100;
      return box([-320 * s, -180 * s, -420 * s], [320 * s, 320 * s, 460 * s]);
    }
    case "exhaust":
      return box([-40, -80, -n("length") / 2], [240, 80, n("length") / 2]);
    case "seat":
      return box([-n("width") / 2, 0, -n("depth") / 2], [n("width") / 2, n("back") + 80, n("depth") / 2]);
    case "steering":
      return box([-40, -n("diameter") / 2, -n("diameter") / 2], [180, n("diameter") / 2, n("diameter") / 2]);
    case "hood":
    case "decklid":
      return box(
        [-n("width") / 2, -Math.abs(n("rake")) / 2 - 10, -n("length") / 2],
        [n("width") / 2, Math.abs(n("rake")) / 2 + n("crown") + 10, n("length") / 2],
      );
    case "door":
      return box([-20, -n("height") / 2, -n("length") / 2], [n("bulge") + 24, n("height") / 2, n("length") / 2]);
    case "fender":
    case "quarter":
      return box([-n("flare") - 10, Math.min(0, n("sill")) - 10, -n("length") / 2], [n("flare") + 16, n("top") + 10, n("length") / 2]);
    case "roof":
      return box([-n("width") / 2, -8, -n("length") / 2], [n("width") / 2, n("crown") + 8, n("length") / 2]);
    case "bumper":
      return box([-n("width") / 2, -n("height") / 2, -n("depth")], [n("width") / 2, n("height") / 2, n("crown") + 20]);
    case "skirt":
      return box([-8, -n("height") / 2, -n("length") / 2], [n("bulge") + 12, n("height") / 2, n("length") / 2]);
    case "spoiler":
      return box([-n("span") / 2, -10, -n("chord")], [n("span") / 2, n("rise") + n("endplate") + n("thickness"), n("chord")]);
    case "diffuser":
      return box([-n("width") / 2, -10, -n("length") / 2], [n("width") / 2, n("height") + 20, n("length") / 2]);
    case "glass":
      return box([-n("width") / 2, -n("length") / 2, -n("length") / 2], [n("width") / 2, n("length") / 2, n("length") / 2]);
    case "headlight":
    case "taillight":
      return box([-n("width") / 2, -n("height") / 2, -n("depth") / 2], [n("width") / 2, n("height") / 2, n("depth") / 2]);
    case "grille":
      return box([-n("width") / 2, -n("height") / 2, -n("depth")], [n("width") / 2, n("height") / 2, n("depth")]);
    case "mirror":
      return box([-40, -n("height"), -n("depth")], [n("width") + 20, n("height"), n("depth")]);
    case "bed":
      return box([-n("width") / 2, -n("arch"), -n("length") / 2], [n("width") / 2, n("side"), n("length") / 2]);
    default: {
      const _never: never = part.kind;
      return _never;
    }
  }
}

function yawPoint(x: number, y: number, z: number, xf: Xform): [number, number, number] {
  const a = (xf.ry * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s + xf.x, y + xf.y, -x * s + z * c + xf.z];
}

export function projectBounds(parts: Part[]) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) {
    if (!part.visible) continue;
    const local = partLocalBox(part);
    const xs = [local.min[0], local.max[0]];
    const ys = [local.min[1], local.max[1]];
    const zs = [local.min[2], local.max[2]];
    for (const x of xs) {
      for (const y of ys) {
        for (const z of zs) {
          const p = yawPoint(x, y, z, part.xform);
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], p[i]);
            max[i] = Math.max(max[i], p[i]);
          }
        }
      }
    }
  }
  if (!Number.isFinite(min[0])) {
    return { min: [-1000, 0, -1000] as [number, number, number], max: [1000, 1000, 1000] as [number, number, number], center: [0, 500, 0] as [number, number, number], size: [2000, 1000, 2000] as [number, number, number] };
  }
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const center: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return { min, max, center, size };
}

function sheetKg(areaMm2: number, thickMm: number, factor = 0.2): number {
  return Math.max(0, areaMm2) * Math.max(0, thickMm) * factor * STEEL;
}

const HARDWARE: Partial<Record<PartKind, number>> = {
  door: 14,
  hood: 6,
  decklid: 5,
  bumper: 4,
  fender: 2,
  quarter: 3,
  seat: 6,
  steering: 2,
  headlight: 1.4,
  taillight: 0.8,
  mirror: 0.8,
  grille: 1.2,
};

export function partMass(part: Part): number {
  const n = (key: string) => num(part, key);
  let mass = 0;
  switch (part.kind) {
    case "chassis": {
      const rail = 2 * (n("length") / 1000) * 11;
      const cross = n("crossCount") * 4.2;
      const floor = (n("length") / 1000) * (n("width") / 1000) * 14;
      mass = rail + cross + floor + 18;
      break;
    }
    case "wheel": {
      const radius = wheelRadius(part.params);
      const tire = (n("width") / 205) * (radius / 320) * 11.2;
      const rim = (n("rim") / 18) * (8.4 + n("spokes") * 0.15);
      mass = tire + rim;
      break;
    }
    case "brake":
      mass = 6.5 + (n("diameter") / 350) * 3.5 + (n("caliper") / 100) * 1.8;
      break;
    case "suspension":
      mass = 8 + (n("arm") / 350) * 3.5 + (n("coils") / 7) * 1.6;
      break;
    case "engine": {
      const base = [145, 175, 215, 170][Math.round(n("layout"))] ?? 180;
      mass = base * (n("scale") / 100) ** 3;
      break;
    }
    case "exhaust":
      mass = (n("length") / 1000) * (n("diameter") / 60) * 4.2 + (n("muffler") / 500) * 8 + n("tips") * 0.6;
      break;
    case "seat":
      mass = 11 + (n("width") / 480) * (n("back") / 760) * 6;
      break;
    case "steering":
      mass = 3.2 + n("diameter") / 350;
      break;
    case "hood":
    case "decklid":
      mass = sheetKg(n("length") * n("width"), n("thickness"), 0.16);
      break;
    case "door":
      mass = sheetKg(n("length") * n("height"), n("thickness"), 0.22);
      break;
    case "fender":
    case "quarter":
      mass = sheetKg(n("length") * Math.max(200, n("top") - n("sill")), n("thickness"), 0.18);
      break;
    case "roof":
      mass = sheetKg(n("length") * n("width"), n("thickness"), 0.16);
      break;
    case "bumper":
      mass = sheetKg(n("width") * n("height"), n("thickness"), 0.28);
      break;
    case "skirt":
      mass = sheetKg(n("length") * n("height"), n("thickness"), 0.3);
      break;
    case "spoiler":
      mass = sheetKg(n("span") * n("chord"), n("thickness"), 0.35) + n("endplate") * 0.01;
      break;
    case "diffuser":
      mass = sheetKg(n("width") * n("length"), 6, 0.3) + n("strakes") * 0.4;
      break;
    case "glass":
      mass = n("width") * n("length") * n("thickness") * (2500 / 1e9);
      break;
    case "bed":
      mass = 40 + (n("length") / 1800) * (n("width") / 1600) * (n("side") / 400) * 35;
      break;
    default:
      mass = 2;
  }
  return mass + (HARDWARE[part.kind] ?? 0);
}

export function projectMass(parts: Part[]): number {
  return parts.reduce((sum, part) => sum + partMass(part), 0);
}

export function formatKg(mass: number): string {
  const rounded = mass >= 100 ? mass.toFixed(0) : mass.toFixed(1);
  return `~${rounded} kg`;
}

export function formatMm(value: number): string {
  return `${Math.round(value)} mm`;
}
