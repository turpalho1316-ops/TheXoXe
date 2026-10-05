import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Matter from "matter-js";
import {
  createGrassTexture,
  createHpBarTexture,
  createDamageNumberTexture,
} from "./textures";
import { SoundEngine } from "./sound";
import {
  createSpeechBubbleTexture,
  pickDialogue,
  pickMonologue,
  pickSpottedLine,
  type DialogueLine,
} from "./bots_dialogues";

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
  kind: "player" | "bot";
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

type BotState = "patrol" | "idle" | "chat" | "chase";

type Character = {
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

type Projectile = {
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

type Enemy = {
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
  // NPC-поля
  state: BotState;
  stateUntil: number;
  visionRadius: number;
  patrolPoints: { x: number; z: number }[];
  patrolIdx: number;
  visionRing: THREE.Mesh;
  // чат
  chatPartnerId: string | null;
  chatDialogue: DialogueLine[] | null;
  chatLineIdx: number;
  chatNextLineAt: number;
  chatCooldownUntil: number;
  // пузырь
  bubble: THREE.Sprite | null;
  bubbleUntil: number;
  // поведение
  monologueNextAt: number;
  spottedSpoken: boolean;
};

type Obstacle = {
  mesh: THREE.Mesh;
  body: Matter.Body;
  cx: number;
  cz: number;
  halfX: number;
  halfZ: number;
};

type Crate = {
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

type Bush = {
  group: THREE.Group;
  cx: number;
  cz: number;
  radius: number;
};

type Pickup = {
  mesh: THREE.Group;
  cx: number;
  cz: number;
  kind: "heal" | "damage";
  spawnedAt: number;
  ttl: number;
};

type Spark = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  spawnedAt: number;
};

type MuzzleFlash = {
  light: THREE.PointLight;
  glow: THREE.Mesh;
  spawnedAt: number;
  life: number;
};

type DamageNumber = {
  sprite: THREE.Sprite;
  spawnedAt: number;
  life: number;
  startY: number;
};

const MAP_W = 50;
const MAP_H = 100;

const PLAYER_SPEED = 28.0;
const PLAYER_ACCEL = 0.2;
const PLAYER_FRICTION = 0.15;
const ROT_ALPHA = 0.1;

const PROJECTILE_SPEED = 22 * 0.85;
const ENEMY_PROJECTILE_SPEED = 18 * 0.75;
const PROJECTILE_TTL = 1.4;
const ULT_PROJECTILE_SPEED = PROJECTILE_SPEED * 0.9;
const ULT_PROJECTILE_TTL = 1.6;
const AIM_LENGTH = 26;
const AIM_WIDTH = 2;

const ENEMY_CHASE_SPEED = 14 * 0.9;
const ENEMY_PATROL_SPEED = 8;
const ENEMY_BACK_SPEED = 10 * 0.9;

const VISION_RADIUS = 8;
const CHAT_TRIGGER_DIST = 3.2;
const CHAT_LINE_DURATION = 2.0;

const CRATE_HP = 1500;
const PLAYER_DAMAGE = 220;
const ENEMY_DAMAGE = 80;
const ULT_DAMAGE = 800;
const ULT_CHARGE_PER_HIT = 0.18;

const KILL_GOAL = 3;

const PITCH = Math.PI / 3;
const YAW = Math.PI / 4;
const CAM_DIST = 35;
const CAM_VIEW_HEIGHT = 18;

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

const CRATE_DEFS: { x: number; z: number }[] = [
  { x: 5, z: -10 },
  { x: -10, z: 12 },
  { x: 8, z: 25 },
  { x: -5, z: -32 },
  { x: 11, z: 8 },
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
  private playerHp = 9000;
  private playerMaxHp = 9000;
  private playerName = "Player";
  private playerHpBar!: THREE.Sprite;
  private inBush = false;

  private bullets = 3;
  private bulletMax = 3;
  private reloadTime = 1.6;
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

  private keys: Record<string, boolean> = {};
  private mouseAimDir: THREE.Vector2 | null = null;
  private mouseAimActive = false;

  private callbacks: EngineCallbacks;
  private state: EngineState;

  private destroyed = false;
  private status: GameStatus = "playing";
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
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.playerName = playerName || "Player";
    this.callbacks = callbacks;

    this.state = this.makeStateSnapshot();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x87a965);
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

    this.setupLights();
    this.setupGround();
    this.setupWalls();
    this.setupObstacles();
    this.setupCrates();
    this.setupBushes();
    this.setupAimOverlay();
    this.setupPlayer();
    this.spawnEnemies();

    this.updateCamera(true);
    this.bindEvents();

    this.aimMesh.visible = false;
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

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
    this.scene.add(dir);

    const fill = new THREE.HemisphereLight(0xa8d8ff, 0x4a3a20, 0.35);
    this.scene.add(fill);
  }

  private setupGround() {
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
    this.scene.add(mesh);

    const borderGeo = new THREE.PlaneGeometry(MAP_W + 2, MAP_H + 2);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a25,
      roughness: 1,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.y = -0.05;
    border.receiveShadow = true;
    this.scene.add(border);
  }

  private setupWalls() {
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
    walls.forEach((w) => Matter.World.add(this.world, w));

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
      this.scene.add(m);
    });
  }

  private setupObstacles() {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6f7280,
      roughness: 0.9,
      metalness: 0.05,
    });

    const stones: { x: number; z: number; size: number }[] = [
      { x: -8, z: -25, size: 2.6 },
      { x: 9, z: -18, size: 2.4 },
      { x: 0, z: -5, size: 2.4 },
      { x: -16, z: 28, size: 2.8 },
      { x: 14, z: 30, size: 2.6 },
      { x: -7, z: 38, size: 2.4 },
      { x: 12, z: -2, size: 2.2 },
      { x: -12, z: -10, size: 2.4 },
    ];

    stones.forEach((o) => {
      const geo = new THREE.BoxGeometry(o.size, 1.6, o.size);
      const mesh = new THREE.Mesh(geo, stoneMat);
      mesh.position.set(o.x, 0.8, o.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const body = Matter.Bodies.rectangle(o.x, o.z, o.size, o.size, {
        isStatic: true,
      });
      Matter.World.add(this.world, body);
      this.obstacles.push({
        mesh,
        body,
        cx: o.x,
        cz: o.z,
        halfX: o.size / 2,
        halfZ: o.size / 2,
      });
    });
  }

  private setupCrates() {
    CRATE_DEFS.forEach((p) => this.spawnCrate(p.x, p.z));
  }

  private spawnCrate(x: number, z: number) {
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
    const base = new THREE.Mesh(new THREE.BoxGeometry(size, 1.4, size), baseMat);
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

    grp.position.set(x, 0.7, z);
    grp.rotation.y = (Math.random() - 0.5) * 0.4;
    this.scene.add(grp);

    const body = Matter.Bodies.rectangle(x, z, size, size, { isStatic: true });
    Matter.World.add(this.world, body);

    this.crates.push({
      mesh: grp,
      body,
      cx: x,
      cz: z,
      halfX: size / 2,
      halfZ: size / 2,
      hp: CRATE_HP,
      maxHp: CRATE_HP,
      destroyed: false,
    });
  }

  private setupBushes() {
    const defs: { x: number; z: number; r: number }[] = [
      { x: -14, z: 5, r: 2.6 },
      { x: 13, z: 12, r: 2.6 },
      { x: -3, z: 22, r: 2.8 },
      { x: 6, z: -38, r: 2.6 },
      { x: 10, z: -8, r: 2.4 },
      { x: -9, z: 35, r: 2.6 },
      { x: 0, z: 0, r: 2.2 },
    ];
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d6a2d,
      roughness: 1,
    });
    for (const d of defs) {
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
      this.scene.add(grp);
      this.bushes.push({ group: grp, cx: d.x, cz: d.z, radius: d.r });
    }
  }
  
private setupAimOverlay() {
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
  this.scene.add(mesh);
  this.aimMesh = mesh;
}

// === Универсальный конструктор персонажей ===
// style: 'player' | 'yakkar' | 'vein' | 'philosoph' | 'patriciy'
private buildCharacter(
  accentColor: number,
  style: string = "player",
): Character {
  const group = new THREE.Group();

  // Базовые материалы
  const matLimb = new THREE.MeshStandardMaterial({
    color: 0x1e2126,
    roughness: 0.7,
  });
  const matBoot = new THREE.MeshStandardMaterial({
    color: 0x0e1014,
    roughness: 0.55,
  });
  const matHead = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.6,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });

  // Параметры по стилю
  let bodyW = 1.0;
  let bodyH = 1.55;
  let bodyColor = 0x33373d;
  let headSize = 0.3;
  let eyeColor = 0x6cf0ff;
  let eyeSize = 0.06;
  let eyeCount = 2;
  let headgear: "cone" | "helmet" | "hood" | "cap" | "jester" = "hood";
  let hasCape = false;
  let hasBackpack = false;
  let hasStaff = false;

  if (style === "player") {
    // будет скрыт при загрузке GLB, но пусть выглядит нормально
    bodyW = 1.0;
    bodyH = 1.55;
    bodyColor = 0x33373d;
    eyeColor = 0x6cf0ff;
    headgear = "hood";
  } else if (style === "yakkar") {
    // Якарь — шут, приземистый
    bodyW = 1.2;
    bodyH = 1.35;
    bodyColor = 0x4a2b16;
    eyeColor = 0xffc857;
    eyeSize = 0.08;
    headgear = "jester";
  } else if (style === "vein") {
    // Веин — военный, подтянутый, широкоплечий
    bodyW = 1.15;
    bodyH = 1.55;
    bodyColor = 0x2a3d24;
    eyeColor = 0x88ff66;
    eyeSize = 0.05;
    headgear = "helmet";
  } else if (style === "philosoph") {
    // Философ — высокий и тонкий
    bodyW = 0.75;
    bodyH = 1.95;
    bodyColor = 0x2e1d42;
    eyeColor = 0xffffff;
    eyeSize = 0.08;
    eyeCount = 1;
    headgear = "hood";
    hasCape = true;
    hasStaff = true;
  } else if (style === "patriciy") {
    // Патриций — низкий, сутулый, испуганный
    bodyW = 0.9;
    bodyH = 1.35;
    bodyColor = 0x5a4a15;
    eyeColor = 0xfff18a;
    eyeSize = 0.13;
    headgear = "cap";
    hasBackpack = true;
  }

  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.55,
    metalness: 0.25,
  });

  // Торс
  const bodyGeo = new THREE.SphereGeometry(0.42, 16, 16);
  bodyGeo.scale(bodyW, bodyH, bodyW * 0.85);
  const torso = new THREE.Mesh(bodyGeo, matBody);
  torso.position.y = 1.1;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Пояс-акцент
  const beltGeo = new THREE.TorusGeometry(0.46 * bodyW, 0.07, 8, 20);
  const belt = new THREE.Mesh(beltGeo, matAccent);
  belt.position.y = 0.78;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  // Голова
  const headY = 2.02 + (bodyH - 1.55) * 0.4;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headSize, 16, 16),
    matHead,
  );
  head.position.y = headY;
  head.castShadow = true;
  group.add(head);

  // Головной убор — разный по стилю
  if (headgear === "cone") {
    const hoodGeo = new THREE.ConeGeometry(0.55, 0.95, 18, 1, true);
    const hood = new THREE.Mesh(hoodGeo, matBody);
    hood.position.y = headY + 0.16;
    hood.castShadow = true;
    group.add(hood);
  } else if (headgear === "hood") {
    const hoodGeo = new THREE.ConeGeometry(
      style === "philosoph" ? 0.5 : 0.55,
      style === "philosoph" ? 1.4 : 0.95,
      18,
      1,
      true,
    );
    const hood = new THREE.Mesh(hoodGeo, matBody);
    hood.position.y = headY + (style === "philosoph" ? 0.4 : 0.16);
    hood.castShadow = true;
    group.add(hood);
  } else if (headgear === "helmet") {
    const helmetGeo = new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const helmet = new THREE.Mesh(helmetGeo, matBody);
    helmet.position.y = headY + 0.1;
    helmet.castShadow = true;
    group.add(helmet);
    // козырёк
    const visorGeo = new THREE.BoxGeometry(0.55, 0.05, 0.4);
    const visor = new THREE.Mesh(visorGeo, matAccent);
    visor.position.set(0, headY + 0.18, 0.32);
    visor.rotation.x = -0.25;
    group.add(visor);
  } else if (headgear === "cap") {
    const capGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.28, 16);
    const cap = new THREE.Mesh(capGeo, matBody);
    cap.position.y = headY + 0.28;
    cap.castShadow = true;
    group.add(cap);
  } else if (headgear === "jester") {
    // Шутовской колпак — три конуса
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(0.16, 0.85, 10);
      const cone = new THREE.Mesh(coneGeo, matAccent);
      const ang = (i - 1) * 0.6;
      cone.position.set(
        Math.sin(ang) * 0.18,
        headY + 0.55,
        Math.cos(ang) * 0.08 - 0.1,
      );
      cone.rotation.z = Math.sin(ang) * 0.5;
      cone.rotation.x = -0.15;
      cone.castShadow = true;
      group.add(cone);
      // бубенчик
      const bellGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const bell = new THREE.Mesh(
        bellGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffd54a,
          emissive: 0xffd54a,
          emissiveIntensity: 0.9,
        }),
      );
      bell.position.set(
        Math.sin(ang) * 0.4,
        headY + 0.95,
        Math.cos(ang) * 0.1 - 0.1,
      );
      group.add(bell);
    }
  }

  // Глаза — разное количество и размер
  const eyeGeo = new THREE.SphereGeometry(eyeSize, 10, 10);
  const matEye = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 4.0,
  });
  matEye.userData.skipOpacity = true;
  if (eyeCount === 1) {
    const eye = new THREE.Mesh(eyeGeo, matEye);
    eye.position.set(0, headY + 0.02, 0.24);
    group.add(eye);
  } else {
    const eyeL = new THREE.Mesh(eyeGeo, matEye);
    eyeL.position.set(-0.11, headY + 0.02, 0.22);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, matEye);
    eyeR.position.set(0.11, headY + 0.02, 0.22);
    group.add(eyeR);
  }

  // Свет глаз
  const eyeLight = new THREE.PointLight(eyeColor, 0.6, 2.8);
  eyeLight.position.set(0, headY + 0.02, 0.34);
  group.add(eyeLight);

  // Пустота в капюшоне (для hood/cone)
  if (headgear === "hood" || headgear === "cone") {
    const matVoid = new THREE.MeshBasicMaterial({ color: 0x000000 });
    matVoid.userData.skipOpacity = true;
    const voidSphere = new THREE.Mesh(
      new THREE.SphereGeometry(headSize + 0.04, 12, 12),
      matVoid,
    );
    voidSphere.position.set(0, headY + 0.02, -0.04);
    group.add(voidSphere);
  }

  // Руки
  const armUpperGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.42, 8);
  const armLowerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.4, 8);
  const buildArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(armUpperGeo, matLimb);
    upper.position.y = -0.21;
    upper.castShadow = true;
    arm.add(upper);
    const lower = new THREE.Mesh(armLowerGeo, matLimb);
    lower.position.set(side * 0.06, -0.55, 0.1);
    lower.rotation.x = -0.35;
    lower.castShadow = true;
    arm.add(lower);
    return arm;
  };
  const armL = buildArm(1);
  armL.position.set(-0.5 * bodyW, 1.5, 0);
  armL.rotation.z = 0.18;
  group.add(armL);
  const armR = buildArm(-1);
  armR.position.set(0.5 * bodyW, 1.5, 0);
  armR.rotation.z = -0.18;
  group.add(armR);

  // Ноги
  const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.4, 8);
  const legL = new THREE.Mesh(legGeo, matLimb);
  legL.position.set(-0.18 * bodyW, 0.55, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, matLimb);
  legR.position.set(0.18 * bodyW, 0.55, 0);
  legR.castShadow = true;
  group.add(legR);

  // Ботинки
  const bootGeo = new THREE.BoxGeometry(0.36, 0.28, 0.5);
  const bootL = new THREE.Mesh(bootGeo, matBoot);
  bootL.position.set(-0.18 * bodyW, 0.16, 0.05);
  bootL.castShadow = true;
  bootL.receiveShadow = true;
  group.add(bootL);
  const bootR = new THREE.Mesh(bootGeo, matBoot);
  bootR.position.set(0.18 * bodyW, 0.16, 0.05);
  bootR.castShadow = true;
  bootR.receiveShadow = true;
  group.add(bootR);

  // Плащ (для Философа)
  if (hasCape) {
    const capeGeo = new THREE.ConeGeometry(0.75, 1.9, 14, 1, true);
    const cape = new THREE.Mesh(capeGeo, matBody);
    cape.position.set(0, 1.1, -0.2);
    cape.castShadow = true;
    group.add(cape);
  }

  // Рюкзак (для Патриция)
  if (hasBackpack) {
    const packGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const pack = new THREE.Mesh(packGeo, matAccent);
    pack.position.set(0, 1.25, -0.55);
    pack.castShadow = true;
    group.add(pack);
  }

  // Посох (для Философа)
  if (hasStaff) {
    const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
    const staff = new THREE.Mesh(staffGeo, matLimb);
    staff.position.set(0.62, 0.9, 0.15);
    staff.rotation.z = -0.15;
    staff.castShadow = true;
    group.add(staff);
    const orbGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const orb = new THREE.Mesh(
      orbGeo,
      new THREE.MeshStandardMaterial({
        color: 0xcc88ff,
        emissive: 0xcc88ff,
        emissiveIntensity: 2.5,
      }),
    );
    orb.position.set(0.72, 2.1, 0.15);
    group.add(orb);
    const orbLight = new THREE.PointLight(0xcc88ff, 0.8, 3.5);
    orbLight.position.set(0.72, 2.1, 0.15);
    group.add(orbLight);
  }

  // Тень
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.32,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return {
    group,
    body: torso,
    head,
    armL,
    armR,
    legL,
    legR,
    shadow,
    walkPhase: 0,
  };
}

private animateCharacter(c: Character, speed: number, dt: number) {
  const norm = Math.min(1, speed / 18);
  c.walkPhase += dt * (4 + norm * 12);
  const swing = Math.sin(c.walkPhase) * 0.55 * norm;
  c.legL.rotation.x = swing;
  c.legR.rotation.x = -swing;
  c.armL.rotation.x = -swing * 0.7;
  c.armR.rotation.x = swing * 0.7;
  const bob = Math.abs(Math.cos(c.walkPhase)) * 0.05 * norm;
  c.body.position.y = 1.1 + bob;
  c.head.position.y = 2.02 + bob;
}

private setCharacterOpacity(c: Character, opacity: number) {
  c.group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.Material & { opacity?: number };
    if (mat.userData?.skipOpacity) return;
    mat.transparent = opacity < 1.0;
    if (typeof mat.opacity === "number") mat.opacity = opacity;
  });
}

private setupPlayer() {
  const char = this.buildCharacter(0x3aa3ff, "player");
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
      model.scale.set(0.85, 0.85, 0.85);
      model.rotation.y = Math.PI;
      this.playerGLB = model;
      this.playerChar.group.add(model);

      this.playerMixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        this.playerActions[clip.name] = this.playerMixer.clipAction(clip);
      }

      // ПОЛНОЕ скрытие старой фигурки одним проходом
      const keep = new Set<THREE.Object3D>();
      keep.add(this.playerHpBar);
      keep.add(model);
      keep.add(this.playerChar.shadow);
      for (const child of [...this.playerChar.group.children]) {
        if (!keep.has(child)) child.visible = false;
      }
      // shadow тоже оставляем видимой
      this.playerChar.shadow.visible = true;
    },
    undefined,
    (err) => {
      console.error("GLB load error", err);
    }
  );
}

private updatePlayerAnimation(speed: number, dt: number) {
  if (!this.playerMixer) return;
  this.playerMixer.update(dt);
  let target = "Idle";
  if (speed > 15) target = "Run";
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

  const char = this.buildCharacter(color, style);
  char.group.position.set(x, 0, z);
  this.scene.add(char.group);

  const maxHp = 700;
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

  // Кольцо обзора
  const visionGeo = new THREE.RingGeometry(
    VISION_RADIUS - 0.15,
    VISION_RADIUS,
    48,
  );
  const visionMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const visionRing = new THREE.Mesh(visionGeo, visionMat);
  visionRing.rotation.x = -Math.PI / 2;
  visionRing.position.set(x, 0.03, z);
  this.scene.add(visionRing);

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
    color: 0xffe066,
    emissive: 0xffaa00,
    ult: false,
    ownerId: this.localPlayerId,
    ownerName: this.playerName,
  });
  this.spawnMuzzleFlash(px, pz, 0xfff1a8);
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
    color: 0xffff66,
    emissive: 0xffcc00,
    ult: true,
    ownerId: this.localPlayerId,
    ownerName: this.playerName,
  });
  this.spawnMuzzleFlash(px, pz, 0xfff04a);
  this.spawnMuzzleFlash(px, pz, 0xffe066);
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
    damage: ENEMY_DAMAGE,
    color: 0xff6655,
    emissive: 0xff3322,
    ult: false,
    ownerId: enemy.id,
    ownerName: enemy.name,
  });
  this.spawnMuzzleFlash(px, pz, 0xffaa88);
  this.sound.playShot(0.5);
}

private spawnProjectile(opts: {
  px: number;
  pz: number;
  vx: number;
  vz: number;
  fromPlayer: boolean;
  damage: number;
  color: number;
  emissive: number;
  ult: boolean;
  ownerId: string;
  ownerName: string;
}) {
  const r = opts.ult ? 0.55 : 0.25;
  const geo = new THREE.SphereGeometry(
    r,
    opts.ult ? 18 : 12,
    opts.ult ? 18 : 12,
  );
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color,
    emissive: opts.emissive,
    emissiveIntensity: opts.ult ? 2.2 : 1.4,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(opts.px, 1.0, opts.pz);
  this.scene.add(mesh);

  let light: THREE.PointLight | undefined;
  if (opts.ult) {
    light = new THREE.PointLight(opts.color, 3.5, 8);
    light.position.set(opts.px, 1.2, opts.pz);
    this.scene.add(light);
  }

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
    light,
  });
}

private removeProjectile(i: number) {
  const p = this.projectiles[i];
  Matter.World.remove(this.world, p.body);
  this.scene.remove(p.mesh);
  if (p.light) this.scene.remove(p.light);
  (p.mesh.geometry as THREE.BufferGeometry).dispose();
  (p.mesh.material as THREE.Material).dispose();
  this.projectiles.splice(i, 1);
}

private showBubbleFor(enemy: Enemy, text: string) {
  // Убираем старый пузырь
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
  enemy.bubbleUntil = this.clock.getElapsedTime() + CHAT_LINE_DURATION;
}

private clearBubble(enemy: Enemy) {
  if (enemy.bubble) {
    enemy.char.group.remove(enemy.bubble);
    enemy.bubble.material.map?.dispose();
    enemy.bubble.material.dispose();
    enemy.bubble = null;
  }
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
    this.playerVel.lerp(targetVel, PLAYER_ACCEL);
  } else {
    this.playerVel.multiplyScalar(1 - PLAYER_FRICTION);
    if (this.playerVel.lengthSq() < 0.0005) this.playerVel.set(0, 0);
  }

  Matter.Body.setVelocity(this.playerBody, {
    x: this.playerVel.x * dt,
    y: this.playerVel.y * dt,
  });

  if (this.playerVel.lengthSq() > 0.05) {
    const targetAngle = Math.atan2(this.playerVel.x, this.playerVel.y);
    this.playerFacing = lerpAngle(
      this.playerFacing,
      targetAngle,
      ROT_ALPHA,
    );
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
    this.animateCharacter(this.playerChar, this.playerVel.length(), dt);
  }

  const wasInBush = this.inBush;
  this.inBush = this.isInBush(
    this.playerBody.position.x,
    this.playerBody.position.y,
  );
  if (this.inBush !== wasInBush) {
    this.setCharacterOpacity(this.playerChar, this.inBush ? 0.4 : 1.0);
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

private canSeePlayer(enemy: Enemy): boolean {
  if (this.destroyed) return false;
  if (this.inBush) return false;
  const dx = this.playerBody.position.x - enemy.body.position.x;
  const dz = this.playerBody.position.y - enemy.body.position.y;
  const d2 = dx * dx + dz * dz;
  return d2 < enemy.visionRadius * enemy.visionRadius;
}

private updateEnemies(dt: number) {
  const now = performance.now() / 1000;
  const elapsed = this.clock.getElapsedTime();
  const AVOID_RADIUS = 3.5;
  const halfW = MAP_W / 2 - 2.5;
  const halfH = MAP_H / 2 - 2.5;

  for (const e of this.enemies) {
    if (e.destroyed) continue;
    e.char.group.position.set(e.body.position.x, 0, e.body.position.y);
    e.visionRing.position.set(e.body.position.x, 0.03, e.body.position.y);

    // обновление пузыря
    if (e.bubble && elapsed > e.bubbleUntil) {
      this.clearBubble(e);
    }

    // Философ — меняем цвет кольца обзора
    if (e.bubble) {
      const mat = e.bubble.material as THREE.SpriteMaterial;
      mat.opacity = Math.min(1, (e.bubbleUntil - elapsed) * 4);
    }

    const canSee = this.canSeePlayer(e);

    // Определяем следующее состояние
    if (e.state === "chat") {
      // во время чата — стоим, поворачиваемся к собеседнику
      Matter.Body.setVelocity(e.body, { x: 0, y: 0 });
      const partner = this.enemies.find((x) => x.id === e.chatPartnerId);
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
      this.animateCharacter(e.char, 0, dt);

      // Показываем следующую строку диалога
      if (e.chatDialogue && elapsed >= e.chatNextLineAt) {
        if (e.chatLineIdx < e.chatDialogue.length) {
          const line = e.chatDialogue[e.chatLineIdx];
          if (line.speaker === e.name) {
            this.showBubbleFor(e, line.text);
          }
          e.chatLineIdx++;
          e.chatNextLineAt = elapsed + CHAT_LINE_DURATION + 0.15;
        } else {
          // Диалог завершён
          e.state = "patrol";
          e.chatDialogue = null;
          e.chatPartnerId = null;
          e.chatCooldownUntil = now + 12;
        }
      }

      if (canSee) {
        // Прервать чат — увидел игрока
        e.state = "chase";
        e.spottedSpoken = false;
        e.chatDialogue = null;
        e.chatPartnerId = null;
        e.chatCooldownUntil = now + 12;
        this.clearBubble(e);
      }
      continue;
    }

    if (canSee) {
      if (e.state !== "chase") {
        e.state = "chase";
        e.spottedSpoken = false;
      }
      // Реплика при первом обнаружении
      if (!e.spottedSpoken) {
        const line = pickSpottedLine(e.name);
        if (line) this.showBubbleFor(e, line);
        e.spottedSpoken = true;
      }
    } else if (e.state === "chase") {
      // Потерял игрока — возвращаемся к патрулю
      if (!this.inBush && this.destroyed) {
        e.state = "patrol";
      } else if (this.inBush) {
        // игрок спрятался — бот идёт к последней позиции
        e.state = "patrol";
      }
    }

    // === Патруль / Погоня ===
    if (e.state === "chase") {
      // Погоня как раньше
      const dxRaw = this.playerBody.position.x - e.body.position.x;
      const dzRaw = this.playerBody.position.y - e.body.position.y;
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

      const repulsion = this.computeRepulsion(e);
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
      this.animateCharacter(e.char, ENEMY_CHASE_SPEED, dt);

      if (dist < 13 && now - e.lastShotAt > 1.5) {
        e.lastShotAt = now;
        const jitter = (Math.random() - 0.5) * 0.13;
        const cs = Math.cos(jitter);
        const sn = Math.sin(jitter);
        const ad = new THREE.Vector2(
          toPlayer.x * cs - toPlayer.y * sn,
          toPlayer.x * sn + toPlayer.y * cs,
        );
        this.fireEnemyProjectile(e, ad);
      }
    } else {
      // === Патруль ===
      const target = e.patrolPoints[e.patrolIdx];
      const dxRaw = target.x - e.body.position.x;
      const dzRaw = target.z - e.body.position.y;
      const dist = Math.hypot(dxRaw, dzRaw);

      if (dist < 1.2) {
        e.patrolIdx = (e.patrolIdx + 1) % e.patrolPoints.length;
      } else {
        const toTarget = new THREE.Vector2(dxRaw, dzRaw).normalize();
        const repulsion = this.computeRepulsion(e);
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
        this.animateCharacter(e.char, ENEMY_PATROL_SPEED, dt);
      }
    }

    // === Ограничение по карте ===
    if (e.body.position.x < 70) e.body.position.x = 70;
    if (e.body.position.x > MAP_W - 70) e.body.position.x = MAP_W - 70;
    if (e.body.position.y < 70) e.body.position.y = 70;
    if (e.body.position.y > MAP_H - 70) e.body.position.y = MAP_H - 70;

    // === Автомонолог ===
    if (
      e.state === "patrol" &&
      !e.bubble &&
      now > e.monologueNextAt &&
      now > e.chatCooldownUntil
    ) {
      const line = pickMonologue(e.name);
      if (line) this.showBubbleFor(e, line);
      e.monologueNextAt = now + 8 + Math.random() * 10;
    }

    // === Проверка возможности начать диалог ===
    if (
      e.state === "patrol" &&
      !e.bubble &&
      now > e.chatCooldownUntil
    ) {
      for (const other of this.enemies) {
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
            // развернуть друг к другу
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

private computeRepulsion(e: Enemy): THREE.Vector2 {
  const AVOID_RADIUS = 3.5;
  const rep = new THREE.Vector2(0, 0);
  for (const o of this.obstacles) {
    const ox = e.body.position.x - o.cx;
    const oz = e.body.position.y - o.cz;
    const od = Math.hypot(ox, oz);
    if (od < AVOID_RADIUS && od > 0.001) {
      const k = (AVOID_RADIUS - od) / AVOID_RADIUS;
      rep.x += (ox / od) * k;
      rep.y += (oz / od) * k;
    }
  }
  for (const c of this.crates) {
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
  if (e.body.position.x > halfW)
    rep.x -= (e.body.position.x - halfW) * 0.5;
  if (e.body.position.x < -halfW)
    rep.x += (-halfW - e.body.position.x) * 0.5;
  if (e.body.position.y > halfH)
    rep.y -= (e.body.position.y - halfH) * 0.5;
  if (e.body.position.y < -halfH)
    rep.y += (-halfH - e.body.position.y) * 0.5;
  return rep;
}

private updateProjectiles(dt: number) {
  const elapsed = this.clock.getElapsedTime();
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
          this.spawnDamageNumber(c.cx, 1.6, c.cz, dealt, "#ffd966");
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
            this.spawnDamageNumber(
              e.body.position.x,
              2.6,
              e.body.position.y,
              dealt,
              p.ult ? "#fff066" : "#ff8866",
            );
            this.ultCharge = Math.min(
              1,
              this.ultCharge + ULT_CHARGE_PER_HIT,
            );
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
        const dxp = nx - this.playerBody.position.x;
        const dzp = nz - this.playerBody.position.y;
        if (
          dxp * dxp + dzp * dzp < 0.65 * 0.65 &&
          !this.destroyed
        ) {
          this.playerHp = Math.max(0, this.playerHp - p.damage);
          this.refreshPlayerHpBar();
          if (this.playerHp <= 0) this.handlePlayerDeath(p.ownerName);
          hit = true;
          hitWorld = false;
          stop = true;
        }
      }
      if (stop) break;
    }

    p.mesh.position.set(p.body.position.x, 1.0, p.body.position.y);
    if (p.light)
      p.light.position.set(p.body.position.x, 1.2, p.body.position.y);

    if (hit) {
      if (hitWorld) {
        this.spawnSparks(
          p.body.position.x,
          1.0,
          p.body.position.y,
          p.fromPlayer ? 0xffd966 : 0xff8866,
          p.ult ? 14 : 7,
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
  this.spawnSparks(c.cx, 1.0, c.cz, 0xc88a3a, 12);
  this.sound.playCrate();
  const kind: "heal" | "damage" = Math.random() < 0.5 ? "heal" : "damage";
  this.spawnPickup(c.cx, c.cz, kind);
}
  
  private killEnemy(e: Enemy, killerName: string) {
    e.destroyed = true;
    Matter.World.remove(this.world, e.body);
    this.scene.remove(e.char.group);
    this.scene.remove(e.visionRing);
    this.clearBubble(e);
    // Спрятать кольцо обзора
    e.visionRing.visible = false;
    this.kills += 1;
    this.spawnSparks(
      e.body.position.x,
      1.5,
      e.body.position.y,
      e.color,
      16,
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
      // Найти исходные данные по имени, чтобы восстановить patrol
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
      this.scene.remove(f.light);
      this.scene.remove(f.glow);
      (f.glow.geometry as THREE.BufferGeometry).dispose();
      (f.glow.material as THREE.Material).dispose();
    }
    this.muzzleFlashes = [];
    for (const d of this.damageNumbers) {
      this.scene.remove(d.sprite);
      d.sprite.material.map?.dispose();
      d.sprite.material.dispose();
    }
    this.damageNumbers = [];
    for (let i = this.pickups.length - 1; i >= 0; i--) this.removePickup(i);
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
    this.crates = [];
    this.setupCrates();
    this.playerHp = this.playerMaxHp;
    this.refreshPlayerHpBar();
    Matter.Body.setPosition(this.playerBody, { x: 0, y: 0 });
    this.playerVel.set(0, 0);
    this.playerFacing = 0;
    this.playerChar.group.position.set(0, 0, 0);
    this.playerChar.group.rotation.y = 0;
    this.setCharacterOpacity(this.playerChar, 1.0);
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

  private spawnMuzzleFlash(x: number, z: number, color: number) {
    const light = new THREE.PointLight(color, 4, 6);
    light.position.set(x, 1.2, z);
    this.scene.add(light);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 10),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    glow.position.set(x, 1.2, z);
    this.scene.add(glow);
    this.muzzleFlashes.push({
      light,
      glow,
      spawnedAt: this.clock.getElapsedTime(),
      life: 0.09,
    });
  }

  private updateMuzzleFlashes() {
    const now = this.clock.getElapsedTime();
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const f = this.muzzleFlashes[i];
      const t = (now - f.spawnedAt) / f.life;
      if (t >= 1) {
        this.scene.remove(f.light);
        this.scene.remove(f.glow);
        (f.glow.geometry as THREE.BufferGeometry).dispose();
        (f.glow.material as THREE.Material).dispose();
        this.muzzleFlashes.splice(i, 1);
      } else {
        const k = 1 - t;
        f.light.intensity = 4 * k;
        const mat = f.glow.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.9 * k;
        const s = 1 + t * 0.6;
        f.glow.scale.set(s, s, s);
      }
    }
  }

  private spawnSparks(
    x: number,
    y: number,
    z: number,
    color = 0xffd966,
    count = 7,
  ) {
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
      this.scene.add(m);
      const ang = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 6;
      this.sparks.push({
        mesh: m,
        vx: Math.cos(ang) * sp,
        vz: Math.sin(ang) * sp,
        vy: 2 + Math.random() * 5,
        life: 0.4,
        spawnedAt: this.clock.getElapsedTime(),
      });
    }
  }

  private updateSparks(dt: number) {
    const now = this.clock.getElapsedTime();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      const t = (now - s.spawnedAt) / s.life;
      if (t >= 1) {
        this.scene.remove(s.mesh);
        (s.mesh.geometry as THREE.BufferGeometry).dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
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

  private spawnDamageNumber(
    x: number,
    y: number,
    z: number,
    value: number,
    color = "#ffe066",
  ) {
    if (value <= 0) return;
    const tex = createDamageNumberTexture(value, color);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.0, 1.0, 1);
    sprite.position.set(
      x + (Math.random() - 0.5) * 0.4,
      y,
      z + (Math.random() - 0.5) * 0.4,
    );
    this.scene.add(sprite);
    this.damageNumbers.push({
      sprite,
      spawnedAt: this.clock.getElapsedTime(),
      life: 0.95,
      startY: sprite.position.y,
    });
  }

  private updateDamageNumbers() {
    const now = this.clock.getElapsedTime();
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      const t = (now - d.spawnedAt) / d.life;
      if (t >= 1) {
        this.scene.remove(d.sprite);
        d.sprite.material.map?.dispose();
        d.sprite.material.dispose();
        this.damageNumbers.splice(i, 1);
        continue;
      }
      d.sprite.position.y = d.startY + t * 1.8;
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      d.sprite.material.opacity = Math.max(0, fade);
      const scale = 1 + Math.sin(t * Math.PI) * 0.15;
      d.sprite.scale.set(2.0 * scale, 1.0 * scale, 1);
    }
  }

  private spawnPickup(x: number, z: number, kind: "heal" | "damage") {
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
    this.scene.add(grp);
    this.pickups.push({
      mesh: grp,
      cx: x,
      cz: z,
      kind,
      spawnedAt: this.clock.getElapsedTime(),
      ttl: 18,
    });
  }

  private updatePickups(dt: number) {
    const now = this.clock.getElapsedTime();
    const px = this.playerBody.position.x;
    const pz = this.playerBody.position.y;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.mesh.rotation.y += dt * 1.6;
      p.mesh.position.y = 1.0 + Math.sin(now * 3 + i) * 0.15;
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
        this.removePickup(i);
        continue;
      }
      if (now - p.spawnedAt > p.ttl) {
        this.removePickup(i);
      }
    }
    if (this.damageBoost > 1.0 && now > this.damageBoostUntil) {
      this.damageBoost = 1.0;
    }
  }

  private removePickup(i: number) {
    const p = this.pickups[i];
    this.scene.remove(p.mesh);
    p.mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mt = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
        else mt?.dispose?.();
      }
    });
    this.pickups.splice(i, 1);
  }

  private updateCamera(snap = false) {
    const target = new THREE.Vector3(
      this.playerBody.position.x,
      0,
      this.playerBody.position.y,
    );
    const camOffset = new THREE.Vector3(
      -Math.cos(PITCH) * Math.cos(YAW) * CAM_DIST,
      Math.sin(PITCH) * CAM_DIST,
      -Math.cos(PITCH) * Math.sin(YAW) * CAM_DIST,
    );
    const desired = target.clone().add(camOffset);
    if (snap) {
      this.camera.position.copy(desired);
    } else {
      this.camera.position.lerp(desired, 0.12);
    }
    this.camera.lookAt(target);
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
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateAimOverlay();
      this.updateReload(dt);
      this.updatePickups(dt);
      this.updateMuzzleFlashes();
      this.updateSparks(dt);
      this.updateDamageNumbers();
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
