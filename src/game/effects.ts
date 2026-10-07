import * as THREE from "three";
import { createDamageNumberTexture } from "./textures";
import type { MuzzleFlash, Spark, DamageNumber, Pickup } from "./types";

// ============================================================
// Muzzle flash
// ============================================================
export function spawnMuzzleFlash(
  scene: THREE.Scene,
  flashes: MuzzleFlash[],
  x: number,
  z: number,
  color: number,
  now: number,
): void {
  const light = new THREE.PointLight(color, 0, 0);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.set(x, 1.2, z);
  scene.add(glow);
  flashes.push({ light, glow, spawnedAt: now, life: 0.09 });
}

export function updateMuzzleFlashes(
  scene: THREE.Scene,
  flashes: MuzzleFlash[],
  now: number,
): void {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    const t = (now - f.spawnedAt) / f.life;
    if (t >= 1) {
      scene.remove(f.glow);
      (f.glow.geometry as THREE.BufferGeometry).dispose();
      (f.glow.material as THREE.Material).dispose();
      flashes.splice(i, 1);
    } else {
      const k = 1 - t;
      const mat = f.glow.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * k;
      const s = 1 + t * 0.6;
      f.glow.scale.set(s, s, s);
    }
  }
}

// ============================================================
// Sparks
// ============================================================
export function spawnSparks(
  scene: THREE.Scene,
  sparks: Spark[],
  x: number,
  y: number,
  z: number,
  color: number,
  count: number,
  now: number,
): void {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    scene.add(m);
    const ang = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 6;
    sparks.push({
      mesh: m,
      vx: Math.cos(ang) * sp,
      vz: Math.sin(ang) * sp,
      vy: 2 + Math.random() * 5,
      life: 0.4,
      spawnedAt: now,
    });
  }
}

export function updateSparks(
  scene: THREE.Scene,
  sparks: Spark[],
  dt: number,
  now: number,
): void {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    const t = (now - s.spawnedAt) / s.life;
    if (t >= 1) {
      scene.remove(s.mesh);
      (s.mesh.geometry as THREE.BufferGeometry).dispose();
      (s.mesh.material as THREE.Material).dispose();
      sparks.splice(i, 1);
      continue;
    }
    s.vy -= 18 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    if (s.mesh.position.y < 0.05) {
      s.mesh.position.y = 0.05;
      s.vy = 0;
      s.vx *= 0.6;
      s.vz *= 0.6;
    }
    (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  }
}

// ============================================================
// Damage numbers
// ============================================================
const DMG_LIFE = 0.75;
const DMG_SCALE_X = 1.35;
const DMG_SCALE_Y = 0.68;

export function spawnDamageNumber(
  scene: THREE.Scene,
  numbers: DamageNumber[],
  x: number,
  y: number,
  z: number,
  value: number,
  color: string,
  now: number,
): void {
  if (value <= 0) return;
  const tex = createDamageNumberTexture(value, color);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(DMG_SCALE_X, DMG_SCALE_Y, 1);
  sprite.position.set(
    x + (Math.random() - 0.5) * 0.4,
    y,
    z + (Math.random() - 0.5) * 0.4,
  );
  scene.add(sprite);
  numbers.push({
    sprite,
    spawnedAt: now,
    life: DMG_LIFE,
    startY: sprite.position.y,
  });
}

export function updateDamageNumbers(
  scene: THREE.Scene,
  numbers: DamageNumber[],
  now: number,
): void {
  for (let i = numbers.length - 1; i >= 0; i--) {
    const d = numbers[i];
    const t = (now - d.spawnedAt) / d.life;
    if (t >= 1) {
      scene.remove(d.sprite);
      d.sprite.material.map?.dispose();
      d.sprite.material.dispose();
      numbers.splice(i, 1);
      continue;
    }
    d.sprite.position.y = d.startY + t * 1.5;
    const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
    d.sprite.material.opacity = Math.max(0, fade);
    const scale = 1 + Math.sin(t * Math.PI) * 0.15;
    d.sprite.scale.set(DMG_SCALE_X * scale, DMG_SCALE_Y * scale, 1);
  }
}

// ============================================================
// Pickups
// ============================================================
export function spawnPickup(
  scene: THREE.Scene,
  pickups: Pickup[],
  x: number,
  z: number,
  kind: "heal" | "damage",
  now: number,
): void {
  const grp = new THREE.Group();
  const color = kind === "heal" ? 0x55ff66 : 0xff8855;
  const baseGeo = new THREE.OctahedronGeometry(0.5);
  const baseMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  grp.add(base);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.75, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.6;
  grp.add(ring);
  grp.position.set(x, 1.0, z);
  scene.add(grp);
  pickups.push({
    mesh: grp,
    cx: x,
    cz: z,
    kind,
    spawnedAt: now,
    ttl: 18,
  });
}

export function updatePickupsVisuals(
  pickups: Pickup[],
  dt: number,
  now: number,
): void {
  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    p.mesh.rotation.y += dt * 1.6;
    p.mesh.position.y = 1.0 + Math.sin(now * 3 + i) * 0.15;
  }
}

export function removePickup(
  scene: THREE.Scene,
  pickups: Pickup[],
  index: number,
): void {
  const p = pickups[index];
  scene.remove(p.mesh);
  p.mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose?.();
      const mt = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
      else mt?.dispose?.();
    }
  });
  pickups.splice(index, 1);
}

// ============================================================
// ENERGY PROJECTILE VFX
// ============================================================
// Layers (local space; forward = +Z; tail grows in -Z):
//
//   coreInner   — hot white sphere
//   coreOuter   — yellow "bloom" sphere around the core
//   aura        — soft glow, double-pulse
//   ring1..ring5 — five tori, different tilts, speeds, colors
//   tailOuter   — wide comet cone
//   tailInner   — narrow bright core of the tail
//   orbiters[12] — tiny dots spiraling around the core
//
// Total meshes per bullet: 3 (core+coreOuter+aura) + 5 (rings)
//                         + 2 (tails) + 12 (orbiters) = 22.
// All built ONCE at pool creation. Zero allocations per frame.
// ============================================================
export type BulletVisualMaterials = {
  coreInner: THREE.Material;
  coreOuter: THREE.Material;
  aura: THREE.Material;
  ring1: THREE.Material;
  ring2: THREE.Material;
  ring3: THREE.Material;
  ring4: THREE.Material;
  ring5: THREE.Material;
  tailOuter: THREE.Material;
  tailInner: THREE.Material;
  orbiter: THREE.Material;
};

export function buildBulletVisual(
  mats: BulletVisualMaterials,
  isUlt: boolean,
): THREE.Group {
  const group = new THREE.Group();
  group.userData.spawnTime = performance.now() / 1000;
  group.userData.fadeIn = 0;

  // ----- CORE -----
  const coreInnerR = isUlt ? 0.30 : 0.14;
  const coreOuterR = isUlt ? 0.55 : 0.28;
  const auraR = isUlt ? 0.95 : 0.55;

  const coreInnerGeo = new THREE.SphereGeometry(coreInnerR, 14, 14);
  const coreInner = new THREE.Mesh(coreInnerGeo, mats.coreInner);
  group.add(coreInner);
  group.userData.coreInner = coreInner;

  const coreOuterGeo = new THREE.SphereGeometry(coreOuterR, 16, 16);
  const coreOuter = new THREE.Mesh(coreOuterGeo, mats.coreOuter);
  group.add(coreOuter);
  group.userData.coreOuter = coreOuter;

  // ----- AURA -----
  const auraGeo = new THREE.SphereGeometry(auraR, 16, 16);
  const aura = new THREE.Mesh(auraGeo, mats.aura);
  group.add(aura);
  group.userData.aura = aura;

  // ----- RINGS (5) -----
  const ringBase = isUlt ? 1.0 : 0.58;
  const ringTube = isUlt ? 0.075 : 0.038;

  const ring1Geo = new THREE.TorusGeometry(ringBase, ringTube, 8, 32);
  const ring1 = new THREE.Mesh(ring1Geo, mats.ring1);
  ring1.rotation.x = Math.PI / 2;
  ring1.rotation.z = 0.2;
  group.add(ring1);
  group.userData.ring1 = ring1;

  const ring2Geo = new THREE.TorusGeometry(
    ringBase * 0.82,
    ringTube * 0.9,
    8,
    28,
  );
  const ring2 = new THREE.Mesh(ring2Geo, mats.ring2);
  ring2.rotation.x = Math.PI / 2;
  ring2.rotation.z = -0.4;
  ring2.rotation.y = 0.6;
  group.add(ring2);
  group.userData.ring2 = ring2;

  const ring3Geo = new THREE.TorusGeometry(
    ringBase * 0.65,
    ringTube * 0.75,
    8,
    26,
  );
  const ring3 = new THREE.Mesh(ring3Geo, mats.ring3);
  ring3.rotation.y = Math.PI / 2;
  ring3.rotation.x = 0.3;
  group.add(ring3);
  group.userData.ring3 = ring3;

  const ring4Geo = new THREE.TorusGeometry(
    ringBase * 1.15,
    ringTube * 0.55,
    8,
    36,
  );
  const ring4 = new THREE.Mesh(ring4Geo, mats.ring4);
  ring4.rotation.x = Math.PI / 2;
  ring4.rotation.z = 0.9;
  group.add(ring4);
  group.userData.ring4 = ring4;

  const ring5Geo = new THREE.TorusGeometry(
    ringBase * 0.5,
    ringTube * 0.9,
    8,
    22,
  );
  const ring5 = new THREE.Mesh(ring5Geo, mats.ring5);
  ring5.rotation.x = Math.PI / 2.6;
  ring5.rotation.y = -0.5;
  group.add(ring5);
  group.userData.ring5 = ring5;

  // ----- TAIL (two cones) -----
  const tailOuterH = isUlt ? 4.0 : 2.6;
  const tailOuterR = isUlt ? 0.36 : 0.20;
  const tailInnerH = isUlt ? 2.8 : 1.8;
  const tailInnerR = isUlt ? 0.16 : 0.09;

  const tailOuterGeo = new THREE.ConeGeometry(
    tailOuterR,
    tailOuterH,
    14,
    1,
    true,
  );
  const tailOuter = new THREE.Mesh(tailOuterGeo, mats.tailOuter);
  tailOuter.rotation.x = -Math.PI / 2;
  tailOuter.position.set(0, 0, -tailOuterH / 2);
  group.add(tailOuter);
  group.userData.tailOuter = tailOuter;

  const tailInnerGeo = new THREE.ConeGeometry(
    tailInnerR,
    tailInnerH,
    12,
    1,
    true,
  );
  const tailInner = new THREE.Mesh(tailInnerGeo, mats.tailInner);
  tailInner.rotation.x = -Math.PI / 2;
  tailInner.position.set(0, 0, -tailInnerH / 2);
  group.add(tailInner);
  group.userData.tailInner = tailInner;

  // ----- ORBITERS (12) -----
  const orbitCount = 12;
  const orbiters: THREE.Mesh[] = [];
  const orbitBaseR = auraR * 1.05;
  for (let i = 0; i < orbitCount; i++) {
    const dotGeo = new THREE.SphereGeometry(
      isUlt ? 0.05 : 0.028,
      6,
      6,
    );
    const dot = new THREE.Mesh(dotGeo, mats.orbiter);
    dot.userData.seed = Math.random() * Math.PI * 2;
    dot.userData.rOff = 0.85 + Math.random() * 0.3;
    dot.userData.yOff = -0.4 + Math.random() * 0.8;
    group.add(dot);
    orbiters.push(dot);
  }
  group.userData.orbiters = orbiters;
  group.userData.orbitBaseR = orbitBaseR;

  group.userData.phase = Math.random() * Math.PI * 2;
  group.userData.isUlt = isUlt;
  group.userData.appearAt = 0;

  return group;
}

export function animateBulletVisual(
  group: THREE.Object3D,
  dt: number,
): void {
  const phase = (group.userData.phase || 0) + dt * 9;
  group.userData.phase = phase;

  // Fade-in over first ~0.15s
  let appearAt = (group.userData.appearAt as number) || 0;
  appearAt = Math.min(1, appearAt + dt * 8);
  group.userData.appearAt = appearAt;

  const coreInner = group.userData.coreInner as THREE.Mesh | undefined;
  const coreOuter = group.userData.coreOuter as THREE.Mesh | undefined;
  const aura = group.userData.aura as THREE.Mesh | undefined;
  const ring1 = group.userData.ring1 as THREE.Mesh | undefined;
  const ring2 = group.userData.ring2 as THREE.Mesh | undefined;
  const ring3 = group.userData.ring3 as THREE.Mesh | undefined;
  const ring4 = group.userData.ring4 as THREE.Mesh | undefined;
  const ring5 = group.userData.ring5 as THREE.Mesh | undefined;
  const tailOuter = group.userData.tailOuter as THREE.Mesh | undefined;
  const tailInner = group.userData.tailInner as THREE.Mesh | undefined;

  // Core: pulsing "breath" + tiny jitter
  if (coreInner) {
    const s = (0.94 + Math.sin(phase * 1.6) * 0.08) * appearAt;
    coreInner.scale.set(s, s, s);
  }
  if (coreOuter) {
    const s = (1 + Math.sin(phase * 1.1) * 0.15) * appearAt;
    coreOuter.scale.set(s, s, s);
  }
  if (aura) {
    const s =
      (1 + Math.sin(phase) * 0.13 + Math.sin(phase * 2.3) * 0.05) *
      appearAt;
    aura.scale.set(s, s, s);
    const am = aura.material as THREE.MeshBasicMaterial;
    am.opacity = (0.45 + Math.sin(phase * 1.5) * 0.12) * appearAt;
  }

  // Rings: each spins on its own axis, wobbles slightly
  if (ring1) {
    ring1.rotation.z += dt * 3.6;
    ring1.rotation.x = Math.PI / 2 + Math.sin(phase * 0.6) * 0.12;
    const m = ring1.material as THREE.MeshBasicMaterial;
    m.opacity = (0.85 + Math.sin(phase * 1.2) * 0.15) * appearAt;
  }
  if (ring2) {
    ring2.rotation.z -= dt * 5.0;
    ring2.rotation.x = Math.PI / 2 + Math.cos(phase * 0.7) * 0.12;
    const m = ring2.material as THREE.MeshBasicMaterial;
    m.opacity = (0.75 + Math.sin(phase * 1.7) * 0.2) * appearAt;
  }
  if (ring3) {
    ring3.rotation.x += dt * 5.5;
    ring3.rotation.y = Math.PI / 2 + Math.sin(phase * 0.9) * 0.15;
    const m = ring3.material as THREE.MeshBasicMaterial;
    m.opacity = (0.7 + Math.sin(phase * 2.1) * 0.2) * appearAt;
  }
  if (ring4) {
    ring4.rotation.z += dt * 2.3;
    ring4.rotation.x = Math.PI / 2 + Math.sin(phase * 0.5) * 0.2;
    const m = ring4.material as THREE.MeshBasicMaterial;
    m.opacity = (0.55 + Math.sin(phase * 1.8) * 0.25) * appearAt;
  }
  if (ring5) {
    ring5.rotation.z -= dt * 6.4;
    ring5.rotation.x = Math.PI / 2.6 + Math.cos(phase * 1.1) * 0.15;
    const m = ring5.material as THREE.MeshBasicMaterial;
    m.opacity = (0.7 + Math.cos(phase * 2.4) * 0.2) * appearAt;
  }

  // Tails: shimmer + slight pulse, extend a touch while alive
  if (tailOuter) {
    const m = tailOuter.material as THREE.MeshBasicMaterial;
    m.opacity = (0.5 + Math.sin(phase * 1.3) * 0.2) * appearAt;
  }
  if (tailInner) {
    const m = tailInner.material as THREE.MeshBasicMaterial;
    m.opacity = (0.75 + Math.sin(phase * 1.9) * 0.2) * appearAt;
  }

  // Orbiters: spiral around the core, alternate direction
  const orbiters = group.userData.orbiters as THREE.Mesh[] | undefined;
  const orbitBaseR = (group.userData.orbitBaseR as number) || 0.5;
  if (orbiters && orbiters.length > 0) {
    for (let i = 0; i < orbiters.length; i++) {
      const dot = orbiters[i];
      const seed = (dot.userData.seed as number) || 0;
      const rOff = (dot.userData.rOff as number) || 1;
      const yOff = (dot.userData.yOff as number) || 0;
      const dir = i % 2 === 0 ? 1 : -1;
      const a = phase * 1.9 * dir + seed + i * 0.5;
      const r = orbitBaseR * rOff;
      dot.position.set(
        Math.cos(a) * r,
        yOff * r * 0.5 + Math.sin(phase * 2.2 + seed) * r * 0.18,
        Math.sin(a) * r,
      );
      const dm = dot.material as THREE.MeshBasicMaterial;
      dm.opacity = (0.7 + Math.sin(phase * 2.6 + i) * 0.25) * appearAt;
      const ds = (0.9 + Math.sin(phase * 3 + i) * 0.2) * appearAt;
      dot.scale.set(ds, ds, ds);
    }
  }
}

export function makeBulletMaterials(
  color: number,
  emissive: number,
  isUlt: boolean,
): BulletVisualMaterials {
  const coreInner = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
  });
  const coreOuter = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: isUlt ? 0.95 : 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const aura = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: isUlt ? 0.6 : 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring1 = new THREE.MeshBasicMaterial({
    color: emissive,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring3 = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring4 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring5 = new THREE.MeshBasicMaterial({
    color: emissive,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const tailOuter = new THREE.MeshBasicMaterial({
    color: emissive,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const tailInner = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const orbiter = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return {
    coreInner,
    coreOuter,
    aura,
    ring1,
    ring2,
    ring3,
    ring4,
    ring5,
    tailOuter,
    tailInner,
    orbiter,
  };
}
