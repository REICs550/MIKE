import { DEFAULTS, DEFAULT_FINISH, PARAMS, clampParam, isPartKind } from "./catalog";
import { partMass } from "./measure";
import type { Finish, Part, Project } from "./types";

const STORAGE_KEY = "mike-cad-v2";

export function serializeProject(project: Project): string {
  return JSON.stringify({ format: "mike-cad", version: 1, project }, null, 2);
}

function numOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value: unknown, fallback: number): number {
  const n = numOr(value, fallback);
  return Math.min(1, Math.max(0, n));
}

function colorOr(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function parseProjectFile(data: unknown): Project | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { project?: unknown };
  const project = (record.project ?? data) as { name?: unknown; parts?: unknown };
  if (!project || !Array.isArray(project.parts)) return null;
  const seen = new Set<string>();
  const parts: Part[] = [];
  for (const raw of project.parts) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.kind !== "string" || !isPartKind(item.kind)) continue;
    const kind = item.kind;
    const params = { ...DEFAULTS[kind] };
    if (item.params && typeof item.params === "object") {
      const source = item.params as Record<string, unknown>;
      for (const spec of PARAMS[kind]) {
        if (typeof source[spec.key] === "number") params[spec.key] = clampParam(kind, spec.key, source[spec.key] as number);
      }
    }
    const xf = (item.xform ?? {}) as Record<string, unknown>;
    const finishIn = (item.finish ?? {}) as Record<string, unknown>;
    const base = DEFAULT_FINISH[kind];
    const finish: Finish = {
      color: colorOr(finishIn.color, base.color),
      metalness: clamp01(finishIn.metalness, base.metalness),
      roughness: clamp01(finishIn.roughness, base.roughness),
      clearcoat: clamp01(finishIn.clearcoat, base.clearcoat),
      opacity: Math.min(1, Math.max(0.05, numOr(finishIn.opacity, base.opacity))),
    };
    let id = typeof item.id === "string" && item.id ? item.id : crypto.randomUUID();
    if (seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    parts.push({
      id,
      kind,
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 80) : kind,
      params,
      xform: {
        x: numOr(xf.x),
        y: numOr(xf.y),
        z: numOr(xf.z),
        rx: numOr(xf.rx),
        ry: numOr(xf.ry),
        rz: numOr(xf.rz),
      },
      finish,
      visible: item.visible !== false,
      locked: item.locked === true,
    });
  }
  const name = typeof project.name === "string" && project.name.trim() ? project.name.trim().slice(0, 80) : "Untitled vehicle";
  return { name, parts };
}

export function loadLocalProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseProjectFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalProject(project: Project) {
  localStorage.setItem(STORAGE_KEY, serializeProject(project));
}

export function bomCsv(project: Project): string {
  const lines = ["name,kind,mass_kg,color,visible"];
  for (const part of project.parts) {
    const cells = [part.name, part.kind, partMass(part).toFixed(2), part.finish.color, part.visible ? "yes" : "no"];
    lines.push(cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","));
  }
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "vehicle";
}
