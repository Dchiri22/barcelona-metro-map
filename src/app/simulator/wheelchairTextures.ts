/**
 * Procedural PBR textures for wheelchair avatar (no external assets).
 */

import * as THREE from "three";

export type AvatarTextureSet = {
  rubber: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  metalBrush: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  fabric: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  leather: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture };
};

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.12) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 80;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = 255 * alpha;
  }
  ctx.putImageData(img, 0, 0);
}

export function createAvatarTextures(): AvatarTextureSet {
  const rubberMap = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#141210";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 0.35);
  });
  rubberMap.repeat.set(3, 3);

  const rubberNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const g = 110 + Math.random() * 40;
      ctx.fillStyle = `rgb(${g},${g + 8},255)`;
      ctx.fillRect(x, y, 2, 2);
    }
  });
  rubberNormal.repeat.set(3, 3);

  const rubberRough = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 0.25);
  });
  rubberRough.repeat.set(3, 3);

  const metalNormal = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,136,255)";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = 118 + Math.sin(y * 0.35) * 12;
      ctx.fillStyle = `rgb(${v},${v + 4},255)`;
      ctx.fillRect(0, y, w, 1);
    }
  });
  metalNormal.repeat.set(4, 1);

  const metalRough = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = "#888888";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const g = 120 + Math.sin(x * 0.08) * 25;
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(x, 0, 1, h);
    }
  });
  metalRough.repeat.set(4, 1);

  const fabricMap = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1a1a1e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
  fabricMap.repeat.set(2, 2);

  const fabricNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(100,110,255,0.5)";
    for (let x = 0; x < w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
  fabricNormal.repeat.set(2, 2);

  const fabricRough = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 0.15);
  });
  fabricRough.repeat.set(2, 2);

  const leatherMap = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2a2520";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 0.2);
  });
  leatherMap.repeat.set(1.5, 1.5);

  const leatherNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 0.4);
  });
  leatherNormal.repeat.set(1.5, 1.5);

  return {
    rubber: { map: rubberMap, normalMap: rubberNormal, roughnessMap: rubberRough },
    metalBrush: { normalMap: metalNormal, roughnessMap: metalRough },
    fabric: { map: fabricMap, normalMap: fabricNormal, roughnessMap: fabricRough },
    leather: { map: leatherMap, normalMap: leatherNormal },
  };
}

export function disposeAvatarTextures(t: AvatarTextureSet) {
  for (const group of Object.values(t)) {
    for (const tex of Object.values(group)) tex.dispose();
  }
}
