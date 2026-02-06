
export const GAME_WIDTH = 400; // Virtual width
export const GAME_HEIGHT = 800; // Virtual height

export const GRAVITY = 0.35; 
export const JUMP_FORCE = -13;
export const BOOST_FORCE = -22;
export const GOLDEN_JUMP_FORCE = -24; 
export const GOLDEN_DURATION_MS = 30000; 
export const MOVE_SPEED = 6;
export const FRICTION = 0.85; 

export const PIXEL_SCALE = 4; 

export const PLAYER_SIZE = { width: 40, height: 40 }; 
export const PLATFORM_SIZE = { width: 72, height: 16 }; 
export const ENEMY_SIZE = { width: 32, height: 32 };
export const ITEM_SIZE = { width: 24, height: 24 };
export const BOSS_SIZE = { width: 80, height: 100 };

export const LEVEL_HEIGHT_THRESHOLD = 200; 
export const MAX_LEVEL = 100;
export const BOSS_HP = 5; // Ajustado a 5 vidas
export const MAX_LIVES = 5;
export const INITIAL_LIVES = 3; // Empieza con 3

export const COLORS = {
  skyTop: '#60a5fa',     
  skyBottom: '#bfdbfe',  
  bossSkyTop: '#450a0a',   
  bossSkyBottom: '#7f1d1d', 
  grassTop: '#4ade80',         
  grassHighlight: '#86efac',   
  dirtBody: '#854d0e',         
  dirtShadow: '#3f2c22',       
  platformMoving: '#0ea5e9',   
  platformMovingLight: '#7dd3fc',
  platformBreakable: '#94a3b8', 
  platformBreakableCrack: '#475569',
  platformBoost: '#f472b6',     
  platformBoostLight: '#fbcfe8',
  chicaSuit: '#b45309',        
  chicaDark: '#451a03',        
  chicaSkin: '#ffe4e6',        
  chicaHair: '#fde047',        
  chicaBoots: '#fbbf24',       
  chicaGloves: '#374151',      
  chicaBlush: '#f9a8d4',       
  goldenSuit: '#facc15',       
  goldenDark: '#b45309',       
  goldenGlow: '#fef08a',       
  carrotBody: '#f97316',       
  carrotLeaf: '#4ade80',
  appleBody: '#dc2626',
  appleHighlight: '#fca5a5',
  appleLeaf: '#4ade80',
  enemy: '#ef4444',             
  enemyDark: '#991b1b',
  white: '#ffffff',
  black: '#000000',
  eggBody: '#f1f5f9',
  eggCracks: '#cbd5e1',
  eggEyes: '#ef4444',
  projectile: '#ffffff',
  textShadow: '#1e3a8a'
};
