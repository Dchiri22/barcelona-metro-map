/**
 * Higher-detail wheelchair + seated person (reference-inspired).
 * Procedural meshes — no external GLB dependency.
 */

import * as THREE from "three";
import { createAvatarTextures, type AvatarTextureSet } from "@/app/simulator/wheelchairTextures";

const COL = {
  metal: 0xb8bcc4,
  metalDark: 0x6b7280,
  chrome: 0xe8eaed,
  tire: 0x121212,
  rim: 0xd1d5db,
  seat: 0x1a1a1e,
  cushion: 0x222226,
  skin: 0xe8c4a8,
  skinShadow: 0xd4a88c,
  hair: 0x4a3428,
  beard: 0x3d2a22,
  shirt: 0x9ca3af,
  shirtDark: 0x6b7280,
  pants: 0x374151,
  shoe: 0xf3f4f6,
  shoeSole: 0xe5e7eb,
  watch: 0x111827,
};

function phys(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    envMapIntensity: 0.55,
    ...opts,
  });
}

function rubber(tex: AvatarTextureSet) {
  return phys(COL.tire, {
    map: tex.rubber.map,
    normalMap: tex.rubber.normalMap,
    roughnessMap: tex.rubber.roughnessMap,
    roughness: 0.95,
    metalness: 0,
  });
}

function brushedMetal(tex: AvatarTextureSet, color = COL.metal) {
  return phys(color, {
    normalMap: tex.metalBrush.normalMap,
    roughnessMap: tex.metalBrush.roughnessMap,
    metalness: 0.72,
    roughness: 0.38,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  });
}

function chrome(tex: AvatarTextureSet) {
  return phys(COL.chrome, {
    normalMap: tex.metalBrush.normalMap,
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });
}

function fabric(tex: AvatarTextureSet, color: number) {
  return phys(color, {
    map: tex.fabric.map,
    normalMap: tex.fabric.normalMap,
    roughnessMap: tex.fabric.roughnessMap,
    roughness: 0.9,
    metalness: 0,
  });
}

function leather(tex: AvatarTextureSet, color: number) {
  return phys(color, {
    map: tex.leather.map,
    normalMap: tex.leather.normalMap,
    roughness: 0.82,
    metalness: 0.05,
  });
}

function skinM(color = COL.skin) {
  return phys(color, {
    roughness: 0.55,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0xffe0c8),
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
  segs = 12,
) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segs), material);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Wheel lies in YZ plane; axle = local X. Spin with roll.rotation.x */
const AXLE_X: [number, number, number] = [0, 0, Math.PI / 2];
/** Torus default is XY (hole Z) → rotate Y 90° so hole is along X */
const TORUS_AXLE_X: [number, number, number] = [0, Math.PI / 2, 0];

function createRearWheel(side: -1 | 1, tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * 0.44, 0.36, -0.04);

  const roll = new THREE.Group();
  g.add(roll);
  g.userData.rollGroup = roll;

  const tireM = rubber(tex);
  const rimM = brushedMetal(tex, COL.rim);
  const spokeM = chrome(tex);

  // All parts share axle X so they roll as one rigid wheel
  addMesh(roll, new THREE.TorusGeometry(0.35, 0.048, 18, 48), tireM, [0, 0, 0], TORUS_AXLE_X);
  addMesh(roll, new THREE.CylinderGeometry(0.28, 0.28, 0.05, 28), rimM, [0, 0, 0], AXLE_X);
  addMesh(roll, new THREE.TorusGeometry(0.3, 0.012, 12, 40), spokeM, [0, 0, 0], TORUS_AXLE_X);
  addMesh(roll, new THREE.TorusGeometry(0.18, 0.01, 10, 32), spokeM, [0, 0, 0], TORUS_AXLE_X);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    // Spokes in YZ plane (radial from axle X)
    addMesh(
      roll,
      new THREE.BoxGeometry(0.012, 0.28, 0.014),
      spokeM,
      [0, Math.cos(a) * 0.14, Math.sin(a) * 0.14],
      [a, 0, 0],
    );
  }

  addMesh(roll, new THREE.CylinderGeometry(0.045, 0.045, 0.09, 18), brushedMetal(tex, COL.metalDark), [0, 0, 0], AXLE_X);
  // Handrim — offset outward along axle (local X)
  addMesh(roll, new THREE.TorusGeometry(0.38, 0.016, 12, 40), chrome(tex), [side * 0.055, 0, 0], TORUS_AXLE_X);
  return g;
}

function createCaster(side: -1 | 1, tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * 0.28, 0.13, 0.5);
  const metalM = brushedMetal(tex);

  tube(g, new THREE.Vector3(0, 0.14, 0), new THREE.Vector3(0, 0.02, 0.02), 0.016, metalM, 10);
  addMesh(g, new THREE.SphereGeometry(0.04, 16, 16), metalM, [0, 0.02, 0.02]);

  const wheel = new THREE.Group();
  wheel.position.set(0, -0.02, 0.07);
  const roll = new THREE.Group();
  wheel.add(roll);
  wheel.userData.rollGroup = roll;
  addMesh(roll, new THREE.TorusGeometry(0.095, 0.026, 14, 28), rubber(tex), [0, 0, 0], TORUS_AXLE_X);
  addMesh(roll, new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20), brushedMetal(tex, COL.rim), [0, 0, 0], AXLE_X);
  g.add(wheel);
  g.userData.casterWheel = wheel;
  return g;
}

function createPerson(tex: AvatarTextureSet): THREE.Group {
  const g = new THREE.Group();
  const skin = skinM();
  const skinD = skinM(COL.skinShadow);
  const shirt = fabric(tex, COL.shirt);
  const shirtDark = fabric(tex, COL.shirtDark);
  const pants = fabric(tex, COL.pants);
  const shoe = leather(tex, COL.shoe);
  const sole = leather(tex, COL.shoeSole);
  const hair = fabric(tex, COL.hair);
  const beard = fabric(tex, COL.beard);

  // Pelvis / hips on seat
  addMesh(g, new THREE.SphereGeometry(0.2, 20, 16), pants, [0, 0.58, 0.1], [0, 0, 0], [1.15, 0.7, 1.05]);

  // Thighs (seated forward)
  addMesh(g, new THREE.CapsuleGeometry(0.095, 0.28, 8, 16), pants, [-0.14, 0.58, 0.32], [1.15, 0.1, 0]);
  addMesh(g, new THREE.CapsuleGeometry(0.095, 0.28, 8, 16), pants, [0.14, 0.58, 0.32], [1.15, -0.1, 0]);

  // Lower legs + feet
  addMesh(g, new THREE.CapsuleGeometry(0.075, 0.26, 8, 14), pants, [-0.16, 0.32, 0.55], [0.35, 0.05, 0]);
  addMesh(g, new THREE.CapsuleGeometry(0.075, 0.26, 8, 14), pants, [0.16, 0.32, 0.55], [0.35, -0.05, 0]);
  addMesh(g, new THREE.BoxGeometry(0.12, 0.07, 0.22), shoe, [-0.16, 0.12, 0.68]);
  addMesh(g, new THREE.BoxGeometry(0.12, 0.07, 0.22), shoe, [0.16, 0.12, 0.68]);
  addMesh(g, new THREE.BoxGeometry(0.11, 0.025, 0.2), sole, [-0.16, 0.085, 0.68]);
  addMesh(g, new THREE.BoxGeometry(0.11, 0.025, 0.2), sole, [0.16, 0.085, 0.68]);

  // Torso (grey shirt)
  addMesh(g, new THREE.CapsuleGeometry(0.2, 0.38, 10, 18), shirt, [0, 0.95, 0.02], [0.12, 0, 0], [1.05, 1, 0.88]);
  // Collar / placket hint
  addMesh(g, new THREE.BoxGeometry(0.12, 0.08, 0.04), shirtDark, [0, 1.18, 0.14], [0.2, 0, 0]);
  addMesh(g, new THREE.BoxGeometry(0.02, 0.28, 0.01), shirtDark, [0, 0.98, 0.17], [0.12, 0, 0]);

  // Shoulders
  addMesh(g, new THREE.SphereGeometry(0.1, 16, 14), shirt, [-0.24, 1.16, 0.02]);
  addMesh(g, new THREE.SphereGeometry(0.1, 16, 14), shirt, [0.24, 1.16, 0.02]);

  // Upper arms (rolled sleeves)
  addMesh(g, new THREE.CapsuleGeometry(0.07, 0.2, 8, 14), shirt, [-0.34, 0.95, 0.08], [0.4, 0, 0.35]);
  addMesh(g, new THREE.CapsuleGeometry(0.07, 0.2, 8, 14), shirt, [0.34, 0.95, 0.08], [0.4, 0, -0.35]);
  // Forearms (skin — rolled sleeves)
  addMesh(g, new THREE.CapsuleGeometry(0.055, 0.2, 8, 14), skin, [-0.38, 0.72, 0.22], [0.85, 0.15, 0.2]);
  addMesh(g, new THREE.CapsuleGeometry(0.055, 0.2, 8, 14), skin, [0.38, 0.72, 0.22], [0.85, -0.15, -0.2]);

  // Hands on thighs
  addMesh(g, new THREE.SphereGeometry(0.055, 14, 12), skin, [-0.28, 0.62, 0.38], [0, 0, 0], [1.1, 0.7, 1.3]);
  addMesh(g, new THREE.SphereGeometry(0.055, 14, 12), skin, [0.28, 0.62, 0.38], [0, 0, 0], [1.1, 0.7, 1.3]);

  // Watch (left wrist)
  addMesh(g, new THREE.TorusGeometry(0.045, 0.012, 10, 20), phys(COL.watch, { metalness: 0.6, roughness: 0.4 }), [0.38, 0.72, 0.22], [0.85, -0.15, -0.2]);

  // Neck + head
  addMesh(g, new THREE.CylinderGeometry(0.055, 0.065, 0.1, 14), skin, [0, 1.28, 0.06]);
  addMesh(g, new THREE.SphereGeometry(0.155, 24, 22), skin, [0, 1.44, 0.05]);
  // Ears
  addMesh(g, new THREE.SphereGeometry(0.035, 12, 10), skinD, [-0.145, 1.44, 0.04], [0, 0, 0], [0.6, 1, 0.8]);
  addMesh(g, new THREE.SphereGeometry(0.035, 12, 10), skinD, [0.145, 1.44, 0.04], [0, 0, 0], [0.6, 1, 0.8]);
  // Nose
  addMesh(g, new THREE.SphereGeometry(0.028, 10, 8), skinD, [0, 1.42, 0.18], [0, 0, 0], [0.7, 0.9, 1.1]);
  // Short hair
  addMesh(g, new THREE.SphereGeometry(0.16, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.1), hair, [0, 1.48, 0.03]);
  addMesh(g, new THREE.SphereGeometry(0.12, 14, 12), hair, [0, 1.52, -0.02], [0, 0, 0], [1.1, 0.6, 1]);
  // Beard / stubble volume
  addMesh(g, new THREE.SphereGeometry(0.12, 16, 12), beard, [0, 1.34, 0.1], [0.15, 0, 0], [0.95, 0.75, 0.9]);

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

  // Silver tubular frame
  tube(root, new THREE.Vector3(-0.4, 0.42, -0.18), new THREE.Vector3(-0.32, 0.42, 0.52), 0.02, frameM, 14);
  tube(root, new THREE.Vector3(0.4, 0.42, -0.18), new THREE.Vector3(0.32, 0.42, 0.52), 0.02, frameM, 14);
  tube(root, new THREE.Vector3(-0.4, 0.42, -0.18), new THREE.Vector3(0.4, 0.42, -0.18), 0.02, frameDark, 14);
  tube(root, new THREE.Vector3(-0.32, 0.42, 0.52), new THREE.Vector3(0.32, 0.42, 0.52), 0.018, frameM, 14);
  // Cross brace under seat
  tube(root, new THREE.Vector3(-0.28, 0.38, 0.05), new THREE.Vector3(0.28, 0.38, 0.25), 0.014, frameDark, 10);
  tube(root, new THREE.Vector3(0.28, 0.38, 0.05), new THREE.Vector3(-0.28, 0.38, 0.25), 0.014, frameDark, 10);

  // Seat + backrest (black cushion)
  addMesh(root, new THREE.BoxGeometry(0.7, 0.08, 0.5), seatM, [0, 0.48, 0.1]);
  addMesh(root, new THREE.BoxGeometry(0.66, 0.07, 0.46), cushionM, [0, 0.54, 0.1]);
  addMesh(root, new THREE.BoxGeometry(0.66, 0.48, 0.06), seatM, [0, 0.8, -0.12], [0.2, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.6, 0.4, 0.045), cushionM, [0, 0.82, -0.08], [0.2, 0, 0]);

  // Armrests
  addMesh(root, new THREE.BoxGeometry(0.07, 0.045, 0.36), padM, [-0.4, 0.62, 0.14]);
  addMesh(root, new THREE.BoxGeometry(0.07, 0.045, 0.36), padM, [0.4, 0.62, 0.14]);
  tube(root, new THREE.Vector3(-0.4, 0.5, -0.05), new THREE.Vector3(-0.4, 0.62, -0.05), 0.014, frameM);
  tube(root, new THREE.Vector3(0.4, 0.5, -0.05), new THREE.Vector3(0.4, 0.62, -0.05), 0.014, frameM);

  // Footrest
  addMesh(root, new THREE.BoxGeometry(0.5, 0.03, 0.2), frameDark, [0, 0.16, 0.58]);
  tube(root, new THREE.Vector3(-0.2, 0.42, 0.45), new THREE.Vector3(-0.2, 0.16, 0.55), 0.012, frameM);
  tube(root, new THREE.Vector3(0.2, 0.42, 0.45), new THREE.Vector3(0.2, 0.16, 0.55), 0.012, frameM);

  // Push handles
  tube(root, new THREE.Vector3(-0.26, 0.95, -0.22), new THREE.Vector3(-0.26, 1.12, -0.36), 0.015, frameM);
  tube(root, new THREE.Vector3(0.26, 0.95, -0.22), new THREE.Vector3(0.26, 1.12, -0.36), 0.015, frameM);
  addMesh(root, new THREE.CylinderGeometry(0.018, 0.018, 0.58, 14), chrome(tex), [0, 1.12, -0.36], [0, 0, Math.PI / 2]);
  addMesh(root, new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12), rubber(tex), [-0.29, 1.12, -0.36], [0, 0, Math.PI / 2]);
  addMesh(root, new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12), rubber(tex), [0.29, 1.12, -0.36], [0, 0, Math.PI / 2]);

  // Anti-tip wheels
  addMesh(root, new THREE.SphereGeometry(0.045, 14, 12), frameDark, [-0.36, 0.1, -0.34]);
  addMesh(root, new THREE.SphereGeometry(0.045, 14, 12), frameDark, [0.36, 0.1, -0.34]);

  root.add(createPerson(tex));

  root.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.computeBoundingSphere();
      const r = c.geometry.boundingSphere?.radius ?? 0;
      c.castShadow = r > 0.12;
      c.receiveShadow = false;
    }
  });

  return { root, rearWheels, casterGroups };
}

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
