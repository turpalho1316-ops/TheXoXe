// ============================================================
// XoXe — Save Data & Progression
// localStorage-based save, missions, skins
// ============================================================

export type PlayerSkinDef = {
  id: string;
  name: string;
  price: number;
  style: string;
  previewColor: string;
};

export type WolfSkinDef = {
  id: string;
  name: string;
  price: number;
  bodyColor: number;
  eyeColor: number;
  previewColor: string;
};

export type MissionType = "kills" | "wins" | "nightWins" | "petKills";

export type Mission = {
  id: string;
  text: string;
  type: MissionType;
  target: number;
  progress: number;
  reward: number;
  xp: number;
};

export type SaveData = {
  coins: number;
  level: number;
  xp: number;
  totalXp: number;
  ownedPlayerSkins: string[];
  currentPlayerSkin: string;
  ownedWolfSkins: string[];
  currentWolfSkin: string;
  lastMissionRefresh: number;
  missions: Mission[];
};

// ============================================================
// Skins
// ============================================================
export const PLAYER_SKINS: PlayerSkinDef[] = [
  { id: "default",  name: "Солдат",   price: 0,    style: "player",   previewColor: "#3aa3ff" },
  { id: "pirate",   name: "Пират",    price: 500,  style: "pirate",   previewColor: "#8a5a2a" },
  { id: "skeleton", name: "Скелет",   price: 600,  style: "skeleton", previewColor: "#e0e0d8" },
  { id: "zombie",   name: "Зомби",    price: 700,  style: "zombie",   previewColor: "#6a8a3a" },
  { id: "ninja",    name: "Ниндзя",   price: 800,  style: "ninja",    previewColor: "#1a1a1a" },
  { id: "clown",    name: "Клоун",    price: 900,  style: "clown",    previewColor: "#ff88aa" },
  { id: "ghost",    name: "Призрак",  price: 1000, style: "ghost",    previewColor: "#aad8ff" },
  { id: "cowboy",   name: "Ковбой",   price: 1100, style: "cowboy",   previewColor: "#c08a4a" },
  { id: "robot",    name: "Робот",    price: 1200, style: "robot",    previewColor: "#708090" },
  { id: "knight",   name: "Рыцарь",   price: 1500, style: "knight",   previewColor: "#9098a8" },
  { id: "samurai",  name: "Самурай",  price: 1800, style: "samurai",  previewColor: "#b02020" },
];

export const WOLF_SKINS: WolfSkinDef[] = [
  { id: "wolf_default", name: "Серый волк",    price: 0,    bodyColor: 0x6b6f76, eyeColor: 0xffd24a, previewColor: "#6b6f76" },
  { id: "wolf_white",   name: "Белый волк",    price: 800,  bodyColor: 0xf0f0f0, eyeColor: 0x6cf0ff, previewColor: "#f0f0f0" },
  { id: "wolf_black",   name: "Чёрный волк",   price: 1200, bodyColor: 0x1a1a1a, eyeColor: 0xff3020, previewColor: "#1a1a1a" },
  { id: "wolf_fire",    name: "Огненный волк", price: 2000, bodyColor: 0x8a2010, eyeColor: 0xffaa00, previewColor: "#c03010" },
];

export function getPlayerSkin(id: string): PlayerSkinDef {
  return PLAYER_SKINS.find((s) => s.id === id) ?? PLAYER_SKINS[0];
}

export function getWolfSkin(id: string): WolfSkinDef {
  return WOLF_SKINS.find((s) => s.id === id) ?? WOLF_SKINS[0];
}

// ============================================================
// Level curve
// ============================================================
export function xpToNextLevel(level: number): number {
  return 200 + (level - 1) * 200;
}

// ============================================================
// Missions
// ============================================================
const MISSION_POOL = [
  { id: "kill_5",  type: "kills" as const,      target: 5,  reward: 100, xp: 50,  text: "Убить 5 ботов" },
  { id: "kill_10", type: "kills" as const,      target: 10, reward: 200, xp: 100, text: "Убить 10 ботов" },
  { id: "kill_15", type: "kills" as const,      target: 15, reward: 300, xp: 150, text: "Убить 15 ботов" },
  { id: "win_1",   type: "wins" as const,       target: 1,  reward: 200, xp: 100, text: "Победить 1 раз" },
  { id: "win_3",   type: "wins" as const,       target: 3,  reward: 500, xp: 250, text: "Победить 3 раза" },
  { id: "night_1", type: "nightWins" as const,  target: 1,  reward: 300, xp: 150, text: "Победить ночью" },
  { id: "pet_3",   type: "petKills" as const,   target: 3,  reward: 250, xp: 120, text: "Пусть волк убьёт 3 ботов" },
  { id: "pet_5",   type: "petKills" as const,   target: 5,  reward: 400, xp: 200, text: "Пусть волк убьёт 5 ботов" },
];

export function generateMissions(): Mission[] {
  const pool = [...MISSION_POOL];
  const picked: Mission[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const m = pool.splice(idx, 1)[0];
    picked.push({
      id: m.id,
      text: m.text,
      type: m.type,
      target: m.target,
      progress: 0,
      reward: m.reward,
      xp: m.xp,
    });
  }
  return picked;
}

const REFRESH_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Save / Load
// ============================================================
const STORAGE_KEY = "xoxe_save_v1";

export function makeDefaultSave(): SaveData {
  return {
    coins: 0,
    level: 1,
    xp: 0,
    totalXp: 0,
    ownedPlayerSkins: ["default"],
    currentPlayerSkin: "default",
    ownedWolfSkins: ["wolf_default"],
    currentWolfSkin: "wolf_default",
    lastMissionRefresh: 0,
    missions: generateMissions(),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = makeDefaultSave();
    const data: SaveData = {
      coins: typeof parsed.coins === "number" ? parsed.coins : def.coins,
      level: typeof parsed.level === "number" ? parsed.level : def.level,
      xp: typeof parsed.xp === "number" ? parsed.xp : def.xp,
      totalXp: typeof parsed.totalXp === "number" ? parsed.totalXp : def.totalXp,
      ownedPlayerSkins: Array.isArray(parsed.ownedPlayerSkins)
        ? parsed.ownedPlayerSkins
        : def.ownedPlayerSkins,
      currentPlayerSkin:
        typeof parsed.currentPlayerSkin === "string"
          ? parsed.currentPlayerSkin
          : def.currentPlayerSkin,
      ownedWolfSkins: Array.isArray(parsed.ownedWolfSkins)
        ? parsed.ownedWolfSkins
        : def.ownedWolfSkins,
      currentWolfSkin:
        typeof parsed.currentWolfSkin === "string"
          ? parsed.currentWolfSkin
          : def.currentWolfSkin,
      lastMissionRefresh:
        typeof parsed.lastMissionRefresh === "number"
          ? parsed.lastMissionRefresh
          : def.lastMissionRefresh,
      missions:
        Array.isArray(parsed.missions) && parsed.missions.length === 3
          ? parsed.missions
          : def.missions,
    };
    return refreshMissionsIfNeeded(data);
  } catch (e) {
    console.warn("Save load failed, resetting", e);
    return makeDefaultSave();
  }
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Save write failed", e);
  }
}

export function refreshMissionsIfNeeded(data: SaveData): SaveData {
  const now = Date.now();
  if (now - data.lastMissionRefresh >= REFRESH_MS) {
    return {
      ...data,
      missions: generateMissions(),
      lastMissionRefresh: now,
    };
  }
  return data;
}

// ============================================================
// Rewards
// ============================================================
export function addRewards(
  data: SaveData,
  coins: number,
  xpGain: number,
): SaveData {
  const newCoins = data.coins + coins;
  let newXp = data.xp + xpGain;
  let newLevel = data.level;
  const newTotalXp = data.totalXp + xpGain;

  let safety = 0;
  while (newXp >= xpToNextLevel(newLevel) && safety < 100) {
    newXp -= xpToNextLevel(newLevel);
    newLevel += 1;
    safety++;
  }

  return {
    ...data,
    coins: newCoins,
    xp: newXp,
    level: newLevel,
    totalXp: newTotalXp,
  };
}

export function progressMission(
  data: SaveData,
  type: MissionType,
  amount: number,
): { data: SaveData; rewardCoins: number; rewardXp: number } {
  let rewardCoins = 0;
  let rewardXp = 0;
  const newMissions = data.missions.map((m) => {
    if (m.type !== type) return m;
    if (m.progress >= m.target) return m;
    const newProgress = Math.min(m.target, m.progress + amount);
    if (newProgress >= m.target && m.progress < m.target) {
      rewardCoins += m.reward;
      rewardXp += m.xp;
    }
    return { ...m, progress: newProgress };
  });
  return {
    data: { ...data, missions: newMissions },
    rewardCoins,
    rewardXp,
  };
}

export function buyPlayerSkin(data: SaveData, skinId: string): SaveData | null {
  const skin = getPlayerSkin(skinId);
  if (data.ownedPlayerSkins.includes(skinId)) return null;
  if (data.coins < skin.price) return null;
  return {
    ...data,
    coins: data.coins - skin.price,
    ownedPlayerSkins: [...data.ownedPlayerSkins, skinId],
    currentPlayerSkin: skinId,
  };
}

export function buyWolfSkin(data: SaveData, skinId: string): SaveData | null {
  const skin = getWolfSkin(skinId);
  if (data.ownedWolfSkins.includes(skinId)) return null;
  if (data.coins < skin.price) return null;
  return {
    ...data,
    coins: data.coins - skin.price,
    ownedWolfSkins: [...data.ownedWolfSkins, skinId],
    currentWolfSkin: skinId,
  };
}

export function equipPlayerSkin(data: SaveData, skinId: string): SaveData {
  if (!data.ownedPlayerSkins.includes(skinId)) return data;
  return { ...data, currentPlayerSkin: skinId };
}

export function equipWolfSkin(data: SaveData, skinId: string): SaveData {
  if (!data.ownedWolfSkins.includes(skinId)) return data;
  return { ...data, currentWolfSkin: skinId };
}
