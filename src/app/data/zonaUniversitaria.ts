/** Zona Universitària — accessible route graph & narration (L3 / L9S) */

export type LineTarget = "L3" | "L9S";

export type Vec3 = { x: number; y: number; z: number };

export type Waypoint = Vec3 & {
  id: string;
  label: string;
  narration: string;
  warning?: string;
};

export type RouteEdge = { from: string; to: string };

const sharedEntry: Waypoint[] = [
  {
    id: "access",
    x: 0,
    y: 0,
    z: -14,
    label: "Accés de carrer",
    narration:
      "Estàs a l'accés de carrer de Zona Universitària. Continua recte cap al vestíbul principal.",
  },
  {
    id: "vestibule",
    x: 0,
    y: 0,
    z: -7,
    label: "Vestíbul",
    narration:
      "Has entrat al vestíbul principal. Segueix recte pel passadís central ample.",
  },
  {
    id: "tickets",
    x: 0,
    y: 0,
    z: -1,
    label: "Validació",
    narration:
      "Passa pels torniquets accessibles del centre. Les escales laterals no són aptes per a cadira de rodes.",
    warning: "Utilitza només el passadís central — les escales són a les parets laterals.",
  },
  {
    id: "gate-exit",
    x: 0,
    y: 0,
    z: 4,
    label: "Distribució",
    narration: "Has passat la validació. Continua pel corredor central.",
  },
];

const l3Waypoints: Waypoint[] = [
  ...sharedEntry,
  {
    id: "l3-turn",
    x: -3,
    y: 0,
    z: 4,
    label: "Corredor L3",
    narration: "Gira a l'esquerra cap al corredor de la línia 3. Mantén-te al centre del passadís.",
  },
  {
    id: "l3-corridor",
    x: -6,
    y: 0,
    z: 7,
    label: "Corredor L3",
    narration: "Segueix recte cap a l'ascensor accessible de la L3.",
  },
  {
    id: "l3-elevator",
    x: -6,
    y: 0,
    z: 10,
    label: "Ascensor L3",
    narration: "Has arribat a l'ascensor de la L3. Entra i baixa fins al nivell d'andana.",
  },
  {
    id: "l3-platform",
    x: -6,
    y: -5,
    z: 10,
    label: "Andana L3",
    narration:
      "Estàs a l'andana de la L3 direcció Trinitat Nova. Mantén-te darrere la línia groga de seguretat.",
    warning: "Vora d'andana — mantén distància de seguretat.",
  },
  {
    id: "l3-wait",
    x: -6,
    y: -5,
    z: 17.5,
    label: "Espera L3",
    narration:
      "Has arribat al punt d'espera accessible. El tren de la L3 és a la via — espera darrere la franja de seguretat.",
  },
];

const l9sWaypoints: Waypoint[] = [
  ...sharedEntry,
  {
    id: "l9s-turn",
    x: 3,
    y: 0,
    z: 4,
    label: "Passadís L9S",
    narration: "Gira a la dreta cap al passadís de la L9 Sud. Evita les escales laterals.",
    warning: "No utilitzis les escales — continua cap a l'ascensor circular.",
  },
  {
    id: "l9s-corridor",
    x: 7,
    y: 0,
    z: 5,
    label: "Passadís L9S",
    narration: "Segueix el passadís llarg cap a l'ascensor circular de gran capacitat.",
  },
  {
    id: "l9s-shaft-top",
    x: 11,
    y: 0,
    z: 7,
    label: "Ascensor circular (nivell superior)",
    narration: "Has arribat a l'ascensor circular. Baixa fins al nivell profund de la L9S.",
  },
  {
    id: "l9s-shaft-bottom",
    x: 11,
    y: -12,
    z: 7,
    label: "Ascensor circular (nivell inferior)",
    narration: "Has baixat al nivell profund. Surts cap al corredor d'andanes.",
  },
  {
    id: "l9s-platform",
    x: 11,
    y: -12,
    z: 14,
    label: "Andana L9S",
    narration:
      "Andana L9S direcció Aeroport T1. Atenció: la via del costat està sense servei.",
    warning: "Via sense servei al costat — espera a l'andana senyalitzat.",
  },
  {
    id: "l9s-wait",
    x: 11,
    y: -12,
    z: 17.5,
    label: "Espera L9S",
    narration:
      "Punt d'espera accessible a la L9 Sud. El tren direcció Aeroport T1 és a l'andana.",
  },
];

export const ROUTES: Record<LineTarget, { waypoints: Waypoint[]; edges: RouteEdge[]; color: string; label: string }> = {
  L3: {
    color: "#3FAB2E",
    label: "L3 · Trinitat Nova",
    waypoints: l3Waypoints,
    edges: l3Waypoints.slice(0, -1).map((w, i) => ({
      from: w.id,
      to: l3Waypoints[i + 1].id,
    })),
  },
  L9S: {
    color: "#F58220",
    label: "L9S · Aeroport T1",
    waypoints: l9sWaypoints,
    edges: l9sWaypoints.slice(0, -1).map((w, i) => ({
      from: w.id,
      to: l9sWaypoints[i + 1].id,
    })),
  },
};

/** Stairs / escalators — placed on side walls, never on the central aisle */
export const RESTRICTED_ZONES = [
  { x: -11, y: 0, z: 2, w: 2.2, h: 2.5, d: 3.5, label: "Escales mecàniques" },
  { x: 11, y: 0, z: 3, w: 2.2, h: 2.5, d: 3.5, label: "Escales cap a L9S" },
  { x: 3, y: 0, z: 9, w: 2.2, h: 2.5, d: 3, label: "Escales fixes" },
];

/** Elevator shaft positions for door animation */
export const ELEVATORS = [
  { id: "l3-elevator", x: -6, y: -2.5, z: 10, radius: 1.6, height: 5, circular: false },
  { id: "l9s-shaft", x: 11, y: -6, z: 7, radius: 3.2, height: 12, circular: true },
];

export function waypointById(line: LineTarget, id: string): Waypoint | undefined {
  return ROUTES[line].waypoints.find((w) => w.id === id);
}

export function vec3(w: Vec3): [number, number, number] {
  return [w.x, w.y, w.z];
}
