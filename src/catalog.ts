import type { Finish, ParamSpec, Part, PartKind, Xform } from "./types";
import { PART_KINDS } from "./types";

export function isPartKind(value: string): value is PartKind {
  return (PART_KINDS as readonly string[]).includes(value);
}

export const KIND_LABEL: Record<PartKind, string> = {
  chassis: "Spaceframe",
  wheel: "Wheel",
  brake: "Disc brake",
  suspension: "Suspension",
  engine: "Engine",
  exhaust: "Exhaust",
  seat: "Bucket seat",
  steering: "Steering wheel",
  hood: "Hood",
  door: "Door",
  fender: "Fender",
  roof: "Roof",
  bumper: "Bumper",
  decklid: "Decklid",
  quarter: "Quarter panel",
  skirt: "Side skirt",
  spoiler: "Spoiler",
  diffuser: "Diffuser",
  glass: "Glass",
  headlight: "Headlight",
  taillight: "Taillight",
  grille: "Grille",
  mirror: "Mirror",
  bed: "Pickup bed",
};

export const KIND_BLURB: Record<PartKind, string> = {
  chassis: "Rails, floor, tunnel, and firewall",
  wheel: "Tire, barrel, and spoke face",
  brake: "Rotor, hat, and caliper",
  suspension: "A-arms, upright, and coilover",
  engine: "Inline, vee, or flat layout",
  exhaust: "Pipe, muffler, and tips",
  seat: "Cushion, bolsters, and headrest",
  steering: "Rim, spokes, and column",
  hood: "Crowned front clip panel",
  door: "Skin, window, and handle",
  fender: "Wheel-arch panel with flare",
  roof: "Crowned cabin panel",
  bumper: "Wraparound cover",
  decklid: "Rear deck panel",
  quarter: "Rear haunch and arch",
  skirt: "Rocker extension",
  spoiler: "Wing, attack, and endplates",
  diffuser: "Raked underbody with strakes",
  glass: "Windshield or side glass",
  headlight: "Housing and lens",
  taillight: "Housing and lens",
  grille: "Frame and slats",
  mirror: "Head, glass, and stalk",
  bed: "Floor, bedsides, and tailgate",
};

export const CATEGORIES: { name: string; kinds: PartKind[] }[] = [
  { name: "Structure", kinds: ["chassis", "suspension", "brake"] },
  { name: "Rolling", kinds: ["wheel"] },
  { name: "Body", kinds: ["hood", "fender", "door", "roof", "quarter", "decklid", "bumper", "skirt", "spoiler", "diffuser", "bed"] },
  { name: "Glass and light", kinds: ["glass", "headlight", "taillight", "grille", "mirror"] },
  { name: "Powertrain", kinds: ["engine", "exhaust"] },
  { name: "Interior", kinds: ["seat", "steering"] },
];

const layout = [
  { value: 0, label: "Inline-4" },
  { value: 1, label: "V6" },
  { value: 2, label: "V8" },
  { value: 3, label: "Flat-6" },
];

const glassStyle = [
  { value: 0, label: "Raked" },
  { value: 1, label: "Side" },
];

const tips = [
  { value: 1, label: "Single" },
  { value: 2, label: "Dual" },
];

export const PARAMS: Record<PartKind, ParamSpec[]> = {
  chassis: [
    { key: "length", label: "Length", min: 1800, max: 6500, step: 10, unit: "mm" },
    { key: "width", label: "Width", min: 800, max: 2200, step: 10, unit: "mm" },
    { key: "railWidth", label: "Rail width", min: 30, max: 160, step: 2, unit: "mm" },
    { key: "railHeight", label: "Rail height", min: 40, max: 240, step: 2, unit: "mm" },
    { key: "clearance", label: "Clearance", min: 40, max: 700, step: 5, unit: "mm" },
    { key: "crossCount", label: "Crossmembers", min: 3, max: 10, step: 1, unit: "" },
    { key: "tunnelWidth", label: "Tunnel width", min: 120, max: 700, step: 10, unit: "mm" },
    { key: "tunnelHeight", label: "Tunnel height", min: 40, max: 400, step: 5, unit: "mm" },
    { key: "firewall", label: "Firewall Z", min: -1500, max: 2500, step: 10, unit: "mm" },
  ],
  wheel: [
    { key: "rim", label: "Rim diameter", min: 14, max: 24, step: 1, unit: "in" },
    { key: "width", label: "Tire width", min: 145, max: 355, step: 5, unit: "mm" },
    { key: "aspect", label: "Aspect ratio", min: 25, max: 80, step: 1, unit: "%" },
    { key: "offset", label: "Offset", min: -20, max: 70, step: 1, unit: "mm" },
    { key: "spokes", label: "Spokes", min: 4, max: 16, step: 1, unit: "" },
    { key: "lip", label: "Lip", min: 4, max: 40, step: 1, unit: "mm" },
  ],
  brake: [
    { key: "diameter", label: "Rotor diameter", min: 240, max: 420, step: 2, unit: "mm" },
    { key: "thickness", label: "Rotor thickness", min: 16, max: 40, step: 1, unit: "mm" },
    { key: "caliper", label: "Caliper scale", min: 70, max: 140, step: 1, unit: "%" },
  ],
  suspension: [
    { key: "arm", label: "Arm length", min: 180, max: 620, step: 5, unit: "mm" },
    { key: "spring", label: "Spring length", min: 140, max: 420, step: 5, unit: "mm" },
    { key: "coils", label: "Coils", min: 4, max: 12, step: 1, unit: "" },
    { key: "upright", label: "Upright height", min: 140, max: 360, step: 5, unit: "mm" },
  ],
  engine: [
    { key: "layout", label: "Layout", min: 0, max: 3, step: 1, unit: "", options: layout },
    { key: "scale", label: "Scale", min: 70, max: 140, step: 1, unit: "%" },
  ],
  exhaust: [
    { key: "length", label: "Length", min: 800, max: 5200, step: 20, unit: "mm" },
    { key: "diameter", label: "Pipe diameter", min: 35, max: 90, step: 1, unit: "mm" },
    { key: "muffler", label: "Muffler length", min: 200, max: 900, step: 10, unit: "mm" },
    { key: "tips", label: "Tips", min: 1, max: 2, step: 1, unit: "", options: tips },
  ],
  seat: [
    { key: "width", label: "Width", min: 380, max: 620, step: 5, unit: "mm" },
    { key: "depth", label: "Cushion depth", min: 380, max: 620, step: 5, unit: "mm" },
    { key: "back", label: "Back height", min: 500, max: 980, step: 5, unit: "mm" },
    { key: "bolster", label: "Bolster", min: 20, max: 90, step: 1, unit: "mm" },
  ],
  steering: [
    { key: "diameter", label: "Diameter", min: 280, max: 420, step: 2, unit: "mm" },
    { key: "dish", label: "Dish", min: 0, max: 80, step: 1, unit: "mm" },
    { key: "spokes", label: "Spokes", min: 2, max: 4, step: 1, unit: "" },
  ],
  hood: [
    { key: "length", label: "Length", min: 400, max: 2200, step: 10, unit: "mm" },
    { key: "width", label: "Width", min: 600, max: 2100, step: 10, unit: "mm" },
    { key: "rake", label: "Rake", min: -200, max: 280, step: 2, unit: "mm" },
    { key: "crown", label: "Crown", min: 0, max: 80, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 20, step: 0.5, unit: "mm" },
  ],
  door: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "length", label: "Length", min: 500, max: 1600, step: 10, unit: "mm" },
    { key: "height", label: "Height", min: 500, max: 1300, step: 5, unit: "mm" },
    { key: "window", label: "Window height", min: 120, max: 700, step: 5, unit: "mm" },
    { key: "bulge", label: "Bulge", min: 0, max: 80, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  fender: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "length", label: "Length", min: 500, max: 2200, step: 10, unit: "mm" },
    { key: "top", label: "Top above axle", min: 180, max: 900, step: 5, unit: "mm" },
    { key: "arch", label: "Arch radius", min: 180, max: 620, step: 5, unit: "mm" },
    { key: "archZ", label: "Arch center Z", min: -800, max: 800, step: 5, unit: "mm" },
    { key: "flare", label: "Flare", min: 0, max: 90, step: 1, unit: "mm" },
    { key: "sill", label: "Sill below axle", min: -400, max: 80, step: 5, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  roof: [
    { key: "length", label: "Length", min: 500, max: 2400, step: 10, unit: "mm" },
    { key: "width", label: "Width", min: 700, max: 1900, step: 10, unit: "mm" },
    { key: "crown", label: "Crown", min: 0, max: 90, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  bumper: [
    { key: "width", label: "Width", min: 800, max: 2300, step: 10, unit: "mm" },
    { key: "height", label: "Height", min: 120, max: 700, step: 5, unit: "mm" },
    { key: "depth", label: "Depth", min: 40, max: 280, step: 5, unit: "mm" },
    { key: "crown", label: "Corner wrap", min: 0, max: 160, step: 2, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 3, max: 30, step: 0.5, unit: "mm" },
  ],
  decklid: [
    { key: "length", label: "Length", min: 300, max: 1600, step: 10, unit: "mm" },
    { key: "width", label: "Width", min: 600, max: 2000, step: 10, unit: "mm" },
    { key: "rake", label: "Rake", min: -160, max: 200, step: 2, unit: "mm" },
    { key: "crown", label: "Crown", min: 0, max: 70, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  quarter: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "length", label: "Length", min: 500, max: 2400, step: 10, unit: "mm" },
    { key: "top", label: "Top above axle", min: 200, max: 1100, step: 5, unit: "mm" },
    { key: "arch", label: "Arch radius", min: 0, max: 620, step: 5, unit: "mm" },
    { key: "archZ", label: "Arch center Z", min: -900, max: 900, step: 5, unit: "mm" },
    { key: "flare", label: "Flare", min: 0, max: 80, step: 1, unit: "mm" },
    { key: "sill", label: "Sill below axle", min: -500, max: 40, step: 5, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  skirt: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "length", label: "Length", min: 400, max: 2400, step: 10, unit: "mm" },
    { key: "height", label: "Height", min: 40, max: 280, step: 2, unit: "mm" },
    { key: "bulge", label: "Bulge", min: 0, max: 60, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 2, max: 16, step: 0.5, unit: "mm" },
  ],
  spoiler: [
    { key: "span", label: "Span", min: 600, max: 2000, step: 10, unit: "mm" },
    { key: "chord", label: "Chord", min: 80, max: 320, step: 2, unit: "mm" },
    { key: "rise", label: "Pedestal", min: 0, max: 280, step: 2, unit: "mm" },
    { key: "attack", label: "Attack", min: -8, max: 24, step: 0.5, unit: "°" },
    { key: "endplate", label: "Endplate", min: 0, max: 180, step: 2, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 8, max: 40, step: 1, unit: "mm" },
  ],
  diffuser: [
    { key: "width", label: "Width", min: 500, max: 2000, step: 10, unit: "mm" },
    { key: "length", label: "Length", min: 200, max: 1200, step: 10, unit: "mm" },
    { key: "height", label: "Exit height", min: 20, max: 280, step: 2, unit: "mm" },
    { key: "strakes", label: "Strakes", min: 0, max: 8, step: 1, unit: "" },
    { key: "angle", label: "Angle", min: 0, max: 28, step: 0.5, unit: "°" },
  ],
  glass: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "style", label: "Style", min: 0, max: 1, step: 1, unit: "", options: glassStyle },
    { key: "width", label: "Width", min: 200, max: 1900, step: 10, unit: "mm" },
    { key: "length", label: "Length", min: 200, max: 1400, step: 5, unit: "mm" },
    { key: "angle", label: "Angle from horizontal", min: 18, max: 90, step: 0.5, unit: "°" },
    { key: "bulge", label: "Bulge", min: 0, max: 50, step: 1, unit: "mm" },
    { key: "thickness", label: "Thickness", min: 3, max: 12, step: 0.5, unit: "mm" },
  ],
  headlight: [
    { key: "width", label: "Width", min: 80, max: 520, step: 5, unit: "mm" },
    { key: "height", label: "Height", min: 40, max: 240, step: 2, unit: "mm" },
    { key: "depth", label: "Depth", min: 30, max: 180, step: 2, unit: "mm" },
  ],
  taillight: [
    { key: "width", label: "Width", min: 80, max: 520, step: 5, unit: "mm" },
    { key: "height", label: "Height", min: 40, max: 240, step: 2, unit: "mm" },
    { key: "depth", label: "Depth", min: 20, max: 140, step: 2, unit: "mm" },
  ],
  grille: [
    { key: "width", label: "Width", min: 200, max: 1400, step: 10, unit: "mm" },
    { key: "height", label: "Height", min: 60, max: 500, step: 5, unit: "mm" },
    { key: "slats", label: "Slats", min: 2, max: 12, step: 1, unit: "" },
    { key: "depth", label: "Depth", min: 10, max: 120, step: 2, unit: "mm" },
  ],
  mirror: [
    { key: "mirror", label: "Side", min: 0, max: 1, step: 1, unit: "", options: [{ value: 0, label: "Right" }, { value: 1, label: "Left" }] },
    { key: "width", label: "Width", min: 140, max: 320, step: 2, unit: "mm" },
    { key: "height", label: "Height", min: 70, max: 180, step: 2, unit: "mm" },
    { key: "depth", label: "Depth", min: 70, max: 200, step: 2, unit: "mm" },
  ],
  bed: [
    { key: "length", label: "Length", min: 800, max: 3200, step: 10, unit: "mm" },
    { key: "width", label: "Width", min: 1000, max: 2200, step: 10, unit: "mm" },
    { key: "side", label: "Side height", min: 200, max: 700, step: 5, unit: "mm" },
    { key: "arch", label: "Wheelhouse radius", min: 0, max: 500, step: 5, unit: "mm" },
    { key: "archZ", label: "Wheelhouse Z", min: -1200, max: 1200, step: 10, unit: "mm" },
  ],
};

export const DEFAULTS: Record<PartKind, Record<string, number>> = Object.fromEntries(
  PART_KINDS.map((kind) => [
    kind,
    Object.fromEntries(PARAMS[kind].map((spec) => [spec.key, defaultFor(spec)])),
  ]),
) as Record<PartKind, Record<string, number>>;

function defaultFor(spec: ParamSpec): number {
  if (spec.options) return spec.options[0].value;
  const mid = (spec.min + spec.max) / 2;
  const stepped = Math.round(mid / spec.step) * spec.step;
  return Number(stepped.toFixed(4));
}

const HAND_DEFAULTS: Partial<Record<PartKind, Record<string, number>>> = {
  chassis: { length: 4100, width: 1400, railWidth: 70, railHeight: 110, clearance: 150, crossCount: 6, tunnelWidth: 280, tunnelHeight: 160, firewall: 900 },
  wheel: { rim: 19, width: 255, aspect: 35, offset: 35, spokes: 10, lip: 14 },
  brake: { diameter: 350, thickness: 28, caliper: 100 },
  suspension: { arm: 360, spring: 240, coils: 7, upright: 240 },
  engine: { layout: 2, scale: 100 },
  exhaust: { length: 3200, diameter: 60, muffler: 520, tips: 2 },
  seat: { width: 480, depth: 480, back: 760, bolster: 48 },
  steering: { diameter: 350, dish: 30, spokes: 3 },
  hood: { length: 1200, width: 1500, rake: 70, crown: 22, thickness: 8 },
  door: { length: 1100, height: 820, window: 340, bulge: 26, thickness: 6 },
  fender: { length: 980, top: 460, arch: 390, archZ: 0, flare: 28, sill: -80, thickness: 6 },
  roof: { length: 1100, width: 1400, crown: 28, thickness: 6 },
  bumper: { width: 1880, height: 280, depth: 90, crown: 50, thickness: 10 },
  decklid: { length: 700, width: 1500, rake: 20, crown: 16, thickness: 6 },
  quarter: { length: 1300, top: 720, arch: 390, archZ: -80, flare: 22, sill: -160, thickness: 6 },
  skirt: { length: 1400, height: 90, bulge: 18, thickness: 6 },
  spoiler: { span: 1400, chord: 180, rise: 90, attack: 8, endplate: 80, thickness: 16 },
  diffuser: { width: 1400, length: 520, height: 90, strakes: 4, angle: 12 },
  glass: { style: 0, width: 1300, length: 760, angle: 32, bulge: 8, thickness: 6 },
  headlight: { width: 280, height: 90, depth: 70 },
  taillight: { width: 260, height: 70, depth: 40 },
  grille: { width: 620, height: 160, slats: 5, depth: 30 },
  mirror: { width: 220, height: 110, depth: 120 },
  bed: { length: 1800, width: 1600, side: 420, arch: 280, archZ: -200 },
};

for (const kind of PART_KINDS) {
  DEFAULTS[kind] = { ...DEFAULTS[kind], ...HAND_DEFAULTS[kind] };
}

export const FINISH_PRESETS: { name: string; finish: Finish }[] = [
  { name: "Rosso", finish: { color: "#b5121b", metalness: 0.62, roughness: 0.28, clearcoat: 1, opacity: 1 } },
  { name: "Midnight", finish: { color: "#1a2333", metalness: 0.7, roughness: 0.26, clearcoat: 1, opacity: 1 } },
  { name: "Ivory", finish: { color: "#e4dfd4", metalness: 0.5, roughness: 0.32, clearcoat: 1, opacity: 1 } },
  { name: "Silver", finish: { color: "#c5c8ce", metalness: 0.86, roughness: 0.22, clearcoat: 0.7, opacity: 1 } },
  { name: "Green", finish: { color: "#1e3a2f", metalness: 0.55, roughness: 0.34, clearcoat: 0.9, opacity: 1 } },
  { name: "Olive", finish: { color: "#3d4f34", metalness: 0.4, roughness: 0.45, clearcoat: 0.6, opacity: 1 } },
  { name: "Satin", finish: { color: "#141414", metalness: 0.45, roughness: 0.55, clearcoat: 0.25, opacity: 1 } },
  { name: "Graphite", finish: { color: "#2a2d31", metalness: 0.75, roughness: 0.35, clearcoat: 0.4, opacity: 1 } },
  { name: "Steel", finish: { color: "#8d939a", metalness: 0.92, roughness: 0.32, clearcoat: 0.08, opacity: 1 } },
  { name: "Ceramic", finish: { color: "#f2b705", metalness: 0.25, roughness: 0.4, clearcoat: 0.35, opacity: 1 } },
  { name: "Rubber", finish: { color: "#161616", metalness: 0.04, roughness: 0.86, clearcoat: 0, opacity: 1 } },
  { name: "Glass", finish: { color: "#b9d7e2", metalness: 0.04, roughness: 0.04, clearcoat: 1, opacity: 0.38 } },
];

export const DEFAULT_FINISH: Record<PartKind, Finish> = {
  chassis: FINISH_PRESETS[8].finish,
  wheel: FINISH_PRESETS[7].finish,
  brake: FINISH_PRESETS[9].finish,
  suspension: FINISH_PRESETS[8].finish,
  engine: { color: "#4a4e55", metalness: 0.7, roughness: 0.45, clearcoat: 0.1, opacity: 1 },
  exhaust: { color: "#6a6460", metalness: 0.8, roughness: 0.4, clearcoat: 0.05, opacity: 1 },
  seat: FINISH_PRESETS[6].finish,
  steering: FINISH_PRESETS[6].finish,
  hood: FINISH_PRESETS[0].finish,
  door: FINISH_PRESETS[0].finish,
  fender: FINISH_PRESETS[0].finish,
  roof: FINISH_PRESETS[0].finish,
  bumper: FINISH_PRESETS[0].finish,
  decklid: FINISH_PRESETS[0].finish,
  quarter: FINISH_PRESETS[0].finish,
  skirt: FINISH_PRESETS[6].finish,
  spoiler: FINISH_PRESETS[6].finish,
  diffuser: FINISH_PRESETS[6].finish,
  glass: FINISH_PRESETS[11].finish,
  headlight: { color: "#f4f1e8", metalness: 0.1, roughness: 0.15, clearcoat: 1, opacity: 0.92 },
  taillight: { color: "#ff2d2d", metalness: 0.1, roughness: 0.2, clearcoat: 1, opacity: 0.9 },
  grille: FINISH_PRESETS[6].finish,
  mirror: FINISH_PRESETS[0].finish,
  bed: FINISH_PRESETS[5].finish,
};

export function num(part: Part, key: string): number {
  const value = part.params[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return DEFAULTS[part.kind][key] ?? 0;
}

export function clampParam(kind: PartKind, key: string, value: number): number {
  const spec = PARAMS[kind].find((item) => item.key === key);
  if (!spec || !Number.isFinite(value)) return DEFAULTS[kind][key] ?? 0;
  const steps = Math.round(value / spec.step);
  const stepped = steps * spec.step;
  const clamped = Math.min(spec.max, Math.max(spec.min, stepped));
  return Number(clamped.toFixed(4));
}

export function wheelRadius(params: Record<string, number>): number {
  const rim = params.rim ?? DEFAULTS.wheel.rim;
  const width = params.width ?? DEFAULTS.wheel.width;
  const aspect = params.aspect ?? DEFAULTS.wheel.aspect;
  const sidewall = width * (aspect / 100);
  return (rim * 25.4) / 2 + sidewall;
}

export function makePart(
  kind: PartKind,
  name: string,
  params: Record<string, number>,
  xform: Xform,
  finish?: Partial<Finish>,
): Part {
  return {
    id: crypto.randomUUID(),
    kind,
    name,
    params: { ...DEFAULTS[kind], ...params },
    xform,
    finish: { ...DEFAULT_FINISH[kind], ...finish },
    visible: true,
    locked: false,
  };
}

export function identityXform(over: Partial<Xform> = {}): Xform {
  return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, ...over };
}

export function createPart(kind: PartKind, existing: Part[]): Part {
  const count = existing.filter((part) => part.kind === kind).length;
  const params = { ...DEFAULTS[kind] };
  let y = 600;
  if (kind === "wheel" || kind === "brake" || kind === "suspension") y = wheelRadius(params);
  if (kind === "chassis" || kind === "exhaust" || kind === "diffuser" || kind === "skirt") y = 0;
  if (kind === "spoiler") y = 1100;
  return makePart(kind, `${KIND_LABEL[kind]} ${count + 1}`, params, identityXform({ x: (count % 5) * 90, y, z: count * 30 }));
}
