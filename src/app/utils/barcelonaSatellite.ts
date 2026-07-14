import * as THREE from "three";

/** Barcelona schematic center ≈ Plaça Catalunya area */
export const BARCELONA_CENTER = { lat: 41.3874, lng: 2.1686 };

const ESRI_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `${ESRI_TILE}/${z}/${y}/${x}`;
  });
}

/** Stitch Esri satellite tiles into one ground texture for Barcelona. */
export async function createBarcelonaSatelliteTexture(
  zoom = 14,
  grid = 4,
): Promise<THREE.CanvasTexture> {
  const { x: cx, y: cy } = latLngToTile(BARCELONA_CENTER.lat, BARCELONA_CENTER.lng, zoom);
  const half = Math.floor(grid / 2);
  const tileSize = 256;
  const canvas = document.createElement("canvas");
  canvas.width = tileSize * grid;
  canvas.height = tileSize * grid;
  const ctx = canvas.getContext("2d")!;

  const loads: Promise<void>[] = [];
  for (let dy = -half; dy < grid - half; dy++) {
    for (let dx = -half; dx < grid - half; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      const px = (dx + half) * tileSize;
      const py = (dy + half) * tileSize;
      loads.push(
        loadTile(zoom, tx, ty)
          .then(img => { ctx.drawImage(img, px, py, tileSize, tileSize); })
          .catch(() => {
            ctx.fillStyle = "#1a2332";
            ctx.fillRect(px, py, tileSize, tileSize);
          }),
      );
    }
  }
  await Promise.all(loads);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
