/**
 * Barcelona city aligned to the schematic metro map (540×450).
 * Grid: 54 px cells (same as 2D map). Manzanas use Cerdà proportions.
 */
import {
  BLOCK_PX, BLOCK_W, GRID_PX, MAP_H, MAP_W, SCALE, STREET_PX, STREET_W,
  schematicLen, schematicTo3D, sxToX, syToZ,
} from "@/app/utils/schematic3d";

export interface CityBuilding {
  x: number; z: number; w: number; d: number; h: number; color: string; rotY?: number;
}
export interface CityPatios { x: number; z: number; size: number; }
export interface StreetSegment {
  x1: number; z1: number; x2: number; z2: number;
  width: number; kind: "local" | "arterial" | "boulevard" | "diagonal" | "rambla";
  name?: string; lanes?: number;
}
export interface Crosswalk { x: number; z: number; angle: number; size: number; }

export const GREY_BUILDINGS = [
  "#E2E2E2", "#DCDCDC", "#D6D6D6", "#D0D0D0", "#CCCCCC",
  "#C8C8C8", "#C4C4C4", "#D8D8D8", "#E0E0E0", "#CECECE",
];
export const SIDEWALK = "#C6C6C6";
export const PATIO_GROUND = "#B8C8A8";

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function pickGrey(rand: () => number) {
  return GREY_BUILDINGS[Math.floor(rand() * GREY_BUILDINGS.length)];
}

function inSea(sx: number, sy: number) {
  return sx > 468 && sy > 180;
}
function onMontjuic(sx: number, sy: number) {
  return sx < 100 && sy > 300;
}
function inCiutadella(sx: number, sy: number) {
  return sx > 350 && sx < 410 && sy > 280 && sy < 340;
}

/** Cerdà manzana at 3D center cx,cz with block width B */
function addManzana(
  buildings: CityBuilding[], patios: CityPatios[],
  cx: number, cz: number, B: number, rand: () => number,
) {
  const chamfer = B * (14 / 113);
  const depth = B * (14 / 113);
  const courtyard = B * (85 / 113);
  const half = B / 2;
  const wingSpan = B - chamfer * 2;
  const bays = 5;
  const bayW = wingSpan / bays;
  const floors = 4 + Math.floor(rand() * 3);
  const floorH = schematicLen(3.5);
  const baseH = floors * floorH;

  patios.push({ x: cx, z: cz, size: courtyard });

  const wings: { axis: "x" | "z"; sign: number }[] = [
    { axis: "z", sign: -1 }, { axis: "z", sign: 1 },
    { axis: "x", sign: -1 }, { axis: "x", sign: 1 },
  ];
  wings.forEach(({ axis, sign }) => {
    for (let b = 0; b < bays; b++) {
      const f = 3 + Math.floor(rand() * 4);
      const h = f * floorH;
      const off = -wingSpan / 2 + bayW / 2 + b * bayW;
      if (axis === "z") {
        buildings.push({
          x: cx + off, z: cz + sign * (half - depth / 2),
          w: bayW * 0.92, d: depth, h, color: pickGrey(rand),
        });
      } else {
        buildings.push({
          x: cx + sign * (half - depth / 2), z: cz + off,
          w: depth, d: bayW * 0.92, h, color: pickGrey(rand),
        });
      }
    }
  });

  const cd = half - chamfer / Math.SQRT2;
  [
    { x: -cd, z: -cd, rot: Math.PI / 4 },
    { x: cd, z: -cd, rot: -Math.PI / 4 },
    { x: -cd, z: cd, rot: -Math.PI / 4 },
    { x: cd, z: cd, rot: Math.PI / 4 },
  ].forEach(c => {
    buildings.push({
      x: cx + c.x, z: cz + c.z,
      w: chamfer, d: chamfer, h: baseH * 0.9,
      color: pickGrey(rand), rotY: c.rot,
    });
  });
}

function addGothicBlock(buildings: CityBuilding[], cx: number, cz: number, rand: () => number) {
  for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
    buildings.push({
      x: cx + (rand() - 0.5) * BLOCK_W * 0.5,
      z: cz + (rand() - 0.5) * BLOCK_W * 0.5,
      w: 0.15 + rand() * 0.2, d: 0.15 + rand() * 0.22,
      h: schematicLen(12 + rand() * 18), color: pickGrey(rand),
    });
  }
}

/** Major streets at real schematic positions from TMB map */
function buildNamedStreets(): StreetSegment[] {
  const z = (sy: number) => syToZ(sy);
  const x = (sx: number) => sxToX(sx);
  const margin = 24;
  const W = MAP_W - margin;
  const H = MAP_H - margin;

  return [
    { x1: x(40), z1: z(40), x2: x(500), z2: z(400), width: STREET_W * 1.6, kind: "diagonal", name: "Avinguda Diagonal", lanes: 6 },
    { x1: x(margin), z1: z(252), x2: x(W), z2: z(252), width: STREET_W * 1.4, kind: "boulevard", name: "Gran Via", lanes: 5 },
    { x1: x(298), z1: z(margin), x2: x(298), z2: z(H), width: STREET_W * 1.3, kind: "boulevard", name: "Passeig de Gràcia", lanes: 4 },
    { x1: x(265), z1: z(margin), x2: x(265), z2: z(H), width: STREET_W * 1.1, kind: "arterial", name: "Carrer de Balmes", lanes: 3 },
    { x1: x(315), z1: z(margin), x2: x(315), z2: z(H), width: STREET_W * 1.1, kind: "arterial", name: "Carrer de Pau Claris", lanes: 3 },
    { x1: x(margin), z1: z(215), x2: x(W), z2: z(215), width: STREET_W * 1.2, kind: "arterial", name: "Carrer de Provença", lanes: 3 },
    { x1: x(margin), z1: z(175), x2: x(W), z2: z(175), width: STREET_W * 1.1, kind: "arterial", name: "Carrer de Mallorca", lanes: 3 },
    { x1: x(margin), z1: z(282), x2: x(W), z2: z(282), width: STREET_W * 1.1, kind: "arterial", name: "Avinguda Paral·lel", lanes: 3 },
    { x1: x(188), z1: z(margin), x2: x(188), z2: z(H), width: STREET_W * 1.0, kind: "arterial", name: "Meridiana", lanes: 3 },
    { x1: x(232), z1: z(margin), x2: x(232), z2: z(H), width: STREET_W, kind: "local", name: "Carrer de Muntaner", lanes: 2 },
    { x1: x(225), z1: z(margin), x2: x(348), z2: z(H), width: STREET_W * 0.9, kind: "rambla", name: "La Rambla", lanes: 2 },
  ];
}

export function generateCity(): { buildings: CityBuilding[]; patios: CityPatios[] } {
  const rand = seededRandom(42);
  const buildings: CityBuilding[] = [];
  const patios: CityPatios[] = [];
  const margin = 27;

  for (let sy = margin; sy < MAP_H - margin; sy += GRID_PX) {
    for (let sx = margin; sx < MAP_W - margin; sx += GRID_PX) {
      if (inSea(sx, sy) || onMontjuic(sx, sy) || inCiutadella(sx, sy)) continue;

      const cx = sxToX(sx + BLOCK_PX / 2);
      const cz = syToZ(sy + BLOCK_PX / 2);

      if (sx < 160 && sy > 240 && sy < 360) {
        addGothicBlock(buildings, cx, cz, rand);
      } else {
        addManzana(buildings, patios, cx, cz, BLOCK_W, rand);
      }
    }
  }

  return { buildings, patios };
}

export function generateLocalStreets(): StreetSegment[] {
  const streets = buildNamedStreets();
  const margin = 27;
  const maxX = sxToX(MAP_W - margin);
  const minX = sxToX(margin);
  const maxZ = syToZ(MAP_H - margin);
  const minZ = syToZ(margin);

  for (let sx = margin; sx <= MAP_W - margin; sx += GRID_PX) {
    const x = sxToX(sx);
    streets.push({ x1: x, z1: minZ, x2: x, z2: maxZ, width: STREET_W, kind: "local", lanes: 1 });
  }
  for (let sy = margin; sy <= MAP_H - margin; sy += GRID_PX) {
    const z = syToZ(sy);
    streets.push({ x1: minX, z1: z, x2: maxX, z2: z, width: STREET_W, kind: "local", lanes: 1 });
  }
  return streets;
}

export function generateCrosswalks(): Crosswalk[] {
  const crosswalks: Crosswalk[] = [];
  const margin = 27;
  for (let sy = margin; sy < MAP_H - margin; sy += GRID_PX) {
    for (let sx = margin; sx < MAP_W - margin; sx += GRID_PX) {
      if (inSea(sx, sy)) continue;
      const x = sxToX(sx + GRID_PX / 2);
      const z = syToZ(sy + GRID_PX / 2);
      crosswalks.push({ x, z, angle: 0, size: STREET_W * 0.8 });
      crosswalks.push({ x, z, angle: Math.PI / 2, size: STREET_W * 0.8 });
    }
  }
  return crosswalks;
}

export function generateBoulevardTrees(): { x: number; z: number }[] {
  const trees: { x: number; z: number }[] = [];
  const rand = seededRandom(88);
  buildNamedStreets()
    .filter(s => s.kind === "boulevard" || s.kind === "diagonal" || s.kind === "arterial")
    .forEach(s => {
      const len = Math.hypot(s.x2 - s.x1, s.z2 - s.z1);
      const steps = Math.floor(len / 0.15);
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const ln = Math.hypot(dx, dz) || 1;
      const nx = -dz / ln, nz = dx / ln;
      const off = s.width / 2 + 0.05;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const bx = s.x1 + dx * t, bz = s.z1 + dz * t;
        for (const side of [-1, 1]) {
          trees.push({
            x: bx + nx * off * side + (rand() - 0.5) * 0.02,
            z: bz + nz * off * side + (rand() - 0.5) * 0.02,
          });
        }
      }
    });
  return trees;
}

const city = generateCity();
export const CITY_BUILDINGS = city.buildings;
export const CITY_PATIOS = city.patios;
export const CITY_STREETS = generateLocalStreets();
export const CITY_CROSSWALKS = generateCrosswalks();
export const BOULEVARD_TREES = generateBoulevardTrees();

export const CITY_BOUNDS = {
  minX: sxToX(0), maxX: sxToX(MAP_W),
  minZ: syToZ(0), maxZ: syToZ(MAP_H),
};
