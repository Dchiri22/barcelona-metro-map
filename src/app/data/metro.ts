export type ElevStatus = "ok" | "maint" | "down" | "none";
export type LineId = "L1" | "L2" | "L3" | "L4" | "L5" | "L9N" | "L10" | "L11";

export interface Station {
  id: string;
  name: string;
  lines: LineId[];
  status: ElevStatus;
  exits: number;
  updated: string;
  elevators: { id: string; label: string; status: ElevStatus }[];
}

export const LINE_COLOR: Record<LineId, string> = {
  L1: "#E3051B", L2: "#9B2D9E", L3: "#3FAB2E",
  L4: "#F5A800", L5: "#0065A7", L9N: "#F07800",
  L10: "#009ACE", L11: "#8FCE00",
};

export const STATIONS: Station[] = [
  {
    id: "sagrada", name: "Sagrada Família", lines: ["L2", "L5"],
    status: "ok", exits: 4, updated: "3 min ago",
    elevators: [
      { id: "e1", label: "Entrance → Mezzanine", status: "ok" },
      { id: "e2", label: "Mezzanine → L2 platform", status: "ok" },
      { id: "e3", label: "Mezzanine → L5 platform", status: "maint" },
    ],
  },
  {
    id: "pggracia", name: "Passeig de Gràcia", lines: ["L2", "L3", "L4"],
    status: "maint", exits: 6, updated: "12 min ago",
    elevators: [
      { id: "e1", label: "Main entrance → Level 1", status: "maint" },
      { id: "e2", label: "Level 1 → L3 platform", status: "ok" },
      { id: "e3", label: "Level 1 → L4 platform", status: "ok" },
    ],
  },
  {
    id: "ciutadella", name: "Ciutadella | Vila Olímpica", lines: ["L4"],
    status: "down", exits: 2, updated: "1 min ago",
    elevators: [{ id: "e1", label: "Street → Platform", status: "down" }],
  },
  {
    id: "barceloneta", name: "Barceloneta", lines: ["L4"],
    status: "ok", exits: 3, updated: "2 min ago",
    elevators: [{ id: "e1", label: "Entrance → Platform", status: "ok" }],
  },
  {
    id: "arct", name: "Arc de Triomf", lines: ["L1"],
    status: "ok", exits: 2, updated: "7 min ago",
    elevators: [{ id: "e1", label: "Entrance → Platform", status: "ok" }],
  },
];

export const PINNED = ["sagrada", "pggracia", "ciutadella"];

export const APP_STATION_COORDS: Record<string, { x: number; y: number }> = {
  sagrada:     { x: 348, y: 187 },
  pggracia:    { x: 298, y: 200 },
  ciutadella:  { x: 378, y: 312 },
  barceloneta: { x: 348, y: 295 },
  arct:        { x: 340, y: 212 },
};

export const BG_NODES: { id: string; label: string; x: number; y: number; interchange: boolean }[] = [
  { id: "bellvitge",   label: "H. Bellvitge",   x: 32,  y: 252, interchange: false },
  { id: "torrassa",    label: "Torrassa",        x: 75,  y: 252, interchange: false },
  { id: "collblanc",   label: "Collblanc",       x: 108, y: 252, interchange: true  },
  { id: "espanya",     label: "Espanya",         x: 172, y: 252, interchange: true  },
  { id: "universitat", label: "Universitat",     x: 232, y: 228, interchange: true  },
  { id: "catalunya",   label: "Catalunya",       x: 265, y: 215, interchange: true  },
  { id: "urquinaona",  label: "Urquinaona",      x: 315, y: 212, interchange: true  },
  { id: "arc-triomf",  label: "Arc de Triomf",   x: 340, y: 212, interchange: false },
  { id: "clot",        label: "Clot",            x: 380, y: 212, interchange: true  },
  { id: "la-pau",      label: "La Pau",          x: 410, y: 215, interchange: true  },
  { id: "gorg",        label: "Gorg",            x: 468, y: 220, interchange: true  },
  { id: "fondo",       label: "Fondo",           x: 498, y: 214, interchange: false },
  { id: "parallel",    label: "Paral·lel",       x: 188, y: 282, interchange: true  },
  { id: "sant-antoni", label: "Sant Antoni",     x: 210, y: 262, interchange: false },
  { id: "badalona",    label: "Badalona PF",     x: 510, y: 216, interchange: false },
  { id: "zona-univ",   label: "Zona Univ.",      x: 82,  y: 418, interchange: true  },
  { id: "sants",       label: "Sants Estació",   x: 152, y: 252, interchange: true  },
  { id: "drassanes",   label: "Drassanes",       x: 200, y: 295, interchange: false },
  { id: "liceu",       label: "Liceu",           x: 225, y: 278, interchange: false },
  { id: "pg-gracia",   label: "Pg. de Gràcia",   x: 298, y: 200, interchange: true  },
  { id: "diagonal",    label: "Diagonal",        x: 252, y: 175, interchange: true  },
  { id: "lesseps",     label: "Lesseps",         x: 244, y: 125, interchange: false },
  { id: "vall-hebron", label: "Vall d'Hebron",   x: 318, y: 90,  interchange: true  },
  { id: "trinitat-nova", label: "Trinitat Nova", x: 248, y: 45, interchange: true  },
  { id: "verdaguer",   label: "Verdaguer",       x: 312, y: 170, interchange: true  },
  { id: "jaume-i",     label: "Jaume I",         x: 332, y: 255, interchange: false },
  { id: "forum",       label: "El Maresme|Fòrum", x: 444, y: 345, interchange: false },
  { id: "cornella",    label: "Cornellà Centre", x: 32,  y: 355, interchange: false },
  { id: "hosp-clinic", label: "Hospital Clínic", x: 242, y: 178, interchange: false },
  { id: "maragall",    label: "Maragall",        x: 375, y: 148, interchange: true  },
];

export const METRO_LINES: { id: string; color: string; w: number; d: string; dashed?: boolean }[] = [
  { id: "L9S", color: "#F07800", w: 3, dashed: true, d: "M 82,418 L 90,432 L 100,445" },
  { id: "L10S", color: "#009ACE", w: 3, dashed: true, d: "M 82,418 L 72,432 L 62,445" },
  { id: "L11", color: "#8FCE00", w: 3, d: "M 248,45 L 230,52 L 214,60 L 200,68" },
  { id: "L9N", color: "#F07800", w: 3, dashed: true, d: "M 468,220 L 468,204 L 472,188 L 478,172" },
  { id: "L10N", color: "#009ACE", w: 3, dashed: true, d: "M 468,220 L 474,204 L 480,188 L 485,172" },
  { id: "L5", color: "#0065A7", w: 5, d: "M 32,355 L 52,342 L 68,328 L 82,315 L 92,302 L 100,288 L 105,275 L 108,252 L 122,250 L 138,250 L 152,252 L 165,242 L 182,226 L 200,210 L 218,194 L 230,184 L 242,178 L 252,175 L 312,170 L 348,187 L 362,174 L 370,160 L 375,148 L 380,132 L 386,116 L 390,100 L 385,88 L 355,80 L 318,90" },
  { id: "L4", color: "#F5A800", w: 5, d: "M 248,45 L 255,58 L 262,72 L 270,86 L 278,100 L 286,116 L 295,132 L 312,170 L 298,200 L 316,200 L 332,196 L 315,212 L 322,240 L 332,268 L 340,290 L 348,295 L 378,312 L 405,326 L 425,337 L 444,345" },
  { id: "L3", color: "#3FAB2E", w: 5, d: "M 82,418 L 86,395 L 90,372 L 94,350 L 100,328 L 110,308 L 120,285 L 134,265 L 148,252 L 162,252 L 172,252 L 188,282 L 200,295 L 214,281 L 230,262 L 248,240 L 265,215 L 298,200 L 252,175 L 248,158 L 244,140 L 240,125 L 244,108 L 252,96 L 268,84 L 290,75 L 318,90 L 325,74 L 332,60 L 340,50 L 346,42 L 334,37 L 316,35 L 296,36 L 278,39 L 264,42 L 248,45" },
  { id: "L2", color: "#9B2D9E", w: 5, d: "M 188,282 L 210,262 L 232,228 L 265,212 L 298,200 L 315,195 L 330,190 L 348,187 L 365,198 L 380,212 L 395,220 L 410,218 L 425,222 L 440,225 L 455,226 L 468,224 L 482,220 L 498,217 L 512,214" },
  { id: "L1", color: "#E3051B", w: 5, d: "M 32,252 L 75,252 L 108,252 L 125,250 L 140,250 L 152,252 L 172,252 L 192,240 L 212,232 L 232,228 L 252,218 L 265,215 L 315,212 L 340,212 L 362,212 L 380,212 L 396,210 L 410,215 L 425,218 L 440,220 L 455,222 L 468,220 L 482,218 L 498,214" },
];

export const METRO_LINE_LABELS: Record<string, string> = {
  L1: "L1 — Fondo / H. Bellvitge",
  L2: "L2 — Badalona / Paral·lel",
  L3: "L3 — Trinitat Nova / Zona Univ.",
  L4: "L4 — Fòrum / Trinitat Nova",
  L5: "L5 — Vall d'Hebron / Cornellà",
  L9N: "L9 Nord",
  L9S: "L9 Sud",
  L10N: "L10 Nord",
  L10S: "L10 Sud",
  L11: "L11",
};

export const STATUS_COLOR: Record<ElevStatus, string> = {
  ok: "#5B4FCF",
  maint: "#A78BFA",
  down: "#0F0D1A",
  none: "#C4C0D4",
};

export const STATUS_LABEL: Record<ElevStatus, string> = {
  ok: "Working",
  maint: "Maintenance",
  down: "Closed",
  none: "No elevator",
};
