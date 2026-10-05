import * as THREE from "three";
import Matter from "matter-js";
import type { DialogueLine } from "./bots_dialogues";

export type MapType = "day" | "night";

export type GameStatus = "playing" | "victory" | "defeat";

export type EngineState = {
  hp: number;
  maxHp: number;
  reload: [number, number, number];
  ammoMax: number;
  bullets: number;
  destroyed: boolean;
  inBush: boolean;
  damageBoostMs: number;
  ultCharge: number;
  ultReady: boolean;
  kills: number;
  killGoal: number;
  status: GameStatus;
};

export type KillEvent = {
  id: string;
  killer: string;
  victim: string;
};

export type EngineCallbacks = {
  onStateChange?: (state: EngineState) => void;
  onKill?: (event: KillEvent) => void;
};

export type EntitySnapshot = {
  id: string;
  kind: "player" | "bot" | "pet";
  name: string;
  color: number;
  x: number;
  z: number;
  facing: number;
  hp: number;
  maxHp: number;
  isLocal: boolean;
  inBush: boolean;
  destroyed: boolean;
};

export type ProjectileSnapshot = {
  id: string;
  ownerId: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  ult: boolean;
  fromPlayer: boolean;
};

export type WorldSnapshot = {
  tick: number;
  entities: EntitySnapshot[];
  projectiles: ProjectileSnapshot[];
};

export type BotState = "patrol" | "idle" | "chat" | "chase";
export type PetState = "follow" | "attack" | "dead";

export type Character = {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  shadow: THREE.Mesh;
  walkPhase: number;
};

export type Pet = {
  group: THREE.Group;
  body: Matter.Body;
  hp: number;
  maxHp: number;
  hpBar: THREE.Sprite;
  state: PetState;
  targetEnemyId: string | null;
  lastAttackerId: string | null;
  lastBiteAt: number;
  walkPhase: number;
  tail: THREE.Object3D;
  head: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  legBL: THREE.Object3D;
  legBR: THREE.Object3D;
  shadow: THREE.Mesh;
  alive: boolean;
};

export type Projectile = {
  id: string;
  ownerId: string;
  ownerName: string;
  mesh: THREE.Mesh;
  body: Matter.Body;
  spawnedAt: number;
  ttl: number;
  fromPlayer: boolean;
  damage: number;
  vx: number;
  vz: number;
  ult: boolean;
  pierced: Set<Enemy>;
  light?: THREE.PointLight;
};

export type Enemy = {
  id: string;
  char: Character;
  body: Matter.Body;
  hpBar: THREE.Sprite;
  hp: number;
  maxHp: number;
  name: string;
  color: number;
  spawnX: number;
  spawnZ: number;
  lastShotAt: number;
  destroyed: boolean;
  strafeDir: number;
  strafeUntil: number;
  state: BotState;
  stateUntil: number;
  visionRadius: number;
  patrolPoints: { x: number; z: number }[];
  patrolIdx: number;
  visionRing: THREE.Mesh;
  chatPartnerId: string | null;
  chatDialogue: DialogueLine[] | null;
  chatLineIdx: number;
  chatNextLineAt: number;
  chatCooldownUntil: number;
  bubble: THREE.Sprite | null;
  bubbleUntil: number;
  monologueNextAt: number;
  spottedSpoken: boolean;
  // Pet aggro
  targetPet: boolean;
};

export type Obstacle = {
  mesh: THREE.Mesh;
  body: Matter.Body;
  cx: number;
  cz: number;
  halfX: number;
  halfZ: number;
};

export type Crate = {
  mesh: THREE.Object3D;
  body: Matter.Body;
  cx: number;
  cz: number;
  halfX: number;
  halfZ: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
};

export type Bush = {
  group: THREE.Group;
  cx: number;
  cz: number;
  radius: number;
};

export type Pickup = {
  mesh: THREE.Group;
  cx: number;
  cz: number;
  kind: "heal" | "damage";
  spawnedAt: number;
  ttl: number;
};

export type Spark = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  spawnedAt: number;
};

export type MuzzleFlash = {
  light: THREE.PointLight;
  glow: THREE.Mesh;
  spawnedAt: number;
  life: number;
};

export type DamageNumber = {
  sprite: THREE.Sprite;
  spawnedAt: number;
  life: number;
  startY: number;
};

export type AIContext = {
  scene: THREE.Scene;
  world: Matter.World;
  clock: THREE.Clock;
  enemies: Enemy[];
  obstacles: Obstacle[];
  crates: Crate[];
  bushes: Bush[];
  playerBody: Matter.Body;
  inBush: boolean;
  destroyed: boolean;
  sound: import("./sound").SoundEngine;
  pet: Pet | null;
  fireEnemyProjectile: (e: Enemy, dir: THREE.Vector2) => void;
  animateCharacter: (c: Character, speed: number, dt: number) => void;
  showBubbleFor: (e: Enemy, text: string) => void;
  clearBubble: (e: Enemy) => void;
};
