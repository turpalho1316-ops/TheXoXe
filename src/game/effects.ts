import * as THREE from "three";
import { createDamageNumberTexture } from "./textures";
import type { MuzzleFlash, Spark, DamageNumber, Pickup } from "./types";

// ============================================================
// Muzzle flash — no PointLight, only a glowing sphere
// ============================================================
export function spawnMuzzleFlash(
  scene: THREE.Scene,
  flashes: MuzzleFlash[],
  x: number,
  z: number,
  color: number,
  now: number,
): void {
  // Reuse a dummy light (0 intensity) so type stays compatible
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
// Damage numbers — smaller, faster fade
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
