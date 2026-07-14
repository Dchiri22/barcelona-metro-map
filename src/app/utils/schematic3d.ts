import * as THREE from "three";

/** Schematic map size (same as 2D SVG MetroMap) */
export const MAP_W = 540;
export const MAP_H = 450;

/** Lower = larger 3D world. 36 ≈ 15 units wide (was 48 ≈ 11 units) */
export const SCALE = 36;

export function schematicTo3D(x: number, y: number, elevation = 0): THREE.Vector3 {
  return new THREE.Vector3(
    (x - MAP_W / 2) / SCALE,
    elevation,
    (y - MAP_H / 2) / SCALE,
  );
}

export function sxToX(sx: number) { return (sx - MAP_W / 2) / SCALE; }
export function syToZ(sy: number) { return (sy - MAP_H / 2) / SCALE; }
export function schematicLen(len: number) { return len / SCALE; }

export function parseSvgPath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const tokens = d.match(/[ML]|[-\d.]+/g) ?? [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === "M" || tokens[i] === "L") i++;
    if (i + 1 >= tokens.length) break;
    points.push({ x: parseFloat(tokens[i]), y: parseFloat(tokens[i + 1]) });
    i += 2;
  }
  return points;
}

export function pathToCurve(d: string, elevation = 0.14): THREE.CatmullRomCurve3 | null {
  const pts = parseSvgPath(d).map(p => schematicTo3D(p.x, p.y, elevation));
  if (pts.length < 2) return null;
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.25);
}

/** Grid pitch in schematic px — matches 2D MetroMap grid (54 px) */
export const GRID_PX = 54;
export const STREET_PX = 10;
export const BLOCK_PX = GRID_PX - STREET_PX;

export const STREET_W = schematicLen(STREET_PX);
export const BLOCK_W = schematicLen(BLOCK_PX);
