import { Grid, Html, Line, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { disposeObject } from "../lib/sheet";
import { partLocalBox, projectBounds } from "../measure";
import { applyClipping, buildPart, markSelected } from "../parts/build";
import { useEditor } from "../state";
import type { Part, PartKind, ViewMode } from "../types";

const LIFT: Partial<Record<PartKind, number>> = {
  hood: 460,
  roof: 680,
  door: 240,
  fender: 160,
  quarter: 180,
  glass: 380,
  spoiler: 560,
  decklid: 320,
  bumper: 140,
  mirror: 260,
  skirt: 80,
  seat: 40,
  steering: 200,
  engine: 80,
  bed: 220,
  grille: 80,
  headlight: 60,
  taillight: 60,
};

function displayPosition(part: Part, amount: number): [number, number, number] {
  const lift = (LIFT[part.kind] ?? 0) * amount;
  const spread = amount * 0.42;
  return [part.xform.x * (1 + spread), part.xform.y + (part.xform.y - 640) * amount * 0.35 + lift, part.xform.z * (1 + spread)];
}

function Backdrop() {
  const { scene } = useThree();
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#30363d");
    gradient.addColorStop(0.42, "#1a1e24");
    gradient.addColorStop(1, "#0d0f12");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    return () => {
      texture.dispose();
      scene.background = null;
    };
  }, [scene]);
  return null;
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const { ui, orbitRef, project } = useEditor();
  const projectRef = useRef(project);
  projectRef.current = project;

  useEffect(() => {
    const bounds = projectBounds(projectRef.current.parts);
    const [cx, cy, cz] = bounds.center;
    const radius = Math.max(bounds.size[0], bounds.size[1], bounds.size[2], 900);
    const dist = radius * (ui.view === "persp" ? 1.15 : 1.45);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = 5;
      camera.far = 250000;
      camera.fov = ui.view === "persp" ? 32 : 22;
      camera.updateProjectionMatrix();
    }
    const dirs: Record<ViewMode, [number, number, number]> = {
      persp: [0.9, 0.46, 1.05],
      front: [0, 0.06, 1],
      back: [0, 0.06, -1],
      left: [-1, 0.08, 0],
      right: [1, 0.08, 0],
      top: [0.001, 1, 0.001],
    };
    const dir = dirs[ui.view];
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    camera.position.set(cx + (dir[0] / len) * dist, cy + (dir[1] / len) * dist, cz + (dir[2] / len) * dist);
    const controls = orbitRef.current;
    if (controls) {
      controls.target.set(cx, cy * 0.92, cz);
      controls.update();
    }
  }, [ui.view, ui.viewTick, camera, orbitRef]);

  return null;
}

function CursorReadout() {
  const { cursorRef } = useEditor();
  const { camera, pointer, raycaster } = useThree();
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const el = cursorRef.current;
    if (!el) return;
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(floor, hit)) {
      el.textContent = `${hit.x.toFixed(0)}, ${hit.y.toFixed(0)}, ${hit.z.toFixed(0)}`;
    }
  });
  return null;
}

function Dims({ part }: { part: Part }) {
  const local = partLocalBox(part);
  const sx = local.max[0] - local.min[0];
  const sy = local.max[1] - local.min[1];
  const sz = local.max[2] - local.min[2];
  const y = local.min[1];
  const z = local.max[2];
  const items: { a: [number, number, number]; b: [number, number, number]; label: string }[] = [
    { a: [local.min[0], y, z], b: [local.max[0], y, z], label: `${Math.round(sx)}` },
    { a: [local.max[0], local.min[1], z], b: [local.max[0], local.max[1], z], label: `${Math.round(sy)}` },
    { a: [local.max[0], y, local.min[2]], b: [local.max[0], y, local.max[2]], label: `${Math.round(sz)}` },
  ];
  return (
    <group>
      {items.map((item) => {
        const mid: [number, number, number] = [
          (item.a[0] + item.b[0]) / 2,
          (item.a[1] + item.b[1]) / 2,
          (item.a[2] + item.b[2]) / 2,
        ];
        return (
          <group key={item.label + item.a.join()}>
            <Line points={[item.a, item.b]} color="#e85d04" />
            <Html position={mid} center style={{ pointerEvents: "none" }}>
              <span className="dim-label">{item.label}</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function PartView({ part, planes }: { part: Part; planes: THREE.Plane[] }) {
  const { ui, select, setXform, checkpoint, orbitRef } = useEditor();
  const selected = ui.selected.includes(part.id);
  const single = ui.selected.length === 1 && selected;
  const obj = useMemo(() => buildPart(part), [part]);
  const [node, setNode] = useState<THREE.Group | null>(null);
  const helper = useMemo(() => {
    if (!node) return null;
    const box = new THREE.BoxHelper(node, 0x4ea1ff);
    box.raycast = () => {};
    return box;
  }, [node, obj]);
  const drag = useRef(false);

  useEffect(() => () => disposeObject(obj), [obj]);
  useEffect(() => {
    markSelected(obj, selected);
  }, [obj, selected]);
  useEffect(() => {
    applyClipping(obj, planes);
  }, [obj, planes]);
  useEffect(() => () => helper?.dispose(), [helper]);

  useFrame(() => {
    helper?.update();
  });

  const [x, y, z] = displayPosition(part, ui.explode);
  const rotation: [number, number, number] = [
    THREE.MathUtils.degToRad(part.xform.rx),
    THREE.MathUtils.degToRad(part.xform.ry),
    THREE.MathUtils.degToRad(part.xform.rz),
  ];
  const showGizmo = single && !part.locked && ui.tool !== "select" && ui.explode < 0.01 && node;

  return (
    <>
      <group
        ref={setNode}
        position={[x, y, z]}
        rotation={rotation}
        onClick={(event) => {
          event.stopPropagation();
          const mode = event.shiftKey ? "add" : event.metaKey || event.ctrlKey ? "toggle" : "set";
          select(part.id, mode);
        }}
      >
        <primitive object={obj} />
        {ui.dims && single && <Dims part={part} />}
      </group>
      {helper && single && <primitive object={helper} />}
      {showGizmo && (
        <TransformControls
          object={node}
          mode={ui.tool === "rotate" ? "rotate" : "translate"}
          size={0.7}
          space="world"
          translationSnap={ui.snap > 0 ? ui.snap : null}
          rotationSnap={ui.snap > 0 ? THREE.MathUtils.degToRad(5) : null}
          onMouseDown={() => {
            drag.current = false;
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
          }}
          onObjectChange={() => {
            if (!drag.current) {
              checkpoint();
              drag.current = true;
            }
            const euler = node.rotation;
            setXform(part.id, {
              x: node.position.x,
              y: node.position.y,
              z: node.position.z,
              rx: THREE.MathUtils.radToDeg(euler.x),
              ry: THREE.MathUtils.radToDeg(euler.y),
              rz: THREE.MathUtils.radToDeg(euler.z),
            });
          }}
        />
      )}
    </>
  );
}

function Scene() {
  const { project, ui, exportRef, orbitRef } = useEditor();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  useLayoutEffect(() => {
    const normal = ui.sectionAxis === "x" ? [1, 0, 0] : ui.sectionAxis === "y" ? [0, 1, 0] : [0, 0, 1];
    plane.normal.set(-normal[0], -normal[1], -normal[2]);
    plane.constant = ui.sectionPos;
  }, [plane, ui.sectionAxis, ui.sectionPos]);
  const planes = useMemo(() => (ui.sectionOn ? [plane] : []), [ui.sectionOn, plane]);

  return (
    <>
      <Backdrop />
      <CameraRig />
      <CursorReadout />
      <hemisphereLight args={["#d5e2ef", "#2a241e", 0.9]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[2400, 4200, 1800]}
        intensity={1.55}
        color={"#fff3e6"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={50}
        shadow-camera-far={16000}
        shadow-camera-left={-6000}
        shadow-camera-right={6000}
        shadow-camera-top={6000}
        shadow-camera-bottom={-6000}
        shadow-bias={-0.0002}
        shadow-normalBias={12}
      />
      <directionalLight position={[-2800, 1800, -1600]} intensity={1.15} color={"#c9d7ea"} />
      <directionalLight position={[400, 900, 3600]} intensity={0.45} color={"#ffe7cf"} />
      <Grid
        args={[20000, 20000]}
        cellSize={100}
        cellThickness={0.7}
        cellColor="#2c343c"
        sectionSize={500}
        sectionThickness={1.15}
        sectionColor="#3e4b57"
        fadeDistance={14000}
        fadeStrength={1.4}
        infiniteGrid
        position={[0, 0, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[12000, 72]} />
        <meshStandardMaterial color="#101317" roughness={1} metalness={0} />
      </mesh>
      {ui.dims && <axesHelper args={[450]} />}
      <group ref={exportRef}>
        {project.parts.map((part) => (part.visible ? <PartView key={part.id} part={part} planes={planes} /> : null))}
      </group>
      {ui.sectionOn && (
        <mesh
          position={
            ui.sectionAxis === "x" ? [ui.sectionPos, 700, 0] : ui.sectionAxis === "y" ? [0, ui.sectionPos, 0] : [0, 700, ui.sectionPos]
          }
          rotation={ui.sectionAxis === "x" ? [0, Math.PI / 2, 0] : ui.sectionAxis === "y" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
        >
          <planeGeometry args={[4200, 1800]} />
          <meshBasicMaterial color="#e85d04" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <OrbitControls
        ref={orbitRef as never}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={250}
        maxDistance={28000}
        target={[0, 620, 0]}
      />
    </>
  );
}

export function Viewport() {
  const { project, ui, setUI, frame, clearSelect } = useEditor();
  return (
    <div className="viewport">
      <Canvas
        shadows
        camera={{ fov: 32, near: 5, far: 250000, position: [3600, 1700, 4600] }}
        gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => clearSelect()}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.setClearColor("#1a1e24");
        }}
      >
        <Scene />
      </Canvas>
      <div className="view-tools">
        <div className="tool-row">
          <button className={ui.tool === "select" ? "on" : ""} onClick={() => setUI({ tool: "select" })} title="Select (Esc)">
            Select
          </button>
          <button className={ui.tool === "translate" ? "on" : ""} onClick={() => setUI({ tool: "translate" })} title="Move (G)">
            Move
          </button>
          <button className={ui.tool === "rotate" ? "on" : ""} onClick={() => setUI({ tool: "rotate" })} title="Rotate (R)">
            Rotate
          </button>
        </div>
        <div className="tool-row">
          {(
            [
              ["persp", "Persp"],
              ["front", "Front"],
              ["back", "Back"],
              ["left", "Left"],
              ["right", "Right"],
              ["top", "Top"],
            ] as [ViewMode, string][]
          ).map(([mode, label]) => (
            <button key={mode} className={ui.view === mode ? "on" : ""} onClick={() => frame(mode)} title={`View ${label}`}>
              {label}
            </button>
          ))}
          <button onClick={() => frame()} title="Frame all (F)">
            Frame
          </button>
        </div>
        <div className="tool-row">
          <button className={ui.sectionOn ? "on" : ""} onClick={() => setUI({ sectionOn: !ui.sectionOn })}>
            Section
          </button>
          <button className={ui.dims ? "on" : ""} onClick={() => setUI({ dims: !ui.dims })}>
            Dims
          </button>
          <button
            className={ui.snap ? "on" : ""}
            onClick={() => setUI({ snap: ui.snap === 0 ? 10 : ui.snap === 10 ? 25 : ui.snap === 25 ? 50 : 0 })}
            title="Translation snap"
          >
            Snap {ui.snap ? ui.snap : "off"}
          </button>
        </div>
        {ui.sectionOn && (
          <div className="section-row">
            {(["x", "y", "z"] as const).map((axis) => (
              <button key={axis} className={ui.sectionAxis === axis ? "on" : ""} onClick={() => setUI({ sectionAxis: axis })}>
                {axis.toUpperCase()}
              </button>
            ))}
            <input
              type="range"
              min={-2500}
              max={2500}
              step={10}
              value={ui.sectionPos}
              onChange={(event) => setUI({ sectionPos: Number(event.target.value) })}
              aria-label="Section position"
            />
            <span>{Math.round(ui.sectionPos)}</span>
          </div>
        )}
      </div>
      <label className="explode">
        <span>Explode</span>
        <input type="range" min={0} max={1} step={0.01} value={ui.explode} onChange={(event) => setUI({ explode: Number(event.target.value) })} />
      </label>
      {project.parts.length <= 1 && (
        <div className="viewport-hint">
          <strong>Start a vehicle</strong>
          <p>Add parametric parts from the library, or load a coupe, sedan, or pickup.</p>
        </div>
      )}
    </div>
  );
}
