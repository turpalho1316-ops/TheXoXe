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

  flashes.push({
    light,
    glow,
    spawnedAt: now,
    life: 0.09,
  });
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

  sprite.scale.set(
    DMG_SCALE_X,
    DMG_SCALE_Y,
    1,
  );

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

    d.sprite.position.y =
      d.startY + t * 1.5;

    const fade =
      t < 0.3
        ? 1
        : 1 - (t - 0.3) / 0.7;

    d.sprite.material.opacity =
      Math.max(0, fade);

    const scale =
      1 + Math.sin(t * Math.PI) * 0.15;

    d.sprite.scale.set(
      DMG_SCALE_X * scale,
      DMG_SCALE_Y * scale,
      1,
    );
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

  const color =
    kind === "heal"
      ? 0x55ff66
      : 0xff8855;

  const baseGeo =
    new THREE.OctahedronGeometry(0.5);

  const baseMat =
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

  const base =
    new THREE.Mesh(baseGeo, baseMat);

  grp.add(base);

  const ring =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.55,
        0.75,
        24,
      ),
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

    p.mesh.position.y =
      1.0 + Math.sin(now * 3 + i) * 0.15;
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

      const mt =
        m.material as
          | THREE.Material
          | THREE.Material[];

      if (Array.isArray(mt)) {
        mt.forEach((x) => x.dispose());
      } else {
        mt?.dispose?.();
      }
    }
  });

  pickups.splice(index, 1);
}

// ============================================================
// BULLET VISUAL
//
// Local space:
//   +Z = direction of flight
//   -Z = comet tail
//
// The projectile remains fully procedural.
// No external textures.
// No changes to physics or projectile pooling.
//
// Performance rule:
// - All objects are created once when the pool is built.
// - animateBulletVisual creates NOTHING.
// - Orbiting particles use ONE THREE.Points object,
//   not four separate meshes.
// ============================================================

export type BulletVisualMaterials = {
  core: THREE.Material;
  inner: THREE.Material;
  aura: THREE.Material;
  ring1: THREE.Material;
  ring2: THREE.Material;
  ring3: THREE.Material;
  orbit: THREE.Material;
  tail: THREE.Material;
  tail2: THREE.Material;
};

// ============================================================
// Build bullet visual
// ============================================================

export function buildBulletVisual(
  mats: BulletVisualMaterials,
  isUlt: boolean,
): THREE.Group {
  const group = new THREE.Group();

  const coreR =
    isUlt ? 0.44 : 0.23;

  const innerR =
    isUlt ? 0.57 : 0.30;

  const auraR =
    isUlt ? 0.78 : 0.41;

  const ringR =
    isUlt ? 0.86 : 0.46;

  const ringTube =
    isUlt ? 0.075 : 0.042;

  const tailH =
    isUlt ? 3.35 : 2.0;

  const tailR =
    isUlt ? 0.32 : 0.17;

  // ----------------------------------------------------------
  // White-hot core
  // ----------------------------------------------------------

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(
      coreR,
      14,
      14,
    ),
    mats.core,
  );

  group.add(core);
  group.userData.core = core;

  // ----------------------------------------------------------
  // Inner energy shell
  // ----------------------------------------------------------

  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(
      innerR,
      14,
      14,
    ),
    mats.inner,
  );

  group.add(inner);
  group.userData.inner = inner;

  // ----------------------------------------------------------
  // Main aura
  // ----------------------------------------------------------

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(
      auraR,
      14,
      14,
    ),
    mats.aura,
  );

  group.add(aura);
  group.userData.aura = aura;

  // ----------------------------------------------------------
  // Ring 1
  // ----------------------------------------------------------

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(
      ringR,
      ringTube,
      7,
      28,
    ),
    mats.ring1,
  );

  ring1.rotation.x = 0.30;

  group.add(ring1);
  group.userData.ring1 = ring1;

  // ----------------------------------------------------------
  // Ring 2
  // ----------------------------------------------------------

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(
      ringR * 0.84,
      ringTube * 0.82,
      7,
      24,
    ),
    mats.ring2,
  );

  ring2.rotation.x = -0.45;
  ring2.rotation.y = 0.28;

  group.add(ring2);
  group.userData.ring2 = ring2;

  // ----------------------------------------------------------
  // Ring 3
  // ----------------------------------------------------------

  const ring3 = new THREE.Mesh(
    new THREE.TorusGeometry(
      ringR * 0.68,
      ringTube * 0.62,
      6,
      22,
    ),
    mats.ring3,
  );

  ring3.rotation.x = 1.0;
  ring3.rotation.z = 0.42;

  group.add(ring3);
  group.userData.ring3 = ring3;

  // ----------------------------------------------------------
  // Orbiting energy particles
  //
  // Four particles are stored in ONE Points object.
  // This keeps the draw-call cost low.
  // ----------------------------------------------------------

  const orbitPositions =
    new Float32Array(12);

  const orbitGeometry =
    new THREE.BufferGeometry();

  orbitGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      orbitPositions,
      3,
    ),
  );

  const orbit =
    new THREE.Points(
      orbitGeometry,
      mats.orbit as THREE.PointsMaterial,
    );

  const orbitRadius =
    isUlt ? 0.72 : 0.40;

  const initialPhase =
    group.userData.phase || 0;

  for (let i = 0; i < 4; i++) {
    const a =
      initialPhase +
      (Math.PI * 2 * i) / 4;

    orbitPositions[i * 3] =
      Math.cos(a) * orbitRadius;

    orbitPositions[i * 3 + 1] =
      Math.sin(a) *
      orbitRadius *
      0.75;

    orbitPositions[i * 3 + 2] =
      Math.sin(a * 1.2) *
      orbitRadius *
      0.45;
  }

  orbitGeometry.attributes.position.needsUpdate =
    true;

  group.add(orbit);

  group.userData.orbit =
    orbit;

  group.userData.orbitRadius =
    orbitRadius;

  // ----------------------------------------------------------
  // Main comet tail
  // ----------------------------------------------------------

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(
      tailR,
      tailH,
      12,
      1,
      true,
    ),
    mats.tail,
  );

  tail.rotation.x =
    -Math.PI / 2;

  tail.position.set(
    0,
    0,
    -tailH / 2,
  );

  group.add(tail);
  group.userData.tail = tail;

  // ----------------------------------------------------------
  // Secondary tail glow
  // ----------------------------------------------------------

  const tail2 = new THREE.Mesh(
    new THREE.ConeGeometry(
      tailR * 0.68,
      tailH * 0.76,
      10,
      1,
      true,
    ),
    mats.tail2,
  );

  tail2.rotation.x =
    -Math.PI / 2;

  tail2.position.set(
    0,
    0,
    -tailH * 0.37,
  );

  group.add(tail2);
  group.userData.tail2 = tail2;

  // ----------------------------------------------------------
  // Animation state
  // ----------------------------------------------------------

  group.userData.phase =
    Math.random() *
    Math.PI *
    2;

  group.userData.isUlt =
    isUlt;

  return group;
}

// ============================================================
// Animate bullet visual
// ============================================================

export function animateBulletVisual(
  group: THREE.Object3D,
  dt: number,
): void {
  const phase =
    (typeof group.userData.phase === "number"
      ? group.userData.phase
      : 0) +
    dt * 9.5;

  group.userData.phase =
    phase;

  const isUlt =
    group.userData.isUlt === true;

  const core =
    group.userData.core as
      | THREE.Mesh
      | undefined;

  const inner =
    group.userData.inner as
      | THREE.Mesh
      | undefined;

  const aura =
    group.userData.aura as
      | THREE.Mesh
      | undefined;

  const ring1 =
    group.userData.ring1 as
      | THREE.Mesh
      | undefined;

  const ring2 =
    group.userData.ring2 as
      | THREE.Mesh
      | undefined;

  const ring3 =
    group.userData.ring3 as
      | THREE.Mesh
      | undefined;

  const orbit =
    group.userData.orbit as
      | THREE.Points
      | undefined;

  const tail =
    group.userData.tail as
      | THREE.Mesh
      | undefined;

  const tail2 =
    group.userData.tail2 as
      | THREE.Mesh
      | undefined;

  // ----------------------------------------------------------
  // Core pulse
  // ----------------------------------------------------------

  if (core) {
    const s =
      1 +
      Math.sin(phase * 1.55) *
        (isUlt ? 0.095 : 0.07);

    core.scale.set(s, s, s);
  }

  // ----------------------------------------------------------
  // Inner energy movement
  // ----------------------------------------------------------

  if (inner) {
    const s =
      1 +
      Math.sin(
        phase * 0.9 + 1.2,
      ) *
        (isUlt ? 0.07 : 0.055);

    inner.scale.set(s, s, s);

    inner.rotation.y +=
      dt * 1.7;

    inner.rotation.x =
      Math.sin(phase * 0.4) *
      0.07;
  }

  // ----------------------------------------------------------
  // Aura pulse
  // ----------------------------------------------------------

  if (aura) {
    const s =
      1 +
      Math.sin(phase) *
        (isUlt ? 0.16 : 0.12);

    aura.scale.set(s, s, s);
  }

  // ----------------------------------------------------------
  // Ring 1
  // ----------------------------------------------------------

  if (ring1) {
    ring1.rotation.z +=
      dt *
      (isUlt ? 4.2 : 3.5);

    ring1.rotation.x =
      0.30 +
      Math.sin(
        phase * 0.7,
      ) *
        0.09;

    ring1.rotation.y =
      Math.cos(
        phase * 0.5,
      ) *
      0.07;
  }

  // ----------------------------------------------------------
  // Ring 2
  // ----------------------------------------------------------

  if (ring2) {
    ring2.rotation.z -=
      dt *
      (isUlt ? 5.2 : 4.4);

    ring2.rotation.x =
      -0.45 +
      Math.cos(
        phase * 0.82,
      ) *
        0.10;

    ring2.rotation.y =
      0.28 +
      Math.sin(
        phase * 0.46,
      ) *
        0.11;
  }

  // ----------------------------------------------------------
  // Ring 3
  // ----------------------------------------------------------

  if (ring3) {
    ring3.rotation.z +=
      dt *
      (isUlt ? 6.6 : 5.4);

    ring3.rotation.x =
      1.0 +
      Math.sin(
        phase * 1.15,
      ) *
        0.12;

    ring3.rotation.y =
      Math.cos(
        phase * 0.66,
      ) *
      0.14;
  }

  // ----------------------------------------------------------
  // Four orbiting particles
  // ----------------------------------------------------------

  if (orbit) {
    const position =
      orbit.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;

    const radius =
      typeof group.userData.orbitRadius ===
      "number"
        ? group.userData.orbitRadius
        : isUlt
          ? 0.72
          : 0.40;

    const orbitPhase =
      phase *
      (isUlt ? 1.22 : 1.02);

    for (let i = 0; i < 4; i++) {
      const angle =
        orbitPhase +
        (Math.PI * 2 * i) / 4;

      const vertical =
        Math.sin(
          phase * 1.3 +
          i * 1.7,
        ) *
        0.12;

      position.setXYZ(
        i,
        Math.cos(angle) *
          radius,

        Math.sin(angle) *
          radius *
          0.76 +
          vertical,

        Math.sin(angle * 1.18) *
          radius *
          0.48,
      );
    }

    position.needsUpdate = true;

    orbit.rotation.z =
      Math.sin(
        phase * 0.42,
      ) *
      0.28;

    orbit.rotation.x =
      Math.cos(
        phase * 0.36,
      ) *
      0.22;

    orbit.rotation.y +=
      dt *
      (isUlt ? 0.70 : 0.50);
  }

  // ----------------------------------------------------------
  // Main tail breathing
  //
  // Important: no per-projectile material opacity
  // animation here because pooled projectiles share
  // materials. Transform animation stays per-instance.
  // ----------------------------------------------------------

  if (tail) {
    const s =
      1 +
      Math.sin(
        phase * 0.92,
      ) *
        (isUlt ? 0.11 : 0.075);

    tail.scale.x = s;
    tail.scale.y = 1;
    tail.scale.z = s;

    tail.rotation.z =
      Math.sin(
        phase * 0.75,
      ) *
      0.035;
  }

  // ----------------------------------------------------------
  // Secondary tail
  // ----------------------------------------------------------

  if (tail2) {
    const s =
      1 +
      Math.cos(
        phase * 1.1,
      ) *
        (isUlt ? 0.14 : 0.095);

    tail2.scale.x = s;
    tail2.scale.y = 1;
    tail2.scale.z = s;

    tail2.rotation.z =
      Math.cos(
        phase * 0.8,
      ) *
      0.04;
  }
}

// ============================================================
// Bullet materials
// ============================================================

export function makeBulletMaterials(
  color: number,
  emissive: number,
  isUlt: boolean,
): BulletVisualMaterials {
  // ----------------------------------------------------------
  // White-hot center
  // ----------------------------------------------------------

  const core =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Inner colored energy
  // ----------------------------------------------------------

  const inner =
    new THREE.MeshBasicMaterial({
      color: isUlt
        ? 0xffffdf
        : 0xffffe5,
      transparent: true,
      opacity: isUlt
        ? 0.92
        : 0.86,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Main aura
  // ----------------------------------------------------------

  const aura =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isUlt
        ? 0.58
        : 0.50,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Ring 1
  // ----------------------------------------------------------

  const ring1 =
    new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: isUlt
        ? 0.96
        : 0.90,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Ring 2
  // ----------------------------------------------------------

  const ring2 =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isUlt
        ? 0.92
        : 0.82,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Ring 3
  // ----------------------------------------------------------

  const ring3 =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isUlt
        ? 0.78
        : 0.66,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  // ----------------------------------------------------------
  // Orbit particles
  // ----------------------------------------------------------

  const orbit =
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: isUlt
        ? 0.19
        : 0.115,
      transparent: true,
      opacity: isUlt
        ? 0.98
        : 0.90,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

  // ----------------------------------------------------------
  // Main tail
  // ----------------------------------------------------------

  const tail =
    new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: isUlt
        ? 0.56
        : 0.48,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

  // ----------------------------------------------------------
  // Secondary tail
  // ----------------------------------------------------------

  const tail2 =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isUlt
        ? 0.22
        : 0.17,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

  return {
    core,
    inner,
    aura,
    ring1,
    ring2,
    ring3,
    orbit,
    tail,
    tail2,
  };
}
