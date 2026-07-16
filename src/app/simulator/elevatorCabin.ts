/**
 * Moving metro elevator: static shaft + landing doors, one cabin that rides with the avatar.
 */

import * as THREE from "three";

export type ElevatorHandle = {
  root: THREE.Group;
  cabin: THREE.Group;
  /** Landing + cabin door groups to animate */
  doorGroups: THREE.Group[];
  colliders: THREE.Mesh[];
  x: number;
  z: number;
  floors: number[];
  radius: number;
};

const METAL = 0x8a939e;
const METAL_DARK = 0x4b5563;
const STEEL = 0xc5cbd3;
const INTERIOR = 0xd4d8de;
const FLOOR_IN = 0x6b7280;

function metal(color = METAL, roughness = 0.35, metalness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1 });
}

function makeSign(text: string, bg: string, w = 256, h = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(h * 0.32)}px system-ui,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast = true,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cheapGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8e0f0,
    transparent: true,
    opacity: 0.32,
    roughness: 0.12,
    metalness: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function doorLeaf(width: number, height: number): THREE.Group {
  const g = new THREE.Group();
  const body = metal(STEEL, 0.28, 0.75);
  const glass = cheapGlass();
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  const frame = metal(METAL_DARK, 0.4, 0.6);

  mesh(g, new THREE.BoxGeometry(width, height, 0.06), body, 0, 0, 0);
  mesh(g, new THREE.BoxGeometry(width * 0.42, height * 0.38, 0.04), glass, 0, height * 0.12, 0.02, false);
  mesh(g, new THREE.BoxGeometry(width * 0.46, 0.03, 0.05), frame, 0, height * 0.12 + height * 0.19, 0.035, false);
  mesh(g, new THREE.BoxGeometry(width * 0.46, 0.03, 0.05), frame, 0, height * 0.12 - height * 0.19, 0.035, false);
  mesh(g, new THREE.BoxGeometry(width * 0.96, height * 0.18, 0.065), metal(METAL_DARK), 0, -height * 0.38, 0.01, false);
  mesh(g, new THREE.BoxGeometry(0.02, height * 0.98, 0.07), rubber, width * 0.48, 0, 0, false);
  return g;
}

function attachDoorPair(
  parent: THREE.Object3D,
  portalZ: number,
  doorW: number,
  doorH: number,
  meta: { x: number; z: number; floorY: number },
): THREE.Group {
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, doorH / 2 + 0.08, portalZ + 0.04);
  parent.add(doorGroup);

  const leafL = doorLeaf(doorW, doorH);
  const leafR = doorLeaf(doorW, doorH);
  leafL.position.x = -doorW / 2 - 0.02;
  leafR.position.x = doorW / 2 + 0.02;
  leafR.scale.x = -1;
  doorGroup.add(leafL, leafR);

  doorGroup.userData.leafL = leafL;
  doorGroup.userData.leafR = leafR;
  doorGroup.userData.doorHalf = doorW / 2 + 0.02;
  doorGroup.userData.openAmount = doorW * 0.92;
  doorGroup.userData.open = false;
  doorGroup.userData.x = meta.x;
  doorGroup.userData.z = meta.z;
  doorGroup.userData.floorY = meta.floorY;
  doorGroup.userData.isCabinDoor = meta.floorY === Number.POSITIVE_INFINITY;
  return doorGroup;
}

function callPanel(parent: THREE.Object3D, x: number, y: number, z: number, rotY: number) {
  const panel = new THREE.Group();
  panel.position.set(x, y, z);
  panel.rotation.y = rotY;
  mesh(panel, new THREE.BoxGeometry(0.22, 0.55, 0.06), metal(METAL_DARK, 0.45, 0.55), 0, 0, 0);
  const btn = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  mesh(panel, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), btn, 0, 0.12, 0.035, false).rotation.x =
    Math.PI / 2;
  mesh(panel, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), btn, 0, -0.08, 0.035, false).rotation.x =
    Math.PI / 2;
  const ico = makeSign("♿", "#0284c7", 64, 64);
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), ico);
  icon.position.set(0, -0.2, 0.04);
  panel.add(icon);
  parent.add(panel);
}

function interiorButtons(parent: THREE.Object3D, x: number, y: number, z: number) {
  const panel = new THREE.Group();
  panel.position.set(x, y, z);
  mesh(panel, new THREE.BoxGeometry(0.28, 0.7, 0.05), metal(0x374151, 0.5, 0.4), 0, 0, 0);
  const lit = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
  for (let i = 0; i < 4; i++) {
    mesh(panel, new THREE.BoxGeometry(0.09, 0.09, 0.02), lit, 0, 0.22 - i * 0.14, 0.03, false);
  }
  parent.add(panel);
}

function buildCabinInterior(
  cabin: THREE.Group,
  width: number,
  depth: number,
  cabinH: number,
  opts: { x: number; z: number; circular?: boolean; radius?: number },
): THREE.Group {
  const hw = width / 2;
  const hd = depth / 2;
  const darkM = metal(METAL_DARK, 0.4, 0.65);
  const doorGroups: THREE.Group[] = [];

  if (opts.circular && opts.radius) {
    const r = opts.radius;
    mesh(cabin, new THREE.CylinderGeometry(r - 0.25, r - 0.25, 0.08, 20), metal(FLOOR_IN, 0.55, 0.3), 0, 0.04, 0);
    mesh(cabin, new THREE.CylinderGeometry(r - 0.3, r - 0.3, 0.05, 20), metal(0xe5e7eb, 0.55, 0.15), 0, cabinH - 0.04, 0, false);
    mesh(
      cabin,
      new THREE.CylinderGeometry(0.7, 0.7, 0.04, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfff8e7,
        emissive: 0xffe4b5,
        emissiveIntensity: 1.15,
        roughness: 0.3,
      }),
      0,
      cabinH - 0.1,
      0,
      false,
    );

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(r - 0.35, r - 0.35, cabinH - 0.2, 16, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: INTERIOR, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide }),
    );
    inner.position.set(0, cabinH / 2, 0);
    inner.rotation.y = Math.PI / 2;
    cabin.add(inner);

    interiorButtons(cabin, r * 0.55, 1.2, 0.4);

    const portalZ = -r + 0.05;
    const doorW = 1.05;
    const doorH = cabinH - 0.25;
    mesh(cabin, new THREE.BoxGeometry(2.4, 0.12, 0.16), darkM, 0, cabinH - 0.02, portalZ);
    mesh(cabin, new THREE.BoxGeometry(0.14, cabinH, 0.16), darkM, -1.15, cabinH / 2, portalZ);
    mesh(cabin, new THREE.BoxGeometry(0.14, cabinH, 0.16), darkM, 1.15, cabinH / 2, portalZ);
    mesh(cabin, new THREE.BoxGeometry(2.45, 0.08, 0.22), darkM, 0, 0.04, portalZ);
    doorGroups.push(
      attachDoorPair(cabin, portalZ, doorW, doorH, { x: opts.x, z: opts.z, floorY: Number.POSITIVE_INFINITY }),
    );
  } else {
    mesh(cabin, new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.15), metal(FLOOR_IN, 0.55, 0.35), 0, 0.04, 0.05);
    mesh(cabin, new THREE.BoxGeometry(width - 0.25, 0.06, depth - 0.2), metal(0xe5e7eb, 0.6, 0.2), 0, cabinH - 0.05, 0.05, false);
    const lightPanel = mesh(
      cabin,
      new THREE.BoxGeometry(width * 0.55, 0.04, depth * 0.35),
      new THREE.MeshStandardMaterial({
        color: 0xfff8e7,
        emissive: 0xffe4b5,
        emissiveIntensity: 1.25,
        roughness: 0.3,
      }),
      0,
      cabinH - 0.1,
      0.05,
      false,
    );
    void lightPanel;

    const wallIn = new THREE.MeshStandardMaterial({ color: INTERIOR, roughness: 0.55, metalness: 0.15 });
    mesh(cabin, new THREE.BoxGeometry(0.05, cabinH - 0.15, depth - 0.25), wallIn, -hw + 0.12, cabinH / 2, 0.05, false);
    mesh(cabin, new THREE.BoxGeometry(0.05, cabinH - 0.15, depth - 0.25), wallIn, hw - 0.12, cabinH / 2, 0.05, false);
    mesh(cabin, new THREE.BoxGeometry(width - 0.3, cabinH - 0.15, 0.05), wallIn, 0, cabinH / 2, hd - 0.12, false);

    const rail = mesh(
      cabin,
      new THREE.CylinderGeometry(0.025, 0.025, width * 0.7, 10),
      metal(STEEL, 0.25, 0.8),
      0,
      0.95,
      hd - 0.2,
      false,
    );
    rail.rotation.z = Math.PI / 2;

    mesh(
      cabin,
      new THREE.BoxGeometry(width * 0.55, 0.7, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        metalness: 0.85,
        roughness: 0.15,
        envMapIntensity: 1.2,
      }),
      0,
      1.55,
      hd - 0.14,
      false,
    );

    interiorButtons(cabin, hw - 0.22, 1.2, 0.15);

    const portalZ = -hd;
    const doorW = (width - 0.15) / 2;
    const doorH = cabinH - 0.2;
    mesh(cabin, new THREE.BoxGeometry(width + 0.2, 0.12, 0.14), darkM, 0, cabinH - 0.02, portalZ);
    mesh(cabin, new THREE.BoxGeometry(0.12, cabinH, 0.14), darkM, -hw - 0.02, cabinH / 2, portalZ);
    mesh(cabin, new THREE.BoxGeometry(0.12, cabinH, 0.14), darkM, hw + 0.02, cabinH / 2, portalZ);
    mesh(cabin, new THREE.BoxGeometry(width + 0.25, 0.08, 0.2), darkM, 0, 0.04, portalZ);
    doorGroups.push(
      attachDoorPair(cabin, portalZ, doorW, doorH, { x: opts.x, z: opts.z, floorY: Number.POSITIVE_INFINITY }),
    );
  }

  cabin.userData.cabinDoors = doorGroups;
  return doorGroups[0];
}

function addLandingDoors(
  root: THREE.Group,
  floorY: number,
  portalZ: number,
  doorW: number,
  doorH: number,
  width: number,
  meta: { x: number; z: number },
): THREE.Group {
  const darkM = metal(METAL_DARK, 0.4, 0.65);
  const landing = new THREE.Group();
  landing.position.set(0, floorY, 0);
  root.add(landing);
  const hw = width / 2;
  mesh(landing, new THREE.BoxGeometry(width + 0.25, 0.12, 0.14), darkM, 0, doorH + 0.12, portalZ);
  mesh(landing, new THREE.BoxGeometry(0.12, doorH + 0.2, 0.14), darkM, -hw - 0.02, (doorH + 0.2) / 2, portalZ);
  mesh(landing, new THREE.BoxGeometry(0.12, doorH + 0.2, 0.14), darkM, hw + 0.02, (doorH + 0.2) / 2, portalZ);
  mesh(landing, new THREE.BoxGeometry(width + 0.3, 0.08, 0.2), darkM, 0, 0.04, portalZ);
  callPanel(landing, -hw - 0.15, 1.15, portalZ - 0.05, Math.PI);
  return attachDoorPair(landing, portalZ, doorW, doorH, { x: meta.x, z: meta.z, floorY });
}

export function buildBoxElevator(opts: {
  x: number;
  z: number;
  floors: number[];
  width?: number;
  depth?: number;
  cabinH?: number;
  label: string;
}): ElevatorHandle {
  const width = opts.width ?? 2.5;
  const depth = opts.depth ?? 2.3;
  const cabinH = opts.cabinH ?? 2.45;
  const root = new THREE.Group();
  root.position.set(opts.x, 0, opts.z);
  const colliders: THREE.Mesh[] = [];
  const doorGroups: THREE.Group[] = [];

  const frameM = metal(METAL);
  const glassWall = new THREE.MeshStandardMaterial({
    color: 0xa8d4e8,
    transparent: true,
    opacity: 0.22,
    roughness: 0.15,
    metalness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const minY = Math.min(...opts.floors);
  const maxY = Math.max(...opts.floors);
  const shaftH = maxY - minY + cabinH + 0.4;
  const shaftCenterY = (minY + maxY) / 2 + cabinH / 2;
  const hw = width / 2;
  const hd = depth / 2;

  for (const [ox, oz] of [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ] as const) {
    colliders.push(mesh(root, new THREE.BoxGeometry(0.14, shaftH, 0.14), frameM, ox, shaftCenterY, oz));
  }

  for (const side of [-1, 1] as const) {
    const wall = mesh(
      root,
      new THREE.PlaneGeometry(depth - 0.1, shaftH * 0.95),
      glassWall,
      side * hw,
      shaftCenterY,
      0,
      false,
    );
    wall.rotation.y = side * (Math.PI / 2);
  }
  const back = mesh(root, new THREE.PlaneGeometry(width - 0.1, shaftH * 0.95), glassWall, 0, shaftCenterY, hd, false);
  back.rotation.y = Math.PI;

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), makeSign(opts.label, "#0284c7", 512, 128));
  sign.position.set(0, maxY + cabinH + 0.15, -hd - 0.05);
  root.add(sign);

  const doorW = (width - 0.15) / 2;
  const doorH = cabinH - 0.2;
  for (const floorY of opts.floors) {
    doorGroups.push(addLandingDoors(root, floorY, -hd, doorW, doorH, width, { x: opts.x, z: opts.z }));
  }

  const cabin = new THREE.Group();
  cabin.position.set(0, maxY, 0);
  root.add(cabin);
  const cabinDoor = buildCabinInterior(cabin, width, depth, cabinH, { x: opts.x, z: opts.z });
  doorGroups.push(cabinDoor);

  return {
    root,
    cabin,
    doorGroups,
    colliders,
    x: opts.x,
    z: opts.z,
    floors: opts.floors,
    radius: Math.max(width, depth) * 0.65,
  };
}

export function buildCircularElevator(opts: {
  x: number;
  z: number;
  floors: number[];
  radius?: number;
  cabinH?: number;
  label: string;
}): ElevatorHandle {
  const radius = opts.radius ?? 2.6;
  const cabinH = opts.cabinH ?? 2.5;
  const root = new THREE.Group();
  root.position.set(opts.x, 0, opts.z);
  const colliders: THREE.Mesh[] = [];
  const doorGroups: THREE.Group[] = [];

  const minY = Math.min(...opts.floors);
  const maxY = Math.max(...opts.floors);
  const shaftH = maxY - minY + cabinH + 1;
  const shaftCenterY = (minY + maxY) / 2 + cabinH / 2;

  const glass = new THREE.MeshStandardMaterial({
    color: 0xb8dceb,
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mesh(root, new THREE.CylinderGeometry(radius, radius, shaftH, 24, 1, true), glass, 0, shaftCenterY, 0, false);

  const ringM = metal(0x0284c7, 0.35, 0.55);
  for (const floorY of opts.floors) {
    const ring = mesh(root, new THREE.TorusGeometry(radius + 0.08, 0.08, 10, 40), ringM, 0, floorY + 0.05, 0, false);
    ring.rotation.x = Math.PI / 2;
  }
  const topRing = mesh(root, new THREE.TorusGeometry(radius + 0.08, 0.1, 10, 40), ringM, 0, maxY + cabinH, 0, false);
  topRing.rotation.x = Math.PI / 2;

  const ribM = metal(METAL, 0.4, 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (a > Math.PI * 0.75 && a < Math.PI * 1.25) continue;
    colliders.push(
      mesh(root, new THREE.BoxGeometry(0.08, shaftH, 0.08), ribM, Math.cos(a) * radius, shaftCenterY, Math.sin(a) * radius),
    );
  }

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), makeSign(opts.label, "#0284c7", 512, 128));
  sign.position.set(0, maxY + cabinH + 0.35, -radius - 0.2);
  root.add(sign);

  const doorW = 1.05;
  const doorH = cabinH - 0.25;
  for (const floorY of opts.floors) {
    doorGroups.push(
      addLandingDoors(root, floorY, -radius + 0.05, doorW, doorH, 2.3, { x: opts.x, z: opts.z }),
    );
  }

  const cabin = new THREE.Group();
  cabin.position.set(0, maxY, 0);
  root.add(cabin);
  const cabinDoor = buildCabinInterior(cabin, 2.2, 2.2, cabinH, {
    x: opts.x,
    z: opts.z,
    circular: true,
    radius,
  });
  doorGroups.push(cabinDoor);

  return {
    root,
    cabin,
    doorGroups,
    colliders,
    x: opts.x,
    z: opts.z,
    floors: opts.floors,
    radius: radius * 0.85,
  };
}

export function updateElevatorDoorGroup(doorGroup: THREE.Group, dt: number) {
  const leafL = doorGroup.userData.leafL as THREE.Group;
  const leafR = doorGroup.userData.leafR as THREE.Group;
  const half = doorGroup.userData.doorHalf as number;
  const openAmt = doorGroup.userData.openAmount as number;
  const open = doorGroup.userData.open as boolean;
  const target = open ? half + openAmt : half;
  leafL.position.x = THREE.MathUtils.lerp(leafL.position.x, -target, Math.min(1, dt * 2.8));
  leafR.position.x = THREE.MathUtils.lerp(leafR.position.x, target, Math.min(1, dt * 2.8));
}

/** Sync cabin Y with avatar while inside; open doors only when stopped at a floor */
export function syncElevatorCabin(
  elev: ElevatorHandle,
  avatarPos: THREE.Vector3,
  verticalSpeed: number,
  dt: number,
) {
  if (!elev.root.visible) return;

  const distXZ = Math.hypot(avatarPos.x - elev.x, avatarPos.z - elev.z);
  const inside = distXZ < elev.radius;
  elev.cabin.userData.occupied = inside;

  if (inside) {
    elev.cabin.position.y = THREE.MathUtils.lerp(elev.cabin.position.y, avatarPos.y, Math.min(1, dt * 10));
  }

  const movingVert = Math.abs(verticalSpeed) > 0.35;
  const cabinY = elev.cabin.position.y;

  for (const g of elev.doorGroups) {
    const isCabin = g.userData.floorY === Number.POSITIVE_INFINITY;
    if (isCabin) {
      g.userData.open = inside && !movingVert;
    } else {
      const floorY = g.userData.floorY as number;
      const atFloor = Math.abs(cabinY - floorY) < 0.45 && Math.abs(avatarPos.y - floorY) < 0.6;
      g.userData.open = inside && atFloor && !movingVert;
    }
    updateElevatorDoorGroup(g, dt);
  }
}
