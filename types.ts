export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Player extends Point, Size {
  vx: number; // Velocity X
  vy: number; // Velocity Y
  isDead: boolean;
  facingRight: boolean;
  state: 'idle' | 'jump' | 'fall';
  isGolden: boolean; // New transformation state
  goldenEndTime?: number; // Timestamp when golden mode expires
  lives: number; // Player lives
  hasMoved: boolean; // To track if the game has actively started
  invulnerableUntil?: number; // Timestamp for damage immunity
}

export enum PlatformType {
  NORMAL = 'NORMAL',
  MOVING = 'MOVING',
  BREAKABLE = 'BREAKABLE',
  BOOST = 'BOOST'
}

export interface Platform extends Point, Size {
  id: number;
  type: PlatformType;
  active: boolean; // For breakable platforms
  speed?: number; // For moving platforms
  direction?: number; // 1 or -1
}

export interface Item extends Point, Size {
  id: number;
  type: 'GOLDEN_CARROT' | 'NORMAL_CARROT';
  active: boolean;
}

export interface Projectile extends Point, Size {
  id: number;
  vx: number;
  vy: number;
  type: 'BOSS_RAY' | 'PLAYER_CARROT';
  active: boolean;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Enemy extends Point, Size {
  id: number;
  speed: number;
  range: number;
  startX: number;
}

export interface Boss extends Point, Size {
  hp: number;
  maxHp: number;
  speed: number;
  active: boolean;
  invulnerableTimer: number;
  attackTimer: number;
}