import * as THREE from "three";
import Matter from "matter-js";
import {
  PET_DAMAGE,
  PET_SPEED,
  PET_FOLLOW_DIST,
  PET_FOLLOW_DEADZONE,
  PET_ATTACK_RANGE,
  PET_ATTACK_COOLDOWN,
  PET_DETECT_RANGE,
  PET_LEASH_RANGE,
  PET_MAX_HP,
  MAP_W,
  MAP_H,
} from "./config";
import type { Pet, Enemy, AIContext } from "./types";
import { animatePet, refreshPetHpBar } from "./characters";
import { spawnDamageNumber, spawnSparks } from "./effects";

function findNearestEnemy(ctx: AIContext, pet: Pet): Enemy | null {
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of ctx.enemies) {
    if (e.destroyed) continue;
    const dx = e.body.position.x - pet.body.position.x;
    const dz = e.body.position.y - pet.body.position.y;
    const d = Math.hypot(dx, dz);
    if (d < PET_DETECT_RANGE && d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function computeRepulsion(ctx: AIContext, pet: Pet): THREE.Vector2 {
  const AVOID_RADIUS = 3.0;
  const rep = new THREE.Vector2(0, 0);
  for (const o of ctx.obstacles) {
    const ox = pet.body.position.x - o.cx;
    const oz = pet.body.position.y - o.cz;
    const od = Math.hypot(ox, oz);
    if (od < AVOID_RADIUS && od > 0.001) {
      const k = (AVOID_RADIUS - od) / AVOID_RADIUS;
      rep.x += (ox / od) * k;
      rep.y += (oz / od) * k;
    }
  }
  for (const c of ctx.crates) {
    if (c.destroyed) continue;
    const ox = pet.body.position.x - c.cx;
    const oz = pet.body.position.y - c.cz;
    const od = Math.hypot(ox, oz);
    if (od < AVOID_RADIUS && od > 0.001) {
      const k = (AVOID_RADIUS - od) / AVOID_RADIUS;
      rep.x += (ox / od) * k;
      rep.y += (oz / od) * k;
    }
  }
  return rep;
}

export function updatePet(
  ctx: AIContext,
  dt: number,
  lerpAngle: (a: number, b: number, t: number) => number,
): void {
  const pet = ctx.pet;
  if (!pet) return;
  if (!pet.alive) return;

  const now = ctx.clock.getElapsedTime();

  pet.group.position.set(pet.body.position.x, 0, pet.body.position.y);

  let target: Enemy | null = null;

  if (pet.lastAttackerId) {
    const ex = ctx.enemies.find(
      (e) => e.id === pet.lastAttackerId && !e.destroyed,
    );
    if (ex) target = ex;
    else pet.lastAttackerId = null;
  }

  if (!target) {
    target = findNearestEnemy(ctx, pet);
  }

  pet.targetEnemyId = target ? target.id : null;

  const playerX = ctx.playerBody.position.x;
  const playerZ = ctx.playerBody.position.y;
  const distToPlayer = Math.hypot(
    pet.body.position.x - playerX,
    pet.body.position.y - playerZ,
  );

  let desiredDir = new THREE.Vector2(0, 0);
  let speed = 0;

  if (target) {
    const tdx = target.body.position.x - pet.body.position.x;
    const tdz = target.body.position.y - pet.body.position.y;
    const td = Math.hypot(tdx, tdz);

    if (td < PET_ATTACK_RANGE) {
      pet.state = "attack";
      pet.group.rotation.y = lerpAngle(
        pet.group.rotation.y,
        Math.atan2(tdx, tdz),
        0.2,
      );
      if (now - pet.lastBiteAt > PET_ATTACK_COOLDOWN) {
        pet.lastBiteAt = now;
        const before = target.hp;
        target.hp = Math.max(0, target.hp - PET_DAMAGE);
        const dealt = before - target.hp;

        // *** Use the shared array from AIContext so engine's updateDamageNumbers
        //     will fade & remove them properly. ***
        spawnDamageNumber(
          ctx.scene,
          ctx.damageNumbers,
          target.body.position.x,
          2.4,
          target.body.position.y,
          dealt,
          "#ff5a3a",
          now,
        );
        spawnSparks(
          ctx.scene,
          ctx.sparks,
          target.body.position.x,
          1.0,
          target.body.position.y,
          0xff3020,
          8,
          now,
        );

        (target as Enemy & { _petBiteDamage?: number })._petBiteDamage = dealt;
        target.targetPet = true;
        target.state = "chase";
      }
    } else {
      pet.state = "attack";
      desiredDir.set(tdx / td, tdz / td);
      speed = PET_SPEED;
    }
  } else {
    pet.state = "follow";
    if (distToPlayer > PET_FOLLOW_DEADZONE) {
      const dx = playerX - pet.body.position.x;
      const dz = playerZ - pet.body.position.y;
      const d = Math.hypot(dx, dz) || 1;
      desiredDir.set(dx / d, dz / d);
      speed = distToPlayer > 10 ? PET_SPEED : PET_SPEED * 0.7;
    } else if (distToPlayer > PET_FOLLOW_DIST) {
      const dx = playerX - pet.body.position.x;
      const dz = playerZ - pet.body.position.y;
      const d = Math.hypot(dx, dz) || 1;
      desiredDir.set(dx / d, dz / d);
      speed = PET_SPEED * 0.4;
    }
  }

  if (distToPlayer > PET_LEASH_RANGE) {
    const dx = playerX - pet.body.position.x;
    const dz = playerZ - pet.body.position.y;
    const d = Math.hypot(dx, dz) || 1;
    desiredDir.set(dx / d, dz / d);
    speed = PET_SPEED;
    target = null;
    pet.targetEnemyId = null;
  }

  const repulsion = computeRepulsion(ctx, pet);
  desiredDir.add(repulsion.multiplyScalar(1.8));
  if (desiredDir.lengthSq() > 0.0001) {
    desiredDir.normalize();
  }

  Matter.Body.setVelocity(pet.body, {
    x: desiredDir.x * speed * dt,
    y: desiredDir.y * speed * dt,
  });

  if (!target && desiredDir.lengthSq() > 0.0001) {
    const ta = Math.atan2(desiredDir.x, desiredDir.y);
    pet.group.rotation.y = lerpAngle(pet.group.rotation.y, ta, 0.15);
  }

  animatePet(pet, speed, dt);

  const halfW = MAP_W / 2 - 3;
  const halfH = MAP_H / 2 - 3;
  if (pet.body.position.x < -halfW) pet.body.position.x = -halfW;
  if (pet.body.position.x > halfW) pet.body.position.x = halfW;
  if (pet.body.position.y < -halfH) pet.body.position.y = -halfH;
  if (pet.body.position.y > halfH) pet.body.position.y = halfH;

  pet.hpBar.visible = pet.alive;
}

export function damagePet(
  ctx: AIContext,
  attackerId: string,
  damage: number,
): void {
  const pet = ctx.pet;
  if (!pet || !pet.alive) return;
  pet.hp = Math.max(0, pet.hp - damage);
  refreshPetHpBar(pet);
  pet.lastAttackerId = attackerId;
  if (pet.hp <= 0) {
    pet.alive = false;
    pet.group.visible = false;
    Matter.Body.setPosition(pet.body, { x: 9999, y: 9999 });
    Matter.Body.setVelocity(pet.body, { x: 0, y: 0 });
  }
}

export function respawnPet(pet: Pet, x: number, z: number): void {
  pet.hp = PET_MAX_HP;
  pet.alive = true;
  pet.group.visible = true;
  pet.group.position.set(x, 0, z);
  Matter.Body.setPosition(pet.body, { x, y: z });
  Matter.Body.setVelocity(pet.body, { x: 0, y: 0 });
  pet.state = "follow";
  pet.targetEnemyId = null;
  pet.lastAttackerId = null;
  pet.lastBiteAt = 0;
  refreshPetHpBar(pet);
}
