// ─── Constants ───────────────────────────────────────────────────────────────

export const SHIP_W = 52;
export const BULLET_W = 6;
export const BULLET_H = 18;
export const BULLET_SPEED = 12;
export const NUM_SIZE = 48;
export const ROCK_MAX_HP = 3;
export const BASE_FALL_SPEED = 1.0;
export const ANSWER_COUNT = 5;
export const MAX_LIVES = 3;
export const MAX_LIVES_CAP = 5;
export const DRAG_THRESHOLD = 6;
export const TAP_MAX_DURATION = 180;
export const PARTICLE_COUNT = 12;
export const PARTICLE_SPEED = 5;
export const PARTICLE_LIFETIME = 28;

// Power-up constants
export const POWERUP_SIZE = 32;
export const POWERUP_FALL_SPEED = 1.5;
export const POWERUP_DROP_CHANCE = 0.25;
export const BAD_DROP_CHANCE = 0.2;
export const POWERUP_DURATION = 600; // ~10 seconds at 60fps
export const BAD_EFFECT_DURATION = 300; // ~5 seconds at 60fps
export const DOUBLE_SHOT_DURATION = 600; // ~10 seconds at 60fps

// Streak / ship-level constants
export const STREAK_THRESHOLDS = [0, 5, 10, 15, 20];
export const BULLET_SPEED_BONUS = [0, 2, 4, 6, 8];

// Round transition cooldown — frames to ignore bullet-rock collisions after a new question
export const ROUND_COOLDOWN_FRAMES = 40;

export const DIFFICULTY_NAMES = ['Beginner', 'Easy', 'Normal', 'Hard', 'Expert'];
const DIFFICULTY_FALL_MUL  = [0.45, 0.7, 1.0, 1.4, 1.9];
const DIFFICULTY_FALL_RAMP = [0.01, 0.025, 0.05, 0.075, 0.12];

// ─── Levels ───────────────────────────────────────────────────────────────────

export type LevelDef = {
  difficulty: number;          // 1–5 maps to existing difficulty system
  questionsToWin: number;      // correct answers needed to complete level
  starThresholds: [number, number]; // [maxMistakes for 3★, maxMistakes for 2★]
};

export const LEVELS: LevelDef[] = [
  // Difficulty 1 – Beginner (levels 1–12)
  { difficulty: 1, questionsToWin: 3,  starThresholds: [0, 2] },
  { difficulty: 1, questionsToWin: 4,  starThresholds: [0, 2] },
  { difficulty: 1, questionsToWin: 5,  starThresholds: [0, 2] },
  { difficulty: 1, questionsToWin: 5,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 10, starThresholds: [0, 1] },
  { difficulty: 1, questionsToWin: 12, starThresholds: [0, 1] },
  // Difficulty 2 – Easy (levels 13–24)
  { difficulty: 2, questionsToWin: 5,  starThresholds: [0, 2] },
  { difficulty: 2, questionsToWin: 5,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 9,  starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 10, starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 11, starThresholds: [0, 1] },
  { difficulty: 2, questionsToWin: 12, starThresholds: [0, 1] },
  // Difficulty 3 – Normal (levels 25–36)
  { difficulty: 3, questionsToWin: 5,  starThresholds: [0, 2] },
  { difficulty: 3, questionsToWin: 5,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 9,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 9,  starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 10, starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 11, starThresholds: [0, 1] },
  { difficulty: 3, questionsToWin: 12, starThresholds: [0, 1] },
  // Difficulty 4 – Hard (levels 37–48)
  { difficulty: 4, questionsToWin: 5,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 5,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 9,  starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 10, starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 11, starThresholds: [0, 1] },
  { difficulty: 4, questionsToWin: 12, starThresholds: [0, 1] },
  // Difficulty 5 – Expert (levels 49–60)
  { difficulty: 5, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 6,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 7,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 8,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 9,  starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 10, starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 11, starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 12, starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 14, starThresholds: [0, 1] },
  { difficulty: 5, questionsToWin: 15, starThresholds: [0, 1] },
];

/** Returns 3, 2 or 1 stars based on how many mistakes were made. */
export function computeStars(levelNum: number, mistakes: number): 1 | 2 | 3 {
  const def = LEVELS[levelNum - 1];
  if (!def) return 1;
  if (mistakes <= def.starThresholds[0]) return 3;
  if (mistakes <= def.starThresholds[1]) return 2;
  return 1;
}

export function shipY(sh: number): number {
  return sh - 130;
}

export function shipLevelFromStreak(streak: number): number {
  if (streak >= 20) return 4;
  if (streak >= 15) return 3;
  if (streak >= 10) return 2;
  if (streak >= 5) return 1;
  return 0;
}

export function shipScale(level: number): number {
  return 1 + level * 0.1;
}

/** Visual scale factor for a rock based on its current hp. */
export function rockScale(hp: number): number {
  if (hp >= 3) return 1.5;
  if (hp === 2) return 1.25;
  return 1.0;
}

// ─── Themes ──────────────────────────────────────────────────────────────────

export type BgTheme = {
  id: string;
  name: string;
  bg: string;
  star: string;
  light: boolean;
};

export type ShipTheme = {
  id: string;
  name: string;
  nose: string;
  noseLight: string;
  body: string;
  wing: string;
  wingMid: string;
  wingLight: string;
  flame: string;
};

export const BG_THEMES: BgTheme[] = [
  { id: 'space',    name: 'Deep Space', bg: '#06080F', star: '#ffffff', light: false },
  { id: 'nebula',   name: 'Nebula',    bg: '#0F0525', star: '#D8B4FE', light: false },
  { id: 'ocean',    name: 'Ocean',     bg: '#021B2E', star: '#7DD3FC', light: false },
  { id: 'crimson',  name: 'Crimson',   bg: '#150808', star: '#FCA5A5', light: false },
  { id: 'daylight', name: 'Daylight',  bg: '#E8F0FE', star: '#93C5FD', light: true },
  { id: 'meadow',   name: 'Meadow',   bg: '#ECFDF5', star: '#6EE7B7', light: true },
];

export const SHIP_THEMES: ShipTheme[] = [
  { id: 'classic', name: 'Classic', nose: '#7C9DFF', noseLight: '#A3BFFF', body: '#4A6CF7', wing: '#3A5BD7', wingMid: '#5577EE', wingLight: '#6B8CFF', flame: '#FF9F43' },
  { id: 'inferno', name: 'Inferno', nose: '#FF8A65', noseLight: '#FFAB91', body: '#E63946', wing: '#C1121F', wingMid: '#E63946', wingLight: '#FF6B6B', flame: '#FFD60A' },
  { id: 'emerald', name: 'Emerald', nose: '#6EE7B7', noseLight: '#A7F3D0', body: '#10B981', wing: '#059669', wingMid: '#34D399', wingLight: '#6EE7B7', flame: '#FCD34D' },
  { id: 'royal',   name: 'Royal',   nose: '#C4B5FD', noseLight: '#DDD6FE', body: '#8B5CF6', wing: '#6D28D9', wingMid: '#8B5CF6', wingLight: '#A78BFA', flame: '#F472B6' },
  { id: 'pink',    name: 'Pink',    nose: '#F9A8D4', noseLight: '#FBCFE8', body: '#EC4899', wing: '#BE185D', wingMid: '#EC4899', wingLight: '#F472B6', flame: '#FDE68A' },
];

export type NumShape = {
  id: string;
  name: string;
};

export const NUM_SHAPES: NumShape[] = [
  { id: 'circle',  name: 'Circle' },
  { id: 'stone',   name: 'Stone' },
  { id: 'hex',     name: 'Hexagon' },
  { id: 'diamond', name: 'Diamond' },
];

export function getBgTheme(id: string): BgTheme {
  return BG_THEMES.find(t => t.id === id) ?? BG_THEMES[0];
}

export function getShipTheme(id: string): ShipTheme {
  return SHIP_THEMES.find(t => t.id === id) ?? SHIP_THEMES[0];
}

export function getNumShape(id: string): NumShape {
  return NUM_SHAPES.find(s => s.id === id) ?? NUM_SHAPES[0];
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Question = { text: string; answer: number };
export const POWER_BULLET_W = 14; // width of a powered-up bullet
export type Bullet = { id: string; x: number; y: number; power?: boolean };
export type FallingNum = { id: string; value: number; x: number; y: number; correct: boolean; hp: number; maxHp: number; bomb?: boolean; gift?: boolean };
export type Particle = { id: string; x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number };
export type Star = { x: number; y: number; r: number; o: number };

export type PowerUpKind = 'life' | 'slow' | 'shield' | 'fast' | 'lose_life' | 'double_shot';
export type PowerUp = { id: string; kind: PowerUpKind; x: number; y: number; bad: boolean };

export const NOTIF_LIFETIME = 90; // ~1.5 seconds at 60fps
export type Notif = { id: string; text: string; color: string; x: number; y: number; life: number; size: number };

export type SoundEvent = 'goodHit' | 'badHit' | 'bombHit';

export type GameState = {
  _key: number;
  shipX: number;
  dragStartX: number;
  isDragging: boolean;
  touchStartTime: number;
  bullets: Bullet[];
  numbers: FallingNum[];
  particles: Particle[];
  question: Question;
  score: number;
  lives: number;
  over: boolean;
  paused: boolean;
  // Power-ups
  powerups: PowerUp[];
  slowTimer: number;
  shieldTimer: number;
  fastTimer: number;
  // Streak
  streak: number;
  shipLevel: number;
  // Notifications
  notifs: Notif[];
  // Sound events drained each frame by the platform layer
  soundEvents: SoundEvent[];
  // Frames remaining where bullets pass through rocks (transition buffer)
  roundCooldown: number;
  // Double shot timer
  doubleShotTimer: number;
  // Difficulty level 1–5 (derived from levelNum via LEVELS)
  difficulty: number;
  // Level system
  levelNum: number;
  questionsToWin: number;
  levelComplete: boolean;
  mistakes: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function createQuestion(difficulty = 3): Question {
  type Op = { sym: string; fn: (a: number, b: number) => number };
  const allOps: Op[] = [
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => a - b },
    { sym: '×', fn: (a, b) => a * b },
    { sym: '÷', fn: (a, b) => a / b },
  ];
  const di = Math.max(0, Math.min(4, difficulty - 1));
  const opCount = [1, 2, 3, 3, 4][di];
  const ops = allOps.slice(0, opCount);
  const op = ops[Math.floor(Math.random() * ops.length)];
  const minN = [1, 1, 2, 3, 4][di];
  const maxN = [5, 8, 10, 13, 16][di];
  if (op.sym === '÷') {
    const b = minN + Math.floor(Math.random() * (maxN - minN));
    const a = b * (2 + Math.floor(Math.random() * 5));
    return { text: `${a} ${op.sym} ${b}`, answer: a / b };
  }
  let a = minN + Math.floor(Math.random() * (maxN - minN));
  let b = minN + Math.floor(Math.random() * (maxN - minN));
  if (op.sym === '−' && a < b) [a, b] = [b, a];
  return { text: `${a} ${op.sym} ${b}`, answer: op.fn(a, b) };
}

export function createNumbers(answer: number, sw: number, score: number, difficulty = 3): FallingNum[] {
  const vals = new Set<number>([answer]);
  while (vals.size < ANSWER_COUNT) {
    let d = Math.floor(Math.random() * 10) + 1;
    if (Math.random() < 0.5) d = -d;
    const v = answer + d;
    if (v > 0) vals.add(v);
  }
  const arr = Array.from(vals).sort(() => Math.random() - 0.5);
  const gap = sw / (arr.length + 1);

  // Max HP ramps up with score, scaled by difficulty
  const di = Math.max(0, Math.min(4, difficulty - 1));
  const hpThresholds = [[99,99],[5,99],[3,8],[2,5],[1,3]][di];
  const maxHp = score < hpThresholds[0] ? 1 : score < hpThresholds[1] ? 2 : ROCK_MAX_HP;

  const rocks: FallingNum[] = arr.map((value, i) => {
    const hp = 1 + Math.floor(Math.random() * maxHp);
    // Stagger rocks into 3 depth tiers so horizontally-adjacent rocks never overlap
    // even at max HP scale (1.5×). Tier spacing (120px) > max rock size (72px = 1.5×48).
    // No random jitter — deterministic spacing guarantees min 48px clear gap between tiers.
    const tier = i % 3;
    return {
      id: `n${Date.now()}-${i}`,
      value,
      x: gap * (i + 1) - NUM_SIZE / 2,
      y: -(NUM_SIZE + 30 + tier * 120),
      correct: value === answer,
      hp,
      maxHp: hp,
    };
  });

  // Bomb rocks appear based on difficulty
  const bombThresholds = [[99,99],[8,99],[5,12],[3,8],[2,6]][di];
  const bombCount = score < bombThresholds[0] ? 0 : score < bombThresholds[1] ? 1 : 2;
  for (let b = 0; b < bombCount; b++) {
    let bx = 0;
    let attempts = 0;
    do {
      bx = NUM_SIZE + Math.random() * (sw - NUM_SIZE * 3);
      attempts++;
    } while (attempts < 20 && rocks.some(r => Math.abs(r.x - bx) < NUM_SIZE * 1.6));
    rocks.push({
      id: `bomb${Date.now()}-${b}-${Math.random()}`,
      value: 0,
      x: bx,
      y: -(NUM_SIZE + Math.random() * 250),
      correct: false,
      hp: 1,
      maxHp: 1,
      bomb: true,
    });
  }

  // Gift rock appears from score >= 3
  if (score >= 3) {
    let gx = 0;
    let attempts = 0;
    do {
      gx = NUM_SIZE + Math.random() * (sw - NUM_SIZE * 3);
      attempts++;
    } while (attempts < 20 && rocks.some(r => Math.abs(r.x - gx) < NUM_SIZE * 1.6));
    rocks.push({
      id: `special${Date.now()}-${Math.random()}`,
      value: 0,
      x: gx,
      y: -(NUM_SIZE + Math.random() * 250),
      correct: false,
      hp: 1,
      maxHp: 1,
      gift: true,
    });
  }

  return rocks;
}

export function spawnExplosion(cx: number, cy: number, correct: boolean): Particle[] {
  const primary = correct ? '#4ADE80' : '#F87171';
  const accent = correct ? '#22C55E' : '#EF4444';
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
    const spd = PARTICLE_SPEED * (0.4 + Math.random() * 0.8);
    return {
      id: `p${Date.now()}-${i}-${Math.random()}`,
      x: cx, y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1.5,
      color: i % 3 === 0 ? accent : primary,
      life: PARTICLE_LIFETIME,
      maxLife: PARTICLE_LIFETIME,
      size: 3 + Math.random() * 5,
    };
  });
}

export function spawnBullets(s: GameState, shipX: number, sh: number): void {
  const power = s.doubleShotTimer > 0;
  const bw = power ? POWER_BULLET_W : BULLET_W;
  const bx = shipX + SHIP_W / 2 - bw / 2;
  const by = shipY(sh) - BULLET_H;
  const wouldOverlap = s.bullets.some(b => {
    const ebw = b.power ? POWER_BULLET_W : BULLET_W;
    return overlaps(bx, by, bw, BULLET_H, b.x, b.y, ebw, BULLET_H);
  });
  if (wouldOverlap) return;
  s.bullets.push({ id: `b${Date.now()}-${Math.random()}`, x: bx, y: by, power });
}

export function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function makeState(key: number, sw: number, levelNum = 1): GameState {
  const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelNum - 1))];
  const difficulty = def.difficulty;
  const q = createQuestion(difficulty);
  return {
    _key: key,
    shipX: sw / 2 - SHIP_W / 2,
    dragStartX: 0,
    isDragging: false,
    touchStartTime: 0,
    bullets: [],
    numbers: createNumbers(q.answer, sw, 0, difficulty),
    particles: [],
    question: q,
    score: 0,
    lives: MAX_LIVES,
    over: false,
    paused: false,
    powerups: [],
    slowTimer: 0,
    shieldTimer: 0,
    fastTimer: 0,
    streak: 0,
    shipLevel: 0,
    notifs: [],
    soundEvents: [],
    roundCooldown: 0,
    doubleShotTimer: 0,
    difficulty,
    levelNum,
    questionsToWin: def.questionsToWin,
    levelComplete: false,
    mistakes: 0,
  };
}

function dropOneLevel(s: GameState): void {
  if (s.shipLevel > 0) {
    s.streak = STREAK_THRESHOLDS[s.shipLevel] - 1;
    if (s.streak < 0) s.streak = 0;
  } else {
    s.streak = 0;
  }
  s.shipLevel = shipLevelFromStreak(s.streak);
}

function addNotif(s: GameState, text: string, color: string, x: number, y: number, size = 22): void {
  s.notifs.push({ id: `nf${Date.now()}-${Math.random()}`, text, color, x, y, life: NOTIF_LIFETIME, size });
}

function maybeSpawnPowerUp(s: GameState, nx: number, ny: number, good: boolean): void {
  const chance = good ? POWERUP_DROP_CHANCE : BAD_DROP_CHANCE;
  if (Math.random() >= chance) return;
  const kinds: PowerUpKind[] = good ? ['life', 'slow', 'shield'] : ['fast', 'lose_life'];
  s.powerups.push({
    id: `pu${Date.now()}-${Math.random()}`,
    kind: kinds[Math.floor(Math.random() * kinds.length)],
    x: nx + NUM_SIZE / 2 - POWERUP_SIZE / 2,
    y: ny + NUM_SIZE / 2 - POWERUP_SIZE / 2,
    bad: !good,
  });
}

export function tickGame(s: GameState, sw: number, sh: number): void {
  if (s.over || s.levelComplete) return;
  const speedMul = s.slowTimer > 0 ? 0.4 : s.fastTimer > 0 ? 1.8 : 1;
  const _di = Math.max(0, Math.min(4, (s.difficulty ?? 3) - 1));
  const fallSpeed = (BASE_FALL_SPEED * DIFFICULTY_FALL_MUL[_di] + s.score * DIFFICULTY_FALL_RAMP[_di]) * speedMul;
  const bulletSpeed = BULLET_SPEED + BULLET_SPEED_BONUS[s.shipLevel];

  // Tick down transition cooldown
  if (s.roundCooldown > 0) s.roundCooldown--;

  // Move bullets
  s.bullets = s.bullets
    .map(b => ({ ...b, y: b.y - bulletSpeed }))
    .filter(b => b.y + BULLET_H > 0);

  // Move falling numbers, track what fell off
  let correctFell = false;
  s.numbers = s.numbers.filter(n => {
    n.y += fallSpeed;
    if (n.y > sh) {
      if (n.correct) correctFell = true;
      // bombs just disappear off screen — no penalty
      return false;
    }
    return true;
  });
  if (correctFell) {
    s.mistakes++;
    if (s.shieldTimer <= 0) s.lives = Math.max(0, s.lives - 1);
    dropOneLevel(s);
  }

  // Bullet–rock collisions (skipped during transition cooldown)
  let newRound = correctFell;
  const keptBullets: Bullet[] = [];
  for (const b of s.bullets) {
    if (newRound) break;
    if (s.roundCooldown > 0) {
      // During cooldown bullets pass through everything
      keptBullets.push(b);
      continue;
    }
    let hit = false;
    for (let i = s.numbers.length - 1; i >= 0; i--) {
      const n = s.numbers[i];
      const rs = rockScale(n.hp);
      const rSize = NUM_SIZE * rs;
      const rx = n.x + NUM_SIZE / 2 - rSize / 2;
      const ry = n.y + NUM_SIZE / 2 - rSize / 2;
      const bw = b.power ? POWER_BULLET_W : BULLET_W;
      if (overlaps(b.x, b.y, bw, BULLET_H, rx, ry, rSize, rSize)) {
        hit = true;
        const cx = n.x + NUM_SIZE / 2, cy = n.y + NUM_SIZE / 2;
        if (n.bomb) {
          // Bomb hit: lose life but NO new round
          s.numbers.splice(i, 1);
          s.particles.push(...spawnExplosion(cx, cy, false));
          s.mistakes++;
          if (s.shieldTimer <= 0) s.lives = Math.max(0, s.lives - 1);
          addNotif(s, '💣 BOOM!', '#FF4444', cx, cy - 30);
          s.soundEvents.push('bombHit');
        } else if (n.gift) {
          // Gift rock hit: drop a good powerup, no life loss, no new round
          s.numbers.splice(i, 1);
          s.particles.push(...spawnExplosion(cx, cy, true));
          addNotif(s, '🎁 GIFT!', '#4ADE80', cx, cy - 30);
          const goodKinds: PowerUpKind[] = ['life', 'slow', 'shield', 'double_shot'];
          s.powerups.push({
            id: `pu${Date.now()}-${Math.random()}`,
            kind: goodKinds[Math.floor(Math.random() * goodKinds.length)],
            x: n.x + NUM_SIZE / 2 - POWERUP_SIZE / 2,
            y: n.y + NUM_SIZE / 2 - POWERUP_SIZE / 2,
            bad: false,
          });
          s.soundEvents.push('goodHit');
        } else if (n.correct) {
          const damage = b.power ? 2 : 1;
          n.hp = Math.max(0, n.hp - damage);
          // Chip particles — bigger for power shot
          const chipScale = b.power ? 1.1 : 0.7;
          s.particles.push(...spawnExplosion(cx, cy, true).map(p => ({ ...p, size: p.size * chipScale })));
          s.soundEvents.push('goodHit');
          if (n.hp <= 0) {
            // Rock destroyed — score + new round
            s.numbers.splice(i, 1);
            s.particles.push(...spawnExplosion(cx, cy, true));
            s.score++;
            s.streak++;
            const prevLevel = s.shipLevel;
            s.shipLevel = shipLevelFromStreak(s.streak);
            newRound = true;
            maybeSpawnPowerUp(s, n.x, n.y, true);
            if (s.score >= s.questionsToWin) { s.levelComplete = true; newRound = false; }
            if (s.shipLevel > prevLevel) {
              const msgs = ['', 'LEVEL UP! 🚀', 'DOUBLE FLAME! 🔥🔥', 'TRIPLE FLAME! 🔥🔥🔥', 'MAX POWER! ⚡'];
              addNotif(s, msgs[s.shipLevel], '#FFD866', sw / 2, sh * 0.35, 28);
            } else if (s.streak > 0 && s.streak % 10 === 0) {
              addNotif(s, `${s.streak}x STREAK! 🎯`, '#4ADE80', sw / 2, sh * 0.35, 26);
            }
            if (n.maxHp >= 3) addNotif(s, 'ROCK SMASHED! 💥', '#FF9F43', cx, cy - 30);
          }
        } else {
          // Wrong rock — instant destroy + new question
          s.particles.push(...spawnExplosion(cx, cy, false));
          s.numbers.splice(i, 1);
          s.mistakes++;
          if (s.shieldTimer <= 0) s.lives = Math.max(0, s.lives - 1);
          dropOneLevel(s);
          newRound = true;
          s.soundEvents.push('badHit');
          maybeSpawnPowerUp(s, n.x, n.y, false);
        }
        break;
      }
    }
    if (!hit) keptBullets.push(b);
  }
  s.bullets = keptBullets;

  // Bullet–powerup collisions
  const survivingBullets: Bullet[] = [];
  for (const b of s.bullets) {
    let hit = false;
    for (let i = s.powerups.length - 1; i >= 0; i--) {
      const pu = s.powerups[i];
      const pbw = b.power ? POWER_BULLET_W : BULLET_W;
      if (overlaps(b.x, b.y, pbw, BULLET_H, pu.x, pu.y, POWERUP_SIZE, POWERUP_SIZE)) {
        hit = true;
        const pcx = pu.x + POWERUP_SIZE / 2, pcy = pu.y + POWERUP_SIZE / 2;
        if (pu.kind === 'life') { s.lives = Math.min(MAX_LIVES_CAP, s.lives + 1); addNotif(s, 'EXTRA LIFE! ❤️', '#FF4757', pcx, pcy - 20); }
        else if (pu.kind === 'slow') { s.slowTimer = POWERUP_DURATION; addNotif(s, 'SLOW MODE! ❄️', '#00BFFF', pcx, pcy - 20); }
        else if (pu.kind === 'shield') { s.shieldTimer = POWERUP_DURATION; addNotif(s, 'SHIELD UP! 🛡️', '#FFD866', pcx, pcy - 20); }
        else if (pu.kind === 'fast') { s.fastTimer = BAD_EFFECT_DURATION; addNotif(s, 'SPEED UP! ⚡', '#C850C0', pcx, pcy - 20); }
        else if (pu.kind === 'lose_life') { s.lives = Math.max(0, s.lives - 1); addNotif(s, 'OUCH! 💀', '#FF2D2D', pcx, pcy - 20); }
        else if (pu.kind === 'double_shot') { s.doubleShotTimer = DOUBLE_SHOT_DURATION; addNotif(s, '💥 POWER SHOT!', '#FFD866', pcx, pcy - 20); }
        s.particles.push(...spawnExplosion(pcx, pcy, !pu.bad));
        s.powerups.splice(i, 1);
        break;
      }
    }
    if (!hit) survivingBullets.push(b);
  }
  s.bullets = survivingBullets;

  // New round (don't clear powerups, keep gift rocks)
  if (newRound) {
    const surviving = s.numbers.filter(n => n.gift);
    const q = createQuestion(s.difficulty);
    s.question = q;
    s.numbers = [...surviving, ...createNumbers(q.answer, sw, s.score, s.difficulty)];
    s.bullets = [];
    s.roundCooldown = ROUND_COOLDOWN_FRAMES;
  }

  // Update particles
  s.particles = s.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.18,
      vx: p.vx * 0.97,
      life: p.life - 1,
    }))
    .filter(p => p.life > 0);

  // Move power-ups and check ship collection
  const sy = shipY(sh);
  const sc = shipScale(s.shipLevel);
  const collW = SHIP_W * sc;
  const collX = s.shipX + SHIP_W / 2 - collW / 2;
  s.powerups = s.powerups.filter(pu => {
    pu.y += POWERUP_FALL_SPEED;
    if (pu.y > sh) return false;
    if (overlaps(pu.x, pu.y, POWERUP_SIZE, POWERUP_SIZE, collX, sy, collW, SHIP_W)) {
      const pcx = pu.x + POWERUP_SIZE / 2, pcy = pu.y + POWERUP_SIZE / 2;
      if (pu.kind === 'life') { s.lives = Math.min(MAX_LIVES_CAP, s.lives + 1); addNotif(s, 'EXTRA LIFE! ❤️', '#FF4757', pcx, pcy - 20); }
      else if (pu.kind === 'slow') { s.slowTimer = POWERUP_DURATION; addNotif(s, 'SLOW MODE! ❄️', '#00BFFF', pcx, pcy - 20); }
      else if (pu.kind === 'shield') { s.shieldTimer = POWERUP_DURATION; addNotif(s, 'SHIELD UP! 🛡️', '#FFD866', pcx, pcy - 20); }
      else if (pu.kind === 'fast') { s.fastTimer = BAD_EFFECT_DURATION; addNotif(s, 'SPEED UP! ⚡', '#C850C0', pcx, pcy - 20); }
      else if (pu.kind === 'lose_life') { s.lives = Math.max(0, s.lives - 1); addNotif(s, 'OUCH! 💀', '#FF2D2D', pcx, pcy - 20); }
      else if (pu.kind === 'double_shot') { s.doubleShotTimer = DOUBLE_SHOT_DURATION; addNotif(s, '💥 POWER SHOT!', '#FFD866', pcx, pcy - 20); }
      s.particles.push(...spawnExplosion(pcx, pcy, !pu.bad));
      return false;
    }
    return true;
  });

  // Update notifications (float up + fade)
  s.notifs = s.notifs.filter(n => {
    n.y -= 0.8;
    n.life--;
    return n.life > 0;
  });

  // Decrement timers
  if (s.slowTimer > 0) s.slowTimer--;
  if (s.shieldTimer > 0) s.shieldTimer--;
  if (s.fastTimer > 0) s.fastTimer--;
  if (s.doubleShotTimer > 0) s.doubleShotTimer--;

  if (s.lives <= 0) s.over = true;
}
