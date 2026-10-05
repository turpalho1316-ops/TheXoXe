import * as THREE from "three";
import Matter from "matter-js";
import {
  pickDialogue,
  pickMonologue,
  pickSpottedLine,
  createSpeechBubbleTexture,
} from "./bots_dialogues";
import {
  VISION_RADIUS,
  CHAT_TRIGGER_DIST,
  CHAT_LINE_DURATION,
  ENEMY_CHASE_SPEED,
  ENEMY_PATROL_SPEED,
  ENEMY_BACK_SPEED,
  MAP_W,
  MAP_H,
} from "./config";
import type { AIContext, Enemy } from "./types";

// ============================================================
// Speech bubble helpers
// ============================================================
export function showBubbleFor(
  enemy: Enemy,
  text: string,
  now: number,
): void {
  if (enemy.bubble) {
    enemy.char.group.remove(enemy.bubble);
    enemy.bubble.material.map?.dispose();
    enemy.bubble.material.dispose();
    enemy.bubble = null;
  }
  const tex = createSpeechBubbleTexture(text);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  const aspect = tex.image.width / tex.image.height;
  const h = 0.8;
  sprite.scale.set(h * aspect, h, 1);
  sprite.position.y = 3.7;
  enemy.char.group.add(sprite);
  enemy.bubble = sprite;
  enemy.bubbleUntil = now + CHAT_LINE_DURATION;
}

export function clearBubble(enemy: Enemy): void {
  if (enemy.bubble) {
    enemy.char.group.remove(enemy.bubble);
    enemy.bubble.material.map?.dispose();
    enemy.bubble.material.dispose();
    enemy.bubble = null;
  }
}

// ============================================================
// Player visibility
// ============================================================
function canSeePlayer(ctx: AIContext, enemy: Enemy): boolean {
  if (ctx.destroyed) return false;
  if (ctx.inBush) return false;
  const dx = ctx.playerBody.position.x - enemy.body.position.x;
  const dz = ctx.playerBody.position.y - enemy.body.position.y;
  const d2 = dx * dx + dz * dz;
  return d2 < enemy.visionRadius * enemy.visionRadius;
}

// ============================================================
// Repulsion from obstacles / crates / borders
// ============================================================
function computeRepulsion(ctx: AIContext, e: Enemy): THREE.Vector2 {
  const AVOID_RADIUS = 3.5;
  const rep = new THREE.Vector2(0, 0);
  for (const o of ctx.obstacles) {
    const ox = e.body.position.x - o.cx;
    const oz = e.body.position.y - o.cz;
    const od = Math.hypot(ox, oz);
    if (od < AVOID_RADIUS && od > 0.001) {
      const k = (AVOID_RADIUS - od) / AVOID_RADIUS;
      rep.x += (ox / od) * k;
      rep.y += (oz / od) * k;
    }
  }
  for (const c of ctx.crates) {
    if (c.destroyed) continue;
    const ox = e.body.position.x - c.cx;
    const oz = e.body.position.y - c.cz;
    const od = Math.hypot(ox, oz);
    if (od < AVOID_RADIUS && od > 0.001) {
      const k = (AVOID_RADIUS - od) / AVOID_RADIUS;
      rep.x += (ox / od) * k * 1.15;
      rep.y += (oz / od) * k * 1.15;
    }
  }
  const halfW = MAP_W / 2 - 2.5;
  const halfH = MAP_H / 2 - 2.5;
  if (e.body.position.x > halfW) rep.x -= (e.body.position.x - halfW) * 0.5;
  if (e.body.position.x < -halfW) rep.x += (-halfW - e.body.position.x) * 0.5;
  if (e.body.position.y > halfH) rep.y -= (e.body.position.y - halfH) * 0.5;
  if (e.body.position.y < -halfH) rep.y += (-halfH - e.body.position.y) * 0.5;
  return rep;
}

// ============================================================
// Main AI tick — called every frame from engine
// ============================================================
export function updateEnemies(
  ctx: AIContext,
  dt: number,
  lerpAngle: (a: number, b: number, t: number) => number,
): void {
  const now = performance.now() / 1000;
  const elapsed = ctx.clock.getElapsedTime();

  for (const e of ctx.enemies) {
    if (e.destroyed) continue;
    e.char.group.position.set(e.body.position.x, 0, e.body.position.y);
    e.visionRing.position.set(e.body.position.x, 0.03, e.body.position.y);

    // Bubble lifetime
    if (e.bubble && elapsed > e.bubbleUntil) {
      clearBubble(e);
    }
    if (e.bubble) {
      const mat = e.bubble.material as THREE.SpriteMaterial;
      mat.opacity = Math.min(1, (e.bubbleUntil - elapsed) * 4);
    }

    const canSee = canSeePlayer(ctx, e);

    // ============================================================
    // STATE: CHAT — бот общается с другим ботом, стоит на месте
    // ============================================================
    if (e.state === "chat") {
      Matter.Body.setVelocity(e.body, { x: 0, y: 0 });
      const partner = ctx.enemies.find((x) => x.id === e.chatPartnerId);
      if (partner) {
        const ddx = partner.body.position.x - e.body.position.x;
        const ddz = partner.body.position.y - e.body.position.y;
        const ta = Math.atan2(ddx, ddz);
        e.char.group.rotation.y = lerpAngle(
          e.char.group.rotation.y,
          ta,
          0.12,
        );
      }
      ctx.animateCharacter(e.char, 0, dt);

      if (e.chatDialogue && elapsed >= e.chatNextLineAt) {
        if (e.chatLineIdx < e.chatDialogue.length) {
          const line = e.chatDialogue[e.chatLineIdx];
          if (line.speaker === e.name) {
            ctx.showBubbleFor(e, line.text);
          }
          e.chatLineIdx++;
          e.chatNextLineAt = elapsed + CHAT_LINE_DURATION + 0.15;
        } else {
          e.state = "patrol";
          e.chatDialogue = null;
          e.chatPartnerId = null;
          e.chatCooldownUntil = now + 12;
        }
      }

      if (canSee) {
        e.state = "chase";
        e.spottedSpoken = false;
        e.chatDialogue = null;
        e.chatPartnerId = null;
        e.chatCooldownUntil = now + 12;
        ctx.clearBubble(e);
      }
      continue;
    }

    // ============================================================
    // STATE TRANSITIONS
    // ============================================================
    if (canSee) {
      if (e.state !== "chase") {
        e.state = "chase";
        e.spottedSpoken = false;
      }
      if (!e.spottedSpoken) {
        const line = pickSpottedLine(e.name);
        if (line) ctx.showBubbleFor(e, line);
        e.spottedSpoken = true;
      }
    } else if (e.state === "chase") {
      e.state = "patrol";
    }

    // ============================================================
    // STATE: CHASE
    // ============================================================
    if (e.state === "chase") {
      const dxRaw = ctx.playerBody.position.x - e.body.position.x;
      const dzRaw = ctx.playerBody.position.y - e.body.position.y;
      const dist = Math.hypot(dxRaw, dzRaw);
      const toPlayer = new THREE.Vector2(dxRaw, dzRaw).normalize();

      if (e.strafeUntil < now) {
        e.strafeDir = Math.random() < 0.5 ? 1 : -1;
        e.strafeUntil = now + 1.0 + Math.random() * 1.4;
      }
      const perp = new THREE.Vector2(
        -toPlayer.y,
        toPlayer.x,
      ).multiplyScalar(e.strafeDir);

      const repulsion = computeRepulsion(ctx, e);
      const desired = new THREE.Vector2(0, 0);
      let targetSpeed = 0;
      const IDEAL_FAR = 10;
      const IDEAL_NEAR = 6;

      if (dist > IDEAL_FAR) {
        desired.copy(toPlayer);
        desired.add(perp.clone().multiplyScalar(0.25));
        targetSpeed = ENEMY_CHASE_SPEED;
      } else if (dist < IDEAL_NEAR) {
        desired.copy(toPlayer).multiplyScalar(-1);
        desired.add(perp.clone().multiplyScalar(0.4));
        targetSpeed = ENEMY_BACK_SPEED;
      } else {
        desired.copy(perp);
        desired.add(toPlayer.clone().multiplyScalar(0.15));
        targetSpeed = ENEMY_BACK_SPEED * 0.85;
      }
      desired.add(repulsion.multiplyScalar(1.6));

      if (desired.lengthSq() > 0.0001) {
        desired.normalize();
        Matter.Body.setVelocity(e.body, {
          x: desired.x * targetSpeed * dt,
          y: desired.y * targetSpeed * dt,
        });
      } else {
        Matter.Body.setVelocity(e.body, { x: 0, y: 0 });
      }

      e.char.group.rotation.y = lerpAngle(
        e.char.group.rotation.y,
        Math.atan2(toPlayer.x, toPlayer.y),
        0.14,
      );
      ctx.animateCharacter(e.char, ENEMY_CHASE_SPEED, dt);

      if (dist < 13 && now - e.lastShotAt > 1.5) {
        e.lastShotAt = now;
        const jitter = (Math.random() - 0.5) * 0.13;
        const cs = Math.cos(jitter);
        const sn = Math.sin(jitter);
        const ad = new THREE.Vector2(
          toPlayer.x * cs - toPlayer.y * sn,
          toPlayer.x * sn + toPlayer.y * cs,
        );
        ctx.fireEnemyProjectile(e, ad);
      }
    } else {
      // ============================================================
      // STATE: PATROL
      // ============================================================
      const target = e.patrolPoints[e.patrolIdx];
      const dxRaw = target.x - e.body.position.x;
      const dzRaw = target.z - e.body.position.y;
      const dist = Math.hypot(dxRaw, dzRaw);

      if (dist < 1.2) {
        e.patrolIdx = (e.patrolIdx + 1) % e.patrolPoints.length;
      } else {
        const toTarget = new THREE.Vector2(dxRaw, dzRaw).normalize();
        const repulsion = computeRepulsion(ctx, e);
        const desired = toTarget.clone().add(repulsion.multiplyScalar(1.6));
        desired.normalize();
        Matter.Body.setVelocity(e.body, {
          x: desired.x * ENEMY_PATROL_SPEED * dt,
          y: desired.y * ENEMY_PATROL_SPEED * dt,
        });
        e.char.group.rotation.y = lerpAngle(
          e.char.group.rotation.y,
          Math.atan2(toTarget.x, toTarget.y),
          0.1,
        );
        ctx.animateCharacter(e.char, ENEMY_PATROL_SPEED, dt);
      }
    }

    // ============================================================
    // MAP BOUNDS
    // ============================================================
    const halfW = MAP_W / 2 - 3;
    const halfH = MAP_H / 2 - 3;
    if (e.body.position.x < -halfW) e.body.position.x = -halfW;
    if (e.body.position.x > halfW) e.body.position.x = halfW;
    if (e.body.position.y < -halfH) e.body.position.y = -halfH;
    if (e.body.position.y > halfH) e.body.position.y = halfH;

    // ============================================================
    // AUTO MONOLOGUE
    // ============================================================
    if (
      e.state === "patrol" &&
      !e.bubble &&
      now > e.monologueNextAt &&
      now > e.chatCooldownUntil
    ) {
      const line = pickMonologue(e.name);
      if (line) ctx.showBubbleFor(e, line);
      e.monologueNextAt = now + 8 + Math.random() * 10;
    }

    // ============================================================
    // CHAT INITIATION — two bots close to each other
    // ============================================================
    if (e.state === "patrol" && !e.bubble && now > e.chatCooldownUntil) {
      for (const other of ctx.enemies) {
        if (other === e || other.destroyed) continue;
        if (other.state !== "patrol") continue;
        if (other.bubble) continue;
        if (other.chatCooldownUntil > now) continue;
        const ddx = other.body.position.x - e.body.position.x;
        const ddz = other.body.position.y - e.body.position.y;
        const d = Math.hypot(ddx, ddz);
        if (d < CHAT_TRIGGER_DIST) {
          const dlg = pickDialogue(e.name, other.name);
          if (dlg) {
            e.state = "chat";
            e.chatPartnerId = other.id;
            e.chatDialogue = dlg;
            e.chatLineIdx = 0;
            e.chatNextLineAt = elapsed + 0.2;

            other.state = "chat";
            other.chatPartnerId = e.id;
            other.chatDialogue = dlg;
            other.chatLineIdx = 0;
            other.chatNextLineAt = elapsed + 0.2;

            other.char.group.rotation.y = Math.atan2(ddx, ddz);
            e.char.group.rotation.y = Math.atan2(-ddx, -ddz);

            other.chatCooldownUntil = now + 15;
            e.chatCooldownUntil = now + 15;
          }
          break;
        }
      }
    }
  }
}

// ============================================================
// Vision ring creation (called once per spawn)
// ============================================================
export function createVisionRing(
  scene: THREE.Scene,
  x: number,
  z: number,
  radius: number,
): THREE.Mesh {
  const geo = new THREE.RingGeometry(radius - 0.15, radius, 48);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.03, z);
  scene.add(ring);
  return ring;
}

export { VISION_RADIUS };
