import * as THREE from "three";

// ============================================================
// Grass texture — created once
// ============================================================
let _grassTex: THREE.Texture | null = null;

export function createGrassTexture(): THREE.Texture {
  if (_grassTex) return _grassTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#3d8b3d");
  grad.addColorStop(1, "#2f6f2f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    const shade = 60 + Math.random() * 60;
    ctx.strokeStyle = `rgba(${Math.floor(shade * 0.4)}, ${Math.floor(
      shade * 1.4,
    )}, ${Math.floor(shade * 0.4)}, 0.7)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 16;
    ctx.fillStyle = `rgba(40, 90, 40, ${0.05 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(${200 + Math.random() * 50}, ${
      200 + Math.random() * 50
    }, ${100 + Math.random() * 80}, 0.55)`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  _grassTex = tex;
  return tex;
}

// ============================================================
// HP bar texture cache
// Key = `${name}_${hp}_${maxHp}` — cached forever
// ============================================================
const hpBarCache = new Map<string, THREE.Texture>();
const HP_CACHE_LIMIT = 200;

export function createHpBarTexture(
  hp: number,
  maxHp: number,
  name: string,
): THREE.Texture {
  const key = `${name}_${Math.round(hp)}_${Math.round(maxHp)}`;
  const cached = hpBarCache.get(key);
  if (cached) return cached;

  const tex = renderHpBar(hp, maxHp, name);
  hpBarCache.set(key, tex);

  // Simple LRU trim
  if (hpBarCache.size > HP_CACHE_LIMIT) {
    const firstKey = hpBarCache.keys().next().value;
    if (firstKey !== undefined) {
      const old = hpBarCache.get(firstKey);
      old?.dispose();
      hpBarCache.delete(firstKey);
    }
  }
  return tex;
}

function renderHpBar(hp: number, maxHp: number, name: string): THREE.Texture {
  const w = 320;
  const h = 116;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, w, h);

  ctx.font = "900 38px Inter, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(name, w / 2, 30);
  ctx.fillText(name, w / 2, 30);

  const barX = 18;
  const barY = 64;
  const barW = w - 36;
  const barH = 30;
  const radius = 13;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundedRect(ctx, barX - 3, barY - 3, barW + 6, barH + 6, radius + 2);
  ctx.fill();

  ctx.fillStyle = "#1c1c1c";
  roundedRect(ctx, barX, barY, barW, barH, radius);
  ctx.fill();

  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const fillW = Math.max(barH, barW * pct);

  const RED: [number, number, number] = [255, 84, 84];
  const YELLOW: [number, number, number] = [255, 220, 80];
  const GREEN: [number, number, number] = [124, 232, 113];
  let mid: [number, number, number];
  if (pct >= 0.5) {
    mid = lerpRgb(YELLOW, GREEN, (pct - 0.5) * 2);
  } else {
    mid = lerpRgb(RED, YELLOW, pct * 2);
  }
  const top = lerpRgb(mid, [255, 255, 255], 0.18);
  const bot = lerpRgb(mid, [0, 0, 0], 0.32);
  const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
  grad.addColorStop(0, `rgb(${top[0]}, ${top[1]}, ${top[2]})`);
  grad.addColorStop(1, `rgb(${bot[0]}, ${bot[1]}, ${bot[2]})`);
  ctx.fillStyle = grad;
  roundedRect(ctx, barX, barY, fillW, barH, radius);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  roundedRect(ctx, barX + 4, barY + 4, fillW - 8, 8, 5);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================
// Damage number texture cache
// ============================================================
const dmgCache = new Map<string, THREE.Texture>();
const DMG_CACHE_LIMIT = 300;

export function createDamageNumberTexture(
  value: number,
  color = "#ffe066",
): THREE.Texture {
  const key = `${Math.round(value)}_${color}`;
  const cached = dmgCache.get(key);
  if (cached) return cached;

  const tex = renderDamageNumber(value, color);
  dmgCache.set(key, tex);

  if (dmgCache.size > DMG_CACHE_LIMIT) {
    const firstKey = dmgCache.keys().next().value;
    if (firstKey !== undefined) {
      const old = dmgCache.get(firstKey);
      old?.dispose();
      dmgCache.delete(firstKey);
    }
  }
  return tex;
}

function renderDamageNumber(value: number, color: string): THREE.Texture {
  const w = 192;
  const h = 96;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.font = "900 56px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.fillStyle = color;
  const text = `-${Math.round(value)}`;
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================
// Helpers
// ============================================================
function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ============================================================
// Warm-up — pre-render common textures so the first usage
// never has to allocate or upload anything.
// ============================================================
export function prewarmCommonTextures(): void {
  // Common HP bar values for player and bots
  createHpBarTexture(9000, 9000, "Player");
  createHpBarTexture(700, 700, "Якарь");
  createHpBarTexture(700, 700, "Веин");
  createHpBarTexture(700, 700, "Философ");
  createHpBarTexture(700, 700, "Патриций");
  createHpBarTexture(800, 800, "Волк");

  // Common damage values
  const colors = ["#ff8866", "#fff066", "#ffd966", "#ff5a3a", "#ff3020"];
  const values = [20, 40, 60, 80, 100, 200, 220, 350, 800];
  for (const v of values) {
    for (const c of colors) {
      createDamageNumberTexture(v, c);
    }
  }
}
