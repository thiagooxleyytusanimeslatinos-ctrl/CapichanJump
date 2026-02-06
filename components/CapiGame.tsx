
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Platform, PlatformType, Particle, Enemy, Item, Boss, Projectile } from '../types';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  GRAVITY, 
  JUMP_FORCE, 
  MOVE_SPEED, 
  COLORS, 
  PLAYER_SIZE, 
  PLATFORM_SIZE,
  LEVEL_HEIGHT_THRESHOLD,
  MAX_LEVEL,
  BOOST_FORCE,
  FRICTION,
  ENEMY_SIZE,
  PIXEL_SCALE,
  ITEM_SIZE,
  GOLDEN_JUMP_FORCE,
  GOLDEN_DURATION_MS,
  BOSS_SIZE,
  BOSS_HP,
  MAX_LIVES,
  INITIAL_LIVES
} from '../constants';
import { Trophy, Volume2, VolumeX, Heart } from 'lucide-react';

// --- Simple 8-Bit Audio Engine ---
class SoundEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicEnabled: boolean = true;
  sfxEnabled: boolean = true;
  isPlayingMusic: boolean = false;
  isPlayingFuneral: boolean = false;
  isPlayingBoss: boolean = false; 
  nextNoteTime: number = 0;
  timerID: number | undefined;
  funeralTimerID: number | undefined;
  bossTimerID: number | undefined;
  dieTimerID: number | undefined;
  
  // Melodía principal extendida para ser un loop de calidad 16-bit
  melody = [
    { note: 329.63, len: 0.2 }, { note: 329.63, len: 0.2 }, { note: 0, len: 0.1 }, { note: 329.63, len: 0.2 }, { note: 0, len: 0.1 }, { note: 261.63, len: 0.2 }, { note: 329.63, len: 0.2 }, { note: 0, len: 0.1 },
    { note: 392.00, len: 0.4 }, { note: 0, len: 0.4 }, { note: 196.00, len: 0.4 }, { note: 0, len: 0.4 },
    { note: 261.63, len: 0.3 }, { note: 196.00, len: 0.3 }, { note: 164.81, len: 0.3 }, { note: 220.00, len: 0.3 }, { note: 246.94, len: 0.3 }, { note: 233.08, len: 0.3 }, { note: 220.00, len: 0.3 },
    { note: 196.00, len: 0.2 }, { note: 329.63, len: 0.2 }, { note: 392.00, len: 0.2 }, { note: 440.00, len: 0.3 }, { note: 349.23, len: 0.2 }, { note: 392.00, len: 0.2 },
    { note: 329.63, len: 0.3 }, { note: 261.63, len: 0.2 }, { note: 293.66, len: 0.2 }, { note: 246.94, len: 0.3 },
    { note: 261.63, len: 0.3 }, { note: 196.00, len: 0.3 }, { note: 164.81, len: 0.3 }, { note: 220.00, len: 0.3 }, { note: 246.94, len: 0.3 }, { note: 233.08, len: 0.3 }, { note: 220.00, len: 0.3 }
  ];

  funeralMelody = [
    { note: 523.25, len: 0.6 }, { note: 523.25, len: 0.6 }, { note: 587.33, len: 0.6 }, { note: 587.33, len: 0.6 },
    { note: 659.25, len: 0.6 }, { note: 659.25, len: 0.6 }, { note: 587.33, len: 1.2 }, { note: 523.25, len: 0.6 },
    { note: 523.25, len: 0.6 }, { note: 523.25, len: 1.2 }, { note: 0, len: 1.0 },
  ];

  bossMelody = [
    { note: 110.00, len: 0.1 }, { note: 220.00, len: 0.1 }, { note: 110.00, len: 0.1 }, { note: 207.65, len: 0.1 }, 
    { note: 110.00, len: 0.1 }, { note: 196.00, len: 0.1 }, { note: 110.00, len: 0.1 }, { note: 185.00, len: 0.1 }, 
    { note: 110.00, len: 0.1 }, { note: 220.00, len: 0.1 }, { note: 110.00, len: 0.1 }, { note: 207.65, len: 0.1 },
    { note: 110.00, len: 0.1 }, { note: 196.00, len: 0.1 }, { note: 110.00, len: 0.1 }, { note: 185.00, len: 0.1 },
    { note: 146.83, len: 0.1 }, { note: 293.66, len: 0.1 }, { note: 146.83, len: 0.1 }, { note: 277.18, len: 0.1 }, 
  ];

  noteIndex = 0;
  funeralIndex = 0;
  bossIndex = 0;

  init() {
    if (this.ctx) return;
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5; 
      } catch (e) {
        console.warn("AudioContext init error:", e);
      }
    }
  }

  resume() { 
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Audio resume error:", e));
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
        this.stopAllMusic();
    } else {
        if (this.isPlayingBoss) this.startBossMusic(); 
        else if (this.isPlayingFuneral) this.startFuneralMusic();
        else this.startMusic();
    }
    return this.musicEnabled;
  }

  playJump() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playBossHit() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playPowerUp() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playLifeUp() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playHurt() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPowerDown() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playDie() {
    if (!this.ctx || !this.sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
    this.dieTimerID = window.setTimeout(() => this.startFuneralMusic(), 500);
  }

  startMusic() {
    this.init();
    if (this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;
    this.stopAllMusic();
    this.isPlayingMusic = true;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  startBossMusic() {
    this.init();
    if (this.isPlayingBoss || !this.ctx || !this.musicEnabled) return;
    this.stopAllMusic();
    this.isPlayingBoss = true;
    this.bossIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.bossScheduler();
  }

  startFuneralMusic() {
    this.init();
    if (this.isPlayingFuneral || !this.ctx || !this.musicEnabled) return;
    this.stopAllMusic();
    this.isPlayingFuneral = true;
    this.funeralIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.funeralScheduler();
  }

  scheduler() {
    if (!this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playNote(this.melody[this.noteIndex], 'triangle');
      this.nextNoteTime += this.melody[this.noteIndex].len;
      this.noteIndex = (this.noteIndex + 1) % this.melody.length;
    }
    this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  bossScheduler() {
    if (!this.isPlayingBoss || !this.ctx || !this.musicEnabled) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playNote(this.bossMelody[this.bossIndex], 'sawtooth');
      this.nextNoteTime += this.bossMelody[this.bossIndex].len;
      this.bossIndex = (this.bossIndex + 1) % this.bossMelody.length;
    }
    this.bossTimerID = window.setTimeout(() => this.bossScheduler(), 25);
  }

  funeralScheduler() {
    if (!this.isPlayingFuneral || !this.ctx || !this.musicEnabled) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playNote(this.funeralMelody[this.funeralIndex], 'sine');
      this.nextNoteTime += this.funeralMelody[this.funeralIndex].len;
      this.funeralIndex = (this.funeralIndex + 1) % this.funeralMelody.length;
    }
    this.funeralTimerID = window.setTimeout(() => this.funeralScheduler(), 25);
  }

  playNote(noteData: {note: number, len: number}, type: OscillatorType = 'triangle') {
    if (!this.ctx || noteData.note === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = noteData.note;
    gain.gain.setValueAtTime(0.06, this.nextNoteTime);
    gain.gain.linearRampToValueAtTime(0, this.nextNoteTime + noteData.len - 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(this.nextNoteTime);
    osc.stop(this.nextNoteTime + noteData.len);
  }

  stopAllMusic() {
    this.isPlayingMusic = false;
    this.isPlayingFuneral = false;
    this.isPlayingBoss = false;
    if (this.timerID) clearTimeout(this.timerID);
    if (this.funeralTimerID) clearTimeout(this.funeralTimerID);
    if (this.bossTimerID) clearTimeout(this.bossTimerID);
    if (this.dieTimerID) clearTimeout(this.dieTimerID);
  }
}

const audioRef = new SoundEngine();

const CapiGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'WIN'>('START');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [highScore, setHighScore] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [goldenTimeLeft, setGoldenTimeLeft] = useState<number>(0);

  const playerRef = useRef<Player>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 200,
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    vx: 0,
    vy: 0,
    isDead: false,
    facingRight: true,
    state: 'idle',
    isGolden: false,
    lives: INITIAL_LIVES,
    hasMoved: false
  });

  const platformsRef = useRef<Platform[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]); 
  const bossRef = useRef<Boss | null>(null);
  const cameraYRef = useRef(0);
  const scoreRef = useRef(0);
  const maxReachedYRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchInputRef = useRef<number>(0); 
  const cloudsRef = useRef<{x: number, y: number, speed: number, type: number}[]>([]);

  const initGame = useCallback(() => {
    audioRef.init();
    audioRef.resume();
    audioRef.stopAllMusic(); 
    audioRef.startMusic();

    playerRef.current = {
      x: GAME_WIDTH / 2 - PLAYER_SIZE.width / 2,
      y: GAME_HEIGHT - 200,
      width: PLAYER_SIZE.width,
      height: PLAYER_SIZE.height,
      vx: 0,
      vy: JUMP_FORCE, 
      isDead: false,
      facingRight: true,
      state: 'jump',
      isGolden: false,
      lives: INITIAL_LIVES, // Empezar con 3
      hasMoved: false,
      invulnerableUntil: 0
    };
    audioRef.playJump();

    cameraYRef.current = 0;
    scoreRef.current = 0;
    maxReachedYRef.current = 0;
    setScore(0);
    setLevel(1);
    setLives(INITIAL_LIVES);
    setGoldenTimeLeft(0);
    bossRef.current = null;
    
    const startPlatforms: Platform[] = [];
    startPlatforms.push({
      id: 0, x: 0, y: GAME_HEIGHT - 50, width: GAME_WIDTH, height: 20, type: PlatformType.NORMAL, active: true
    });

    for (let i = 1; i < 10; i++) {
      startPlatforms.push(generatePlatform(GAME_HEIGHT - 50 - (i * 120)));
    }
    platformsRef.current = startPlatforms;
    itemsRef.current = [];
    particlesRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    
    cloudsRef.current = [];
    for(let i=0; i<10; i++) {
        cloudsRef.current.push({
            x: Math.random() * GAME_WIDTH, y: Math.random() * GAME_HEIGHT, speed: 0.2 + Math.random() * 0.5, type: Math.floor(Math.random() * 2)
        });
    }

    setGameState('PLAYING');
  }, []);

  const generatePlatform = (y: number): Platform => {
    const minWidth = PLATFORM_SIZE.width;
    const maxWidth = PLATFORM_SIZE.width * 1.5;
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    const x = Math.random() * (GAME_WIDTH - width);
    let type = PlatformType.NORMAL;
    const rand = Math.random();
    const currentLevel = Math.floor(Math.abs(scoreRef.current) / LEVEL_HEIGHT_THRESHOLD) + 1;
    if (rand > 0.95) type = PlatformType.BOOST;
    else if (rand > 0.8 && currentLevel > 5) type = PlatformType.BREAKABLE;
    else if (rand > 0.7 && currentLevel > 2) type = PlatformType.MOVING;
    const gridX = Math.floor(x / PIXEL_SCALE) * PIXEL_SCALE;
    const gridY = Math.floor(y / PIXEL_SCALE) * PIXEL_SCALE;
    return { id: Math.random(), x: gridX, y: gridY, width, height: PLATFORM_SIZE.height, type, active: true, speed: type === PlatformType.MOVING ? (Math.random() > 0.5 ? 2 : -2) : 0, direction: Math.random() > 0.5 ? 1 : -1 };
  };

  const generateEnemy = (y: number): Enemy => {
    return { id: Math.random(), x: Math.random() * (GAME_WIDTH - ENEMY_SIZE.width), y: y, width: ENEMY_SIZE.width, height: ENEMY_SIZE.height, speed: 2 + Math.random() * 2, range: 100 + Math.random() * 100, startX: Math.random() * (GAME_WIDTH - ENEMY_SIZE.width) };
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1.0, color, size: Math.random() * 6 + 4 });
    }
  };

  const update = () => {
    if (gameState !== 'PLAYING') return;

    const player = playerRef.current;
    
    if (player.isGolden && player.goldenEndTime && !bossRef.current) {
        if (Date.now() > player.goldenEndTime) {
            player.isGolden = false;
            player.goldenEndTime = undefined;
            audioRef.playPowerDown();
            createParticles(player.x + player.width/2, player.y, COLORS.white, 10);
        }
    }

    let inputDir = 0;
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) inputDir = -1;
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) inputDir = 1;
    if (touchInputRef.current !== 0) inputDir = touchInputRef.current;

    if (inputDir !== 0) {
        player.vx += inputDir * 0.8;
        player.facingRight = inputDir > 0;
        player.hasMoved = true;
    }

    player.vx *= FRICTION;
    player.x += player.vx;
    if (player.vx > MOVE_SPEED) player.vx = MOVE_SPEED;
    if (player.vx < -MOVE_SPEED) player.vx = -MOVE_SPEED;

    if (player.x + player.width < 0) player.x = GAME_WIDTH;
    if (player.x > GAME_WIDTH) player.x = -player.width;

    player.vy += GRAVITY;
    player.y += player.vy;
    player.state = player.vy < 0 ? 'jump' : 'fall';

    if (player.vy > 0) {
      for (const platform of platformsRef.current) {
        if (!platform.active) continue;
        if (player.x < platform.x + platform.width && player.x + player.width > platform.x && player.y + player.height > platform.y && player.y + player.height < platform.y + platform.height + 20) {
          if (platform.type === PlatformType.BREAKABLE) {
            platform.active = false;
            createParticles(platform.x + platform.width/2, platform.y, COLORS.platformBreakable, 8);
          }
          let force = player.isGolden ? GOLDEN_JUMP_FORCE : JUMP_FORCE;
          if (platform.type === PlatformType.BOOST) {
            force = BOOST_FORCE;
            if (player.isGolden) force = GOLDEN_JUMP_FORCE * 1.2;
            createParticles(player.x + player.width/2, player.y + player.height, COLORS.platformBoost, 12);
            audioRef.playJump();
          } else { createParticles(player.x + player.width/2, player.y + player.height, COLORS.grassTop, 4); }
          audioRef.playJump();
          player.vy = force;
          player.y = platform.y - player.height;
          player.hasMoved = true; 
          break;
        }
      }
    }

    for (const item of itemsRef.current) {
        if (!item.active) continue;
        if (player.x < item.x + item.width && player.x + player.width > item.x && player.y < item.y + item.height && player.y + player.height > item.y) {
            item.active = false;
            if (item.type === 'GOLDEN_CARROT') {
                player.isGolden = true;
                player.goldenEndTime = Date.now() + GOLDEN_DURATION_MS;
                player.vy = GOLDEN_JUMP_FORCE;
                audioRef.playPowerUp();
                createParticles(player.x + player.width/2, player.y, COLORS.goldenGlow, 20);
            } else if (item.type === 'NORMAL_CARROT') {
                player.lives = Math.min(player.lives + 1, MAX_LIVES); // Curar hasta 5
                audioRef.playLifeUp();
                createParticles(player.x + player.width/2, player.y, COLORS.carrotBody, 10);
            }
        }
    }

    // --- Lógica del JEFE FINAL ---
    if (bossRef.current && bossRef.current.active) {
      const boss = bossRef.current;
      if (boss.invulnerableTimer > 0) boss.invulnerableTimer--;

      boss.x += boss.speed;
      if (boss.x < 0 || boss.x + boss.width > GAME_WIDTH) boss.speed *= -1;

      // El jefe siempre intenta estar un poco por encima del jugador pero en la parte superior del canvas
      const targetBossY = cameraYRef.current + 100; 
      boss.y += (targetBossY - boss.y) * 0.05; 

      if (boss.attackTimer > 0) {
          boss.attackTimer--;
      } else {
          // Ataque triple ráfaga
          const spawnX = boss.x + boss.width / 2;
          const spawnY = boss.y + boss.height / 2;
          projectilesRef.current.push({ id: Math.random(), x: spawnX, y: spawnY, width: 16, height: 20, vx: 0, vy: 8, type: 'BOSS_RAY', active: true });
          projectilesRef.current.push({ id: Math.random(), x: spawnX, y: spawnY, width: 16, height: 20, vx: -3, vy: 7, type: 'BOSS_RAY', active: true });
          projectilesRef.current.push({ id: Math.random(), x: spawnX, y: spawnY, width: 16, height: 20, vx: 3, vy: 7, type: 'BOSS_RAY', active: true });
          boss.attackTimer = 180; 
      }

      // Colisión de ataque: Capi le da "cabezazos" cayendo sobre él
      const bossHitboxPadding = 5;
      if (player.x < boss.x + boss.width - bossHitboxPadding && player.x + player.width > boss.x + bossHitboxPadding &&
          player.y < boss.y + boss.height - bossHitboxPadding && player.y + player.height > boss.y + bossHitboxPadding) {
        
        // Si el jugador está cayendo (vy > 0) y está por encima del centro del jefe -> ¡DAÑO!
        if (player.vy > 0 && player.y + player.height < boss.y + boss.height * 0.7 && boss.invulnerableTimer <= 0) {
          boss.hp -= 1;
          boss.invulnerableTimer = 40;
          player.vy = GOLDEN_JUMP_FORCE * 0.8; // Rebote
          audioRef.playBossHit();
          createParticles(boss.x + boss.width/2, boss.y + boss.height/2, COLORS.enemy, 20);
          if (boss.hp <= 0) {
            boss.active = false;
            createParticles(boss.x + boss.width/2, boss.y + boss.height/2, COLORS.white, 50);
            setTimeout(() => setGameState('WIN'), 1000);
          }
        } else if (boss.invulnerableTimer <= 0) {
             const now = Date.now();
             if (!player.invulnerableUntil || now > player.invulnerableUntil) {
                 player.lives--;
                 player.invulnerableUntil = now + 1500;
                 audioRef.playHurt();
                 createParticles(player.x, player.y, COLORS.enemy, 10);
                 player.vy = JUMP_FORCE;
                 player.vx = player.x < boss.x ? -8 : 8;
                 if (player.lives <= 0) setGameState('GAME_OVER');
             }
        }
      }
    }

    projectilesRef.current.forEach(proj => {
        if (!proj.active) return;
        proj.x += proj.vx;
        proj.y += proj.vy;

        if (proj.type === 'BOSS_RAY') {
             if (player.x < proj.x + proj.width && player.x + player.width > proj.x &&
                player.y < proj.y + proj.height && player.y + player.height > proj.y) {
                 const now = Date.now();
                 if (!player.invulnerableUntil || now > player.invulnerableUntil) {
                     player.lives--;
                     player.invulnerableUntil = now + 1500;
                     audioRef.playHurt();
                     createParticles(player.x, proj.y, COLORS.white, 8);
                     if (player.lives <= 0) setGameState('GAME_OVER');
                 }
                 proj.active = false; 
             }
        }

        if (proj.y > cameraYRef.current + GAME_HEIGHT + 100 || proj.y < cameraYRef.current - 200) {
            proj.active = false;
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.active);

    for (const enemy of enemiesRef.current) {
        enemy.x += enemy.speed;
        if (enemy.x > enemy.startX + enemy.range || enemy.x < enemy.startX - enemy.range || enemy.x > GAME_WIDTH || enemy.x < 0) enemy.speed *= -1;
        const hitboxPadding = 8;
        if (player.x + hitboxPadding < enemy.x + enemy.width - hitboxPadding && player.x + player.width - hitboxPadding > enemy.x + hitboxPadding &&
            player.y + hitboxPadding < enemy.y + enemy.height - hitboxPadding && player.y + player.height - hitboxPadding > enemy.y + hitboxPadding) {
            
            const now = Date.now();
            if (player.isGolden) {
                 createParticles(enemy.x, enemy.y, COLORS.enemy, 15);
                 enemy.y = 99999; 
                 audioRef.playJump();
            } else if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2 + 10) {
                 player.vy = JUMP_FORCE;
                 audioRef.playJump();
                 createParticles(enemy.x, enemy.y, COLORS.enemy, 10);
                 enemy.y = 99999; 
            } else if (!player.invulnerableUntil || now > player.invulnerableUntil) {
                player.lives--;
                player.invulnerableUntil = now + 1500;
                audioRef.playHurt();
                createParticles(player.x, player.y, COLORS.enemy, 10);
                player.vy = JUMP_FORCE;
                if (player.lives <= 0) setGameState('GAME_OVER');
            }
        }
    }

    const cameraTarget = player.y - GAME_HEIGHT / 2;
    if (cameraTarget < cameraYRef.current) cameraYRef.current = cameraTarget;

    const currentHeightScore = Math.floor(Math.abs(Math.min(0, player.y)));
    if (currentHeightScore > maxReachedYRef.current) {
      maxReachedYRef.current = currentHeightScore;
      scoreRef.current = currentHeightScore;
      const newLevel = Math.floor(scoreRef.current / LEVEL_HEIGHT_THRESHOLD) + 1;
      if (newLevel !== level) {
          setLevel(newLevel);
          if (newLevel >= MAX_LEVEL && !bossRef.current) {
            bossRef.current = {
              x: GAME_WIDTH / 2 - BOSS_SIZE.width / 2,
              y: cameraYRef.current - 300, 
              width: BOSS_SIZE.width,
              height: BOSS_SIZE.height,
              hp: BOSS_HP,
              maxHp: BOSS_HP,
              speed: 4,
              active: true,
              invulnerableTimer: 0,
              attackTimer: 100 
            };
            player.isGolden = true;
            player.goldenEndTime = undefined; 
            createParticles(player.x, player.y, COLORS.goldenGlow, 50);
            audioRef.playPowerUp();
            audioRef.startBossMusic();
            
            // Suelo final para la batalla
            platformsRef.current = platformsRef.current.filter(p => p.y > cameraYRef.current);
            platformsRef.current.push({
              id: 9999, x: 0, y: cameraYRef.current + GAME_HEIGHT - 60, width: GAME_WIDTH, height: 20, type: PlatformType.NORMAL, active: true
            });
          }
      }
    }

    // Generación de plataformas y enemigos dobles
    if (level < MAX_LEVEL) {
      const highestPlatformY = platformsRef.current.length > 0 ? Math.min(...platformsRef.current.map(p => p.y)) : 0;
      if (highestPlatformY > cameraYRef.current - 100) {
        const newY = highestPlatformY - (65 + Math.random() * 45);
        platformsRef.current.push(generatePlatform(newY));
        
        // --- ENEMIGOS DOBLES CADA 5 NIVELES ---
        let enemyChance = 0.2;
        if (level % 5 === 0) enemyChance = 0.6; // Mucho más probable cada 5 niveles
        
        if (Math.random() < enemyChance && level > 2) {
            enemiesRef.current.push(generateEnemy(newY - 50));
            // Si es nivel múltiplo de 5, añadimos un segundo enemigo cerca
            if (level % 5 === 0 && Math.random() > 0.5) {
                enemiesRef.current.push(generateEnemy(newY - 150));
            }
        }
        
        if (!player.isGolden) {
             const r = Math.random();
             if (r > 0.994) itemsRef.current.push({ id: Math.random(), x: Math.random() * (GAME_WIDTH - ITEM_SIZE.width), y: newY - 60, width: ITEM_SIZE.width, height: ITEM_SIZE.height, type: 'GOLDEN_CARROT', active: true });
             else if (r > 0.985) itemsRef.current.push({ id: Math.random(), x: Math.random() * (GAME_WIDTH - ITEM_SIZE.width), y: newY - 60, width: ITEM_SIZE.width, height: ITEM_SIZE.height, type: 'NORMAL_CARROT', active: true });
        }
      }
    }

    platformsRef.current = platformsRef.current.filter(p => p.y < cameraYRef.current + GAME_HEIGHT + 100);
    enemiesRef.current = enemiesRef.current.filter(e => e.y < cameraYRef.current + GAME_HEIGHT + 100 && e.y < 90000);
    itemsRef.current = itemsRef.current.filter(i => i.y < cameraYRef.current + GAME_HEIGHT + 100);
    platformsRef.current.forEach(p => { if (p.type === PlatformType.MOVING && p.speed) { p.x += p.speed; if (p.x < 0 || p.x + p.width > GAME_WIDTH) p.speed *= -1; } });

    if (player.y > cameraYRef.current + GAME_HEIGHT) {
      if (player.isGolden) { 
          player.vy = GOLDEN_JUMP_FORCE * 1.5; 
          audioRef.playPowerUp(); 
          createParticles(player.x + player.width/2, player.y, COLORS.goldenGlow, 10); 
      } else { 
          player.lives--;
          audioRef.playHurt();
          if (player.lives > 0) {
              player.vy = GOLDEN_JUMP_FORCE; 
              player.invulnerableUntil = Date.now() + 1500;
              createParticles(player.x + player.width/2, player.y, COLORS.white, 15);
          } else {
              setGameState('GAME_OVER'); 
          }
      }
    }

    particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.05; });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    cloudsRef.current.forEach(c => { c.y += c.speed; if (c.y > cameraYRef.current + GAME_HEIGHT + 100) { c.y = cameraYRef.current - 100; c.x = Math.random() * GAME_WIDTH; } });
  };

  const drawPixelRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => { 
    ctx.fillStyle = color; 
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h)); 
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    if (level < MAX_LEVEL) {
      grad.addColorStop(0, COLORS.skyTop);
      grad.addColorStop(1, COLORS.skyBottom);
    } else {
      grad.addColorStop(0, COLORS.bossSkyTop);
      grad.addColorStop(1, COLORS.bossSkyBottom);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    ctx.translate(0, -Math.floor(cameraYRef.current));
    
    if (level < MAX_LEVEL) {
      cloudsRef.current.forEach(c => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          const width = c.type === 0 ? 60 : 100; const height = 24;
          ctx.fillRect(c.x, c.y, width, height); ctx.fillRect(c.x + 10, c.y - 10, width - 20, 10);
      });
    }

    platformsRef.current.forEach(p => {
      if (!p.active) return;
      let topColor = COLORS.grassTop, topLight = COLORS.grassHighlight, bodyColor = COLORS.dirtBody;
      if (p.type === PlatformType.MOVING) { topColor = COLORS.platformMoving; topLight = COLORS.platformMovingLight; bodyColor = '#0369a1'; }
      if (p.type === PlatformType.BREAKABLE) { topColor = COLORS.platformBreakable; topLight = '#cbd5e1'; bodyColor = COLORS.platformBreakableCrack; }
      if (p.type === PlatformType.BOOST) { topColor = COLORS.platformBoost; topLight = COLORS.platformBoostLight; bodyColor = '#be185d'; }
      drawPixelRect(ctx, p.x, p.y + 4, p.width, p.height - 4, bodyColor);
      drawPixelRect(ctx, p.x + p.width - 4, p.y + 4, 4, p.height - 4, 'rgba(0,0,0,0.2)');
      drawPixelRect(ctx, p.x, p.y + p.height - 4, p.width, 4, 'rgba(0,0,0,0.2)');
      drawPixelRect(ctx, p.x, p.y, p.width, 6, topColor);
      drawPixelRect(ctx, p.x, p.y, p.width, 2, topLight);
    });

    if (bossRef.current && bossRef.current.active) {
      const b = bossRef.current;
      const bx = Math.floor(b.x), by = Math.floor(b.y);
      if (!(b.invulnerableTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0)) {
        ctx.fillStyle = COLORS.eggBody;
        ctx.beginPath();
        ctx.ellipse(bx + b.width/2, by + b.height/2, b.width/2, b.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.eggCracks;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + 20, by + 40); ctx.lineTo(bx + 30, by + 50); ctx.lineTo(bx + 25, by + 60);
        ctx.stroke();
        ctx.fillStyle = COLORS.eggEyes;
        drawPixelRect(ctx, bx + 20, by + 30, 10, 10, COLORS.eggEyes);
        drawPixelRect(ctx, bx + 50, by + 30, 10, 10, COLORS.eggEyes);
        ctx.fillStyle = COLORS.black;
        ctx.beginPath();
        ctx.moveTo(bx + 15, by + 25); ctx.lineTo(bx + 35, by + 35);
        ctx.moveTo(bx + 65, by + 25); ctx.lineTo(bx + 45, by + 35);
        ctx.stroke();
      }
    }

    itemsRef.current.forEach(item => {
        if (!item.active) return;
        const cx = Math.floor(item.x), cy = Math.floor(item.y), offset = Math.sin(Date.now() / 200) * 4;
        let bodyColor = item.type === 'GOLDEN_CARROT' ? COLORS.goldenSuit : COLORS.carrotBody;
        if (item.type === 'GOLDEN_CARROT') { ctx.shadowColor = COLORS.goldenGlow; ctx.shadowBlur = 10; }
        drawPixelRect(ctx, cx + 6, cy + 8 + offset, 12, 16, bodyColor);
        drawPixelRect(ctx, cx + 8, cy + 24 + offset, 8, 4, bodyColor);
        drawPixelRect(ctx, cx + 10, cy + 28 + offset, 4, 2, bodyColor);
        drawPixelRect(ctx, cx + 4, cy + offset, 8, 8, COLORS.carrotLeaf);
        drawPixelRect(ctx, cx + 12, cy + offset, 8, 8, COLORS.carrotLeaf);
        ctx.shadowBlur = 0;
    });

    projectilesRef.current.forEach(p => {
        if (p.type === 'BOSS_RAY') {
            drawPixelRect(ctx, p.x, p.y, p.width, p.height, COLORS.projectile);
            ctx.shadowColor = COLORS.projectile;
            ctx.shadowBlur = 5;
            drawPixelRect(ctx, p.x + 2, p.y, p.width - 4, p.height, '#fff');
            ctx.shadowBlur = 0;
        }
    });

    enemiesRef.current.forEach(e => {
        const cx = Math.floor(e.x), cy = Math.floor(e.y);
        const frame = Math.floor(Date.now() / 150) % 2;
        ctx.fillStyle = COLORS.black;
        if (frame === 0) {
            drawPixelRect(ctx, cx - 4, cy - 2, 8, 12, COLORS.black);
            drawPixelRect(ctx, cx + 28, cy - 2, 8, 12, COLORS.black);
        } else {
            drawPixelRect(ctx, cx - 4, cy + 8, 8, 12, COLORS.black);
            drawPixelRect(ctx, cx + 28, cy + 8, 8, 12, COLORS.black);
        }
        drawPixelRect(ctx, cx + 4, cy, 24, 32, COLORS.eggBody);
        drawPixelRect(ctx, cx + 8, cy + 12, 6, 4, COLORS.enemy);
        drawPixelRect(ctx, cx + 18, cy + 12, 6, 4, COLORS.enemy);
        drawPixelRect(ctx, cx + 8, cy + 10, 6, 2, COLORS.black);
        drawPixelRect(ctx, cx + 18, cy + 10, 6, 2, COLORS.black);
        drawPixelRect(ctx, cx + 14, cy + 20, 4, 2, COLORS.black);
    });

    particlesRef.current.forEach(p => drawPixelRect(ctx, p.x, p.y, p.size, p.size, p.color));
    drawPixelCapybara(ctx, playerRef.current);
    ctx.restore();

    if (bossRef.current && bossRef.current.active) {
      const b = bossRef.current;
      const hpWidth = 200;
      const currentHpWidth = (b.hp / b.maxHp) * hpWidth;
      drawPixelRect(ctx, GAME_WIDTH/2 - hpWidth/2, 60, hpWidth, 20, '#450a0a');
      drawPixelRect(ctx, GAME_WIDTH/2 - hpWidth/2, 60, currentHpWidth, 20, '#ef4444');
      ctx.fillStyle = 'white';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('HUEVO MALVADO', GAME_WIDTH/2 - 60, 50);
    }
  };

  const drawPixelCapybara = (ctx: CanvasRenderingContext2D, p: Player) => {
    const { x, y, width, height, facingRight, isGolden, goldenEndTime, hasMoved, invulnerableUntil } = p;
    if (invulnerableUntil && Date.now() < invulnerableUntil && Math.floor(Date.now() / 50) % 2 === 0) return;
    const px = Math.floor(x), py = Math.floor(y);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(px + width/2, py + height - 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (!facingRight) { ctx.translate(px + width, py); ctx.scale(-1, 1); ctx.translate(-px, -py); }
    const rect = (rx: number, ry: number, rw: number, rh: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(px + rx, py + ry, rw, rh); };
    let mainColor = isGolden ? COLORS.goldenSuit : COLORS.chicaSuit; 
    let darkColor = isGolden ? COLORS.goldenDark : COLORS.chicaDark; 
    if (isGolden && goldenEndTime && (goldenEndTime - Date.now() < 5000) && Math.floor(Date.now() / 200) % 2 === 0) {
        mainColor = COLORS.chicaSuit; darkColor = COLORS.chicaDark;
    }
    if (isGolden) { ctx.fillStyle = COLORS.goldenGlow; ctx.globalAlpha = 0.5; ctx.fillRect(px - 2, py - 2, width + 4, height + 4); ctx.globalAlpha = 1.0; }
    const showActive = hasMoved;
    rect(6, 2, 28, 22, mainColor); rect(4, 2, 6, 8, mainColor); rect(30, 2, 6, 8, mainColor); rect(14, 0, 12, 6, mainColor); 
    rect(12, 6, 16, 8, darkColor); rect(14, 10, 2, 3, '#000'); rect(24, 10, 2, 3, '#000'); rect(8, 8, 3, 3, '#000'); rect(29, 8, 3, 3, '#000');
    rect(10, 16, 20, 10, COLORS.chicaSkin); rect(10, 16, 20, 4, COLORS.chicaHair); rect(8, 18, 4, 8, COLORS.chicaHair); rect(28, 18, 4, 8, COLORS.chicaHair); 
    rect(14, 21, 2, 3, '#000'); rect(24, 21, 2, 3, '#000'); rect(12, 23, 3, 2, COLORS.chicaBlush); rect(25, 23, 3, 2, COLORS.chicaBlush);
    if (showActive) {
        rect(12, 26, 16, 10, mainColor); rect(2, 18, 8, 6, mainColor); rect(0, 16, 4, 4, COLORS.chicaGloves); rect(30, 18, 8, 6, mainColor); rect(36, 16, 4, 4, COLORS.chicaGloves); 
        rect(6, 32, 8, 6, mainColor); rect(26, 32, 8, 6, mainColor); rect(4, 36, 6, 6, COLORS.chicaBoots); rect(30, 36, 6, 6, COLORS.chicaBoots); rect(19, 24, 2, 2, '#fff');
    } else {
        rect(10, 26, 20, 12, mainColor); rect(4, 26, 6, 8, mainColor); rect(4, 34, 6, 4, COLORS.chicaGloves); rect(30, 26, 6, 8, mainColor); rect(30, 34, 6, 4, COLORS.chicaGloves); 
        rect(12, 36, 6, 4, mainColor); rect(22, 36, 6, 4, mainColor); rect(10, 38, 8, 4, COLORS.chicaBoots); rect(22, 38, 8, 4, COLORS.chicaBoots); rect(19, 24, 2, 1, '#a67c52'); 
    }
    if (!showActive) rect(18, 32, 4, 4, darkColor);
    ctx.restore();
  };

  const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
  const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState === 'START' || gameState === 'GAME_OVER' || gameState === 'WIN') { initGame(); return; }
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = clientX - rect.left;
    const width = rect.width;
    if (relX < width / 2) touchInputRef.current = -1;
    else touchInputRef.current = 1;
  };
  const handleTouchEnd = () => { touchInputRef.current = 0; };
  const toggleMusic = (e: React.MouseEvent) => { e.stopPropagation(); setMusicOn(audioRef.toggleMusic()); };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); audioRef.stopAllMusic(); };
  }, []);
  
  useEffect(() => { if (gameState === 'GAME_OVER') { audioRef.stopAllMusic(); audioRef.playDie(); } }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return;
    canvas.width = GAME_WIDTH; canvas.height = GAME_HEIGHT;
    const render = () => { update(); draw(ctx); animationFrameRef.current = requestAnimationFrame(render); };
    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, level]);

  useEffect(() => {
      const interval = setInterval(() => {
          if (gameState === 'PLAYING') {
              setScore(scoreRef.current);
              setLives(playerRef.current.lives);
              if (playerRef.current.isGolden && playerRef.current.goldenEndTime && !bossRef.current) setGoldenTimeLeft(Math.max(0, Math.ceil((playerRef.current.goldenEndTime - Date.now()) / 1000)));
              else setGoldenTimeLeft(0);
          }
      }, 100);
      return () => clearInterval(interval);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 select-none overflow-hidden font-['Press_Start_2P']">
      <div 
        ref={containerRef}
        className="relative shadow-2xl overflow-hidden rounded-xl border-4 border-slate-700 bg-sky-300 w-full max-w-[500px]"
        style={{ paddingBottom: '200%' }}
        onMouseDown={handleTouchStart} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

        <div className="absolute top-4 left-4 text-white text-[10px] z-10" style={{textShadow: '2px 2px 0px #1e3a8a'}}>
            <div className="mb-2 flex items-center gap-1">
                {Array.from({length: MAX_LIVES}).map((_, i) => (
                    <Heart 
                        key={i} 
                        size={12} 
                        fill={i < lives ? "#ef4444" : "none"} 
                        className={i < lives ? "text-red-500" : "text-gray-400 opacity-50"} 
                    />
                ))}
            </div>
            <div className="mb-2">NIVEL {level}</div>
            <div className="text-yellow-300">PUNTOS {score}</div>
            {goldenTimeLeft > 0 && <div className="mt-2 text-yellow-400 animate-pulse border-l-4 border-yellow-500 pl-2">GOLDEN CAPI: {goldenTimeLeft}s</div>}
        </div>
        
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end">
            <button onClick={toggleMusic} className="text-white p-2 bg-black/40 rounded border border-white/20 hover:bg-black/60 flex gap-2 items-center text-[8px] backdrop-blur-sm mb-1">
                {musicOn ? <Volume2 size={12} /> : <VolumeX size={12} />} <span>MÚSICA</span>
            </button>
        </div>

        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-40 text-center p-4">
            <h1 className="text-3xl text-yellow-400 mb-2 leading-relaxed" style={{textShadow: '4px 4px 0px #b45309'}}>CAPI JUMP</h1>
            <div className="text-yellow-200 text-[10px] mb-8 animate-pulse">AxelxAnimesGames</div>
            <button onClick={initGame} className="bg-pink-500 hover:bg-pink-400 text-white text-xs py-4 px-8 rounded border-b-4 border-pink-700 active:border-b-0 active:translate-y-1 transition-all shadow-xl">¡A JUGAR!</button>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-40 text-center">
            <h2 className="text-3xl mb-6 text-red-300">¡CAÍSTE!</h2>
            <button onClick={initGame} className="bg-white text-black text-xs py-3 px-6 rounded border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 shadow-lg">REINTENTAR</button>
          </div>
        )}

        {gameState === 'WIN' && (
          <div className="absolute inset-0 bg-yellow-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 text-center p-4">
             <Trophy size={64} className="text-yellow-300 mb-6 animate-bounce drop-shadow-lg" />
            <h2 className="text-3xl mb-4 text-white">¡DERROTASTE AL HUEVO!</h2>
            <p className="mb-8 text-xs leading-5">¡LA CAPIBARA ES LA REINA DEL CIELO!</p>
            <button onClick={initGame} className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-3 px-6 rounded border-b-4 border-blue-800 shadow-lg">JUGAR OTRA VEZ</button>
          </div>
        )}
      </div>
      <div className="mt-4 text-slate-500 text-[10px]">Capi Jump (AxelxAnimesGames)</div>
    </div>
  );
};

export default CapiGame;
