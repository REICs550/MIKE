import { clampParam, wheelRadius } from "./catalog";
import type { Finish, Part, Project, Xform } from "./types";

export interface History {
  past: Project[];
  present: Project;
  future: Project[];
}

export type HistAction =
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-param"; id: string; key: string; value: number; record?: boolean }
  | { type: "set-xform"; id: string; xform: Xform; record?: boolean }
  | { type: "set-finish"; id: string; finish: Finish; record?: boolean }
  | { type: "rename-part"; id: string; name: string; record?: boolean }
  | { type: "rename-project"; name: string; record?: boolean }
  | { type: "insert"; parts: Part[] }
  | { type: "remove"; ids: string[] }
  | { type: "toggle-visible"; id: string }
  | { type: "toggle-lock"; id: string }
  | { type: "nudge"; ids: string[]; dx: number; dy: number; dz: number }
  | { type: "load"; project: Project };

const WHEEL_SIZE = new Set(["rim", "width", "aspect"]);

function commit(state: History, present: Project, record = true): History {
  if (!record) return { ...state, present };
  return {
    past: [...state.past, structuredClone(state.present)].slice(-60),
    present,
    future: [],
  };
}

function mapPart(project: Project, id: string, fn: (part: Part) => Part): Project {
  return { ...project, parts: project.parts.map((part) => (part.id === id ? fn(part) : part)) };
}

export function reduceHistory(state: History, action: HistAction): History {
  switch (action.type) {
    case "checkpoint":
      return { ...state, past: [...state.past, structuredClone(state.present)].slice(-60), future: [] };
    case "undo": {
      if (!state.past.length) return state;
      const present = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: structuredClone(present),
        future: [structuredClone(state.present), ...state.future].slice(0, 60),
      };
    }
    case "redo": {
      if (!state.future.length) return state;
      const [present, ...future] = state.future;
      return {
        past: [...state.past, structuredClone(state.present)].slice(-60),
        present: structuredClone(present),
        future,
      };
    }
    case "set-param":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => {
          const value = clampParam(part.kind, action.key, action.value);
          let xform = part.xform;
          if (part.kind === "wheel" && WHEEL_SIZE.has(action.key)) {
            const next = { ...part.params, [action.key]: value };
            xform = { ...xform, y: xform.y + (wheelRadius(next) - wheelRadius(part.params)) };
          }
          return { ...part, params: { ...part.params, [action.key]: value }, xform };
        }),
        action.record ?? false,
      );
    case "set-xform":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => (part.locked ? part : { ...part, xform: action.xform })),
        action.record ?? false,
      );
    case "set-finish":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => ({ ...part, finish: action.finish })),
        action.record ?? false,
      );
    case "rename-part":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => ({ ...part, name: action.name.slice(0, 80) })),
        action.record ?? true,
      );
    case "rename-project":
      return commit(state, { ...state.present, name: action.name.slice(0, 80) }, action.record ?? true);
    case "insert":
      return commit(state, { ...state.present, parts: [...state.present.parts, ...action.parts] });
    case "remove": {
      const ids = new Set(action.ids);
      return commit(state, { ...state.present, parts: state.present.parts.filter((part) => !ids.has(part.id)) });
    }
    case "toggle-visible":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => ({ ...part, visible: !part.visible })),
      );
    case "toggle-lock":
      return commit(
        state,
        mapPart(state.present, action.id, (part) => ({ ...part, locked: !part.locked })),
      );
    case "nudge": {
      const ids = new Set(action.ids);
      return commit(
        state,
        {
          ...state.present,
          parts: state.present.parts.map((part) =>
            ids.has(part.id) && !part.locked
              ? { ...part, xform: { ...part.xform, x: part.xform.x + action.dx, y: part.xform.y + action.dy, z: part.xform.z + action.dz } }
              : part,
          ),
        },
        false,
      );
    }
    case "load":
      return commit(state, structuredClone(action.project));
    default:
      return state;
  }
}
