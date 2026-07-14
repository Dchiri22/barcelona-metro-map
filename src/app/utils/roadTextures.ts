import * as THREE from "three";

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
let asphaltTex: THREE.CanvasTexture | null = null;
let boulevardTex: THREE.CanvasTexture | null = null;
let crosswalkTex: THREE.CanvasTexture | null = null;

function makeAsphaltTexture(lanes: number, dashed: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#2E2E2E";
  ctx.fillRect(0, 0, 128, 256);

  // asphalt grain
  for (let i = 0; i < 600; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5
      ? `rgba(255,255,255,${Math.random() * 0.035})`
      : `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  if (dashed) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 256);
    ctx.stroke();
  }

  if (lanes >= 4) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 256);
    ctx.moveTo(96, 0);
    ctx.lineTo(96, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
}

function makeCrosswalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6B6B6B";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#F0F0F0";
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 8, 0, 5, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function getAsphaltTexture(lanes = 2): THREE.CanvasTexture {
  if (!asphaltTex) asphaltTex = makeAsphaltTexture(lanes, true);
  return asphaltTex;
}

export function getBoulevardTexture(): THREE.CanvasTexture {
  if (!boulevardTex) boulevardTex = makeAsphaltTexture(6, true);
  return boulevardTex;
}

export function getCrosswalkTexture(): THREE.CanvasTexture {
  if (!crosswalkTex) crosswalkTex = makeCrosswalkTexture();
  return crosswalkTex;
}

export function getSidewalkMaterial(): THREE.MeshStandardMaterial {
  const key = "sidewalk";
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({ color: "#D0D0D0", roughness: 0.95, metalness: 0 }));
  }
  return materialCache.get(key)!;
}

export function getAsphaltMaterial(lanes = 2): THREE.MeshStandardMaterial {
  const key = `asphalt-${lanes}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      map: getAsphaltTexture(lanes),
      color: "#484848",
      roughness: 0.92,
      metalness: 0.04,
    }));
  }
  return materialCache.get(key)!;
}

export function getBoulevardMaterial(): THREE.MeshStandardMaterial {
  const key = "boulevard";
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      map: getBoulevardTexture(),
      color: "#424242",
      roughness: 0.9,
      metalness: 0.04,
    }));
  }
  return materialCache.get(key)!;
}
