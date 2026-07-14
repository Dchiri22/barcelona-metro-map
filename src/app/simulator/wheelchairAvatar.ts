/**
 * Stylized wheelchair + seated person — PBR materials & procedural textures.
 */

import * as THREE from "three";
import { createAvatarTextures, type AvatarTextureSet } from "@/app/simulator/wheelchairTextures";

const COL = {
  metal: 0x8a8a93,
  metalDark: 0x52525b,
  chrome: 0xe4e4e7,
  tire: 0x141210,
  rim: 0xb8bcc4,
  seat: 0x1c1c20,
  cushion: 0x2a2520,
  skin: 0xe8b796,
  hair: 0x3d2c1e,
  shirt: 0x5b4fcf,
  jacket: 0x4338ca,
  pants: 0x374151,
  shoe: 0x1f2937,
};

function phys(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    envMapIntensity: 0.12,
    ...opts,
  });
}

function rubber(tex: AvatarTextureSet) {
  return phys(COL.tire, {
    map: tex.rubber.map,
    normalMap: tex.rubber.normalMap,
    roughnessMap: tex.rubber.roughnessMap,
    roughness: 0.96,
    metalness: 0,
    clearcoat: 0,
    envMapIntensity: 0.12,
  });
}

function brushedMetal(tex: AvatarTextureSet, color = COL.metal) {
  return phys(color, {
    normalMap: tex.metalBrush.normalMap,
    roughnessMap: tex.metalBrush.roughnessMap,
    metalness: 0.45,
    roughness: 0.72,
    clearcoat: 0,
    envMapIntensity: 0.15,
  });
}

function chrome(tex: AvatarTextureSet) {
  return phys(COL.chrome, {
    normalMap: tex.metalBrush.normalMap,
    metalness: 0.6,
    roughness: 0.48,
    clearcoat: 0,
    envMapIntensity: 0.18,
  });
}

function fabric(tex: AvatarTextureSet, color: number) {
  return phys(color, {
    map: tex.fabric.map,
    normalMap: tex.fabric.normalMap,
    roughnessMap: tex.fabric.roughnessMap,
    roughness: 0.92,
    metalness: 0,
    clearcoat: 0,
    envMapIntensity: 0.15,
  });
}

function leather(tex: AvatarTextureSet, color: number) {
  return phys(color, {
    map: tex.leather.map,
    normalMap: tex.leather.normalMap,
    roughness: 0.86,
    metalness: 0,
    clearcoat: 0,
    envMapIntensity: 0.12,
  });
}

function skinM() {
  return phys(COL.skin, {
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0,
    envMapIntensity: 0.18,
  });
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function tube(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 16), material);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  parent.add(m);
}

function createRearWheel(side: -1 | 1, tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * 0.42, 0.36, -0.02);

  const roll = new THREE.Group();
  g.add(roll);
  g.userData.rollGroup = roll;

  const tireM = rubber(tex);
  const rimM = brushedMetal(tex, COL.rim);
  const spokeM = chrome(tex);

  addMesh(roll, new THREE.TorusGeometry(0.34, 0.055, 16, 40), tireM, [0, 0, 0], [Math.PI / 2, 0, 0]);
  addMesh(roll, new THREE.CylinderGeometry(0.27, 0.27, 0.06, 24), rimM, [0, 0, 0], [0, 0, Math.PI / 2]);
  addMesh(roll, new THREE.TorusGeometry(0.3, 0.018, 10, 32), spokeM, [0, 0, 0], [Math.PI / 2, 0, 0]);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addMesh(roll, new THREE.BoxGeometry(0.025, 0.24, 0.02), spokeM, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0], [0, 0, a]);
  }

  addMesh(roll, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), brushedMetal(tex, COL.metalDark), [0, 0, 0], [0, 0, Math.PI / 2]);
  addMesh(roll, new THREE.TorusGeometry(0.38, 0.022, 10, 36), brushedMetal(tex), [0, 0, side * 0.04], [Math.PI / 2, 0, 0]);
  return g;
}

function createCaster(side: -1 | 1, tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * 0.3, 0.14, 0.52);
  const metalM = brushedMetal(tex);

  tube(g, new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(0, 0, 0), 0.018, metalM);
  addMesh(g, new THREE.SphereGeometry(0.045, 14, 14), metalM, [0, 0, 0]);

  const wheel = new THREE.Group();
  wheel.position.set(0, -0.02, 0.06);
  const roll = new THREE.Group();
  wheel.add(roll);
  wheel.userData.rollGroup = roll;
  addMesh(roll, new THREE.TorusGeometry(0.1, 0.028, 12, 24), rubber(tex), [0, 0, 0], [Math.PI / 2, 0, 0]);
  addMesh(roll, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 18), brushedMetal(tex, COL.rim), [0, 0, 0], [0, 0, Math.PI / 2]);
  g.add(wheel);
  g.userData.casterWheel = wheel;
  return g;
}

function createPerson(tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  const skin = skinM();
  const shirt = fabric(tex, COL.shirt);
  const jacket = fabric(tex, COL.jacket);
  const pants = fabric(tex, COL.pants);
  const shoe = leather(tex, COL.shoe);

  addMesh(g, new THREE.CapsuleGeometry(0.22, 0.32, 8, 16), jacket, [0, 1.02, 0.02], [0.18, 0, 0], [1, 1.05, 0.85]);
  addMesh(g, new THREE.SphereGeometry(0.19, 20, 20), skin, [0, 1.38, 0.04]);
  addMesh(g, new THREE.SphereGeometry(0.195, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), fabric(tex, COL.hair), [0, 1.42, 0.02]);
  addMesh(g, new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12), skin, [0, 1.22, 0.04]);
  addMesh(g, new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), pants, [-0.12, 0.62, 0.22], [1.05, 0.15, 0.1]);
  addMesh(g, new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), pants, [0.12, 0.62, 0.22], [1.05, -0.15, -0.1]);
  addMesh(g, new THREE.BoxGeometry(0.12, 0.08, 0.22), shoe, [-0.12, 0.48, 0.38]);
  addMesh(g, new THREE.BoxGeometry(0.12, 0.08, 0.22), shoe, [0.12, 0.48, 0.38]);
  addMesh(g, new THREE.CapsuleGeometry(0.06, 0.28, 6, 12), shirt, [-0.34, 0.92, 0.08], [0.4, 0, 0.65], [1, 1, 1.1]);
  addMesh(g, new THREE.CapsuleGeometry(0.06, 0.28, 6, 12), shirt, [0.34, 0.92, 0.08], [0.4, 0, -0.65], [1, 1, 1.1]);
  addMesh(g, new THREE.SphereGeometry(0.055, 12, 12), skin, [-0.46, 0.82, 0.18]);
  addMesh(g, new THREE.SphereGeometry(0.055, 12, 12), skin, [0.46, 0.82, 0.18]);
  return g;
}

export type WheelchairAvatarParts = {
  root: THREE.Group;
  rearWheels: THREE.Group[];
  casterGroups: THREE.Group[];
};

export function buildWheelchairAvatar(textures?: AvatarTextureSet): WheelchairAvatarParts {
  const tex = textures ?? createAvatarTextures();
  const root = new THREE.Group();
  const frameM = brushedMetal(tex);
  const frameDark = brushedMetal(tex, COL.metalDark);
  const seatM = fabric(tex, COL.seat);
  const cushionM = leather(tex, COL.cushion);
  const padM = leather(tex, 0x0a0a0a);

  const rearWheels = [createRearWheel(-1, tex), createRearWheel(1, tex)];
  const casterGroups = [createCaster(-1, tex), createCaster(1, tex)];
  rearWheels.forEach((w) => root.add(w));
  casterGroups.forEach((c) => root.add(c));

  tube(root, new THREE.Vector3(-0.38, 0.42, -0.15), new THREE.Vector3(-0.32, 0.42, 0.55), 0.022, frameM);
  tube(root, new THREE.Vector3(0.38, 0.42, -0.15), new THREE.Vector3(0.32, 0.42, 0.55), 0.022, frameM);
  tube(root, new THREE.Vector3(-0.38, 0.42, -0.15), new THREE.Vector3(0.38, 0.42, -0.15), 0.022, frameDark);
  tube(root, new THREE.Vector3(-0.32, 0.42, 0.55), new THREE.Vector3(0.32, 0.42, 0.55), 0.02, frameM);

  addMesh(root, new THREE.BoxGeometry(0.72, 0.1, 0.52), seatM, [0, 0.5, 0.08]);
  addMesh(root, new THREE.BoxGeometry(0.68, 0.06, 0.48), cushionM, [0, 0.56, 0.08]);
  addMesh(root, new THREE.BoxGeometry(0.68, 0.52, 0.07), seatM, [0, 0.82, -0.14], [0.22, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.62, 0.44, 0.04), cushionM, [0, 0.84, -0.1], [0.22, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.07, 0.05, 0.38), padM, [-0.4, 0.62, 0.12]);
  addMesh(root, new THREE.BoxGeometry(0.07, 0.05, 0.38), padM, [0.4, 0.62, 0.12]);
  tube(root, new THREE.Vector3(-0.4, 0.62, -0.05), new THREE.Vector3(-0.4, 0.62, 0.32), 0.018, frameM);
  tube(root, new THREE.Vector3(0.4, 0.62, -0.05), new THREE.Vector3(0.4, 0.62, 0.32), 0.018, frameM);
  addMesh(root, new THREE.BoxGeometry(0.52, 0.04, 0.22), frameDark, [0, 0.38, 0.48]);
  tube(root, new THREE.Vector3(-0.22, 0.42, 0.42), new THREE.Vector3(-0.22, 0.38, 0.48), 0.015, frameM);
  tube(root, new THREE.Vector3(0.22, 0.42, 0.42), new THREE.Vector3(0.22, 0.38, 0.48), 0.015, frameM);
  tube(root, new THREE.Vector3(-0.28, 0.95, -0.28), new THREE.Vector3(-0.28, 1.08, -0.38), 0.016, frameM);
  tube(root, new THREE.Vector3(0.28, 0.95, -0.28), new THREE.Vector3(0.28, 1.08, -0.38), 0.016, frameM);
  addMesh(root, new THREE.CylinderGeometry(0.018, 0.018, 0.62, 12), chrome(tex), [0, 1.06, -0.36], [0, 0, Math.PI / 2]);
  addMesh(root, new THREE.SphereGeometry(0.05, 12, 12), frameDark, [-0.38, 0.12, -0.32]);
  addMesh(root, new THREE.SphereGeometry(0.05, 12, 12), frameDark, [0.38, 0.12, -0.32]);

  root.add(createPerson(tex));
  addMesh(root, new THREE.BoxGeometry(0.64, 0.04, 0.02), fabric(tex, COL.shirt), [0, 0.88, -0.08], [0.22, 0, 0]);

  root.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return { root, rearWheels, casterGroups };
}

/** Rotate wheels proportional to distance traveled (world Z-forward rolling). */
export function spinWheelchairWheels(
  rearWheels: THREE.Group[],
  casterGroups: THREE.Group[],
  distance: number,
) {
  const angle = distance * 2.8;
  if (angle < 1e-5) return;

  for (const w of rearWheels) {
    const roll = w.userData.rollGroup as THREE.Group | undefined;
    if (roll) roll.rotation.x += angle;
  }
  for (const c of casterGroups) {
    const wheel = c.userData.casterWheel as THREE.Group | undefined;
    const roll = wheel?.userData.rollGroup as THREE.Group | undefined;
    if (roll) roll.rotation.x += angle * 1.15;
  }
}
