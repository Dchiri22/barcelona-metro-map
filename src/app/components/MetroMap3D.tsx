import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, ContactShadows, Environment, Html, OrbitControls, Text } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { createBarcelonaSatelliteTexture } from "@/app/utils/barcelonaSatellite";
import {
  BG_NODES, LINE_COLOR, METRO_LINE_LABELS, METRO_LINES,
  PINNED, STATIONS, STATUS_COLOR, STATUS_LABEL,
  type Station,
} from "@/app/data/metro";
import {
  BOULEVARD_TREES, CITY_BOUNDS, CITY_BUILDINGS, CITY_CROSSWALKS, CITY_PATIOS, CITY_STREETS,
  PATIO_GROUND, SIDEWALK,
  type StreetSegment,
} from "@/app/data/barcelonaCity";
import { parseSvgPath, pathToCurve, schematicTo3D } from "@/app/utils/schematic3d";
import { getAsphaltMaterial, getBoulevardMaterial, getCrosswalkTexture, getSidewalkMaterial } from "@/app/utils/roadTextures";
import { SOLMOVE } from "@/app/theme/solmove";

/** Metro tunnel depth below street level (3D mode) */
const METRO_DEPTH = -0.14;
const METRO_SURFACE = 0.022;
const SURFACE_Y = 0.08;

export type MapVariant = "2d" | "3d";

export type MapLayers = {
  buildings: boolean;
  streets: boolean;
  metro: boolean;
  stations: boolean;
  trees: boolean;
  lineLabels: boolean;
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  buildings: true,
  streets: true,
  metro: true,
  stations: true,
  trees: true,
  lineLabels: true,
};

const BUILDING_CONCRETE = "#A8A8A8";
const SKY_BG = "#0e1f36";
const MAX_BUILDING_H = Math.max(...CITY_BUILDINGS.map(b => b.h), 1);

const BARCELONA_PAN = {
  minX: CITY_BOUNDS.minX - 0.6,
  maxX: CITY_BOUNDS.maxX + 0.6,
  minZ: CITY_BOUNDS.minZ - 0.6,
  maxZ: CITY_BOUNDS.maxZ + 0.6,
};

function pathMidpoint(d: string, elevation: number): THREE.Vector3 {
  const pts = parseSvgPath(d);
  const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
  return schematicTo3D(mid.x, mid.y, elevation);
}

// ─── Terrain ──────────────────────────────────────────────────────────────────

function TerrainBase({ flat2d }: { flat2d?: boolean }) {
  const [satTex, setSatTex] = useState<THREE.CanvasTexture | null>(null);
  const w = CITY_BOUNDS.maxX - CITY_BOUNDS.minX + 1;
  const d = CITY_BOUNDS.maxZ - CITY_BOUNDS.minZ + 1;
  const cx = (CITY_BOUNDS.minX + CITY_BOUNDS.maxX) / 2;
  const cz = (CITY_BOUNDS.minZ + CITY_BOUNDS.maxZ) / 2;

  useEffect(() => {
    if (flat2d) return;
    let alive = true;
    void createBarcelonaSatelliteTexture(14, 4).then(tex => {
      if (alive) setSatTex(tex);
    });
    return () => { alive = false; };
  }, [flat2d]);

  const groundMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: satTex ?? undefined,
        color: satTex ? "#ffffff" : "#2a3544",
        roughness: 0.88,
        metalness: 0.04,
      }),
    [satTex],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.021, cz]} receiveShadow material={groundMat}>
        <planeGeometry args={[w * 1.18, d * 1.18]} />
      </mesh>
      {!flat2d && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[schematicTo3D(378, 312).x, 0.002, schematicTo3D(378, 312).z]}>
            <planeGeometry args={[1.2, 0.95]} />
            <meshStandardMaterial color="#6A9460" roughness={0.95} transparent opacity={0.55} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CITY_BOUNDS.maxX - 0.8, -0.019, cz]}>
            <planeGeometry args={[2.5, d * 0.85]} />
            <meshStandardMaterial color="#8a8070" roughness={0.95} transparent opacity={0.45} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CITY_BOUNDS.maxX + 1.2, -0.022, cz]}>
            <planeGeometry args={[3, d + 1]} />
            <meshStandardMaterial color="#1a4a6e" roughness={0.2} metalness={0.15} transparent opacity={0.72} />
          </mesh>
        </>
      )}
      {flat2d && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[schematicTo3D(378, 312).x, 0.003, schematicTo3D(378, 312).z]}>
            <planeGeometry args={[1.2, 0.95]} />
            <meshStandardMaterial color="#A8C898" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CITY_BOUNDS.maxX + 1.2, -0.025, cz]}>
            <planeGeometry args={[3, d + 1]} />
            <meshStandardMaterial color="#7EB0D8" roughness={0.15} metalness={0.1} transparent opacity={0.88} />
          </mesh>
        </>
      )}
    </group>
  );
}

function BlockPatios({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {CITY_PATIOS.map((p, i) => (
        <group key={i} position={[p.x, 0.005, p.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[p.size, p.size]} />
            <meshStandardMaterial color={PATIO_GROUND} roughness={0.98} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Streets ──────────────────────────────────────────────────────────────────

function streetMaterial(s: StreetSegment) {
  if (s.kind === "boulevard" || s.kind === "diagonal") return getBoulevardMaterial();
  if (s.kind === "rambla") return getAsphaltMaterial(1);
  return getAsphaltMaterial(s.lanes ?? 2);
}

function StreetNetwork({ visible, flat2d }: { visible: boolean; flat2d?: boolean }) {
  const segments = useMemo(() =>
    CITY_STREETS.map((s, i) => {
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      return { ...s, key: i, cx: (s.x1 + s.x2) / 2, cz: (s.z1 + s.z2) / 2, len: Math.hypot(dx, dz), angle: Math.atan2(dx, dz) };
    }),
  []);
  const sidewalkMat = useMemo(() => getSidewalkMaterial(), []);
  if (!visible) return null;

  return (
    <group>
      {segments.map(s => {
        const sw = s.kind === "boulevard" || s.kind === "diagonal" ? 0.16 : 0.1;
        const mat = streetMaterial(s);
        return (
          <group key={s.key}>
            <mesh position={[s.cx, 0.001, s.cz]} rotation={[0, s.angle, 0]} receiveShadow material={sidewalkMat}>
              <boxGeometry args={[s.width + sw * 2, 0.012, s.len]} />
            </mesh>
            <mesh position={[s.cx, 0.003, s.cz]} rotation={[0, s.angle, 0]}>
              <boxGeometry args={[s.width + 0.04, 0.014, s.len]} />
              <meshStandardMaterial color={SIDEWALK} roughness={0.88} />
            </mesh>
            <mesh position={[s.cx, 0.005, s.cz]} rotation={[0, s.angle, 0]}>
              <boxGeometry args={[s.width + 0.018, 0.004, s.len]} />
              <meshStandardMaterial color="#8A8A8A" roughness={0.95} />
            </mesh>
            <mesh position={[s.cx, 0.008, s.cz]} rotation={[0, s.angle, 0]} receiveShadow material={mat}>
              <boxGeometry args={[s.width, 0.018, s.len]} />
            </mesh>
            {s.name && !flat2d && (
              <Text position={[s.cx, 0.028, s.cz]} rotation={[-Math.PI / 2, s.angle, 0]} fontSize={0.065} color="#707070" anchorX="center" anchorY="middle" maxWidth={s.len * 0.85}>
                {s.name}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Crosswalks({ visible }: { visible: boolean }) {
  const tex = useMemo(() => getCrosswalkTexture(), []);
  if (!visible) return null;
  return (
    <group>
      {CITY_CROSSWALKS.map((cw, i) => (
        <mesh key={i} position={[cw.x, 0.009, cw.z]} rotation={[-Math.PI / 2, cw.angle, 0]}>
          <planeGeometry args={[cw.size, cw.size * 0.55]} />
          <meshStandardMaterial map={tex} color="#F0F0F0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Buildings — extruded volumes, concrete MeshPhysicalMaterial ──────────────

function BuildingCity({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = CITY_BUILDINGS.length;

  const concreteMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(BUILDING_CONCRETE),
        roughness: 0.82,
        metalness: 0.06,
        clearcoat: 0.08,
        clearcoatRoughness: 0.92,
        reflectivity: 0.25,
      }),
    [],
  );

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    CITY_BUILDINGS.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.rotation.set(0, b.rotY ?? 0, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      const lum = 0.52 + (b.h / MAX_BUILDING_H) * 0.28;
      tint.setHSL(0, 0, lum);
      meshRef.current!.setColorAt(i, tint);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, []);

  if (!visible) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, concreteMaterial, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

function BoulevardTrees({ visible }: { visible: boolean }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const count = BOULEVARD_TREES.length;

  const trunkMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#888878", roughness: 0.9 }),
    [],
  );
  const canopyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#6A9460", roughness: 0.85 }),
    [],
  );

  useLayoutEffect(() => {
    if (!trunkRef.current || !canopyRef.current) return;
    const dummy = new THREE.Object3D();
    BOULEVARD_TREES.forEach((t, i) => {
      dummy.position.set(t.x, 0.04, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, 0.1, t.z);
      dummy.updateMatrix();
      canopyRef.current!.setMatrixAt(i, dummy.matrix);
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    canopyRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  if (!visible) return null;

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, trunkMaterial, count]} castShadow>
        <cylinderGeometry args={[0.012, 0.015, 0.08, 5]} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, canopyMaterial, count]} castShadow>
        <sphereGeometry args={[0.045, 6, 6]} />
      </instancedMesh>
    </group>
  );
}

// ─── Metro underground ────────────────────────────────────────────────────────

function MetroLineLabel({
  position, color, label, flat2d,
}: {
  position: THREE.Vector3; color: string; label: string; flat2d?: boolean;
}) {
  if (flat2d) {
    return (
      <Html position={position} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white whitespace-nowrap shadow-sm"
          style={{ background: color, fontFamily: "'Onest', sans-serif" }}>{label}</div>
      </Html>
    );
  }

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh renderOrder={10}>
        <planeGeometry args={[0.72, 0.16]} />
        <meshBasicMaterial color={color} transparent opacity={0.94} depthTest={false} />
      </mesh>
      <Text
        position={[0, 0, 0.002]}
        fontSize={0.048}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.68}
        renderOrder={11}
      >
        {label}
      </Text>
    </Billboard>
  );
}

function MetroLineMesh({
  id, d, color, width, dashed, showLabel, flat2d,
}: {
  id: string; d: string; color: string; width: number; dashed?: boolean; showLabel: boolean; flat2d?: boolean;
}) {
  const elevation = flat2d ? METRO_SURFACE : METRO_DEPTH;
  const curve = useMemo(() => pathToCurve(d, elevation), [d, elevation]);
  const labelPos = useMemo(() => pathMidpoint(d, flat2d ? 0.05 : 0.04), [d, flat2d]);
  if (!curve) return null;
  const r = width * (flat2d ? 0.005 : 0.008);
  const label = METRO_LINE_LABELS[id] ?? id;

  if (flat2d) {
    const pts = parseSvgPath(d);
    const segments: { cx: number; cz: number; len: number; angle: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = schematicTo3D(pts[i].x, pts[i].y, METRO_SURFACE);
      const b = schematicTo3D(pts[i + 1].x, pts[i + 1].y, METRO_SURFACE);
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;
      segments.push({ cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2, len, angle: Math.atan2(dx, dz) });
    }
    return (
      <group>
        {segments.map((s, i) => (
          <mesh key={i} position={[s.cx, METRO_SURFACE, s.cz]} rotation={[0, s.angle, 0]}>
            <boxGeometry args={[r * 2.2, 0.014, s.len]} />
            <meshBasicMaterial color={color} transparent={!!dashed} opacity={dashed ? 0.6 : 1} />
          </mesh>
        ))}
        {showLabel && (
          <MetroLineLabel position={labelPos} color={color} label={label} flat2d />
        )}
      </group>
    );
  }

  return (
    <group>
      {/* Tunnel casing underground */}
      <mesh castShadow>
        <tubeGeometry args={[curve, 256, r * 2.5, 10, false]} />
        <meshStandardMaterial color="#6E6E6E" roughness={0.88} metalness={0.08} />
      </mesh>
      {/* Colored rail — official TMB line color */}
      <mesh>
        <tubeGeometry args={[curve, 256, r, 10, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.32}
          transparent={!!dashed}
          opacity={dashed ? 0.75 : 1}
          roughness={0.28}
          metalness={0.12}
        />
      </mesh>
      {showLabel && (
        <MetroLineLabel position={labelPos} color={color} label={label} />
      )}
    </group>
  );
}

function MetroNetwork({ visible, showLabels, flat2d }: { visible: boolean; showLabels: boolean; flat2d?: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {METRO_LINES.map(l => (
        <MetroLineMesh key={l.id} id={l.id} d={l.d} color={l.color} width={l.w} dashed={l.dashed} showLabel={showLabels} flat2d={flat2d} />
      ))}
    </group>
  );
}

// ─── Stations at surface, connected to underground ────────────────────────────

function stationDimmed(st: Station, filter: string) {
  return (
    (filter === "issues" && st.status === "ok") ||
    (filter === "working" && st.status !== "ok") ||
    (filter === "mine" && !PINNED.includes(st.id))
  );
}

function MetroStationNode({
  x, y, label, interchange, filter, onSelect, station, selected, dimmed, visible, flat2d,
}: {
  x: number; y: number; label: string; interchange: boolean; filter: string; visible: boolean; flat2d?: boolean;
  onSelect?: (s: Station) => void; station?: Station; selected?: boolean; dimmed?: boolean;
}) {
  const surfacePos = schematicTo3D(x, y, flat2d ? 0.035 : SURFACE_Y);
  const [hovered, setHovered] = useState(false);
  const isInteractive = !!station;
  const ringColor = station ? STATUS_COLOR[station.status] : "#B0B0B0";
  const r = isInteractive ? 0.085 : interchange ? 0.055 : 0.04;
  const meshRef = useRef<THREE.Mesh>(null);
  const shaftDepth = SURFACE_Y - METRO_DEPTH;

  useFrame(() => {
    if (!meshRef.current || !isInteractive || flat2d) return;
    const scale = hovered || selected ? 1.28 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);
  });

  if (!visible) return null;
  const fade = (filter === "issues" || filter === "mine") && !isInteractive;

  if (flat2d) {
    const rf = isInteractive ? 0.075 : interchange ? 0.05 : 0.038;
    return (
      <group position={surfacePos}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <ringGeometry args={[rf * 0.85, rf * 1.15, 20]} />
          <meshBasicMaterial color={ringColor} transparent opacity={dimmed ? 0.12 : 0.85} />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={e => { e.stopPropagation(); if (isInteractive && !dimmed && onSelect && station) onSelect(station); }}
        >
          <circleGeometry args={[rf, 20]} />
          <meshBasicMaterial
            color={station?.status === "down" ? SOLMOVE.ink : "#FFFFFF"}
            transparent
            opacity={dimmed ? 0.15 : fade ? 0.35 : 1}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group position={surfacePos}>
      {/* Shaft to underground metro */}
      <mesh position={[0, -shaftDepth / 2, 0]}>
        <cylinderGeometry args={[r * 0.4, r * 0.5, shaftDepth, 8]} />
        <meshStandardMaterial color="#A8A8A8" roughness={0.8} transparent opacity={0.55} />
      </mesh>
      {/* Entrance kiosk */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <boxGeometry args={[r * 1.6, 0.06, r * 1.2]} />
        <meshStandardMaterial color="#BABABA" roughness={0.6} />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={e => { e.stopPropagation(); if (isInteractive && !dimmed && onSelect && station) onSelect(station); }}
        onPointerOver={e => { e.stopPropagation(); if (isInteractive && !dimmed) setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[r, 18, 18]} />
        <meshStandardMaterial
          color="#EEEEEE"
          emissive={ringColor}
          emissiveIntensity={dimmed ? 0 : hovered || selected ? 0.45 : isInteractive ? 0.22 : 0.06}
          roughness={0.35}
          transparent
          opacity={dimmed ? 0.15 : fade ? 0.35 : 1}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[r * 0.9, r * 1.15, 24]} />
        <meshBasicMaterial color={ringColor} transparent opacity={dimmed ? 0.1 : 0.9} />
      </mesh>
      {(interchange || isInteractive) && !dimmed && !fade && (
        <Text position={[0, r + 0.06, 0]} fontSize={isInteractive ? 0.055 : 0.045} color="#505050" anchorX="center" anchorY="bottom" maxWidth={0.9}>
          {label.length > 18 ? label.slice(0, 17) + "…" : label}
        </Text>
      )}
      {isInteractive && !dimmed && (hovered || selected) && station && (
        <Html distanceFactor={8} position={[0, r + 0.32, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-2xl px-3 py-2 shadow-lg border whitespace-nowrap"
            style={{ background: "white", borderColor: "rgba(47,163,160,0.18)", minWidth: 170, fontFamily: "'Onest', sans-serif" }}>
            <p className="text-xs font-extrabold" style={{ color: SOLMOVE.ink }}>{station.name}</p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {station.lines.map(l => (
                <span key={l} className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: LINE_COLOR[l] }}>{l}</span>
              ))}
            </div>
            <p className="text-[10px] mt-1 font-semibold" style={{ color: ringColor }}>{STATUS_LABEL[station.status]}</p>
            <p className="text-[9px] mt-0.5" style={{ color: SOLMOVE.muted }}>{station.exits} exits · Updated {station.updated}</p>
            {selected && station.elevators.map(e => (
              <p key={e.id} className="text-[8px] mt-0.5" style={{ color: SOLMOVE.muted }}>
                <span style={{ color: STATUS_COLOR[e.status] }}>●</span> {e.label}
              </p>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
}

function AllMetroStations({
  filter, onSelect, selectedId, visible, flat2d,
}: {
  filter: string; onSelect: (s: Station) => void; selectedId: string | null; visible: boolean; flat2d?: boolean;
}) {
  const stationByNodeId: Record<string, Station> = {};
  STATIONS.forEach(s => { stationByNodeId[s.id] = s; });
  stationByNodeId["arc-triomf"] = STATIONS.find(s => s.id === "arct")!;

  return (
    <group>
      {BG_NODES.map(n => {
        const st = stationByNodeId[n.id];
        return (
          <MetroStationNode
            key={n.id}
            x={n.x} y={n.y}
            label={n.label}
            interchange={n.interchange}
            filter={filter}
            station={st}
            onSelect={onSelect}
            selected={st ? selectedId === st.id : false}
            dimmed={st ? stationDimmed(st, filter) : false}
            visible={visible}
            flat2d={flat2d}
          />
        );
      })}
    </group>
  );
}

function TopDownCamera({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.position.set(0, 50, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, zoom]);
  return null;
}

function CityLighting({ is2d }: { is2d: boolean }) {
  if (is2d) {
    return (
      <>
        <ambientLight intensity={1.05} />
        <directionalLight position={[0, 10, 0]} intensity={0.35} />
        <hemisphereLight args={["#F8F8F8", "#B0B0B0", 0.4]} />
      </>
    );
  }

  // Ported from frontend/GlobeCanvas.tsx — cinematic multi-light rig
  return (
    <>
      <Environment preset="city" />
      <hemisphereLight args={["#e8f2ff", "#9aab8a", 0.85]} />
      <ambientLight intensity={0.38} color="#f2f7ff" />
      <directionalLight
        position={[4.5, 14, 5]}
        intensity={2.4}
        color="#fff6e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={55}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.00035}
        shadow-radius={3}
      />
      <directionalLight position={[-7, 9, -5]} intensity={0.85} color="#d9ecff" />
      <directionalLight position={[0, 6, 10]} intensity={0.45} color="#eef3e4" />
      <directionalLight position={[7, 4, -2]} intensity={0.35} color="#ffe8d4" />
    </>
  );
}

function BarcelonaOrbitControls({
  is2d, controlsRef, zoomRef,
}: {
  is2d: boolean;
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  zoomRef?: MutableRefObject<number>;
}) {
  const internalRef = useRef<OrbitControlsImpl>(null);
  const ref = controlsRef ?? internalRef;

  useFrame(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, BARCELONA_PAN.minX, BARCELONA_PAN.maxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, BARCELONA_PAN.minZ, BARCELONA_PAN.maxZ);
  });

  if (is2d) {
    return (
      <OrbitControls
        ref={ref}
        enableRotate={false}
        enableDamping
        dampingFactor={0.08}
        minZoom={35}
        maxZoom={105}
        minPolarAngle={0}
        maxPolarAngle={0}
        screenSpacePanning
        target={[0, 0, 0]}
      />
    );
  }

  return (
    <OrbitControls
      ref={ref}
      enablePan
      enableZoom
      enableDamping
      dampingFactor={0.06}
      minDistance={6}
      maxDistance={28}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, 0, 0]}
    />
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({
  filter, onStation, selectedId, layers, variant, controlsRef, zoomRef,
}: {
  filter: string;
  onStation: (s: Station) => void;
  selectedId: string | null;
  layers: MapLayers;
  variant: MapVariant;
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  zoomRef?: MutableRefObject<number>;
}) {
  const is2d = variant === "2d";
  const { camera } = useThree();

  useLayoutEffect(() => {
    if (is2d || !(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(0, 14, 16);
    camera.lookAt(0, 0, 0);
  }, [camera, is2d]);

  return (
    <>
      <color attach="background" args={[is2d ? "#E4E4E8" : SKY_BG]} />
      {is2d && zoomRef && <TopDownCamera zoom={zoomRef.current} />}
      {!is2d && <fog attach="fog" args={[SKY_BG, 28, 52]} />}
      <CityLighting is2d={is2d} />

      <TerrainBase flat2d={is2d} />
      <BlockPatios visible={layers.buildings} />
      <StreetNetwork visible={layers.streets} flat2d={is2d} />
      <Crosswalks visible={layers.streets} />
      <BuildingCity visible={layers.buildings} />
      <BoulevardTrees visible={layers.trees} />
      <MetroNetwork visible={layers.metro} showLabels={layers.lineLabels} flat2d={is2d} />
      <AllMetroStations filter={filter} onSelect={onStation} selectedId={selectedId} visible={layers.stations} flat2d={is2d} />

      {!is2d && (
        <ContactShadows
          position={[0, 0.002, 0]}
          opacity={0.62}
          scale={24}
          blur={2.8}
          far={12}
          color="#0a1220"
          frames={Infinity}
        />
      )}

      <BarcelonaOrbitControls is2d={is2d} controlsRef={controlsRef} zoomRef={zoomRef} />
    </>
  );
}

export function MetroMap3D({
  filter, onStation, selectedId, layers = DEFAULT_MAP_LAYERS,
  variant = "3d", controlsRef, zoomRef,
}: {
  filter: string;
  onStation: (s: Station) => void;
  selectedId?: string | null;
  layers?: MapLayers;
  variant?: MapVariant;
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  zoomRef?: MutableRefObject<number>;
}) {
  const is2d = variant === "2d";

  return (
    <Canvas
      orthographic={is2d}
      shadows={!is2d}
      dpr={[1, 2]}
      camera={is2d
        ? { zoom: zoomRef?.current ?? 55, position: [0, 50, 0], near: 0.1, far: 500 }
        : { fov: 38, near: 0.1, far: 100, position: [0, 14, 16] }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(is2d ? "#E4E4E8" : SKY_BG);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = is2d ? 1.0 : 1.38;
        gl.shadowMap.enabled = !is2d;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      style={{ width: "100%", height: "100%", touchAction: "none", display: "block" }}
    >
      <Suspense fallback={null}>
        <Scene
          filter={filter}
          onStation={onStation}
          selectedId={selectedId ?? null}
          layers={layers}
          variant={variant}
          controlsRef={controlsRef}
          zoomRef={zoomRef}
        />
      </Suspense>
    </Canvas>
  );
}
