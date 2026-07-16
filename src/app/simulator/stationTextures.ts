/**
 * Procedural PBR textures for Zona Universitària station
 * (floor, ribbed walls, ceiling — inspired by real TMB finishes).
 */

import * as THREE from "three";

export type StationTextureSet = {
  floor: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  wall: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  ceiling: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  platform: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  aisle: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
};

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function noiseOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function cloneMaps(
  maps: { map?: THREE.CanvasTexture; normalMap?: THREE.CanvasTexture; roughnessMap?: THREE.CanvasTexture },
  rx: number,
  ry: number,
) {
  const out: {
    map?: THREE.CanvasTexture;
    normalMap?: THREE.CanvasTexture;
    roughnessMap?: THREE.CanvasTexture;
  } = {};
  if (maps.map) {
    out.map = maps.map.clone();
    out.map.repeat.set(rx, ry);
    out.map.needsUpdate = true;
  }
  if (maps.normalMap) {
    out.normalMap = maps.normalMap.clone();
    out.normalMap.colorSpace = THREE.NoColorSpace;
    out.normalMap.repeat.set(rx, ry);
    out.normalMap.needsUpdate = true;
  }
  if (maps.roughnessMap) {
    out.roughnessMap = maps.roughnessMap.clone();
    out.roughnessMap.colorSpace = THREE.NoColorSpace;
    out.roughnessMap.repeat.set(rx, ry);
    out.roughnessMap.needsUpdate = true;
  }
  return out;
}

export function createStationTextures(): StationTextureSet {
  // Polished warm stone / light terrazzo floor (mezzanine)
  const floorMap = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#c8c0b4";
    ctx.fillRect(0, 0, w, h);
    // subtle tile grid
    ctx.strokeStyle = "rgba(90,80,70,0.12)";
    ctx.lineWidth = 2;
    const tile = 64;
    for (let x = 0; x <= w; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // speckles (terrazzo)
    for (let i = 0; i < 2200; i++) {
      const s = 1 + Math.random() * 3;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,255,255,${0.08 + Math.random() * 0.12})`
        : `rgba(60,50,40,${0.06 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    noiseOverlay(ctx, w, h, 18);
  });

  const floorNormal = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    const tile = 64;
    ctx.strokeStyle = "rgb(118,118,255)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 800; i++) {
      const g = 120 + Math.random() * 20;
      ctx.fillStyle = `rgb(${g},${g},255)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  floorNormal.colorSpace = THREE.NoColorSpace;

  const floorRough = canvasTex(256, 256, (ctx, w, h) => {
    // darker = smoother/glossier
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    }
  });
  floorRough.colorSpace = THREE.NoColorSpace;

  // Bright aisle strip (more polished)
  const aisleMap = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 12);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const aisleRough = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#555555";
    ctx.fillRect(0, 0, w, h);
  });
  aisleRough.colorSpace = THREE.NoColorSpace;

  // Horizontal ribbed cream wall tiles (Zona Universitària style)
  const wallMap = canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "#ebe6dc";
    ctx.fillRect(0, 0, w, h);
    const rib = 8;
    for (let y = 0; y < h; y += rib) {
      const shade = y % (rib * 2) === 0 ? "#e2dcd0" : "#f0ebe3";
      ctx.fillStyle = shade;
      ctx.fillRect(0, y, w, rib - 1);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, y + rib - 1, w, 1);
    }
    noiseOverlay(ctx, w, h, 10);
  });

  const wallNormal = canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    const rib = 8;
    for (let y = 0; y < h; y += rib) {
      // top of rib brighter in G (bump up), groove darker
      ctx.fillStyle = "rgb(145,145,255)";
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = "rgb(110,110,255)";
      ctx.fillRect(0, y + rib - 2, w, 2);
    }
  });
  wallNormal.colorSpace = THREE.NoColorSpace;

  const wallRough = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? "#b0b0b0" : "#d0d0d0";
      ctx.fillRect(0, y, w, 2);
    }
  });
  wallRough.colorSpace = THREE.NoColorSpace;

  // Slatted / beamed ceiling
  const ceilingMap = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "#d8d4cc";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      ctx.fillStyle = "#c4bfb6";
      ctx.fillRect(x, 0, 12, h);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x + 12, 0, 6, h);
    }
    noiseOverlay(ctx, w, h, 14);
  });

  const ceilingNormal = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      ctx.fillStyle = "rgb(150,150,255)";
      ctx.fillRect(x, 0, 12, h);
      ctx.fillStyle = "rgb(105,105,255)";
      ctx.fillRect(x + 12, 0, 6, h);
    }
  });
  ceilingNormal.colorSpace = THREE.NoColorSpace;

  const ceilingRough = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(0, 0, w, h);
  });
  ceilingRough.colorSpace = THREE.NoColorSpace;

  // Platform floor — warmer polished stone (like reference photo)
  const platformMap = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b89a82";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const s = 1 + Math.random() * 2.5;
      ctx.fillStyle = Math.random() > 0.45
        ? `rgba(255,240,220,${0.06 + Math.random() * 0.1})`
        : `rgba(70,45,30,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    noiseOverlay(ctx, w, h, 16);
    // faint seams
    ctx.strokeStyle = "rgba(60,40,30,0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });

  const platformNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const g = 118 + Math.random() * 22;
      ctx.fillStyle = `rgb(${g},${g},255)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  platformNormal.colorSpace = THREE.NoColorSpace;

  const platformRough = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 30);
  });
  platformRough.colorSpace = THREE.NoColorSpace;

  return {
    floor: { map: floorMap, normalMap: floorNormal, roughnessMap: floorRough },
    wall: { map: wallMap, normalMap: wallNormal, roughnessMap: wallRough },
    ceiling: { map: ceilingMap, normalMap: ceilingNormal, roughnessMap: ceilingRough },
    platform: { map: platformMap, normalMap: platformNormal, roughnessMap: platformRough },
    aisle: { map: aisleMap, roughnessMap: aisleRough },
  };
}

export function disposeStationTextures(t: StationTextureSet) {
  const all = [
    t.floor.map, t.floor.normalMap, t.floor.roughnessMap,
    t.wall.map, t.wall.normalMap, t.wall.roughnessMap,
    t.ceiling.map, t.ceiling.normalMap, t.ceiling.roughnessMap,
    t.platform.map, t.platform.normalMap, t.platform.roughnessMap,
    t.aisle.map, t.aisle.roughnessMap,
  ];
  for (const tex of all) tex.dispose();
}

/** Build a MeshStandardMaterial with UV repeat sized to world extents */
export function stationMaterial(
  maps: { map?: THREE.CanvasTexture; normalMap?: THREE.CanvasTexture; roughnessMap?: THREE.CanvasTexture },
  opts: {
    repeatX: number;
    repeatY: number;
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
    normalScale?: number;
  },
) {
  const cloned = cloneMaps(maps, opts.repeatX, opts.repeatY);
  return new THREE.MeshStandardMaterial({
    map: cloned.map,
    normalMap: cloned.normalMap,
    roughnessMap: cloned.roughnessMap,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.04,
    envMapIntensity: opts.envMapIntensity ?? 1,
    normalScale: new THREE.Vector2(opts.normalScale ?? 1, opts.normalScale ?? 1),
  });
}
