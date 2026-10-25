import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export function downloadSTL(root: THREE.Object3D, filename: string) {
  const exporter = new STLExporter();
  const data = exporter.parse(root, { binary: true });
  const blob = new Blob([data as unknown as BlobPart], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
