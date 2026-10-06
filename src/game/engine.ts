import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Matter from "matter-js";
import { createHpBarTexture, prewarmCommonTextures } from "./textures";
import { SoundEngine } from "./sound";
import { prewarmBubbles } from "./bots_dialogues";
import {
  MODEL_SCALE,
  PLAYER_HP,
  PLAYER_SPEED,
  PLAYER_DAMAGE,
  ENEMY_HP,
  KILL_GOAL,
  VISION_RADIUS,
  MAP_W,
  MAP_H,
  PROJECTILE_SPEED,
  ENEMY_PROJECTILE_SPEED,
  PROJECTILE_TTL,
  ULT_PROJECTILE_SPEED,
  ULT_PROJECTILE_TTL,
  ULT_DAMAGE,
  AIM_LENGTH,
  CAM_VIEW_HEIGHT,
  CAM_DIST,
  CAM_LERP,
  RELOAD_TIME,
} from "./config";
import type {
  EngineState,
  EngineCallbacks,
  Enemy,
  Projectile,
  Character,
  Obstacle,
  Crate,
  Bush,
  Pickup,
  Spark,
  MuzzleFlash,
  DamageNumber,
  WorldSnapshot,
  EntitySnapshot,
  ProjectileSnapshot,
  AIContext,
  MapType,
  Pet,
} from "./types";
import {
  buildCharacter,
  animateCharacter,
  setCharacterOpacity,
  buildPet,
} from "./characters";
import {
  setupLights,
  setupGround,
  setupWalls,
  setupObstacles,
  setupCrates,
  setupBushes,
  setupAimOverlay,
  setupStreetLamps,
} from "./world";
import {
  spawnMuzzleFlash,
  updateMuzzleFlashes,
  spawnSparks,
  updateSparks,
  spawnDamageNumber,
  updateDamageNumbers,
  spawnPickup,
  updatePickupsVisuals,
  removePickup,
} from "./effects";
import {
  updateEnemies,
  createVisionRing,
  showBubbleFor,
  clearBubble,
} from "./ai";
import { updatePet, damagePet, respawnPet } from "./pet";

const POOL_SIZE_NORMAL = 40;
const POOL_SIZE_ULT = 6;

type BotDef = {
  name: string;
  color: number;
  x: number;
  z: number;
  patrol: { x: number; z: number }[];
};

const ENEMY_DEFS: BotDef[] = [
  {
    name: "Якарь",
    color: 0xff9933,
    x: 0,
    z: 35,
    patrol: [
      { x: -15, z: 30 },
      { x: -15, z: 45 },
      { x: 10, z: 45 },
      { x: 10, z: 28 },
    ],
  },
  {
    name: "Веин",
    color: 0x4d7a3a,
    x: -18,
    z: 0,
    patrol: [
      { x: -20, z: -15 },
      { x: -20, z: 15 },
      { x: -10, z: 15 },
      { x: -10, z: -15 },
    ],
  },
  {
    name: "Философ",
    color: 0x8a4dbb,
    x: 18,
    z: 0,
    patrol: [
      { x: 20, z: -15 },
      { x: 20, z: 15 },
      { x: 10, z: 15 },
      { x: 10, z: -15 },
    ],
  },
  {
    name: "Патриций",
    color: 0xe8c84a,
    x: 0,
    z: -35,
    patrol: [
      { x: -15, z: -30 },
      { x: -15, z: -45 },
      { x: 15, z: -45 },
      { x: 15, z: -28 },
    ],
  },
];

const SAFE_SPAWN_POINTS: { x: number; z: number }[] = [
  { x: -22, z: 38 },
  { x: 22, z: 38 },
  { x: -22, z: 18 },
  { x: 22, z: 22 },
  { x: -22, z: 0 },
  { x: 22, z: 0 },
  { x: -22, z: -28 },
  { x: 22, z: -28 },
  { x: 0, z: 45 },
  { x: 0, z: -45 },
  { x: -18, z: -10 },
  { x: 18, z: -2 },
];

export class Engine {
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock = new THREE.Clock();
  private rafId: number | null = null;
  private mapType: MapType;

  private engine: Matter.Engine;
  private world: Matter.World;
  private sound = new SoundEngine();

  private playerChar!: Character;
  private playerGLB: THREE.Group | null = null;
  private playerMixer: THREE.AnimationMixer | null = null;
  private playerActions: Record<string, THREE.AnimationAction> = {};
  private playerCurrentAction: string = "";
  private playerBody!: Matter.Body;
  private playerVel = new THREE.Vector2(0, 0);
  private playerFacing = 0;
  private playerHp = PLAYER_HP;
  private playerMaxHp = PLAYER_HP;
  private playerName = "Player";
  private playerHpBar!: THREE.Sprite;
  private inBush = false;

  private bullets = 3;
  private bulletMax = 3;
  private reloadTime = RELOAD_TIME;
  private reloadProgress: [number, number, number] = [1, 1, 1];

  private damageBoost = 1.0;
  private damageBoostUntil = 0;

  private moveInput = new THREE.Vector2(0, 0);
  private aimInput = new THREE.Vector2(0, 0);
  private aimActive = false;

  private aimMesh!: THREE.Mesh;

  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private crates: Crate[] = [];
  private bushes: Bush[] = [];
  private pickups: Pickup[] = [];
  private sparks: Spark[] = [];
  private muzzleFlashes: MuzzleFlash[] = [];
  private damageNumbers: DamageNumber[] = [];
  private pet: Pet | null = null;

  private poolNormalMesh: THREE.Mesh[] = [];
  private poolNormalFree: number[] = [];
  private poolUltMesh: THREE.Mesh[] = [];
  private poolUltFree: number[] = [];

  private keys: Record<string, boolean> = {};
  private mouseAimDir: THREE.Vector2 | null = null;
  private mouseAimActive = false;

  private callbacks: EngineCallbacks;
  private state: EngineState;

  private destroyed = false;
  private status: "playing" | "victory" | "defeat" = "playing";
  private kills = 0;
  private ultCharge = 0;
  private respawnTimers = new Set<ReturnType<typeof setTimeout>>();

  private localPlayerId = "p_local";
  private nextEntityId = 1;
  private nextProjectileId = 1;
  private simTick = 0;

  constructor(
    container: HTMLElement,
    playerName: string,
    mapType: MapType,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.playerName = playerName || "Player";
    this.mapType = mapType;
    this.callbacks = callbacks;

    this.state = this.makeStateSnapshot();

    // Prewarm all 2D textures before ANY rendering happens
    prewarmCommonTextures();
    prewarmBubbles();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = mapType === "day";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(mapType === "night" ? 0x0a1220 : 0x87a965);
    container.appendChild(this.renderer.domElement);

    const aspect = container.clientWidth / container.clientHeight;
    const halfH = CAM_VIEW_HEIGHT / 2;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(
      -halfW,
      halfW,
      halfH,
      -halfH,
      0.1,
      200,
    );

    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    this.world = this.engine.world;

    this.buildProjectilePool();

    setupLights(this.scene, mapType);
    setupGround(this.scene, mapType);
    setupWalls(this.scene, this.world, mapType);
    this.obstacles = setupObstacles(this.scene, this.world, mapType);
    this.crates = setupCrates(this.scene, this.world);
    this.bushes = setupBushes(this.scene, mapType);
    if (mapType === "night") {
      setupStreetLamps(this.scene);
    }
    this.aimMesh = setupAimOverlay(this.scene);
    this.setupPlayer();
    this.setupPet();
    this.spawnEnemies();

    this.updateCamera(true);
    this.bindEvents();

    this.aimMesh.visible = false;

    try {
      this.renderer.compile(this.scene, this.camera);
    } catch (e) {
      console.warn("Shader warm-up failed", e);
    }
  }

  private buildProjectilePool() {
    const normalGeo = new THREE.SphereGeometry(0.25, 10, 10);
    const ultGeo = new THREE.SphereGeometry(0.55, 14, 14);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffaa00,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    });
    const enemyMat = new THREE.MeshStandardMaterial({
      color: 0xff6655,
      emissive: 0xff3322,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    });
    const ultMat = new THREE.MeshStandardMaterial({
      color: 0xffff66,
      emissive: 0xffcc00,
      emissiveIntensity: 2.2,
      roughness: 0.4,
    });

    for (let i = 0; i < POOL_SIZE_NORMAL; i++) {
      const isPlayer = i < POOL_SIZE_NORMAL / 2;
      const mesh = new THREE.Mesh(normalGeo, isPlayer ? playerMat : enemyMat);
      mesh.visible = false;
      mesh.position.set(0, -100, 0);
      this.scene.add(mesh);
      this.poolNormalMesh.push(mesh);
      this.poolNormalFree.push(i);
    }
    for (let i = 0; i < POOL_SIZE_ULT; i++) {
      const mesh = new THREE.Mesh(ultGeo, ultMat);
      mesh.visible = false;
      mesh.position.set(0, -100, 0);
      this.scene.add(mesh);
      this.poolUltMesh.push(mesh);
      this.poolUltFree.push(i);
    }
  }

  private setupPlayer() {
    const char = buildCharacter(0x3aa3ff, "player");
    this.playerChar = char;
    this.scene.add(char.group);

    const hpBarTex = createHpBarTexture(
      this.playerHp,
      this.playerMaxHp,
      this.playerName,
    );
    const hpBar = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: hpBarTex,
        transparent: true,
        depthTest: false,
      }),
    );
    hpBar.scale.set(3.0, 1.1, 1);
    hpBar.position.y = 3.1;
    char.group.add(hpBar);
    this.playerHpBar = hpBar;

    this.loadPlayerGLB();

    const matterBody = Matter.Bodies.circle(0, 0, 0.55, {
      frictionAir: 0,
      inertia: Infinity,
    });
    Matter.World.add(this.world, matterBody);
    this.playerBody = matterBody;
  }

  private setupPet() {
    const pet = buildPet();
    this.pet = pet;
    this.scene.add(pet.group);

    const body = Matter.Bodies.circle(1.5, 1.5, 0.5, {
      frictionAir: 0,
      inertia: Infinity,
    });
    Matter.World.add(this.world, body);
    pet.body = body;
    pet.group.position.set(1.5, 0, 1.5);
    Matter.Body.setPosition(body, { x: 1.5, y: 1.5 });
  }

  private loadPlayerGLB() {
    const loader = new GLTFLoader();
    loader.load(
      "models/Soldier.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        model.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        model.rotation.y = Math.PI;
        this.playerGLB = model;
        this.playerChar.group.add(model);

        this.playerMixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
          this.playerActions[clip.name] = this.playerMixer.clipAction(clip);
        }

        const keep = new Set<THREE.Object3D>();
        keep.add(this.playerHpBar);
        keep.add(model);
        keep.add(this.playerChar.shadow);
        for (const child of [...this.playerChar.group.children]) {
          if (!keep.has(child)) child.visible = false;
        }
        this.playerChar.shadow.visible = true;

        try {
          this.renderer.compile(this.scene, this.camera);
        } catch (e) {
          /* ignore */
        }
      },
      undefined,
      (err) => {
        console.error("GLB load error", err);
      },
    );
  }

  private updatePlayerAnimation(speed: number, dt: number) {
    if (!this.playerMixer) return;
    this.playerMixer.update(dt);
    let target = "Idle";
    if (speed > 12) target = "Run";
    else if (speed > 1) target = "Walk";
    if (target !== this.playerCurrentAction) {
      const prev = this.playerActions[this.playerCurrentAction];
      const next = this.playerActions[target];
      if (next) {
        next.reset();
        next.fadeIn(0.2);
        next.play();
        if (prev) prev.fadeOut(0.2);
        this.playerCurrentAction = target;
      }
    }
  }

  private spawnEnemies() {
    ENEMY_DEFS.forEach((d) =>
      this.spawnEnemy(d.x, d.z, d.color, d.name, d.patrol),
    );
  }

  private spawnEnemy(
    x: number,
    z: number,
    color: number,
    name: string,
    patrol: { x: number; z: number }[],
  ) {
    let style = "vein";
    if (name === "Якарь") style = "yakkar";
    else if (name === "Веин") style = "vein";
    else if (name === "Философ") style = "philosoph";
    else if (name === "Патриций") style = "patriciy";

    const char = buildCharacter(color, style);
    char.group.position.set(x, 0, z);
    this.scene.add(char.group);

    const maxHp = ENEMY_HP;
    const hp = maxHp;
    const hpBarTex = createHpBarTexture(hp, maxHp, name);
    const hpBar = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: hpBarTex,
        transparent: true,
        depthTest: false,
      }),
    );
    hpBar.scale.set(3.0, 1.1, 1);
    hpBar.position.y = 3.1;
    char.group.add(hpBar);

    const matterBody = Matter.Bodies.circle(x, z, 0.55, {
      frictionAir: 0,
      inertia: Infinity,
    });
    Matter.World.add(this.world, matterBody);

    const visionRing = createVisionRing(this.scene, x, z, VISION_RADIUS);

    this.enemies.push({
      id: `b_${this.nextEntityId++}`,
      char,
      body: matterBody,
      hpBar,
      hp,
      maxHp,
      name,
      color,
      spawnX: x,
      spawnZ: z,
      lastShotAt: performance.now() / 1000 + Math.random() * 2,
      destroyed: false,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      strafeUntil: 0,
      state: "patrol",
      stateUntil: 0,
      visionRadius: VISION_RADIUS,
      patrolPoints: patrol,
      patrolIdx: 0,
      visionRing,
      chatPartnerId: null,
      chatDialogue: null,
      chatLineIdx: 0,
      chatNextLineAt: 0,
      chatCooldownUntil: 0,
      bubble: null,
      bubbleUntil: 0,
      monologueNextAt: performance.now() / 1000 + 4 + Math.random() * 6,
      spottedSpoken: false,
      targetPet: false,
    });
  }

  private pickSafeSpawn(): { x: number; z: number } {
    const px = this.playerBody.position.x;
    const pz = this.playerBody.position.y;
    let best = SAFE_SPAWN_POINTS[0];
    let bestD = -Infinity;
    for (const p of SAFE_SPAWN_POINTS) {
      const d = (p.x - px) ** 2 + (p.z - pz) ** 2;
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private bindEvents() {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.addEventListener("mousedown", this.onMouseDown);
    this.renderer.domElement.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  private unbindEvents() {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.removeEventListener("mousedown", this.onMouseDown);
    this.renderer.domElement.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const halfH = CAM_VIEW_HEIGHT / 2;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === "Space" || e.code === "KeyQ") {
      this.useUlt();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".joystick-zone")) return;
    if ((e.target as HTMLElement).closest(".hud-button")) return;
    this.mouseAimActive = true;
    this.updateMouseAim(e);
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.mouseAimActive) return;
    this.updateMouseAim(e);
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (this.mouseAimActive && this.mouseAimDir) {
      this.fireProjectile(this.mouseAimDir);
    }
    this.mouseAimActive = false;
    this.mouseAimDir = null;
  };

  private updateMouseAim(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector3(ndcX, ndcY, 0.5);
    ndc.unproject(this.camera);
    const groundPoint = this.rayToGround(ndc);
    if (!groundPoint) return;
    const px = this.playerBody.position.x;
    const pz = this.playerBody.position.y;
    const dir = new THREE.Vector2(groundPoint.x - px, groundPoint.z - pz);
    if (dir.length() < 0.1) return;
    dir.normalize();
    this.mouseAimDir = dir;
  }

  private rayToGround(worldPoint: THREE.Vector3): THREE.Vector3 | null {
    const camPos = this.camera.position.clone();
    const dir = worldPoint.clone().sub(camPos).normalize();
    if (Math.abs(dir.y) < 1e-6) return null;
    const t = -camPos.y / dir.y;
    if (t < 0) return null;
    return camPos.clone().addScaledVector(dir, t);
  }

  setMoveInput(x: number, y: number) {
    if (this.status !== "playing") return;
    this.moveInput.set(x, y);
  }

  setAimInput(x: number, y: number, active: boolean) {
    if (this.status !== "playing") return;
    this.aimInput.set(x, y);
    this.aimActive = active;
  }

  releaseAim() {
    if (this.status !== "playing") return;
    if (this.aimInput.lengthSq() > 0.04) {
      const dir = this.cameraRelativeDir(this.aimInput);
      this.fireProjectile(dir);
    }
    this.aimActive = false;
    this.aimInput.set(0, 0);
  }

  private cameraRelativeDir(input: THREE.Vector2): THREE.Vector2 {
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), fwd)
      .multiplyScalar(-1)
      .normalize();
    const dir3 = new THREE.Vector3()
      .addScaledVector(fwd, input.y)
      .addScaledVector(right, input.x);
    return new THREE.Vector2(dir3.x, dir3.z).normalize();
  }

  private fireProjectile(dir: THREE.Vector2) {
    if (this.bullets <= 0) return;
    if (this.status !== "playing") return;
    this.sound.resume();
    this.bullets -= 1;

    const px = this.playerBody.position.x + dir.x * 0.7;
    const pz = this.playerBody.position.y + dir.y * 0.7;

    this.spawnProjectile({
      px,
      pz,
      vx: dir.x * PROJECTILE_SPEED,
      vz: dir.y * PROJECTILE_SPEED,
      fromPlayer: true,
      damage: Math.round(PLAYER_DAMAGE * this.damageBoost),
      ult: false,
      ownerId: this.localPlayerId,
      ownerName: this.playerName,
    });
    spawnMuzzleFlash(
      this.scene,
      this.muzzleFlashes,
      px,
      pz,
      0xfff1a8,
      this.clock.getElapsedTime(),
    );
    this.sound.playShot();
  }

  useUlt() {
    if (this.status !== "playing") return;
    if (this.ultCharge < 1) return;
    this.sound.resume();
    let dir: THREE.Vector2 | null = null;
    if (this.aimActive && this.aimInput.lengthSq() > 0.04) {
      dir = this.cameraRelativeDir(this.aimInput);
    } else if (this.mouseAimActive && this.mouseAimDir) {
      dir = this.mouseAimDir;
    } else {
      dir = new THREE.Vector2(
        Math.sin(this.playerFacing),
        Math.cos(this.playerFacing),
      );
    }
    if (!dir || dir.lengthSq() < 0.001) return;
    dir.normalize();
    this.ultCharge = 0;

    const px = this.playerBody.position.x + dir.x * 0.9;
    const pz = this.playerBody.position.y + dir.y * 0.9;

    this.spawnProjectile({
      px,
      pz,
      vx: dir.x * ULT_PROJECTILE_SPEED,
      vz: dir.y * ULT_PROJECTILE_SPEED,
      fromPlayer: true,
      damage: ULT_DAMAGE,
      ult: true,
      ownerId: this.localPlayerId,
      ownerName: this.playerName,
    });
    spawnMuzzleFlash(
      this.scene,
      this.muzzleFlashes,
      px,
      pz,
      0xfff04a,
      this.clock.getElapsedTime(),
    );
    spawnMuzzleFlash(
      this.scene,
      this.muzzleFlashes,
      px,
      pz,
      0xffe066,
      this.clock.getElapsedTime(),
    );
    this.sound.playUlt();
  }

  private fireEnemyProjectile(enemy: Enemy, dir: THREE.Vector2) {
    const px = enemy.body.position.x + dir.x * 0.7;
    const pz = enemy.body.position.y + dir.y * 0.7;

    this.spawnProjectile({
      px,
      pz,
      vx: dir.x * ENEMY_PROJECTILE_SPEED,
      vz: dir.y * ENEMY_PROJECTILE_SPEED,
      fromPlayer: false,
      damage: 80,
      ult: false,
      ownerId: enemy.id,
      ownerName: enemy.name,
    });
    spawnMuzzleFlash(
      this.scene,
      this.muzzleFlashes,
      px,
      pz,
      0xffaa88,
      this.clock.getElapsedTime(),
    );
    this.sound.playShot(0.5);
  }

  private spawnProjectile(opts: {
    px: number;
    pz: number;
    vx: number;
    vz: number;
    fromPlayer: boolean;
    damage: number;
    ult: boolean;
    ownerId: string;
    ownerName: string;
  }) {
    const usePool = opts.ult ? this.poolUltFree : this.poolNormalFree;
    if (usePool.length === 0) return;

    let poolIdx: number;
    if (opts.ult) {
      poolIdx = usePool.shift()!;
    } else {
      const isPlayerHalf = (i: number) => i < POOL_SIZE_NORMAL / 2;
      const idxInFree = usePool.findIndex((i) =>
        opts.fromPlayer ? isPlayerHalf(i) : !isPlayerHalf(i),
      );
      if (idxInFree < 0) return;
      poolIdx = usePool.splice(idxInFree, 1)[0];
    }

    const mesh = opts.ult
      ? this.poolUltMesh[poolIdx]
      : this.poolNormalMesh[poolIdx];
    mesh.visible = true;
    mesh.position.set(opts.px, 1.0, opts.pz);

    const r = opts.ult ? 0.55 : 0.25;
    const body = Matter.Bodies.circle(opts.px, opts.pz, r, {
      frictionAir: 0,
      isSensor: true,
    });
    Matter.World.add(this.world, body);

    this.projectiles.push({
      id: `pr_${this.nextProjectileId++}`,
      ownerId: opts.ownerId,
      ownerName: opts.ownerName,
      mesh,
      body,
      spawnedAt: this.clock.getElapsedTime(),
      ttl: opts.ult ? ULT_PROJECTILE_TTL : PROJECTILE_TTL,
      fromPlayer: opts.fromPlayer,
      damage: opts.damage,
      vx: opts.vx,
      vz: opts.vz,
      ult: opts.ult,
      pierced: new Set<Enemy>(),
    });
  }

  private removeProjectile(i: number) {
    const p = this.projectiles[i];
    Matter.World.remove(this.world, p.body);

    if (p.ult) {
      const idx = this.poolUltMesh.indexOf(p.mesh);
      if (idx >= 0) {
        p.mesh.visible = false;
        p.mesh.position.set(0, -100, 0);
        this.poolUltFree.push(idx);
      }
    } else {
      const idx = this.poolNormalMesh.indexOf(p.mesh);
      if (idx >= 0) {
        p.mesh.visible = false;
        p.mesh.position.set(0, -100, 0);
        this.poolNormalFree.push(idx);
      }
    }

    this.projectiles.splice(i, 1);
  }
  
  private updatePlayer(dt: number) {
    const keyInput = new THREE.Vector2(0, 0);
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) keyInput.y += 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) keyInput.y -= 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) keyInput.x -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) keyInput.x += 1;
    if (keyInput.lengthSq() > 0) keyInput.normalize();

    const input =
      this.moveInput.lengthSq() > keyInput.lengthSq()
        ? this.moveInput
        : keyInput;

    const worldDir =
      input.lengthSq() > 0
        ? this.cameraRelativeDir(input)
        : new THREE.Vector2(0, 0);
    const targetVel = worldDir
      .clone()
      .multiplyScalar(PLAYER_SPEED * Math.min(1, input.length()));

    if (input.lengthSq() > 0) {
      this.playerVel.lerp(targetVel, 0.2);
    } else {
      this.playerVel.multiplyScalar(1 - 0.15);
      if (this.playerVel.lengthSq() < 0.0005) this.playerVel.set(0, 0);
    }

    Matter.Body.setVelocity(this.playerBody, {
      x: this.playerVel.x * dt,
      y: this.playerVel.y * dt,
    });

    if (this.playerVel.lengthSq() > 0.05) {
      const targetAngle = Math.atan2(this.playerVel.x, this.playerVel.y);
      this.playerFacing = lerpAngle(this.playerFacing, targetAngle, 0.1);
    }
    this.playerChar.group.position.set(
      this.playerBody.position.x,
      0,
      this.playerBody.position.y,
    );
    this.playerChar.group.rotation.y = this.playerFacing;

    if (this.playerGLB) {
      this.updatePlayerAnimation(this.playerVel.length(), dt);
    } else {
      animateCharacter(this.playerChar, this.playerVel.length(), dt);
    }

    const wasInBush = this.inBush;
    this.inBush = this.isInBush(
      this.playerBody.position.x,
      this.playerBody.position.y,
    );
    if (this.inBush !== wasInBush) {
      setCharacterOpacity(this.playerChar, this.inBush ? 0.4 : 1.0);
      this.playerHpBar.material.opacity = this.inBush ? 0.6 : 1.0;
    }
  }

  private isInBush(x: number, z: number): boolean {
    for (const b of this.bushes) {
      const dx = x - b.cx;
      const dz = z - b.cz;
      if (dx * dx + dz * dz < b.radius * b.radius) return true;
    }
    return false;
  }

  private updateAimOverlay() {
    let dir: THREE.Vector2 | null = null;
    if (this.aimActive && this.aimInput.lengthSq() > 0.04) {
      dir = this.cameraRelativeDir(this.aimInput);
    } else if (this.mouseAimActive && this.mouseAimDir) {
      dir = this.mouseAimDir;
    }
    if (dir && this.bullets > 0 && this.status === "playing") {
      const angle = Math.atan2(dir.x, dir.y);
      this.aimMesh.visible = true;
      const cx = this.playerBody.position.x + (dir.x * AIM_LENGTH) / 2;
      const cz = this.playerBody.position.y + (dir.y * AIM_LENGTH) / 2;
      this.aimMesh.position.set(cx, 0.02, cz);
      this.aimMesh.rotation.set(Math.PI / 2, 0, -angle);
    } else {
      this.aimMesh.visible = false;
    }
  }

  private updateProjectiles(dt: number) {
    const elapsed = this.clock.getElapsedTime();
    const now = elapsed;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      const dx = p.vx * dt;
      const dz = p.vz * dt;
      const dist = Math.hypot(dx, dz);
      const stepLen = 0.25;
      const steps = Math.max(1, Math.ceil(dist / stepLen));
      const sx = dx / steps;
      const sz = dz / steps;

      let hit = false;
      let hitWorld = true;

      for (let s = 0; s < steps; s++) {
        const nx = p.body.position.x + sx;
        const nz = p.body.position.y + sz;
        Matter.Body.setPosition(p.body, { x: nx, y: nz });

        if (Math.abs(nx) > MAP_W / 2 || Math.abs(nz) > MAP_H / 2) {
          hit = true;
          break;
        }

        let stop = false;
        for (const o of this.obstacles) {
          if (
            Math.abs(nx - o.cx) < o.halfX + 0.18 &&
            Math.abs(nz - o.cz) < o.halfZ + 0.18
          ) {
            hit = true;
            stop = true;
            break;
          }
        }
        if (stop) break;

        for (const c of this.crates) {
          if (c.destroyed) continue;
          if (
            Math.abs(nx - c.cx) < c.halfX + 0.18 &&
            Math.abs(nz - c.cz) < c.halfZ + 0.18
          ) {
            const before = c.hp;
            c.hp = Math.max(0, c.hp - p.damage);
            const dealt = before - c.hp;
            spawnDamageNumber(
              this.scene,
              this.damageNumbers,
              c.cx,
              1.6,
              c.cz,
              dealt,
              "#ffd966",
              now,
            );
            if (c.hp <= 0) this.destroyCrate(c);
            hit = true;
            stop = true;
            break;
          }
        }
        if (stop) break;

        if (p.fromPlayer) {
          for (const e of this.enemies) {
            if (e.destroyed) continue;
            if (p.pierced.has(e)) continue;
            const ex = nx - e.body.position.x;
            const ez = nz - e.body.position.y;
            const hitR = p.ult ? 0.95 : 0.65;
            if (ex * ex + ez * ez < hitR * hitR) {
              const before = e.hp;
              e.hp = Math.max(0, e.hp - p.damage);
              const dealt = before - e.hp;
              this.refreshEnemyHpBar(e);
              spawnDamageNumber(
                this.scene,
                this.damageNumbers,
                e.body.position.x,
                2.6,
                e.body.position.y,
                dealt,
                p.ult ? "#fff066" : "#ff8866",
                now,
              );
              this.ultCharge = Math.min(1, this.ultCharge + 0.18);
              if (e.hp <= 0) this.killEnemy(e, p.ownerName);
              if (p.ult) {
                p.pierced.add(e);
              } else {
                hit = true;
                hitWorld = false;
                stop = true;
              }
              break;
            }
          }
        } else {
          let hitAnything = false;

          const dxp = nx - this.playerBody.position.x;
          const dzp = nz - this.playerBody.position.y;
          if (dxp * dxp + dzp * dzp < 0.65 * 0.65 && !this.destroyed) {
            this.playerHp = Math.max(0, this.playerHp - p.damage);
            this.refreshPlayerHpBar();
            if (this.playerHp <= 0) this.handlePlayerDeath(p.ownerName);
            hit = true;
            hitWorld = false;
            hitAnything = true;
          }

          if (!hitAnything && this.pet && this.pet.alive) {
            const dxpt = nx - this.pet.body.position.x;
            const dzpt = nz - this.pet.body.position.y;
            if (dxpt * dxpt + dzpt * dzpt < 0.65 * 0.65) {
              const ctxTmp = this.makeAIContext();
              damagePet(ctxTmp, p.ownerId, p.damage);
              spawnDamageNumber(
                this.scene,
                this.damageNumbers,
                this.pet.body.position.x,
                1.8,
                this.pet.body.position.y,
                p.damage,
                "#ff5a3a",
                now,
              );
              hit = true;
              hitWorld = false;
              hitAnything = true;
            }
          }

          if (hitAnything) stop = true;
        }
        if (stop) break;
      }

      p.mesh.position.set(p.body.position.x, 1.0, p.body.position.y);

      if (hit) {
        if (hitWorld) {
          spawnSparks(
            this.scene,
            this.sparks,
            p.body.position.x,
            1.0,
            p.body.position.y,
            p.fromPlayer ? 0xffd966 : 0xff8866,
            p.ult ? 14 : 7,
            now,
          );
        }
        this.removeProjectile(i);
      } else if (elapsed - p.spawnedAt > p.ttl) {
        this.removeProjectile(i);
      }
    }
  }

  private refreshEnemyHpBar(e: Enemy) {
    const tex = createHpBarTexture(e.hp, e.maxHp, e.name);
    const oldMap = e.hpBar.material.map;
    e.hpBar.material.map = tex;
    e.hpBar.material.needsUpdate = true;
    if (oldMap) oldMap.dispose();
  }

  private refreshPlayerHpBar() {
    const tex = createHpBarTexture(
      this.playerHp,
      this.playerMaxHp,
      this.playerName,
    );
    const oldMap = this.playerHpBar.material.map;
    this.playerHpBar.material.map = tex;
    this.playerHpBar.material.needsUpdate = true;
    if (oldMap) oldMap.dispose();
  }

  private destroyCrate(c: Crate) {
    c.destroyed = true;
    Matter.World.remove(this.world, c.body);
    this.scene.remove(c.mesh);
    spawnSparks(
      this.scene,
      this.sparks,
      c.cx,
      1.0,
      c.cz,
      0xc88a3a,
      12,
      this.clock.getElapsedTime(),
    );
    this.sound.playCrate();
    const kind: "heal" | "damage" = Math.random() < 0.5 ? "heal" : "damage";
    spawnPickup(
      this.scene,
      this.pickups,
      c.cx,
      c.cz,
      kind,
      this.clock.getElapsedTime(),
    );
  }

  private killEnemy(e: Enemy, killerName: string) {
    e.destroyed = true;
    Matter.World.remove(this.world, e.body);
    this.scene.remove(e.char.group);
    e.visionRing.visible = false;
    clearBubble(e);
    this.kills += 1;
    spawnSparks(
      this.scene,
      this.sparks,
      e.body.position.x,
      1.5,
      e.body.position.y,
      e.color,
      16,
      this.clock.getElapsedTime(),
    );
    this.emitKill(killerName, e.name);

    if (this.kills >= KILL_GOAL) {
      this.status = "victory";
      this.destroyed = true;
      return;
    }

    const timer = setTimeout(() => {
      this.respawnTimers.delete(timer);
      if (this.status !== "playing") return;
      const spot = this.pickSafeSpawn();
      const def = ENEMY_DEFS.find((d) => d.name === e.name);
      const patrol =
        def && def.patrol.length > 0
          ? def.patrol
          : [
              { x: spot.x - 5, z: spot.z - 5 },
              { x: spot.x + 5, z: spot.z - 5 },
              { x: spot.x + 5, z: spot.z + 5 },
              { x: spot.x - 5, z: spot.z + 5 },
            ];
      this.spawnEnemy(spot.x, spot.z, e.color, e.name, patrol);
      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }, 2200);
    this.respawnTimers.add(timer);
  }

  private emitKill(killer: string, victim: string) {
    this.callbacks.onKill?.({
      id: `k_${performance.now().toFixed(0)}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      killer,
      victim,
    });
  }

  private clearRespawnTimers() {
    for (const t of this.respawnTimers) clearTimeout(t);
    this.respawnTimers.clear();
  }

  private disposeObject3D(obj: THREE.Object3D) {
    obj.traverse((node) => {
      const m = node as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
        else mat?.dispose?.();
      }
      const s = node as THREE.Sprite;
      if (s.isSprite && s.material) {
        s.material.map?.dispose();
        s.material.dispose();
      }
    });
  }

  private handlePlayerDeath(killerName: string) {
    this.destroyed = true;
    this.status = "defeat";
    this.emitKill(killerName, this.playerName);
  }

  restart() {
    this.clearRespawnTimers();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }
    for (const s of this.sparks) {
      this.scene.remove(s.mesh);
      (s.mesh.geometry as THREE.BufferGeometry).dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.sparks = [];
    for (const f of this.muzzleFlashes) {
      this.scene.remove(f.glow);
      (f.glow.geometry as THREE.BufferGeometry).dispose();
      (f.glow.material as THREE.Material).dispose();
    }
    this.muzzleFlashes = [];
    for (const d of this.damageNumbers) {
      this.scene.remove(d.sprite);
      d.sprite.material.dispose();
    }
    this.damageNumbers = [];
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      removePickup(this.scene, this.pickups, i);
    }
    for (const e of this.enemies) {
      if (!e.destroyed) Matter.World.remove(this.world, e.body);
      this.scene.remove(e.char.group);
      this.scene.remove(e.visionRing);
      this.disposeObject3D(e.char.group);
    }
    this.enemies = [];
    for (const c of this.crates) {
      if (!c.destroyed) Matter.World.remove(this.world, c.body);
      this.scene.remove(c.mesh);
      this.disposeObject3D(c.mesh);
    }
    this.crates = setupCrates(this.scene, this.world);

    this.playerHp = this.playerMaxHp;
    this.refreshPlayerHpBar();
    Matter.Body.setPosition(this.playerBody, { x: 0, y: 0 });
    this.playerVel.set(0, 0);
    this.playerFacing = 0;
    this.playerChar.group.position.set(0, 0, 0);
    this.playerChar.group.rotation.y = 0;
    setCharacterOpacity(this.playerChar, 1.0);
    this.playerHpBar.material.opacity = 1.0;
    this.inBush = false;
    this.bullets = this.bulletMax;
    this.reloadProgress = [1, 1, 1];
    this.damageBoost = 1.0;
    this.damageBoostUntil = 0;
    this.ultCharge = 0;
    this.kills = 0;
    this.destroyed = false;
    this.status = "playing";
    this.moveInput.set(0, 0);
    this.aimInput.set(0, 0);
    this.aimActive = false;
    this.mouseAimActive = false;
    this.mouseAimDir = null;

    if (this.pet) {
      respawnPet(this.pet, 1.5, 1.5);
    }

    this.spawnEnemies();
  }

  private updateReload(dt: number) {
    if (this.bullets >= this.bulletMax) {
      this.reloadProgress = [1, 1, 1];
      return;
    }
    for (let i = 0; i < this.bulletMax; i++) {
      if (i < this.bullets) {
        this.reloadProgress[i] = 1;
      } else if (i === this.bullets) {
        this.reloadProgress[i] = Math.min(
          1,
          this.reloadProgress[i] + dt / this.reloadTime,
        );
        if (this.reloadProgress[i] >= 1) {
          this.bullets += 1;
          this.reloadProgress[i] = 1;
        }
      } else {
        this.reloadProgress[i] = 0;
      }
    }
  }

  private updatePickups(dt: number) {
    const now = this.clock.getElapsedTime();
    const px = this.playerBody.position.x;
    const pz = this.playerBody.position.y;
    updatePickupsVisuals(this.pickups, dt, now);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dx = px - p.cx;
      const dz = pz - p.cz;
      if (dx * dx + dz * dz < 1.0 * 1.0 && !this.destroyed) {
        if (p.kind === "heal") {
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 350);
          this.refreshPlayerHpBar();
        } else {
          this.damageBoost = 1.6;
          this.damageBoostUntil = now + 8;
        }
        this.sound.playPickup();
        removePickup(this.scene, this.pickups, i);
        continue;
      }
      if (now - p.spawnedAt > p.ttl) {
        removePickup(this.scene, this.pickups, i);
      }
    }
    if (this.damageBoost > 1.0 && now > this.damageBoostUntil) {
      this.damageBoost = 1.0;
    }
  }

  private updateCamera(snap = false) {
    const target = new THREE.Vector3(
      this.playerBody.position.x,
      0,
      this.playerBody.position.y,
    );
    const camOffset = new THREE.Vector3(
      -Math.cos(Math.PI / 3) * Math.cos(Math.PI / 4) * CAM_DIST,
      Math.sin(Math.PI / 3) * CAM_DIST,
      -Math.cos(Math.PI / 3) * Math.sin(Math.PI / 4) * CAM_DIST,
    );
    const desired = target.clone().add(camOffset);
    if (snap) {
      this.camera.position.copy(desired);
    } else {
      this.camera.position.lerp(desired, CAM_LERP);
    }
    this.camera.lookAt(target);
  }

  private makeAIContext(): AIContext {
    return {
      scene: this.scene,
      world: this.world,
      clock: this.clock,
      enemies: this.enemies,
      obstacles: this.obstacles,
      crates: this.crates,
      bushes: this.bushes,
      playerBody: this.playerBody,
      inBush: this.inBush,
      destroyed: this.destroyed,
      sound: this.sound,
      pet: this.pet,
      damageNumbers: this.damageNumbers,
      sparks: this.sparks,
      fireEnemyProjectile: (e, d) => this.fireEnemyProjectile(e, d),
      animateCharacter: (c, s, dt) => animateCharacter(c, s, dt),
      showBubbleFor: (e, text) =>
        showBubbleFor(e, text, this.clock.getElapsedTime()),
      clearBubble: (e) => clearBubble(e),
    };
  }

  private makeStateSnapshot(): EngineState {
    const now = this.clock.getElapsedTime();
    return {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
      reload: [...this.reloadProgress] as [number, number, number],
      ammoMax: this.bulletMax,
      bullets: this.bullets,
      destroyed: this.destroyed,
      inBush: this.inBush,
      damageBoostMs:
        this.damageBoost > 1.0
          ? Math.max(0, Math.round((this.damageBoostUntil - now) * 1000))
          : 0,
      ultCharge: this.ultCharge,
      ultReady: this.ultCharge >= 1,
      kills: this.kills,
      killGoal: KILL_GOAL,
      status: this.status,
    };
  }

  private emitState() {
    const next = this.makeStateSnapshot();
    this.state = next;
    this.callbacks.onStateChange?.(next);
  }

  start() {
    if (this.rafId !== null) return;
    this.clock.start();
    const loop = () => {
      const dt = Math.min(0.05, this.clock.getDelta());
      this.simTick++;
      Matter.Engine.update(this.engine, Math.min(16.667, dt * 1000));
      if (this.status === "playing" && !this.destroyed) {
        this.updatePlayer(dt);
      }
      const ctx = this.makeAIContext();
      updateEnemies(ctx, dt, lerpAngle);
      updatePet(ctx, dt, lerpAngle);

      for (const e of this.enemies) {
        const eAny = e as Enemy & { _petBiteDamage?: number };
        if (eAny._petBiteDamage !== undefined) {
          this.refreshEnemyHpBar(e);
          if (e.hp <= 0) {
            this.killEnemy(e, "Волк");
          }
          delete eAny._petBiteDamage;
        }
      }

      this.updateProjectiles(dt);
      this.updateAimOverlay();
      this.updateReload(dt);
      this.updatePickups(dt);
      const now = this.clock.getElapsedTime();
      updateMuzzleFlashes(this.scene, this.muzzleFlashes, now);
      updateSparks(this.scene, this.sparks, dt, now);
      updateDamageNumbers(this.scene, this.damageNumbers, now);
      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      this.emitState();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  getState(): EngineState {
    return this.state;
  }

  getSnapshot(): WorldSnapshot {
    const entities: EntitySnapshot[] = [];
    entities.push({
      id: this.localPlayerId,
      kind: "player",
      name: this.playerName,
      color: 0x3aa3ff,
      x: this.playerBody.position.x,
      z: this.playerBody.position.y,
      facing: this.playerFacing,
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
      isLocal: true,
      inBush: this.inBush,
      destroyed: this.destroyed,
    });
    if (this.pet && this.pet.alive) {
      entities.push({
        id: "p_pet",
        kind: "pet",
        name: "Волк",
        color: 0x6b6f76,
        x: this.pet.body.position.x,
        z: this.pet.body.position.y,
        facing: this.pet.group.rotation.y,
        hp: this.pet.hp,
        maxHp: this.pet.maxHp,
        isLocal: true,
        inBush: false,
        destroyed: false,
      });
    }
    for (const e of this.enemies) {
      entities.push({
        id: e.id,
        kind: "bot",
        name: e.name,
        color: e.color,
        x: e.body.position.x,
        z: e.body.position.y,
        facing: e.char.group.rotation.y,
        hp: e.hp,
        maxHp: e.maxHp,
        isLocal: false,
        inBush: false,
        destroyed: e.destroyed,
      });
    }
    const projectiles: ProjectileSnapshot[] = this.projectiles.map((p) => ({
      id: p.id,
      ownerId: p.ownerId,
      x: p.body.position.x,
      z: p.body.position.y,
      vx: p.vx,
      vz: p.vz,
      damage: p.damage,
      ult: p.ult,
      fromPlayer: p.fromPlayer,
    }));
    return { tick: this.simTick, entities, projectiles };
  }

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.clearRespawnTimers();
    this.unbindEvents();
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
        else mat?.dispose?.();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    this.sound.dispose();
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
