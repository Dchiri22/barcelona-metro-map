/**
 * Detailed TMB-style metro train + track bed for platform destinations.
 */

import * as THREE from "three";

function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast = true,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function labelTex(text: string, bg: string, fg: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.floor(h * 0.45)}px system-ui,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wheelchairDoorSticker(): THREE.MeshBasicMaterial {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#fff";
  ctx.font = "72px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♿", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

/** Rails + sleepers under the train */
export function buildTrackBed(length: number, width = 3.2): THREE.Group {
  const g = new THREE.Group();
  const bed = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.92 });
  const railM = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.28 });
  const sleeperM = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.88 });

  mesh(g, new THREE.BoxGeometry(length, 0.12, width), bed, 0, -0.06, 0, false);

  const gauge = 1.15;
  for (const sx of [-gauge / 2, gauge / 2]) {
    mesh(g, new THREE.BoxGeometry(length, 0.08, 0.08), railM, 0, 0.04, sx);
    // Rail head
    mesh(g, new THREE.BoxGeometry(length, 0.04, 0.12), railM, 0, 0.1, sx, false);
  }

  const sleepers = Math.floor(length / 0.7);
  for (let i = 0; i < sleepers; i++) {
    const x = -length / 2 + 0.4 + i * 0.7;
    mesh(g, new THREE.BoxGeometry(0.22, 0.1, width * 0.85), sleeperM, x, 0.01, 0, false);
  }

  // Third rail / cable detail
  mesh(
    g,
    new THREE.BoxGeometry(length * 0.95, 0.03, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.5 }),
    0,
    0.05,
    -width * 0.38,
    false,
  );

  return g;
}

/**
 * TMB-inspired metro car. Local +X = forward (nose).
 * Place with rotation.y so nose faces desired world direction.
 */
export function buildMetroTrain(opts: {
  cars?: number;
  lineColor?: number;
  destination?: string;
}): THREE.Group {
  const cars = opts.cars ?? 2;
  const lineColor = opts.lineColor ?? 0x3fab2e;
  const dest = opts.destination ?? "Trinitat Nova";
  const root = new THREE.Group();

  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.35, metalness: 0.15, envMapIntensity: 1 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc41e3a, roughness: 0.4, metalness: 0.2, envMapIntensity: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55, metalness: 0.3 });
  const blueStripe = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x87a8c0,
    transparent: true,
    opacity: 0.45,
    roughness: 0.15,
    metalness: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const purple = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0x5b21b6,
    emissiveIntensity: 0.15,
    roughness: 0.5,
  });
  const under = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.5, roughness: 0.45 });
  const sticker = wheelchairDoorSticker();

  const carLen = 9.5;
  const carW = 2.7;
  const carH = 2.55;

  for (let c = 0; c < cars; c++) {
    const car = new THREE.Group();
    car.position.x = -c * (carLen + 0.35);
    root.add(car);

    // Body
    mesh(car, new THREE.BoxGeometry(carLen, carH * 0.72, carW), white, 0, carH * 0.45, 0);
    // Roof
    mesh(car, new THREE.BoxGeometry(carLen * 0.98, 0.18, carW * 0.92), white, 0, carH * 0.88, 0, false);
    // Blue waist stripe
    mesh(car, new THREE.BoxGeometry(carLen * 0.98, 0.1, carW + 0.02), blueStripe, 0, 0.55, 0, false);
    // Underframe
    mesh(car, new THREE.BoxGeometry(carLen * 0.95, 0.25, carW * 0.85), under, 0, 0.2, 0, false);

    // Bogies + wheels (low-poly)
    for (const bx of [-carLen * 0.32, carLen * 0.32]) {
      mesh(car, new THREE.BoxGeometry(1.4, 0.22, 1.6), under, bx, 0.12, 0, false);
      for (const wz of [-0.7, 0.7]) {
        for (const wx of [-0.4, 0.4]) {
          const wh = mesh(car, new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), black, bx + wx, 0.28, wz, false);
          wh.rotation.z = Math.PI / 2;
        }
      }
    }

    // Side windows + purple interior stripe
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 4; i++) {
        const wx = -carLen * 0.35 + i * 2.1;
        mesh(car, new THREE.BoxGeometry(1.5, 0.85, 0.06), glass, wx, 1.55, side * (carW / 2 + 0.02), false);
        mesh(car, new THREE.BoxGeometry(1.4, 0.12, 0.04), purple, wx, 1.55, side * (carW / 2 + 0.05), false);
      }
    }

    // Passenger doors (pairs) with accessibility stickers
    for (const side of [-1, 1] as const) {
      for (const dx of [-2.2, 2.2]) {
        mesh(car, new THREE.BoxGeometry(1.15, 1.85, 0.08), white, dx, 1.05, side * (carW / 2 + 0.03), false);
        mesh(car, new THREE.BoxGeometry(0.9, 0.7, 0.05), glass, dx, 1.45, side * (carW / 2 + 0.06), false);
        mesh(car, new THREE.BoxGeometry(1.15, 0.08, 0.09), blueStripe, dx, 0.55, side * (carW / 2 + 0.04), false);
        const st = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), sticker);
        st.position.set(dx - 0.35, 1.55, side * (carW / 2 + 0.08));
        if (side < 0) st.rotation.y = Math.PI;
        car.add(st);
      }
    }

    if (c === 0) {
      // Nose / cab — red front mask (reference TMB)
      const nose = new THREE.Group();
      nose.position.set(carLen / 2 + 0.15, 0, 0);
      car.add(nose);

      // Red face
      mesh(nose, new THREE.BoxGeometry(0.55, 1.6, carW * 0.95), red, 0.1, 1.15, 0);
      // Black surround / chin
      mesh(nose, new THREE.BoxGeometry(0.5, 0.55, carW * 0.98), black, 0.12, 0.4, 0, false);
      // Windshield
      mesh(nose, new THREE.BoxGeometry(0.12, 1.05, carW * 0.72), glass, 0.38, 1.45, 0, false);
      // Wiper hint
      mesh(nose, new THREE.BoxGeometry(0.04, 0.85, 0.04), black, 0.42, 1.4, -0.15, false);

      // Headlights (emissive only — no SpotLights)
      const lamp = new THREE.MeshStandardMaterial({
        color: 0xfff7ed,
        emissive: 0xfde68a,
        emissiveIntensity: 1.4,
        roughness: 0.25,
      });
      mesh(nose, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), lamp, 0.4, 0.55, -0.75, false).rotation.z =
        Math.PI / 2;
      mesh(nose, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), lamp, 0.4, 0.55, 0.75, false).rotation.z =
        Math.PI / 2;

      // Coupler
      mesh(nose, new THREE.BoxGeometry(0.45, 0.18, 0.35), under, 0.45, 0.35, 0, false);

      // TMB roundel
      const logo = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 16),
        new THREE.MeshBasicMaterial({ map: labelTex("TMB", "#c41e3a", "#fff", 128, 128) }),
      );
      logo.position.set(0.4, 2.15, 0);
      logo.rotation.y = Math.PI / 2;
      nose.add(logo);

      // Destination / unit display
      const destTex = labelTex(dest.slice(0, 14), "#0f172a", "#f8fafc", 256, 64);
      const destPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 0.28),
        new THREE.MeshBasicMaterial({ map: destTex }),
      );
      destPlane.position.set(0.42, 0.95, -0.55);
      destPlane.rotation.y = Math.PI / 2;
      nose.add(destPlane);

      const unit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.45, 0.22),
        new THREE.MeshBasicMaterial({ map: labelTex("211", "#0f172a", "#22c55e", 128, 64) }),
      );
      unit.position.set(0.42, 1.85, 0.55);
      unit.rotation.y = Math.PI / 2;
      nose.add(unit);

      // Side branding
      const brand = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.28),
        new THREE.MeshBasicMaterial({
          map: labelTex("Transports Metropolitans de Barcelona", "#f5f5f5", "#111827", 1024, 96),
          transparent: true,
        }),
      );
      brand.position.set(1.2, 1.05, carW / 2 + 0.04);
      car.add(brand);

      // Line badge
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 16),
        new THREE.MeshBasicMaterial({
          map: labelTex("L", `#${lineColor.toString(16).padStart(6, "0")}`, "#fff", 128, 128),
        }),
      );
      badge.position.set(-1.5, 1.9, carW / 2 + 0.05);
      car.add(badge);

      // Pantograph (roof)
      mesh(car, new THREE.BoxGeometry(0.15, 0.55, 1.4), red, carLen * 0.15, carH + 0.15, 0, false);
      mesh(car, new THREE.BoxGeometry(1.2, 0.06, 0.12), red, carLen * 0.15, carH + 0.45, 0, false);
    } else {
      // Inter-car gangway
      mesh(car, new THREE.BoxGeometry(0.5, 2.0, 1.8), black, carLen / 2 + 0.1, 1.2, 0, false);
    }

    // Rear face for last car
    if (c === cars - 1) {
      mesh(car, new THREE.BoxGeometry(0.2, 1.8, carW * 0.9), red, -carLen / 2 - 0.05, 1.2, 0, false);
      mesh(car, new THREE.BoxGeometry(0.12, 0.9, carW * 0.55), glass, -carLen / 2 - 0.12, 1.5, 0, false);
    }
  }

  return root;
}

/** Platform track scene: bed + train aligned to platform edge (train runs along +X) */
export function placeMetroAtPlatform(opts: {
  x: number;
  y: number;
  z: number;
  /** World yaw of train forward */
  rotY?: number;
  lineColor: number;
  destination: string;
  trackLength?: number;
}): THREE.Group {
  const group = new THREE.Group();
  group.position.set(opts.x, opts.y, opts.z);
  group.rotation.y = opts.rotY ?? 0;

  const track = buildTrackBed(opts.trackLength ?? 28, 3.4);
  track.position.y = -0.15;
  group.add(track);

  // Tunnel continuation dark box
  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4.2, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.95 }),
  );
  tunnel.position.set(14, 1.8, 0);
  group.add(tunnel);

  const train = buildMetroTrain({
    cars: 2,
    lineColor: opts.lineColor,
    destination: opts.destination,
  });
  train.position.set(-2, 0, 0);
  group.add(train);

  return group;
}
