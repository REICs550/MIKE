import * as THREE from "three";

/**
 * Thickened parametric surface. u and v run 0..1 across the sample grid.
 * The sheet is centered on the sampled surface, offset along the normal.
 */
export function parametricSheet(
  segmentsU: number,
  segmentsV: number,
  sample: (u: number, v: number) => THREE.Vector3,
  thickness: number,
): THREE.BufferGeometry {
  const nu = Math.max(2, segmentsU + 1);
  const nv = Math.max(2, segmentsV + 1);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      pts.push(sample(i / (nu - 1), j / (nv - 1)));
    }
  }
  const at = (i: number, j: number) => pts[i * nv + j];
  const nrm: THREE.Vector3[] = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(nu - 1, i + 1);
      const j0 = Math.max(0, j - 1);
      const j1 = Math.min(nv - 1, j + 1);
      const du = at(i1, j).clone().sub(at(i0, j));
      const dv = at(i, j1).clone().sub(at(i, j0));
      const n = du.cross(dv);
      if (n.lengthSq() < 1e-10) n.set(0, 1, 0);
      else n.normalize();
      nrm.push(n);
    }
  }

  const positions: number[] = [];
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    pushTri(a, b, c);
    pushTri(a, c, d);
  };

  const half = Math.max(0.2, thickness) / 2;
  const outer = pts.map((p, k) => p.clone().addScaledVector(nrm[k], half));
  const inner = pts.map((p, k) => p.clone().addScaledVector(nrm[k], -half));
  const id = (i: number, j: number) => i * nv + j;

  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = id(i, j);
      const b = id(i, j + 1);
      const c = id(i + 1, j + 1);
      const d = id(i + 1, j);
      quad(outer[a], outer[b], outer[c], outer[d]);
      quad(inner[a], inner[d], inner[c], inner[b]);
    }
  }

  const stitch = (loop: number[]) => {
    for (let k = 0; k < loop.length - 1; k++) {
      const a = loop[k];
      const b = loop[k + 1];
      quad(outer[a], inner[a], inner[b], outer[b]);
    }
  };
  const edgeI0: number[] = [];
  const edgeI1: number[] = [];
  const edgeJ0: number[] = [];
  const edgeJ1: number[] = [];
  for (let j = 0; j < nv; j++) {
    edgeI0.push(id(0, j));
    edgeI1.push(id(nu - 1, j));
  }
  for (let i = 0; i < nu; i++) {
    edgeJ0.push(id(i, 0));
    edgeJ1.push(id(i, nv - 1));
  }
  stitch(edgeI0);
  stitch(edgeI1);
  stitch(edgeJ0);
  stitch(edgeJ1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => m?.dispose());
  });
}
