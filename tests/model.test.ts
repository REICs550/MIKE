import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { DEFAULTS, wheelRadius } from "../src/catalog";
import { reduceHistory, type History } from "../src/history";
import { parseProjectFile, serializeProject } from "../src/io";
import { disposeObject, parametricSheet } from "../src/lib/sheet";
import { partMass } from "../src/measure";
import { buildPart } from "../src/parts/build";
import { buildTemplate } from "../src/templates";
import { PART_KINDS, type Part } from "../src/types";

function history(project = buildTemplate("chassis")): History {
  return { past: [], present: project, future: [] };
}

function finiteGeometry(part: Part) {
  const root = buildPart(part);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.length() > 10, `${part.kind} has no size`);
  assert.ok(size.length() < 20000, `${part.kind} is unexpectedly huge`);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const attr = mesh.geometry.getAttribute("position");
    assert.ok(attr && attr.count > 0, `${part.kind} missing positions`);
    for (let i = 0; i < attr.count; i += Math.max(1, Math.floor(attr.count / 25))) {
      assert.ok(Number.isFinite(attr.getX(i)) && Number.isFinite(attr.getY(i)) && Number.isFinite(attr.getZ(i)));
    }
  });
  disposeObject(root);
}

describe("vehicle templates", () => {
  it("builds a coupe, sedan, and pickup with the right major parts", () => {
    const coupe = buildTemplate("coupe");
    const sedan = buildTemplate("sedan");
    const truck = buildTemplate("truck");
    for (const project of [coupe, sedan, truck]) {
      const ids = new Set(project.parts.map((part) => part.id));
      assert.equal(ids.size, project.parts.length);
      assert.equal(project.parts.filter((part) => part.kind === "wheel").length, 4);
      assert.equal(project.parts.filter((part) => part.kind === "engine").length, 1);
    }
    assert.equal(coupe.parts.filter((part) => part.kind === "door").length, 2);
    assert.equal(sedan.parts.filter((part) => part.kind === "door").length, 4);
    assert.equal(truck.parts.filter((part) => part.kind === "bed").length, 1);
    assert.equal(coupe.parts.filter((part) => part.kind === "bed").length, 0);
    assert.ok(coupe.parts.some((part) => part.kind === "spoiler"));
  });

  it("keeps the front tires inside the body", () => {
    for (const id of ["coupe", "sedan", "truck"] as const) {
      const project = buildTemplate(id);
      const wheel = project.parts.find((part) => part.name === "Front right wheel");
      const fender = project.parts.find((part) => part.name === "Front right fender");
      assert.ok(wheel && fender);
      const outerTire = wheel.xform.x + wheel.params.width / 2;
      assert.ok(fender.xform.x + 8 > outerTire, `${id} tire sticks through the fender`);
    }
  });

  it("estimates a plausible coupe mass and responds to thickness", () => {
    const coupe = buildTemplate("coupe");
    const mass = coupe.parts.reduce((sum, part) => sum + partMass(part), 0);
    assert.ok(mass > 700 && mass < 2600, `coupe mass ${mass}`);
    const hood = coupe.parts.find((part) => part.kind === "hood")!;
    const heavier = partMass({ ...hood, params: { ...hood.params, thickness: hood.params.thickness + 4 } });
    assert.ok(heavier > partMass(hood));
  });
});

describe("parts", () => {
  it("computes wheel radius from rim, width, and aspect", () => {
    const radius = wheelRadius({ rim: 18, width: 225, aspect: 45 });
    assert.ok(Math.abs(radius - ((18 * 25.4) / 2 + 225 * 0.45)) < 0.001);
  });

  it("builds every catalog part without broken geometry", () => {
    for (const kind of PART_KINDS) {
      finiteGeometry({
        id: kind,
        kind,
        name: kind,
        params: { ...DEFAULTS[kind] },
        xform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
        finish: { color: "#888888", metalness: 0.4, roughness: 0.4, clearcoat: 0.2, opacity: 1 },
        visible: true,
        locked: false,
      });
    }
  });

  it("thickens a sheet into a solid with finite vertices", () => {
    const geo = parametricSheet(4, 3, (u, v) => new THREE.Vector3(u * 100, Math.sin(u * Math.PI) * 8, v * 40), 4);
    const pos = geo.getAttribute("position");
    assert.ok(pos.count > 20);
    geo.computeBoundingBox();
    assert.ok((geo.boundingBox?.max.y ?? 0) - (geo.boundingBox?.min.y ?? 0) > 3);
    geo.dispose();
  });
});

describe("history and files", () => {
  it("undo restores a dimension", () => {
    let state = history();
    const part = state.present.parts[0];
    const key = "length";
    const before = part.params[key];
    state = reduceHistory(state, { type: "checkpoint" });
    state = reduceHistory(state, { type: "set-param", id: part.id, key, value: before + 80, record: false });
    assert.equal(state.present.parts[0].params[key], before + 80);
    state = reduceHistory(state, { type: "undo" });
    assert.equal(state.present.parts[0].params[key], before);
    state = reduceHistory(state, { type: "redo" });
    assert.equal(state.present.parts[0].params[key], before + 80);
  });

  it("round-trips a project file and drops unknown parts", () => {
    const project = buildTemplate("corner");
    const parsed = parseProjectFile(JSON.parse(serializeProject(project)));
    assert.ok(parsed);
    assert.equal(parsed!.parts.length, project.parts.length);
    assert.equal(parsed!.name, project.name);
    const junk = parseProjectFile({ project: { name: "x", parts: [{ kind: "wing" }, ...project.parts] } });
    assert.equal(junk?.parts.length, project.parts.length);
    assert.equal(parseProjectFile({ hello: true }), null);
  });
});
