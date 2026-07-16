/**
 * MetroAccessibilitySimulator — Three.js engine for Zona Universitària
 *
 * Prototype: simulated avatar movement via D-pad or auto-play.
 * Production note: avatar position would sync with indoor positioning
 * (WiFi/beacon triangulation) — left as integration hook for future release.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  RESTRICTED_ZONES,
  ROUTES,
  type LineTarget,
  type Waypoint,
} from "@/app/data/zonaUniversitaria";
import {
  buildBoxElevator,
  buildCircularElevator,
  syncElevatorCabin,
  type ElevatorHandle,
} from "@/app/simulator/elevatorCabin";
import { placeMetroAtPlatform } from "@/app/simulator/metroTrain";
import {
  buildWheelchairAvatar,
  spinWheelchairWheels,
} from "@/app/simulator/wheelchairAvatar";
import { createAvatarTextures, disposeAvatarTextures, type AvatarTextureSet } from "@/app/simulator/wheelchairTextures";
import {
  createStationTextures,
  disposeStationTextures,
  stationMaterial,
  type StationTextureSet,
} from "@/app/simulator/stationTextures";

export type SimulatorCallbacks = {
  onSubtitle: (text: string) => void;
  onWarning: (text: string | null) => void;
  onWaypoint: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
};

type MoveDir = "up" | "down" | "left" | "right";

const ROUTE_BLUE = 0x2fa3a0;
const STAIR = 0xfbbf24;
const STAIR_WARN = 0xef4444;
/** Keep wheelchair slightly above floor slabs to avoid z-fighting / camera clip */
const GROUND_CLEARANCE = 0.04;

export class MetroAccessibilitySimulator {
  private container: HTMLElement;
  private callbacks: SimulatorCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private avatar!: THREE.Group;
  private rearWheels: THREE.Group[] = [];
  private casterGroups: THREE.Group[] = [];
  private routeGroup: THREE.Group | null = null;
  private restrictedMeshes: THREE.Mesh[] = [];
  private colliderMeshes: THREE.Mesh[] = [];
  private elevatorGroups: THREE.Group[] = [];
  private elevators: ElevatorHandle[] = [];
  private prevAvatarY = 0;
  private verticalSpeed = 0;
  private camRaycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastWarn: string | null = null;
  private trainL3: THREE.Group | null = null;
  private trainL9: THREE.Group | null = null;
  private avatarTextures: AvatarTextureSet | null = null;
  private stationTextures: StationTextureSet | null = null;
  private autoPrevPos = new THREE.Vector3();
  private autoSegStartRot = 0;
  private animId = 0;
  private disposed = false;

  private line: LineTarget = "L3";
  private waypointIndex = 0;
  private autoPlaying = false;
  private autoSegment = 0;
  private autoSegT = 0;
  private muted = false;
  private lastSpoken = "";
  private camTarget = new THREE.Vector3();
  private camDesired = new THREE.Vector3();
  private avatarPos = new THREE.Vector3();
  private rafCallbacks: Array<(dt: number) => void> = [];

  constructor(container: HTMLElement, callbacks: SimulatorCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  /* ── Public API ─────────────────────────────────────────────────────── */

  setLine(line: LineTarget) {
    this.line = line;
    this.waypointIndex = 0;
    this.stopAuto();
    this.buildRoute();
    this.teleportToWaypoint(0);
    this.updateLineVisibility();
  }

  getLine() {
    return this.line;
  }

  reset() {
    this.stopAuto();
    this.waypointIndex = 0;
    this.teleportToWaypoint(0);
    this.closeElevatorDoors();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) window.speechSynthesis?.cancel();
  }

  move(dir: MoveDir) {
    if (this.autoPlaying) return;
    const route = ROUTES[this.line];
    const current = route.waypoints[this.waypointIndex];
    const neighbors = this.getNeighborIndices(this.waypointIndex);
    const next = this.pickNeighbor(current, neighbors, dir, route.waypoints);
    if (next === null) return;
    this.animateToWaypoint(next);
  }

  playAuto() {
    this.autoSegment = 0;
    this.autoSegT = 0;
    this.autoPlaying = true;
    const wps = ROUTES[this.line].waypoints;
    const a = wps[0];
    this.autoPrevPos.set(a.x, a.y, a.z);
    this.autoSegStartRot = this.avatar.rotation.y;
    this.callbacks.onPlayingChange(true);
  }

  private spinWheels(distance: number) {
    spinWheelchairWheels(this.rearWheels, this.casterGroups, distance);
  }

  stopAuto() {
    this.autoPlaying = false;
    this.autoSegment = 0;
    this.autoSegT = 0;
    this.callbacks.onPlayingChange(false);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animId);
    window.speechSynthesis?.cancel();
    this.controls?.dispose();
    if (this.avatarTextures) {
      disposeAvatarTextures(this.avatarTextures);
      this.avatarTextures = null;
    }
    if (this.stationTextures) {
      disposeStationTextures(this.stationTextures);
      this.stationTextures = null;
    }
    if (this.scene.environment) {
      this.scene.environment.dispose();
    }
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  /* ── Init ───────────────────────────────────────────────────────────── */

  private init() {
    const w = this.container.clientWidth || 360;
    const h = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd6d2ca);
    this.scene.fog = new THREE.Fog(0xd6d2ca, 42, 95);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.15, 120);
    this.camera.position.set(0, 1.7, -16);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    // Cap DPR — 2x on phones kills fill-rate with this scene
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    // Keep orbit near wheelchair eye-level — never dive into the floor slab
    this.controls.minPolarAngle = Math.PI * 0.28;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 6.5;
    this.controls.enablePan = false;

    this.setupEnvironment();
    this.setupLighting();

    this.buildStation();
    this.avatarTextures = createAvatarTextures();
    const avatarParts = buildWheelchairAvatar(this.avatarTextures);
    this.avatar = avatarParts.root;
    this.rearWheels = avatarParts.rearWheels;
    this.casterGroups = avatarParts.casterGroups;
    this.scene.add(this.avatar);
    this.buildRoute();
    this.teleportToWaypoint(0);

    this.loop();
  }

  /** Soft indoor reflections — RoomEnvironment IBL */
  private setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const rt = pmrem.fromScene(room, 0.04);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.4;
    pmrem.dispose();
  }

  /** Few real lights — emissive fixtures handle the rest (much cheaper) */
  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xf5f2ea, 0x8a8578, 0.55);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff8f0, 1.15);
    key.position.set(8, 22, -6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 55;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xe8f0f5, 0.45);
    fill.position.set(-14, 10, 10);
    this.scene.add(fill);
  }

  /* ── Station geometry (textured PBR finishes) ───────────────────────── */

  private buildStation() {
    this.stationTextures = createStationTextures();
    const tex = this.stationTextures;

    const floorMat = stationMaterial(tex.floor, {
      repeatX: 10, repeatY: 9, roughness: 0.32, metalness: 0.06, envMapIntensity: 1.35, normalScale: 0.55,
    });
    const aisleMat = stationMaterial(tex.aisle, {
      repeatX: 3, repeatY: 14, roughness: 0.22, metalness: 0.08, envMapIntensity: 1.5,
    });
    const wallMat = stationMaterial(tex.wall, {
      repeatX: 2, repeatY: 6, roughness: 0.72, metalness: 0.02, envMapIntensity: 0.7, normalScale: 1.35,
    });
    const ceilingMat = stationMaterial(tex.ceiling, {
      repeatX: 14, repeatY: 4, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.55, normalScale: 0.9,
    });
    const platformMat = stationMaterial(tex.platform, {
      repeatX: 8, repeatY: 5, roughness: 0.28, metalness: 0.05, envMapIntensity: 1.4, normalScale: 0.4,
    });
    const skirting = new THREE.MeshStandardMaterial({ color: 0x8a857c, roughness: 0.55, metalness: 0.15 });
    const signBand = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.85, metalness: 0.1 });

    // ── Mezzanine floor + central aisle ──
    this.addBox(0, -0.15, -4, 26, 0.3, 24, floorMat);
    this.addBox(0, -0.12, -4, 4.5, 0.06, 22, aisleMat);

    // Perimeter walls (ribbed tiles)
    this.registerCollider(this.addBox(-13, 1.5, -4, 0.4, 3.2, 22, wallMat));
    this.registerCollider(this.addBox(13, 1.5, -4, 0.4, 3.2, 22, wallMat));
    // Soft end walls (enclosure / depth)
    this.registerCollider(this.addBox(0, 1.5, -15.8, 26, 3.2, 0.35, wallMat));
    this.registerCollider(this.addBox(0, 1.5, 7.8, 10, 3.2, 0.35, wallMat));

    // Baseboards
    this.addBox(-13, 0.08, -4, 0.12, 0.16, 22, skirting);
    this.addBox(13, 0.08, -4, 0.12, 0.16, 22, skirting);

    // Black signage band along walls
    this.addBox(-12.75, 2.55, -4, 0.08, 0.38, 20, signBand);
    this.addBox(12.75, 2.55, -4, 0.08, 0.38, 20, signBand);

    // Slatted ceiling + structural beams
    this.addBox(0, 3.05, -4, 26, 0.22, 22, ceilingMat);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xc9c4bb, roughness: 0.82, metalness: 0.04 });
    for (const z of [-12, -8, -4, 0, 4]) {
      this.addBox(0, 2.88, z, 26, 0.18, 0.45, beamMat);
    }

    for (const [x, z] of [[-5, -6], [5, -6], [0, 1], [-5, 8], [0, -10]] as const) {
      this.addCeilingLight(x, 2.85, z);
    }

    // Street ramps (outside main hall)
    for (const [x, z] of [[-7, -14], [7, -14]] as const) {
      this.addRamp(x, z);
      this.addTactilePad(x, 0.04, z - 1.2);
    }
    this.addWallSign(-12, 1.6, -2, "Accés", 0x2fa3a0, Math.PI / 2);
    this.addWallSign(12, 1.6, -2, "Accés", 0x2fa3a0, -Math.PI / 2);

    // Turnstiles on SIDES only — 4 m clear center aisle
    for (const x of [-5, 5]) {
      this.addTurnstile(x, -0.5);
    }

    // Branch corridors
    this.addBox(-6, -0.15, 8, 3.5, 0.3, 8, aisleMat);
    this.addBox(8, -0.15, 5, 8, 0.3, 5, aisleMat);

    // Station name banner
    this.addHangingSign(0, 2.55, -4, "Zona Universitària", 0x24323f, 5.5);

    // L3 platform hall
    this.addBox(-6, -5.15, 14, 18, 0.3, 12, platformMat);
    this.addBox(-6, -2.1, 14, 18, 0.18, 12, ceilingMat);
    this.registerCollider(this.addBox(-14.8, -3.5, 14, 0.35, 3.2, 12, wallMat));
    this.registerCollider(this.addBox(2.5, -3.5, 14, 0.35, 3.2, 10, wallMat));
    this.addBox(-14.6, -2.5, 14, 0.08, 0.35, 10, signBand);
    this.addPlatformEdge(-6, -4.98, 19.5, 16, 0x3fab2e);
    this.addTactileStrip(-6, -4.96, 18.8, 14);
    this.addSafetyLine(-6, -4.97, 19.1, 15, 0xffffff);
    this.addHazardStrip(-6, -4.95, 19.35, 15);
    this.addWallSign(-12, -3.8, 14, "L3 → Trinitat Nova", 0x3fab2e, Math.PI / 2);
    this.addPlatformScreen(-10, -3.6, 16.5, "3 min  ·  L3 Trinitat Nova", 0x3fab2e);
    this.addPlatformScreen(-2, -3.6, 16.5, "7 min  ·  L3 Zona Universitària", 0x3fab2e);
    this.addBench(-10, -5, 12);
    this.addBench(-2, -5, 12);
    this.addTrashBin(-8.5, -5, 11);
    this.addTunnelMouth(-6, -5, 8, 0x3fab2e);
    this.addCeilingLight(-6, -2.25, 14);

    // L9S deep level
    this.addBox(11, -12.15, 14, 16, 0.3, 12, platformMat);
    this.addBox(11, -9.1, 14, 16, 0.18, 12, ceilingMat);
    this.registerCollider(this.addBox(3.2, -10.5, 14, 0.35, 3.2, 12, wallMat));
    this.registerCollider(this.addBox(18.5, -10.5, 14, 0.35, 3.2, 12, wallMat));
    this.addPlatformEdge(11, -11.98, 19.5, 14, 0xf58220);
    this.addTactileStrip(11, -11.96, 18.8, 12);
    this.addSafetyLine(11, -11.97, 19.1, 13, 0xffffff);
    this.addHazardStrip(11, -11.95, 19.35, 13);
    this.addWallSign(12, -10.8, 19, "L9S → Aeroport T1", 0xf58220, 0);
    this.addPlatformScreen(8, -10.6, 16.5, "4 min  ·  L9S Aeroport T1", 0xf58220);
    this.addPlatformScreen(14, -10.6, 16.5, "Via sense servei", 0x64748b);
    this.addBench(8, -12, 12);
    this.addBench(14, -12, 12);
    this.addTrashBin(10, -12, 11);
    this.addTunnelMouth(11, -12, 8, 0xf58220);
    this.addCeilingLight(11, -9.25, 14);

    // Stairs on side walls only (restricted)
    for (const z of RESTRICTED_ZONES) {
      this.addStaircase(z.x, z.y, z.z, z.w, z.h, z.d, z.label);
      this.addGlassBarrier(z.x, z.y, z.z, z.w + 0.4);
    }

    // L3 elevator — moving cabin rides with the avatar
    const l3Elev = buildBoxElevator({
      x: -6,
      z: 10,
      floors: [0, -5],
      width: 2.5,
      depth: 2.3,
      label: "Ascensor L3",
    });
    this.scene.add(l3Elev.root);
    l3Elev.colliders.forEach((c) => this.registerCollider(c));
    this.elevators.push(l3Elev);
    this.elevatorGroups.push(...l3Elev.doorGroups);

    // L9S circular shaft elevator
    const l9Elev = buildCircularElevator({
      x: 11,
      z: 7,
      floors: [0, -12],
      radius: 2.7,
      label: "Ascensor L9S",
    });
    this.scene.add(l9Elev.root);
    l9Elev.colliders.forEach((c) => this.registerCollider(c));
    this.elevators.push(l9Elev);
    this.elevatorGroups.push(...l9Elev.doorGroups);

    // Destination trains on the rails (toggle by active line)
    this.trainL3 = placeMetroAtPlatform({
      x: -6,
      y: -5.05,
      z: 22.2,
      rotY: 0,
      lineColor: 0x3fab2e,
      destination: "Trinitat Nova",
      trackLength: 30,
    });
    this.trainL9 = placeMetroAtPlatform({
      x: 11,
      y: -12.05,
      z: 22.2,
      rotY: 0,
      lineColor: 0xf58220,
      destination: "Aeroport T1",
      trackLength: 30,
    });
    this.scene.add(this.trainL3, this.trainL9);
    this.updateLineVisibility();

    // Columns with tile cladding
    const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 3.1, 16);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x9a9590,
      roughness: 0.45,
      metalness: 0.25,
      envMapIntensity: 0.9,
    });
    for (const [x, z] of [[-10, -8], [10, -8], [-10, 6], [10, 6], [-4, -2], [4, -2]] as const) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(x, 1.55, z);
      col.castShadow = true;
      col.receiveShadow = true;
      this.registerCollider(col);
      this.scene.add(col);
    }

    this.addKiosk(11, 0, -6);
    this.addTicketMachine(-8, 0, -5);
    this.addTicketMachine(8, 0, -5);
    this.addInfoBoard(0, 1.8, 6.5, "L3  ·  L9S  ·  Bus");
    this.addAdPanel(-12.6, 1.4, -8, Math.PI / 2);
    this.addAdPanel(12.6, 1.4, -8, -Math.PI / 2);
    this.addTrashBin(-3, 0, -3);
    this.addTrashBin(3, 0, 2);
    this.addHandrail(-6, 0, 8, 6, -Math.PI / 2);
    this.addHandrail(8, 0, 5, 5, 0);

    this.addArrow(0, 0.02, -10, 0);
    this.addArrow(-4, 0.02, 5, Math.PI / 2);
    this.addArrow(4, 0.02, 5, -Math.PI / 4);
    this.addFloorMarking(0, 0.02, 0, "→ ANDANES");
  }

  private registerCollider(mesh: THREE.Mesh) {
    this.colliderMeshes.push(mesh);
    return mesh;
  }

  private addWallSign(x: number, y: number, z: number, text: string, color: number, rotY: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), mat);
    plane.position.set(x, y, z);
    plane.rotation.y = rotY;
    plane.renderOrder = 2;
    this.scene.add(plane);
  }

  private addHangingSign(x: number, y: number, z: number, text: string, color: number, width: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, 1024, 160);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 72px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 80);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.55, 0.08),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }),
    );
    board.position.set(x, y, z);
    this.scene.add(board);
    for (const sx of [-width * 0.4, width * 0.4]) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }),
      );
      cable.position.set(x + sx, y + 0.45, z);
      this.scene.add(cable);
    }
  }

  private addPlatformScreen(x: number, y: number, z: number, text: string, accent: number) {
    const frame = this.addBox(
      x,
      y,
      z,
      2.4,
      0.7,
      0.12,
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.45 }),
    );
    frame.castShadow = true;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = `#${accent.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, 12, 128);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 36px system-ui,sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 28, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    screen.position.set(x, y, z + 0.07);
    this.scene.add(screen);
  }

  private addSafetyLine(x: number, y: number, z: number, w: number, color: number) {
    this.addBox(x, y, z, w, 0.015, 0.12, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  }

  /** Red/white diagonal hazard strip at platform edge (TMB style) */
  private addHazardStrip(x: number, y: number, z: number, w: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const stripe = 28;
    for (let i = -2; i < 20; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#dc2626" : "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(i * stripe, 0);
      ctx.lineTo(i * stripe + stripe, 0);
      ctx.lineTo(i * stripe + stripe * 2, 64);
      ctx.lineTo(i * stripe + stripe, 64);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(w / 4, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
    this.addBox(x, y, z, w, 0.02, 0.35, mat);
  }

  private addTrashBin(x: number, y: number, z: number) {
    const body = this.registerCollider(
      this.addBox(x, y + 0.45, z, 0.35, 0.9, 0.35, new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.35, roughness: 0.5 })),
    );
    body.castShadow = true;
    this.addBox(x, y + 0.92, z, 0.38, 0.06, 0.38, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 }));
  }

  private addTicketMachine(x: number, y: number, z: number) {
    this.registerCollider(
      this.addBox(x, y + 0.75, z, 0.85, 1.5, 0.45, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.25, roughness: 0.4 })),
    );
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.5, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.35 }),
    );
    screen.position.set(x, y + 1.15, z + 0.24);
    this.scene.add(screen);
    this.addBox(x, y + 0.55, z + 0.2, 0.5, 0.08, 0.12, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  }

  private addInfoBoard(x: number, y: number, z: number, text: string) {
    this.addBox(x, y, z, 3.2, 1.1, 0.1, new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.3, roughness: 0.5 }));
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 640, 200);
    ctx.fillStyle = "#2fa3a0";
    ctx.fillRect(0, 0, 640, 18);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 48px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 320, 100);
    ctx.font = "28px system-ui,sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Informació · Metro de Barcelona", 320, 155);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.95), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(x, y, z + 0.06);
    this.scene.add(face);
  }

  private addAdPanel(x: number, y: number, z: number, rotY: number) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xf5b12e, roughness: 0.55 }),
    );
    panel.position.set(x, y, z);
    panel.rotation.y = rotY;
    panel.castShadow = true;
    this.scene.add(panel);
    const light = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.55),
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.15,
        roughness: 0.6,
      }),
    );
    light.position.set(0.05, 0, 0);
    light.rotation.y = Math.PI / 2;
    panel.add(light);
  }

  private addGlassBarrier(x: number, y: number, z: number, w: number) {
    const glass = new THREE.MeshStandardMaterial({
      color: 0xcfe8f5,
      transparent: true,
      opacity: 0.28,
      roughness: 0.15,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.06), glass);
    pane.position.set(x, y + 0.7, z - 1.6);
    pane.castShadow = false;
    this.scene.add(pane);
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.05, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 }),
    );
    rail.position.set(x, y + 1.28, z - 1.6);
    rail.castShadow = false;
    this.scene.add(rail);
  }

  private addFloorMarking(x: number, y: number, z: number, text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = "rgba(47,163,160,0.85)";
    ctx.font = "bold 48px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.8),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.scene.add(m);
  }

  private updateLineVisibility() {
    if (this.trainL3) this.trainL3.visible = this.line === "L3";
    if (this.trainL9) this.trainL9.visible = this.line === "L9S";
    // Hide unused elevator shaft while on the other line
    for (const elev of this.elevators) {
      const isL3 = Math.abs(elev.x + 6) < 0.5;
      elev.root.visible = this.line === "L3" ? isL3 : !isL3;
    }
  }

  private addCeilingLight(x: number, y: number, z: number) {
    // Emissive fixture only — no PointLight (was the main FPS killer)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfffaf0,
      emissive: 0xffe8c0,
      emissiveIntensity: 1.35,
      roughness: 0.35,
    });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.38), mat);
    housing.position.set(x, y, z);
    housing.castShadow = false;
    housing.receiveShadow = false;
    this.scene.add(housing);
  }

  private addTactilePad(x: number, y: number, z: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8a317, roughness: 0.9 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.55), mat);
    pad.position.set(x, y, z);
    this.scene.add(pad);
  }

  /** Long tactile strip — one textured mesh instead of hundreds of bumps */
  private addTactileStrip(x: number, y: number, z: number, length: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#e0e0e0";
    for (let i = 0; i < 12; i++) {
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.arc(12 + i * 20, 16 + r * 16, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(length / 3, 1);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.025, 0.55),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
    );
    base.position.set(x, y, z);
    base.receiveShadow = true;
    base.castShadow = false;
    this.scene.add(base);
  }

  private addTurnstile(x: number, z: number) {
    const base = this.registerCollider(
      this.addBox(x, 0.45, z, 0.7, 0.9, 0.7, new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.2 })),
    );
    base.castShadow = true;
    const arm = this.registerCollider(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.65, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.1 }),
      ),
    );
    arm.position.set(x, 0.85, z);
    arm.castShadow = true;
    this.scene.add(arm);
  }

  private addPlatformEdge(x: number, y: number, z: number, w: number, color: number) {
    this.addBox(x, y, z, w, 0.1, 0.55, new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
  }

  private addBench(x: number, y: number, z: number) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    this.addBox(x, y + 0.35, z, 1.6, 0.08, 0.5, wood);
    for (const sx of [-0.65, 0.65]) {
      this.addBox(x + sx, y + 0.18, z, 0.08, 0.35, 0.45, new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.4 }));
    }
  }

  private addHandrail(x: number, y: number, z: number, len: number, rotY: number) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, len, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 }),
    );
    rail.position.set(x, y + 0.95, z);
    rail.rotation.z = Math.PI / 2;
    rail.rotation.y = rotY;
    this.scene.add(rail);
  }

  private addStaircase(x: number, y: number, z: number, w: number, h: number, d: number, label: string) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const steps = 6;
    const stepH = h / steps;
    const stepD = d / steps;
    const mat = new THREE.MeshStandardMaterial({ color: STAIR, roughness: 0.75 });
    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, stepD), mat.clone());
      step.position.set(0, stepH * 0.5 + i * stepH, -d / 2 + stepD * 0.5 + i * stepD);
      step.castShadow = true;
      step.userData.restricted = true;
      step.userData.label = label;
      g.add(step);
      this.restrictedMeshes.push(step);
      this.registerCollider(step);
    }
    this.scene.add(g);
  }

  private addTunnelMouth(x: number, y: number, z: number, color: number) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.22, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.85 }),
    );
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI;
    arch.position.set(x, y + 1.2, z);
    this.scene.add(arch);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, y + 0.05, z);
    this.scene.add(glow);
  }

  private addKiosk(x: number, y: number, z: number) {
    this.registerCollider(
      this.addBox(x, 0.65, z, 1.1, 1.3, 0.55, new THREE.MeshStandardMaterial({ color: 0x5b4fcf, roughness: 0.5 })),
    );
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.65, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x312e81, emissiveIntensity: 0.2 }),
    );
    screen.position.set(x, 1.35, z);
    this.scene.add(screen);
  }

  private addBox(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = h > 1;
    this.scene.add(m);
    return m;
  }

  private addRamp(x: number, z: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9, metalness: 0.02 });
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 5.5), mat);
    ramp.position.set(x, 0.12, z);
    ramp.rotation.x = -0.11;
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    this.scene.add(ramp);
    for (const sx of [-1.55, 1.55]) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 5.5),
        new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.9, metalness: 0.02 }),
      );
      curb.position.set(x + sx, 0.18, z);
      curb.rotation.x = -0.11;
      curb.receiveShadow = true;
      this.scene.add(curb);
    }
  }

  private addArrow(x: number, y: number, z: number, rotY: number) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.5);
    shape.lineTo(-0.35, 0);
    shape.lineTo(-0.12, 0);
    shape.lineTo(-0.12, -0.5);
    shape.lineTo(0.12, -0.5);
    shape.lineTo(0.12, 0);
    shape.lineTo(0.35, 0);
    shape.closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, y, z);
    this.scene.add(m);
  }

  /* ── Avatar ─────────────────────────────────────────────────────────── */

  /* ── Route tube ─────────────────────────────────────────────────────── */

  private buildRoute() {
    if (this.routeGroup) {
      this.scene.remove(this.routeGroup);
      this.routeGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      this.routeGroup = null;
    }

    const group = new THREE.Group();
    const wps = ROUTES[this.line].waypoints;
    const mat = new THREE.MeshStandardMaterial({
      color: ROUTE_BLUE,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i];
      const b = wps[i + 1];
      const start = new THREE.Vector3(a.x, a.y + 0.06, a.z);
      const end = new THREE.Vector3(b.x, b.y + 0.06, b.z);
      const seg = end.clone().sub(start);
      const len = seg.length();
      if (len < 0.01) continue;
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dir = seg.clone().normalize();
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, len), mat);
      strip.position.copy(mid);
      strip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      strip.receiveShadow = false;
      group.add(strip);

      // Node dot at each waypoint
      const dot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12),
        mat.clone(),
      );
      dot.position.set(a.x, a.y + 0.07, a.z);
      group.add(dot);
    }
    const last = wps[wps.length - 1];
    const endDot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12), mat.clone());
    endDot.position.set(last.x, last.y + 0.07, last.z);
    group.add(endDot);

    this.routeGroup = group;
    this.scene.add(group);
  }

  /* ── Movement & animation ───────────────────────────────────────────── */

  private floorY(levelY: number) {
    return levelY + GROUND_CLEARANCE;
  }

  private teleportToWaypoint(index: number) {
    const w = ROUTES[this.line].waypoints[index];
    if (!w) return;
    this.waypointIndex = index;
    this.avatar.position.set(w.x, this.floorY(w.y), w.z);
    this.avatarPos.copy(this.avatar.position);
    this.prevAvatarY = this.avatar.position.y;
    this.verticalSpeed = 0;
    // Snap elevator cabins if teleporting inside a shaft
    for (const elev of this.elevators) {
      const distXZ = Math.hypot(w.x - elev.x, w.z - elev.z);
      if (distXZ < elev.radius) elev.cabin.position.y = this.floorY(w.y);
    }
    this.triggerNarration(w);
    this.callbacks.onWaypoint(index);
    this.updateCamera(1);
  }

  private animateToWaypoint(index: number) {
    const w = ROUTES[this.line].waypoints[index];
    if (!w) return;
    const start = this.avatar.position.clone();
    const end = new THREE.Vector3(w.x, this.floorY(w.y), w.z);
    const startRot = this.avatar.rotation.y;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const dy = Math.abs(end.y - start.y);
    const endRot = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : startRot;
    // Elevator rides take longer so cabin motion is visible
    const elevRide = dy > 1.5;
    let prevPos = start.clone();
    let t = 0;
    const dur = elevRide ? Math.min(4.5, 1.2 + dy * 0.35) : 0.9;
    const cb = (dt: number) => {
      t += dt;
      const p = Math.min(t / dur, 1);
      const ease = p * p * (3 - 2 * p);
      this.avatar.position.lerpVectors(start, end, ease);
      this.avatar.rotation.y = THREE.MathUtils.lerp(startRot, endRot, ease);
      this.avatarPos.copy(this.avatar.position);
      const moved = this.avatar.position.distanceTo(prevPos);
      prevPos.copy(this.avatar.position);
      if (!elevRide) this.spinWheels(moved);
      if (p >= 1) {
        this.waypointIndex = index;
        this.triggerNarration(w);
        this.callbacks.onWaypoint(index);
        this.rafCallbacks = this.rafCallbacks.filter((f) => f !== cb);
      }
    };
    this.rafCallbacks.push(cb);
  }

  private getNeighborIndices(index: number): number[] {
    const route = ROUTES[this.line];
    const id = route.waypoints[index]?.id;
    if (!id) return [];
    const out: number[] = [];
    for (const e of route.edges) {
      if (e.from === id) out.push(route.waypoints.findIndex((w) => w.id === e.to));
      if (e.to === id) out.push(route.waypoints.findIndex((w) => w.id === e.from));
    }
    return [...new Set(out.filter((i) => i >= 0))];
  }

  private pickNeighbor(current: Waypoint, indices: number[], dir: MoveDir, all: Waypoint[]): number | null {
    if (indices.length === 1) return indices[0];
    const forward = indices.filter((i) => all[i].z > current.z + 0.5);
    const back = indices.filter((i) => all[i].z < current.z - 0.5);
    const left = indices.filter((i) => all[i].x < current.x - 0.5);
    const right = indices.filter((i) => all[i].x > current.x + 0.5);
    const down = indices.filter((i) => all[i].y < current.y - 0.5);
    const up = indices.filter((i) => all[i].y > current.y + 0.5);

    if (dir === "up") return forward[0] ?? up[0] ?? indices[0] ?? null;
    if (dir === "down") return back[0] ?? down[0] ?? indices[0] ?? null;
    if (dir === "left") return left[0] ?? indices[0] ?? null;
    if (dir === "right") return right[0] ?? indices[0] ?? null;
    return indices[0] ?? null;
  }

  /* ── Auto-play along curve ──────────────────────────────────────────── */

  private updateAuto(dt: number) {
    if (!this.autoPlaying) return;
    const wps = ROUTES[this.line].waypoints;
    if (this.autoSegment >= wps.length - 1) {
      this.stopAuto();
      return;
    }

    const a = wps[this.autoSegment];
    const b = wps[this.autoSegment + 1];
    const elevRide = Math.abs(b.y - a.y) > 1.5;
    // Slower vertical elevator segments
    this.autoSegT += dt * (elevRide ? 0.18 : 0.45);
    const t = Math.min(this.autoSegT, 1);
    const ease = t * t * (3 - 2 * t);

    const prevPos = this.autoPrevPos.clone();
    this.avatar.position.set(
      THREE.MathUtils.lerp(a.x, b.x, ease),
      THREE.MathUtils.lerp(this.floorY(a.y), this.floorY(b.y), ease),
      THREE.MathUtils.lerp(a.z, b.z, ease),
    );
    this.avatarPos.copy(this.avatar.position);

    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const endRot = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : this.autoSegStartRot;
    this.avatar.rotation.y = THREE.MathUtils.lerp(this.autoSegStartRot, endRot, ease);

    const moved = this.avatar.position.distanceTo(prevPos);
    this.autoPrevPos.copy(this.avatar.position);
    if (!elevRide) this.spinWheels(moved);

    if (t >= 1) {
      this.autoSegment += 1;
      this.autoSegT = 0;
      this.autoSegStartRot = this.avatar.rotation.y;
      this.waypointIndex = this.autoSegment;
      const wp = wps[this.autoSegment];
      if (wp) {
        this.triggerNarration(wp);
        this.callbacks.onWaypoint(this.autoSegment);
      }
    }
  }

  /* ── Camera follow (wheelchair eye-level) + wall collision ─────────── */

  private resolveCameraPosition(from: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
    const dir = desired.clone().sub(from);
    const len = dir.length();
    if (len < 0.01) return desired.clone();
    dir.normalize();
    this.camRaycaster.set(from, dir);
    this.camRaycaster.far = len;
    const hits = this.camRaycaster
      .intersectObjects(this.colliderMeshes, false)
      // Ignore floor/ceiling-like hits (nearly horizontal faces) — only bounce off walls
      .filter((h) => {
        if (!h.face) return true;
        const n = h.face.normal.clone();
        h.object.updateWorldMatrix(true, false);
        n.transformDirection(h.object.matrixWorld);
        return Math.abs(n.y) < 0.55;
      });
    if (hits.length > 0 && hits[0].distance < len) {
      const safe = from.clone().addScaledVector(dir, Math.max(1.4, hits[0].distance - 0.4));
      // Never drop the camera into a slab when resolving collisions
      safe.y = Math.max(safe.y, from.y);
      return safe;
    }
    return desired.clone();
  }

  private updateCamera(alpha = 0.12) {
    const yaw = this.avatar.rotation.y;
    // Seated wheelchair eye height (~1.25 m) — chase cam slightly above & behind
    const eyeH = 1.25;
    const lookH = 1.05;
    const dist = 2.85;
    const lift = 0.45; // slight over-shoulder lift so we don't clip the head

    this.camDesired.set(
      this.avatarPos.x - Math.sin(yaw) * dist,
      this.avatarPos.y + eyeH + lift,
      this.avatarPos.z - Math.cos(yaw) * dist,
    );
    // Look slightly ahead of the avatar (travel direction)
    this.camTarget.set(
      this.avatarPos.x + Math.sin(yaw) * 0.55,
      this.avatarPos.y + lookH,
      this.avatarPos.z + Math.cos(yaw) * 0.55,
    );

    const resolved = this.resolveCameraPosition(this.camTarget, this.camDesired);

    // Hard floor clamp relative to current level (mezzanine / platform)
    const minCamY = this.avatarPos.y + 1.1;
    resolved.y = Math.max(resolved.y, minCamY);

    this.camera.position.lerp(resolved, alpha);
    this.controls.target.lerp(this.camTarget, alpha);
    // Keep orbit target locked to eye height so the user can't yank into the slab
    this.controls.minPolarAngle = Math.PI * 0.28;
    this.controls.maxPolarAngle = Math.PI * 0.48;
  }

  /* ── Restricted zones highlight ─────────────────────────────────────── */

  private checkRestricted() {
    let warn: string | null = null;
    for (const m of this.restrictedMeshes) {
      const parent = m.parent;
      const px = parent ? parent.position.x + m.position.x : m.position.x;
      const pz = parent ? parent.position.z + m.position.z : m.position.z;
      const near = Math.hypot(this.avatarPos.x - px, this.avatarPos.z - pz) < 2.4;
      const std = m.material as THREE.MeshStandardMaterial;
      if (near) {
        if (std.userData.warn !== true) {
          std.color.setHex(STAIR_WARN);
          std.emissive.setHex(0x7f1d1d);
          std.emissiveIntensity = 0.35;
          std.userData.warn = true;
        }
        warn = m.userData.label as string;
      } else if (std.userData.warn) {
        std.color.setHex(STAIR);
        std.emissive.setHex(0x000000);
        std.emissiveIntensity = 0;
        std.userData.warn = false;
      }
    }
    if (warn !== this.lastWarn) {
      this.lastWarn = warn;
      this.callbacks.onWarning(warn);
      if (warn && !this.muted) this.speak(`Atenció: ${warn}. No utilitzis aquesta zona.`);
    }
  }

  /* ── Elevator doors + moving cabin ──────────────────────────────────── */

  private openElevatorDoors() {
    for (const g of this.elevatorGroups) g.userData.open = true;
  }

  private closeElevatorDoors() {
    for (const g of this.elevatorGroups) g.userData.open = false;
  }

  private updateElevators(dt: number) {
    this.verticalSpeed = (this.avatarPos.y - this.prevAvatarY) / Math.max(dt, 1 / 120);
    this.prevAvatarY = this.avatarPos.y;
    for (const elev of this.elevators) {
      syncElevatorCabin(elev, this.avatarPos, this.verticalSpeed, dt);
    }
  }

  /* ── Speech & subtitles ─────────────────────────────────────────────── */

  private triggerNarration(w: Waypoint) {
    this.callbacks.onSubtitle(w.narration);
    if (w.warning) this.callbacks.onWarning(w.warning);
    this.speak(w.narration);
    if (w.warning && !this.muted) {
      setTimeout(() => this.speak(w.warning!), 2800);
    }
  }

  private speak(text: string) {
    if (this.muted || !window.speechSynthesis) return;
    if (text === this.lastSpoken) return;
    this.lastSpoken = text;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ca-ES";
    u.rate = 0.95;
    u.onend = () => {
      this.lastSpoken = "";
    };
    window.speechSynthesis.speak(u);
  }

  /* ── Render loop ────────────────────────────────────────────────────── */

  private loop = () => {
    if (this.disposed) return;
    this.animId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.frameCount++;

    for (const cb of this.rafCallbacks) cb(dt);
    this.updateAuto(dt);
    this.updateElevators(dt);

    // Throttle heavier per-frame work
    if (this.frameCount % 4 === 0) this.checkRestricted();
    if (!this.autoPlaying) this.updateCamera();
    else if (this.frameCount % 2 === 0) this.updateCamera(0.18);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

export type { MoveDir };
