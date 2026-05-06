import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

/**
 * Exports a Three.js Object3D (or Scene) as a .glb binary file
 * and triggers a browser download.
 */
export async function exportSceneAsGLB(
  scene: THREE.Object3D,
  filename = "model.glb"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: "model/gltf-binary" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error("Expected binary GLB output"));
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

/**
 * Builds a standalone Three.js scene from pergola parameters
 * (without needing the React canvas) for server-side or export use.
 */
export function buildPergolaScene(params: {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  postCount: number;
  postSizeIn: number;
  beamSizeIn: number;
  louverSpacingIn: number;
  louverSizeIn: number;
  hasGlass: boolean;
  finishColor: string;
}): THREE.Group {
  const FT = 0.3048;
  const ft = (v: number) => v * FT;
  const inch = (v: number) => (v * FT) / 12;

  const {
    widthFt, depthFt, heightFt, postCount,
    postSizeIn, beamSizeIn, louverSpacingIn, louverSizeIn,
    hasGlass, finishColor,
  } = params;

  const W = ft(widthFt);
  const D = ft(depthFt);
  const H = ft(heightFt);
  const postS = inch(postSizeIn);
  const beamH = inch(beamSizeIn);
  const beamW = inch(Math.max(beamSizeIn, 4));
  const louverSpacing = inch(louverSpacingIn);
  const louverW = inch(louverSizeIn);
  const louverThick = inch(1.5);

  const alumMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finishColor),
    metalness: 0.85,
    roughness: 0.25,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#a8d8ea"),
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();

  const addBox = (
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    mat: THREE.Material
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const n = Math.max(postCount, 2);

  // Posts
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (i / (n - 1)) * W;
    addBox(x, H / 2, D / 2, postS, H, postS, alumMat);   // front
    addBox(x, H / 2, -D / 2, postS, H, postS, alumMat);  // back
  }

  // Front & back beams
  addBox(0, H + beamH / 2, D / 2, W, beamH, beamW, alumMat);
  addBox(0, H + beamH / 2, -D / 2, W, beamH, beamW, alumMat);

  // Side purlins
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (i / (n - 1)) * W;
    addBox(x, H + beamH / 2, 0, beamW, beamH, D, alumMat);
  }

  // Louver slats
  const roofY = H + beamH + louverThick / 2;
  const slatCount = Math.floor(D / louverSpacing);
  for (let i = 0; i <= slatCount; i++) {
    const z = -D / 2 + i * louverSpacing;
    addBox(0, roofY, z, W, louverThick, louverW, alumMat);
  }

  // Glass panel (front face)
  if (hasGlass) {
    addBox(0, H / 2, D / 2, W, H, 0.012, glassMat);
  }

  // Slab
  const slabMat = new THREE.MeshStandardMaterial({ color: "#d0ccc8", roughness: 0.9 });
  addBox(0, -0.02, 0, W + 0.3, 0.04, D + 0.3, slabMat);

  return group;
}
