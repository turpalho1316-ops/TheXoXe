// ============================================================
// XoXe — Game Configuration
// All tunable values in one place.
// ============================================================

export const MODEL_SCALE = 1.7;

// Player stats
export const PLAYER_HP = 9000;
export const PLAYER_SPEED = 16.0;
export const PLAYER_DAMAGE = 220;

// Enemy stats
export const ENEMY_HP = 700;
export const ENEMY_DAMAGE = 80;
export const KILL_GOAL = 3;

// Crates
export const CRATE_HP = 1500;

// Bot AI
export const VISION_RADIUS = 12;
export const CHAT_TRIGGER_DIST = 3.5;
export const CHAT_LINE_DURATION = 2.0;

// Map dimensions
export const MAP_W = 50;
export const MAP_H = 100;

// Bot movement speeds
export const ENEMY_CHASE_SPEED = 9;
export const ENEMY_PATROL_SPEED = 5;
export const ENEMY_BACK_SPEED = 6.5;

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
export const CAM_LERP = 0.08;

// Camera dead-zone — fraction of the viewport where the camera
// DOES NOT move. 0.35 = camera only starts moving once the player
// reaches 35% of the way from the center to the screen edge.
export const CAM_DEADZONE_X = 0.28;
export const CAM_DEADZONE_Y = 0.28;

// Reload time for one bullet (seconds)
export const RELOAD_TIME = 1.6;

// ============================================================
// PET — companion wolf
// ============================================================
export const PET_HP = 500;
export const PET_MAX_HP = 500;
export const PET_DAMAGE = 200;
export const PET_SPEED = 12;
export const PET_FOLLOW_DIST = 3.0;
export const PET_FOLLOW_DEADZONE = 5.0;
export const PET_ATTACK_RANGE = 1.8;
export const PET_ATTACK_COOLDOWN = 0.9;
export const PET_DETECT_RANGE = 18;
export const PET_LEASH_RANGE = 22;

// ============================================================
// NIGHT MODE
// ============================================================
export const NIGHT_AMBIENT_INTENSITY = 0.35;
export const NIGHT_MOON_INTENSITY = 0.5;
export const NIGHT_LAMP_INTENSITY = 3.0;
export const NIGHT_LAMP_DISTANCE = 14;
export const NIGHT_FOG_COLOR = 0x0a1220;

// ============================================================
// PROGRESSION — rewards
// ============================================================
export const COINS_PER_KILL = 50;
export const COINS_PER_WIN = 200;
export const XP_PER_KILL = 15;
export const XP_PER_WIN = 100;
