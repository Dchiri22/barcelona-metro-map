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
  ELEVATORS,
  RESTRICTED_ZONES,
  ROUTES,
  type LineTarget,
  type Waypoint,
} from "@/app/data/zonaUniversitaria";
import {
  buildWheelchairAvatar,
  spinWheelchairWheels,
} from "@/app/simulator/wheelchairAvatar";
import { createAvatarTextures, disposeAvatarTextures, type AvatarTextureSet } from "@/app/simulator/wheelchairTextures";

export type SimulatorCallbacks = {
  onSubtitle: (text: string) => void;
  onWarning: (text: string | null) => void;
  onWaypoint: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
};

type MoveDir = "up" | "down" | "left" | "right";

const ROUTE_BLUE = 0x2563eb;
const FLOOR = 0xd4d4d8;
const WALL = 0xa1a1aa;
const STAIR = 0xfbbf24;
const STAIR_WARN = 0xef4444;
const ELEVATOR = 0x7dd3fc;

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
  private camRaycaster = new THREE.Raycaster();
  private avatarTextures: AvatarTextureSet | null = null;
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
    this.openElevatorDoors();
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
    this.scene.background = new THREE.Color(0xdcdae8);
    this.scene.fog = new THREE.Fog(0xdcdae8, 38, 88);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.15, 120);
    this.camera.position.set(0, 8, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 28;
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

  /** Soft indoor reflections — kept subtle to avoid harsh shine */
  private setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const rt = pmrem.fromScene(room, 0.04);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.28;
    pmrem.dispose();
  }

  /** Three-point lighting: key + fill + rim (matte, not blown out) */
  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xf0eeff, 0x8a8580, 0.32);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff8f0, 0.72);
    key.position.set(10, 20, -8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 70;
    key.shadow.camera.left = -28;
    key.shadow.camera.right = 28;
    key.shadow.camera.top = 28;
    key.shadow.camera.bottom = -28;
    key.shadow.bias = -0.00035;
    key.shadow.radius = 2;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd8d0f0, 0.22);
    fill.position.set(-12, 8, 12);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x6b5fd4, 0.18);
    rim.position.set(-5, 9, -12);
    this.scene.add(rim);
  }

  /* ── Station geometry (low-poly from isometric plan) ────────────────── */

  private buildStation() {
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 0.88, metalness: 0.02 });
    const wallMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.9, metalness: 0.02 });
    const aisleMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.82, metalness: 0.02 });

    // ── Mezzanine floor + central aisle (clear path) ──
    this.addBox(0, -0.15, -4, 26, 0.3, 24, floorMat);
    this.addBox(0, -0.12, -4, 4.5, 0.06, 22, aisleMat); // bright central corridor

    // Perimeter walls
    this.registerCollider(this.addBox(-13, 1.5, -4, 0.4, 3.2, 22, wallMat));
    this.registerCollider(this.addBox(13, 1.5, -4, 0.4, 3.2, 22, wallMat));
    this.registerCollider(this.addBox(0, 3.05, -4, 26, 0.25, 22, new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.9 })));

    for (const [x, z] of [[-5, -6], [5, -6], [0, 1], [-5, 8], [7, 5]] as const) {
      this.addCeilingLight(x, 2.85, z);
    }

    // Street ramps (outside main hall)
    for (const [x, z] of [[-7, -14], [7, -14]] as const) {
      this.addRamp(x, z);
      this.addTactilePad(x, 0.04, z - 1.2);
    }
    this.addWallSign(-12, 1.6, -2, "Accés", 0x5b4fcf, Math.PI / 2);
    this.addWallSign(12, 1.6, -2, "Accés", 0x5b4fcf, -Math.PI / 2);

    // Turnstiles on SIDES only — 4 m clear center aisle
    for (const x of [-5, 5]) {
      this.addTurnstile(x, -0.5);
    }

    // L3 branch corridor floor
    this.addBox(-6, -0.15, 8, 3.5, 0.3, 8, aisleMat);
    // L9S branch corridor floor
    this.addBox(8, -0.15, 5, 8, 0.3, 5, aisleMat);

    // L3 platform level (separate floor, no overlap with mezzanine)
    const l3Floor = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.8 });
    this.addBox(-6, -5.15, 14, 18, 0.3, 12, l3Floor);
    this.addPlatformEdge(-6, -4.98, 19.5, 16, 0x3fab2e);
    this.addWallSign(-12, -3.8, 14, "L3 → Trinitat Nova", 0x3fab2e, Math.PI / 2);
    this.addBench(-10, -5, 12);
    this.addTunnelMouth(-6, -5, 8, 0x3fab2e);

    // L9S deep level
    this.addBox(11, -12.15, 14, 16, 0.3, 12, l3Floor);
    this.addPlatformEdge(11, -11.98, 19.5, 14, 0xf58220);
    this.addWallSign(12, -10.8, 19, "L9S → Aeroport T1", 0xf58220, 0);
    this.addBench(8, -12, 12);
    this.addTunnelMouth(11, -12, 8, 0xf58220);

    // Stairs on side walls only (restricted)
    for (const z of RESTRICTED_ZONES) {
      this.addStaircase(z.x, z.y, z.z, z.w, z.h, z.d, z.label);
    }

    // L3 elevator — hollow frame (walkable center)
    this.addElevatorFrame(-6, 0, 10, 2.8, 5, false);
    this.addWallSign(-9, 1.6, 10, "Ascensor L3", 0x0284c7, Math.PI / 2);

    // L9S circular shaft — offset to the right, glass only
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x9ecfe8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.65,
      metalness: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 11, 28, 1, true), shaftMat);
    cyl.position.set(11, -5.5, 7);
    this.scene.add(cyl);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.1, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.55, roughness: 0.35 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(11, 0.05, 7);
    this.scene.add(ring);
    this.addWallSign(12.5, 1.8, 7, "Ascensor L9S", 0x0284c7, -Math.PI / 2);

    // Elevator doors
    for (const e of ELEVATORS) {
      const g = new THREE.Group();
      g.position.set(e.x, e.y, e.z);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.32 });
      const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.07), doorMat);
      const d2 = d1.clone();
      d1.position.set(-0.52, 0, 0.06);
      d2.position.set(0.52, 0, 0.06);
      g.add(d1, d2);
      g.userData.d1 = d1;
      g.userData.d2 = d2;
      g.userData.open = false;
      this.elevatorGroups.push(g);
      this.scene.add(g);
    }

    // Columns along walls (not in aisle)
    const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 3.1, 10);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.7 });
    for (const [x, z] of [[-10, -8], [10, -8], [-10, 6], [10, 6]] as const) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(x, 1.55, z);
      col.castShadow = true;
      this.registerCollider(col);
      this.scene.add(col);
    }

    this.addKiosk(11, 0, -6);
    this.addHandrail(-6, 0, 8, 6, -Math.PI / 2);
    this.addHandrail(8, 0, 5, 5, 0);

    // Floor decals on aisle only
    this.addArrow(0, 0.02, -10, 0);
    this.addArrow(-4, 0.02, 5, Math.PI / 2);
    this.addArrow(4, 0.02, 5, -Math.PI / 4);
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

  private addElevatorFrame(x: number, y: number, z: number, size: number, height: number, _circular: boolean) {
    const frameM = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.45, roughness: 0.4 });
    const half = size / 2;
    for (const [ox, oz] of [[-half, -half], [half, -half], [-half, half], [half, half]] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.12), frameM);
      post.position.set(x + ox, y, z + oz);
      post.castShadow = true;
      this.registerCollider(post);
      this.scene.add(post);
    }
    // Glass panels (non-colliding)
    const glass = new THREE.MeshStandardMaterial({
      color: ELEVATOR,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const panelF = new THREE.Mesh(new THREE.PlaneGeometry(size, height), glass);
    panelF.position.set(x, y, z + half);
    this.scene.add(panelF);
  }

  private addCeilingLight(x: number, y: number, z: number) {
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.12, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f5, emissive: 0xfffbeb, emissiveIntensity: 0.35 }),
    );
    housing.position.set(x, y, z);
    this.scene.add(housing);
    const bulb = new THREE.PointLight(0xfff7ed, 0.25, 12);
    bulb.position.set(x, y - 0.2, z);
    this.scene.add(bulb);
  }

  private addTactilePad(x: number, y: number, z: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.95 });
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const bump = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), mat);
        bump.position.set(x + i * 0.18, y, z + j * 0.18);
        this.scene.add(bump);
      }
    }
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

  private teleportToWaypoint(index: number) {
    const w = ROUTES[this.line].waypoints[index];
    if (!w) return;
    this.waypointIndex = index;
    this.avatar.position.set(w.x, w.y, w.z);
    this.avatarPos.copy(this.avatar.position);
    this.triggerNarration(w);
    this.callbacks.onWaypoint(index);
    this.updateCamera(1);
  }

  private animateToWaypoint(index: number) {
    const w = ROUTES[this.line].waypoints[index];
    if (!w) return;
    const start = this.avatar.position.clone();
    const end = new THREE.Vector3(w.x, w.y, w.z);
    const startRot = this.avatar.rotation.y;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const endRot = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : startRot;
    let prevPos = start.clone();
    let t = 0;
    const dur = 0.9;
    const cb = (dt: number) => {
      t += dt;
      const p = Math.min(t / dur, 1);
      const ease = p * p * (3 - 2 * p);
      this.avatar.position.lerpVectors(start, end, ease);
      this.avatar.rotation.y = THREE.MathUtils.lerp(startRot, endRot, ease);
      this.avatarPos.copy(this.avatar.position);
      const moved = this.avatar.position.distanceTo(prevPos);
      prevPos.copy(this.avatar.position);
      this.spinWheels(moved);
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
    this.autoSegT += dt * 0.45;
    const t = Math.min(this.autoSegT, 1);
    const ease = t * t * (3 - 2 * t);

    const prevPos = this.autoPrevPos.clone();
    this.avatar.position.set(
      THREE.MathUtils.lerp(a.x, b.x, ease),
      THREE.MathUtils.lerp(a.y, b.y, ease),
      THREE.MathUtils.lerp(a.z, b.z, ease),
    );
    this.avatarPos.copy(this.avatar.position);

    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const endRot = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : this.autoSegStartRot;
    this.avatar.rotation.y = THREE.MathUtils.lerp(this.autoSegStartRot, endRot, ease);

    const moved = this.avatar.position.distanceTo(prevPos);
    this.autoPrevPos.copy(this.avatar.position);
    this.spinWheels(moved);

    if (this.autoSegT >= 1) {
      this.autoSegT = 0;
      this.waypointIndex = this.autoSegment + 1;
      this.autoSegStartRot = this.avatar.rotation.y;
      this.triggerNarration(b);
      this.callbacks.onWaypoint(this.waypointIndex);
      this.autoSegment++;
    }
  }

  /* ── Camera follow (third person) + collision ─────────────────────── */

  private resolveCameraPosition(from: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
    const dir = desired.clone().sub(from);
    const len = dir.length();
    if (len < 0.01) return desired;
    dir.normalize();
    this.camRaycaster.set(from, dir);
    this.camRaycaster.far = len;
    const hits = this.camRaycaster.intersectObjects(this.colliderMeshes, false);
    if (hits.length > 0 && hits[0].distance < len) {
      return from.clone().addScaledVector(dir, Math.max(2.4, hits[0].distance - 0.45));
    }
    return desired;
  }

  private updateCamera(alpha = 0.08) {
    const yaw = this.avatar.rotation.y;
    const dist = 5.2;
    const height = 3.6;
    this.camDesired.set(
      this.avatarPos.x - Math.sin(yaw) * dist,
      this.avatarPos.y + height,
      this.avatarPos.z - Math.cos(yaw) * dist,
    );
    this.camTarget.set(this.avatarPos.x, this.avatarPos.y + 1.2, this.avatarPos.z);
    const resolved = this.resolveCameraPosition(this.camTarget, this.camDesired);
    this.camera.position.lerp(resolved, alpha);
    this.controls.target.lerp(this.camTarget, alpha);
    this.controls.update();
  }

  /* ── Restricted zones highlight ─────────────────────────────────────── */

  private checkRestricted() {
    let warn: string | null = null;
    for (const m of this.restrictedMeshes) {
      const world = new THREE.Vector3();
      m.getWorldPosition(world);
      const dx = this.avatarPos.x - world.x;
      const dz = this.avatarPos.z - world.z;
      const near = Math.hypot(dx, dz) < 2.2;
      const std = m.material as THREE.MeshStandardMaterial;
      std.color.setHex(near ? STAIR_WARN : STAIR);
      std.emissive.setHex(near ? 0x7f1d1d : 0x000000);
      std.emissiveIntensity = near ? 0.35 : 0;
      if (near) warn = m.userData.label as string;
    }
    this.callbacks.onWarning(warn);
    if (warn && !this.muted) this.speak(`Atenció: ${warn}. No utilitzis aquesta zona.`);
  }

  /* ── Elevator doors ─────────────────────────────────────────────────── */

  private openElevatorDoors() {
    for (const g of this.elevatorGroups) {
      g.userData.open = true;
    }
  }

  private closeElevatorDoors() {
    for (const g of this.elevatorGroups) {
      g.userData.open = false;
    }
  }

  private updateElevators(dt: number) {
    for (const g of this.elevatorGroups) {
      const d1 = g.userData.d1 as THREE.Mesh;
      const d2 = g.userData.d2 as THREE.Mesh;
      const target = g.userData.open ? 1.1 : 0.7;
      d1.position.x = THREE.MathUtils.lerp(d1.position.x, -target, dt * 3);
      d2.position.x = THREE.MathUtils.lerp(d2.position.x, target, dt * 3);
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
    const dt = 1 / 60;
    for (const cb of [...this.rafCallbacks]) cb(dt);
    this.updateAuto(dt);
    this.updateElevators(dt);
    this.checkRestricted();
    if (!this.autoPlaying) this.updateCamera();
    else this.updateCamera(0.12);
    this.renderer.render(this.scene, this.camera);
  };
}

export type { MoveDir };
