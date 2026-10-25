export const PART_KINDS = [
  "chassis",
  "wheel",
  "brake",
  "suspension",
  "engine",
  "exhaust",
  "seat",
  "steering",
  "hood",
  "door",
  "fender",
  "roof",
  "bumper",
  "decklid",
  "quarter",
  "skirt",
  "spoiler",
  "diffuser",
  "glass",
  "headlight",
  "taillight",
  "grille",
  "mirror",
  "bed",
] as const;

export type PartKind = (typeof PART_KINDS)[number];

export interface Xform {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/** Surface finish. Opacity below 1 renders as glass or a lens. */
export interface Finish {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  opacity: number;
}

export interface Part {
  id: string;
  kind: PartKind;
  name: string;
  params: Record<string, number>;
  xform: Xform;
  finish: Finish;
  visible: boolean;
  locked: boolean;
}

export interface Project {
  name: string;
  parts: Part[];
}

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  options?: { value: number; label: string }[];
}

export type TemplateId = "coupe" | "sedan" | "truck" | "chassis" | "corner";

export type Tool = "select" | "translate" | "rotate";

export type ViewMode = "persp" | "front" | "back" | "left" | "right" | "top";

export type SectionAxis = "x" | "y" | "z";
