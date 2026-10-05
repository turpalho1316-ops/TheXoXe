// ============================================================
// XoXe — Game Configuration
// All tunable values in one place.
// Change a number, save, rebuild. Don't touch engine.ts.
// ============================================================

// Player model scale (1.0 = base, 2.0 = twice as large)
export const MODEL_SCALE = 1.7;

// Player stats
export const PLAYER_HP = 9000;
export const PLAYER_SPEED = 28.0;
export const PLAYER_DAMAGE = 220;

// Enemy stats
export const ENEMY_HP = 700;
export const ENEMY_DAMAGE = 80;
export const KILL_GOAL = 3;

// Bot AI
export const VISION_RADIUS = 12;
export const CHAT_TRIGGER_DIST = 3.5;
export const CHAT_LINE_DURATION = 2.0;

// Map dimensions
export const MAP_W = 50;
export const MAP_H = 100;

// Bot movement speeds
export const ENEMY_CHASE_SPEED = 14;
export const ENEMY_PATROL_SPEED = 8;
export const ENEMY_BACK_SPEED = 10;

// Projectile speeds
export const PROJECTILE_SPEED = 22 * 0.85;
export const ENEMY_PROJECTILE_SPEED = 18 * 0.75;

// Projectile lifetime (seconds)
export const PROJECTILE_TTL = 1.4;
export const ULT_PROJECTILE_TTL = 1.6;

// Ultimate ability
export const ULT_PROJECTILE_SPEED = PROJECTILE_SPEED * 0.9;
export const ULT_DAMAGE = 800;

// Aim indicator
export const AIM_LENGTH = 26;
export const AIM_WIDTH = 2;

// Camera
export const CAM_VIEW_HEIGHT = 18;
export const CAM_DIST = 35;

// Reload time for one bullet (seconds)
export const RELOAD_TIME = 1.6;
