import * as THREE from "three";
import Matter from "matter-js";
import { createGrassTexture } from "./textures";
import { MAP_W, MAP_H, AIM_LENGTH, AIM_WIDTH } from "./config";
import type { Obstacle, Crate, Bush } from "./types";
import { CRATE_HP } from "./config";

const CRATE_DEFS: { x: number; z: number }[] = [
  { x: 5, z: -10 },
  { x: -10, z: 12 },
  { x: 8, z: 25 },
  { x: -5, z: -32 },
  { x: 11, z: 8 },
];

const STONES: { x: number; z: number; size: number }[] = [
  { x: -8, z: -25, size: 2.6 },
  { x: 9, z: -18, size: 2.4 },
  { x: 0, z: -5, size: 2.4 },
  { x: -16, z: 28, size: 2.8 },
  { x: 14, z: 30, size: 2.6 },
  { x: -7, z: 38, size: 2.4 },
  { x: 12, z: -2, size: 2.2 },
  { x: -12, z: -10, size: 2.4 },
];

const BUSH_DEFS: { x: number; z: number; r: number }[] = [
  { x: -14, z: 5, r: 2.6 },
  { x: 13, z: 12, r: 2.6 },
  { x: -3, z: 22, r: 2.8 },
  { x: 6, z: -38, r: 2.6 },
  { x: 10, z: -8, r: 2.4 },
  { x: -9, z: 35, r: 2.6 },
  { x: 0, z: 0, r: 2.2 },
];

// ============================================================
// Lights
// ============================================================
export function setupLights(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xfff2d6, 1.2);
  dir.position.set(20, 35, -10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -40;
  dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 60;
  dir.shadow.camera.bottom = -60;
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 120;
  dir.shadow.bias = -0.001;
  scene.add(dir);

  const fill = new THREE.HemisphereLight(0xa8d8ff, 0x4a3a20, 0.35);
  scene.add(fill);
}

// ============================================================
// Ground
// ============================================================
export function setupGround(scene: THREE.Scene): void {
  const grass = createGrassTexture();
  grass.repeat.set(MAP_W / 4, MAP_H / 4);
  const geo = new THREE.PlaneGeometry(MAP_W, MAP_H);
  const mat = new THREE.MeshStandardMaterial({
    map: grass,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const borderGeo = new THREE.PlaneGeometry(MAP_W + 2, MAP_H + 2);
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x2a4a25,
    roughness: 1,
  });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.rotation.x = -Math.PI / 2;
  border.position.y = -0.05;
  border.receiveShadow = true;
  scene.add(border);
}

// ============================================================
// Walls (invisible physical + visible fences)
// ============================================================
export function setupWalls(scene: THREE.Scene, world: Matter.World): void {
  const halfW = MAP_W / 2;
  const halfH = MAP_H / 2;
  const t = 2;
  const walls = [
    Matter.Bodies.rectangle(0, halfH + t / 2, MAP_W + 2 * t, t, {
      isStatic: true,
    }),
    Matter.Bodies.rectangle(0, -halfH - t / 2, MAP_W + 2 * t, t, {
      isStatic: true,
    }),
    Matter.Bodies.rectangle(halfW + t / 2, 0, t, MAP_H + 2 * t, {
      isStatic: true,
    }),
    Matter.Bodies.rectangle(-halfW - t / 2, 0, t, MAP_H + 2 * t, {
      isStatic: true,
    }),
  ];
  walls.forEach((w) => Matter.World.add(world, w));

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x553a22,
    roughness: 0.95,
  });
  const fenceGeo1 = new THREE.BoxGeometry(MAP_W + 1, 1.2, 0.4);
  const fenceGeo2 = new THREE.BoxGeometry(0.4, 1.2, MAP_H + 1);
  const positions: [THREE.BoxGeometry, number, number][] = [
    [fenceGeo1, 0, halfH],
    [fenceGeo1, 0, -halfH],
    [fenceGeo2, halfW, 0],
    [fenceGeo2, -halfW, 0],
  ];
  positions.forEach(([g, x, z]) => {
    const m = new THREE.Mesh(g, fenceMat);
    m.position.set(x, 0.6, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  });
}

// ============================================================
// Obstacles (stones)
// ============================================================
export function setupObstacles(
  scene: THREE.Scene,
  world: Matter.World,
): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6f7280,
    roughness: 0.9,
    metalness: 0.05,
  });

  STONES.forEach((o) => {
    const geo = new THREE.BoxGeometry(o.size, 1.6, o.size);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(o.x, 0.8, o.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = Matter.Bodies.rectangle(o.x, o.z, o.size, o.size, {
      isStatic: true,
    });
    Matter.World.add(world, body);
    obstacles.push({
      mesh,
      body,
      cx: o.x,
      cz: o.z,
      halfX: o.size / 2,
      halfZ: o.size / 2,
    });
  });
  return obstacles;
}

// ============================================================
// Crates (destructible, drop pickups)
// ============================================================
export function setupCrates(
  scene: THREE.Scene,
  world: Matter.World,
): Crate[] {
  const crates: Crate[] = [];
  CRATE_DEFS.forEach((p) => {
    const size = 2.0;
    const grp = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xc88a3a,
      roughness: 0.85,
    });
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x6c3d12,
      roughness: 0.85,
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(size, 1.4, size),
      baseMat,
    );
    base.castShadow = true;
    base.receiveShadow = true;
    grp.add(base);

    const strap1 = new THREE.Mesh(
      new THREE.BoxGeometry(size + 0.02, 0.18, 0.18),
      stripMat,
    );
    strap1.position.y = 0.45;
    strap1.position.z = -size / 2 - 0.01;
    grp.add(strap1);
    const strap2 = strap1.clone();
    strap2.position.z = size / 2 + 0.01;
    grp.add(strap2);
    const strapV = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, size + 0.02),
      stripMat,
    );
    strapV.position.y = 0.45;
    strapV.position.x = -size / 2 - 0.01;
    grp.add(strapV);
    const strapV2 = strapV.clone();
    strapV2.position.x = size / 2 + 0.01;
    grp.add(strapV2);

    grp.position.set(p.x, 0.7, p.z);
    grp.rotation.y = (Math.random() - 0.5) * 0.4;
    scene.add(grp);

    const body = Matter.Bodies.rectangle(p.x, p.z, size, size, {
      isStatic: true,
    });
    Matter.World.add(world, body);

    crates.push({
      mesh: grp,
      body,
      cx: p.x,
      cz: p.z,
      halfX: size / 2,
      halfZ: size / 2,
      hp: CRATE_HP,
      maxHp: CRATE_HP,
      destroyed: false,
    });
  });
  return crates;
}

// ============================================================
// Bushes (stealth zones)
// ============================================================
export function setupBushes(scene: THREE.Scene): Bush[] {
  const bushes: Bush[] = [];
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2d6a2d,
    roughness: 1,
  });
  for (const d of BUSH_DEFS) {
    const grp = new THREE.Group();
    const blobs = 5;
    for (let i = 0; i < blobs; i++) {
      const r = d.r * (0.45 + Math.random() * 0.25);
      const geo = new THREE.SphereGeometry(r, 12, 10);
      const m = new THREE.Mesh(geo, mat);
      const a = (i / blobs) * Math.PI * 2;
      const dist = i === 0 ? 0 : d.r * 0.45;
      m.position.set(
        Math.cos(a) * dist,
        d.r * 0.45 + Math.random() * 0.2,
        Math.sin(a) * dist,
      );
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
    grp.position.set(d.x, 0, d.z);
    scene.add(grp);
    bushes.push({ group: grp, cx: d.x, cz: d.z, radius: d.r });
  }
  return bushes;
}

// ============================================================
// Aim overlay (red indicator)
// ============================================================
export function setupAimOverlay(scene: THREE.Scene): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(AIM_WIDTH, AIM_LENGTH);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff5555,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "__aim";
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.02;
  scene.add(mesh);
  return mesh;
}
