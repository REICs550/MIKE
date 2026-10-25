import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FINISH_PRESETS, KIND_BLURB, KIND_LABEL, PARAMS, num } from "../catalog";
import { bomCsv, downloadText, parseProjectFile, serializeProject, slugName } from "../io";
import { formatKg, formatMm, partMass, projectBounds, projectMass } from "../measure";
import { useEditor } from "../state";
import { downloadSTL } from "../stl";
import { TEMPLATE_LIST } from "../templates";
import type { Part } from "../types";

function ProjectName({ name, onCommit }: { name: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  return (
    <input
      className="project-name"
      aria-label="Project name"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== name) onCommit(next);
      }}
    />
  );
}

export function TopBar() {
  const { project, ui, canUndo, canRedo, undo, redo, renameProject, loadTemplate, loadProject, setUI, exportRef } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<"templates" | "export" | null>(null);

  useEffect(() => {
    const onSave = () => downloadText(`${slugName(project.name)}.json`, serializeProject(project));
    window.addEventListener("mike-save", onSave);
    return () => window.removeEventListener("mike-save", onSave);
  }, [project]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const close = () => setMenu(null);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">M</span>
        <div>
          <strong>MIKE</strong>
          <small>Vehicle CAD</small>
        </div>
      </div>
      <ProjectName name={project.name} onCommit={renameProject} />
      <div className="top-actions">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <button className={ui.leftOpen ? "on" : ""} onClick={() => setUI({ leftOpen: !ui.leftOpen })}>
          Library
        </button>
        <button className={ui.rightOpen ? "on" : ""} onClick={() => setUI({ rightOpen: !ui.rightOpen })}>
          Inspector
        </button>
        <div className="pop" onMouseDown={(event) => event.stopPropagation()}>
          <button className={menu === "templates" ? "on" : ""} onClick={() => setMenu(menu === "templates" ? null : "templates")}>
            Templates
          </button>
          {menu === "templates" && (
            <div className="pop-menu">
              {TEMPLATE_LIST.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    loadTemplate(item.id);
                    close();
                  }}
                >
                  <b>{item.label}</b>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
        >
          Open
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              const projectFile = parseProjectFile(JSON.parse(await file.text()));
              if (!projectFile) setUI({ notice: "That file is not a MIKE project" });
              else loadProject(projectFile);
            } catch {
              setUI({ notice: "Could not read that file" });
            }
          }}
        />
        <div className="pop" onMouseDown={(event) => event.stopPropagation()}>
          <button className={menu === "export" ? "on" : ""} onClick={() => setMenu(menu === "export" ? null : "export")}>
            Export
          </button>
          {menu === "export" && (
            <div className="pop-menu">
              <button
                onClick={() => {
                  downloadText(`${slugName(project.name)}.json`, serializeProject(project));
                  close();
                }}
              >
                <b>Project JSON</b>
                <span>Parts, dimensions, and finishes</span>
              </button>
              <button
                onClick={() => {
                  if (exportRef.current) downloadSTL(exportRef.current, `${slugName(project.name)}.stl`);
                  close();
                }}
              >
                <b>STL</b>
                <span>Visible solids for printing or CAM</span>
              </button>
              <button
                onClick={() => {
                  downloadText(`${slugName(project.name)}-bom.csv`, bomCsv(project), "text/csv");
                  close();
                }}
              >
                <b>Bill of materials</b>
                <span>Name, kind, and estimated mass</span>
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setUI({ help: true })} title="Shortcuts (?)">
          ?
        </button>
      </div>
    </header>
  );
}

export function LeftPanel() {
  const { ui, setUI, project, addKind, select, toggleVisible, toggleLock } = useEditor();
  const query = ui.query.trim().toLowerCase();
  return (
    <aside className="side left">
      <div className="side-head">
        <div className="tabs">
          <button className={ui.tab === "library" ? "on" : ""} onClick={() => setUI({ tab: "library" })}>
            Parts
          </button>
          <button className={ui.tab === "tree" ? "on" : ""} onClick={() => setUI({ tab: "tree" })}>
            Assembly
          </button>
        </div>
        <input
          value={ui.query}
          onChange={(event) => setUI({ query: event.target.value })}
          placeholder={ui.tab === "library" ? "Search parts" : "Search assembly"}
          aria-label="Search"
        />
      </div>
      {ui.tab === "library" ? (
        <div className="scroll">
          <p className="lede">Every part is driven by dimensions in millimeters. Add one, then edit it in the inspector.</p>
          {CATEGORIES.map((category) => {
            const kinds = category.kinds.filter((kind) => {
              const hay = `${KIND_LABEL[kind]} ${KIND_BLURB[kind]}`.toLowerCase();
              return !query || hay.includes(query);
            });
            if (!kinds.length) return null;
            return (
              <section key={category.name}>
                <h2>{category.name}</h2>
                {kinds.map((kind) => (
                  <div className="lib-row" key={kind}>
                    <div>
                      <b>{KIND_LABEL[kind]}</b>
                      <span>{KIND_BLURB[kind]}</span>
                    </div>
                    <button onClick={() => addKind(kind)}>Add</button>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <Assembly query={query} parts={project.parts} selected={ui.selected} select={select} toggleVisible={toggleVisible} toggleLock={toggleLock} />
      )}
    </aside>
  );
}

function Assembly({
  query,
  parts,
  selected,
  select,
  toggleVisible,
  toggleLock,
}: {
  query: string;
  parts: Part[];
  selected: string[];
  select: (id: string, mode?: "set" | "add" | "toggle") => void;
  toggleVisible: (id: string) => void;
  toggleLock: (id: string) => void;
}) {
  const shown = parts.filter((part) => !query || `${part.name} ${KIND_LABEL[part.kind]}`.toLowerCase().includes(query));
  return (
    <div className="scroll">
      {shown.map((part) => (
        <div key={part.id} className={selected.includes(part.id) ? "tree-row on" : "tree-row"}>
          <button className="icon" title={part.visible ? "Hide" : "Show"} onClick={() => toggleVisible(part.id)}>
            {part.visible ? "●" : "○"}
          </button>
          <button className="icon" title={part.locked ? "Unlock transform" : "Lock transform"} onClick={() => toggleLock(part.id)}>
            {part.locked ? "▣" : "□"}
          </button>
          <button
            className="tree-name"
            onClick={(event) => select(part.id, event.shiftKey ? "add" : event.metaKey || event.ctrlKey ? "toggle" : "set")}
          >
            <i style={{ background: part.finish.color }} />
            <span>{part.name}</span>
            <small>{KIND_LABEL[part.kind]}</small>
          </button>
          <em>{formatKg(partMass(part))}</em>
        </div>
      ))}
      {!shown.length && <p className="lede">Nothing in the assembly matches.</p>}
    </div>
  );
}

export function RightPanel() {
  const editor = useEditor();
  const { project, ui } = editor;
  const selected = project.parts.filter((part) => ui.selected.includes(part.id));
  return (
    <aside className="side right">
      <div className="side-head">
        <h2>{selected.length === 1 ? "Part" : selected.length > 1 ? "Multiple" : "Vehicle"}</h2>
      </div>
      <div className="scroll">
        {selected.length === 1 ? (
          <PartInspector part={selected[0]} />
        ) : selected.length > 1 ? (
          <MultiInspector parts={selected} />
        ) : (
          <VehicleSummary />
        )}
      </div>
    </aside>
  );
}

function VehicleSummary() {
  const { project, loadTemplate } = useEditor();
  const bounds = projectBounds(project.parts);
  return (
    <div className="inspector">
      <p className="lede">
        {project.parts.length} parts · {formatKg(projectMass(project.parts))} estimated. Mass updates as you change thickness, diameter, and layout.
      </p>
      <dl className="facts">
        <div>
          <dt>Length</dt>
          <dd>{formatMm(bounds.size[2])}</dd>
        </div>
        <div>
          <dt>Width</dt>
          <dd>{formatMm(bounds.size[0])}</dd>
        </div>
        <div>
          <dt>Height</dt>
          <dd>{formatMm(bounds.size[1])}</dd>
        </div>
      </dl>
      <h3>Load a starting point</h3>
      {TEMPLATE_LIST.map((item) => (
        <button key={item.id} className="block" onClick={() => loadTemplate(item.id)}>
          <b>{item.label}</b>
          <span>{item.detail}</span>
        </button>
      ))}
      <p className="fine">Axis: +X right, +Y up, +Z forward. Origin is on the ground at mid-wheelbase for the full vehicles.</p>
    </div>
  );
}

function MultiInspector({ parts }: { parts: Part[] }) {
  const { duplicate, remove, toggleVisible } = useEditor();
  const ids = parts.map((part) => part.id);
  return (
    <div className="inspector">
      <p className="lede">{parts.length} parts selected · {formatKg(parts.reduce((sum, part) => sum + partMass(part), 0))}</p>
      <div className="row-actions">
        <button onClick={() => duplicate(ids)}>Duplicate</button>
        <button onClick={() => ids.forEach((id) => toggleVisible(id))}>Hide</button>
        <button className="danger" onClick={() => remove(ids)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function PartInspector({ part }: { part: Part }) {
  const { checkpoint, setParam, setFinish, setXform, renamePart, duplicate, remove, toggleVisible, toggleLock } = useEditor();
  const [name, setName] = useState(part.name);
  useEffect(() => setName(part.name), [part.name]);
  const specs = PARAMS[part.kind].filter((spec) => !(part.kind === "glass" && spec.key === "mirror" && num(part, "style") < 0.5));
  return (
    <div className="inspector">
      <input
        className="name"
        aria-label="Part name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (name.trim() && name !== part.name) renamePart(part.id, name.trim());
        }}
      />
      <p className="kind">{KIND_LABEL[part.kind]} · {formatKg(partMass(part))}</p>
      <div className="row-actions">
        <button onClick={() => duplicate([part.id])}>Duplicate</button>
        <button onClick={() => toggleVisible(part.id)}>{part.visible ? "Hide" : "Show"}</button>
        <button onClick={() => toggleLock(part.id)}>{part.locked ? "Unlock" : "Lock"}</button>
        <button className="danger" onClick={() => remove([part.id])}>
          Delete
        </button>
      </div>
      <h3>Finish</h3>
      <div className="swatches">
        {FINISH_PRESETS.map((item) => (
          <button
            key={item.name}
            title={item.name}
            className={part.finish.color === item.finish.color ? "swatch on" : "swatch"}
            style={{ background: item.finish.color }}
            onClick={() => setFinish(part.id, { ...item.finish }, true)}
          />
        ))}
        <input
          type="color"
          aria-label="Custom color"
          value={/^#[0-9a-fA-F]{6}$/.test(part.finish.color) ? part.finish.color : "#888888"}
          onFocus={() => checkpoint()}
          onChange={(event) => setFinish(part.id, { ...part.finish, color: event.target.value })}
        />
      </div>
      <Slider
        label="Metal"
        min={0}
        max={1}
        step={0.01}
        value={part.finish.metalness}
        onPointerDown={checkpoint}
        onChange={(value) => setFinish(part.id, { ...part.finish, metalness: value })}
      />
      <Slider
        label="Rough"
        min={0}
        max={1}
        step={0.01}
        value={part.finish.roughness}
        onPointerDown={checkpoint}
        onChange={(value) => setFinish(part.id, { ...part.finish, roughness: value })}
      />
      <Slider
        label="Clearcoat"
        min={0}
        max={1}
        step={0.01}
        value={part.finish.clearcoat}
        onPointerDown={checkpoint}
        onChange={(value) => setFinish(part.id, { ...part.finish, clearcoat: value })}
      />
      <Slider
        label="Opacity"
        min={0.08}
        max={1}
        step={0.01}
        value={part.finish.opacity}
        onPointerDown={checkpoint}
        onChange={(value) => setFinish(part.id, { ...part.finish, opacity: value })}
      />
      <h3>Dimensions</h3>
      {specs.map((spec) =>
        spec.options ? (
          <div key={spec.key} className="field">
            <span>{spec.label}</span>
            <div className="options">
              {spec.options.map((option) => (
                <button
                  key={option.value}
                  className={num(part, spec.key) === option.value ? "on" : ""}
                  onClick={() => setParam(part.id, spec.key, option.value, true)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Slider
            key={spec.key}
            label={spec.label}
            unit={spec.unit}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={num(part, spec.key)}
            onPointerDown={checkpoint}
            onChange={(value) => setParam(part.id, spec.key, value)}
          />
        ),
      )}
      <h3>Placement</h3>
      {(["x", "y", "z"] as const).map((axis) => (
        <NumberField
          key={axis}
          label={axis.toUpperCase()}
          unit="mm"
          value={part.xform[axis]}
          disabled={part.locked}
          onFocus={checkpoint}
          onChange={(value) => setXform(part.id, { ...part.xform, [axis]: value })}
        />
      ))}
      {(["rx", "ry", "rz"] as const).map((axis) => (
        <NumberField
          key={axis}
          label={axis.toUpperCase()}
          unit="°"
          value={part.xform[axis]}
          disabled={part.locked}
          onFocus={checkpoint}
          onChange={(value) => setXform(part.id, { ...part.xform, [axis]: value })}
        />
      ))}
    </div>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  onPointerDown,
}: {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onPointerDown?: () => void;
}) {
  const shown = step >= 1 ? Math.round(value).toString() : value.toFixed(step < 0.1 ? 2 : 1);
  return (
    <label className="slider">
      <span>
        {label}
        {unit ? <small> {unit}</small> : null}
      </span>
      <strong>{shown}</strong>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onPointerDown}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function NumberField({
  label,
  unit,
  value,
  disabled,
  onChange,
  onFocus,
}: {
  label: string;
  unit: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onFocus?: () => void;
}) {
  return (
    <label className="num">
      <span>{label}</span>
      <input
        type="number"
        disabled={disabled}
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        onFocus={onFocus}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{unit}</small>
    </label>
  );
}

export function StatusBar() {
  const { project, ui, cursorRef } = useEditor();
  const selected = project.parts.filter((part) => ui.selected.includes(part.id));
  const label = selected.length === 1 ? selected[0].name : selected.length > 1 ? `${selected.length} selected` : "No selection";
  return (
    <footer className="status">
      <span>{label}</span>
      <span className="cursor">
        xyz <b ref={cursorRef}>0, 0, 0</b>
      </span>
      <span>{project.parts.length} parts</span>
      <span>{formatKg(projectMass(project.parts))}</span>
      <span>mm</span>
      <span>+Z forward</span>
      {ui.notice && <span className="notice">{ui.notice}</span>}
    </footer>
  );
}

export function HelpDialog() {
  const { ui, setUI } = useEditor();
  if (!ui.help) return null;
  return (
    <div className="modal" onClick={() => setUI({ help: false })}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Shortcuts</h2>
          <button onClick={() => setUI({ help: false })}>Close</button>
        </header>
        <p>Orbit with the left mouse button, pan with the right button or shift-drag, and zoom with the wheel. Units are millimeters.</p>
        <ul>
          <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> front, back, right, left</li>
          <li><kbd>5</kbd> perspective · <kbd>7</kbd> top · <kbd>F</kbd> frame</li>
          <li><kbd>G</kbd> move · <kbd>R</kbd> rotate · <kbd>Esc</kbd> select</li>
          <li>Arrows nudge X/Z · <kbd>Alt</kbd> or <kbd>PgUp</kbd> changes height</li>
          <li><kbd>Shift</kbd> nudges 1 mm · <kbd>Del</kbd> deletes · <kbd>H</kbd> hides</li>
          <li><kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Ctrl</kbd>+<kbd>S</kbd> save JSON</li>
          <li>Shift-click adds to the selection</li>
        </ul>
      </div>
    </div>
  );
}
