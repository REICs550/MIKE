import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { Group } from "three";
import { createPart } from "./catalog";
import { reduceHistory, type History } from "./history";
import { loadLocalProject, saveLocalProject } from "./io";
import { buildTemplate } from "./templates";
import type { Finish, Part, PartKind, Project, SectionAxis, TemplateId, Tool, ViewMode, Xform } from "./types";

export interface UIState {
  selected: string[];
  tool: Tool;
  view: ViewMode;
  viewTick: number;
  explode: number;
  sectionOn: boolean;
  sectionAxis: SectionAxis;
  sectionPos: number;
  snap: number;
  dims: boolean;
  tab: "library" | "tree";
  query: string;
  help: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  notice: string;
}

interface OrbitLike {
  enabled: boolean;
  target: { set: (x: number, y: number, z: number) => void };
  update: () => void;
}

interface EditorApi {
  project: Project;
  ui: UIState;
  canUndo: boolean;
  canRedo: boolean;
  orbitRef: MutableRefObject<OrbitLike | null>;
  exportRef: MutableRefObject<Group | null>;
  cursorRef: MutableRefObject<HTMLElement | null>;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  setParam: (id: string, key: string, value: number, record?: boolean) => void;
  setXform: (id: string, xform: Xform, record?: boolean) => void;
  setFinish: (id: string, finish: Finish, record?: boolean) => void;
  renamePart: (id: string, name: string) => void;
  renameProject: (name: string) => void;
  addKind: (kind: PartKind) => void;
  remove: (ids: string[]) => void;
  duplicate: (ids: string[]) => void;
  toggleVisible: (id: string) => void;
  toggleLock: (id: string) => void;
  nudge: (ids: string[], dx: number, dy: number, dz: number) => void;
  loadTemplate: (id: TemplateId) => void;
  loadProject: (project: Project) => void;
  select: (id: string, mode?: "set" | "add" | "toggle") => void;
  selectOnly: (ids: string[]) => void;
  clearSelect: () => void;
  setUI: (patch: Partial<UIState>) => void;
  frame: (view?: ViewMode) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

function initialHistory(): History {
  const saved = typeof localStorage === "undefined" ? null : loadLocalProject();
  return { past: [], present: saved ?? buildTemplate("coupe"), future: [] };
}

const INITIAL_UI: UIState = {
  selected: [],
  tool: "select",
  view: "persp",
  viewTick: 0,
  explode: 0,
  sectionOn: false,
  sectionAxis: "z",
  sectionPos: 400,
  snap: 0,
  dims: false,
  tab: "tree",
  query: "",
  help: false,
  leftOpen: true,
  rightOpen: true,
  notice: "",
};

export function EditorProvider({ children }: { children: ReactNode }) {
  const [hist, dispatch] = useState(initialHistory);
  const [ui, setUiState] = useState<UIState>(INITIAL_UI);
  const orbitRef = useRef<OrbitLike | null>(null);
  const exportRef = useRef<Group | null>(null);
  const cursorRef = useRef<HTMLElement | null>(null);
  const latest = useRef({ hist, ui });
  latest.current = { hist, ui };

  const dispatchHist = (action: Parameters<typeof reduceHistory>[1]) => {
    dispatch((current) => reduceHistory(current, action));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => saveLocalProject(hist.present), 300);
    return () => window.clearTimeout(timer);
  }, [hist.present]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const meta = event.metaKey || event.ctrlKey;
      const { ui: view } = latest.current;
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        if (typing) return;
        event.preventDefault();
        setUiState((state) => ({ ...state, help: !state.help }));
        return;
      }
      if (event.key === "Escape") {
        setUiState((state) => ({ ...state, help: false, tool: "select", selected: typing ? state.selected : [] }));
        return;
      }
      if (typing) return;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatchHist(event.shiftKey ? { type: "redo" } : { type: "undo" });
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatchHist({ type: "redo" });
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicate(view.selected);
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("mike-save"));
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (view.selected.length) dispatchHist({ type: "remove", ids: view.selected });
        setUiState((state) => ({ ...state, selected: [] }));
        return;
      }
      if (event.key === "h" || event.key === "H") {
        view.selected.forEach((id) => dispatchHist({ type: "toggle-visible", id }));
        return;
      }
      if (event.key === "f" || event.key === "F") {
        setUiState((state) => ({ ...state, viewTick: state.viewTick + 1 }));
        return;
      }
      if (event.key === "g" || event.key === "G") {
        setUiState((state) => ({ ...state, tool: "translate" }));
        return;
      }
      if (event.key === "r" || event.key === "R") {
        setUiState((state) => ({ ...state, tool: "rotate" }));
        return;
      }
      const viewKeys: Record<string, ViewMode> = { "1": "front", "2": "back", "3": "right", "4": "left", "5": "persp", "7": "top" };
      if (viewKeys[event.key]) {
        setUiState((state) => ({ ...state, view: viewKeys[event.key], viewTick: state.viewTick + 1 }));
        return;
      }
      const step = event.shiftKey ? 1 : event.altKey ? 100 : view.snap || 10;
      let dx = 0;
      let dy = 0;
      let dz = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") event.altKey ? (dy = step) : (dz = step);
      else if (event.key === "ArrowDown") event.altKey ? (dy = -step) : (dz = -step);
      else if (event.key === "PageUp") dy = step;
      else if (event.key === "PageDown") dy = -step;
      else return;
      event.preventDefault();
      if (!event.repeat) dispatchHist({ type: "checkpoint" });
      dispatchHist({ type: "nudge", ids: view.selected, dx, dy, dz });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const duplicate = (ids: string[]) => {
    const copies: Part[] = latest.current.hist.present.parts
      .filter((part) => ids.includes(part.id))
      .map((part) => ({
        ...structuredClone(part),
        id: crypto.randomUUID(),
        name: `${part.name} copy`.slice(0, 80),
        xform: { ...part.xform, x: part.xform.x + (part.xform.x < 0 ? -70 : 70) },
      }));
    if (!copies.length) return;
    dispatchHist({ type: "insert", parts: copies });
    setUiState((state) => ({ ...state, selected: copies.map((part) => part.id), tab: "tree" }));
  };

  const api = useMemo<EditorApi>(() => {
    const setUI = (patch: Partial<UIState>) => setUiState((state) => ({ ...state, ...patch }));
    return {
      project: hist.present,
      ui,
      canUndo: hist.past.length > 0,
      canRedo: hist.future.length > 0,
      orbitRef,
      exportRef,
      cursorRef,
      checkpoint: () => dispatchHist({ type: "checkpoint" }),
      undo: () => dispatchHist({ type: "undo" }),
      redo: () => dispatchHist({ type: "redo" }),
      setParam: (id, key, value, record = false) => dispatchHist({ type: "set-param", id, key, value, record }),
      setXform: (id, xform, record = false) => dispatchHist({ type: "set-xform", id, xform, record }),
      setFinish: (id, finish, record = false) => dispatchHist({ type: "set-finish", id, finish, record }),
      renamePart: (id, name) => dispatchHist({ type: "rename-part", id, name }),
      renameProject: (name) => dispatchHist({ type: "rename-project", name }),
      addKind: (kind) => {
        const part = createPart(kind, latest.current.hist.present.parts);
        dispatchHist({ type: "insert", parts: [part] });
        setUiState((state) => ({ ...state, selected: [part.id], tab: "tree", viewTick: state.viewTick + 1 }));
      },
      remove: (ids) => {
        dispatchHist({ type: "remove", ids });
        setUiState((state) => ({ ...state, selected: state.selected.filter((id) => !ids.includes(id)) }));
      },
      duplicate,
      toggleVisible: (id) => dispatchHist({ type: "toggle-visible", id }),
      toggleLock: (id) => dispatchHist({ type: "toggle-lock", id }),
      nudge: (ids, dx, dy, dz) => dispatchHist({ type: "nudge", ids, dx, dy, dz }),
      loadTemplate: (id) => {
        dispatchHist({ type: "load", project: buildTemplate(id) });
        setUiState((state) => ({ ...state, selected: [], tab: "tree", explode: 0, sectionOn: false, view: "persp", viewTick: state.viewTick + 1, notice: "" }));
      },
      loadProject: (project) => {
        dispatchHist({ type: "load", project });
        setUiState((state) => ({ ...state, selected: [], viewTick: state.viewTick + 1, notice: "Project loaded" }));
      },
      select: (id, mode = "set") => {
        setUiState((state) => {
          if (mode === "add") return { ...state, selected: state.selected.includes(id) ? state.selected : [...state.selected, id] };
          if (mode === "toggle") {
            return { ...state, selected: state.selected.includes(id) ? state.selected.filter((item) => item !== id) : [...state.selected, id] };
          }
          return { ...state, selected: [id] };
        });
      },
      selectOnly: (ids) => setUiState((state) => ({ ...state, selected: ids })),
      clearSelect: () => setUiState((state) => ({ ...state, selected: [] })),
      setUI,
      frame: (view) => setUiState((state) => ({ ...state, view: view ?? state.view, viewTick: state.viewTick + 1 })),
    };
  }, [hist, ui]);

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
