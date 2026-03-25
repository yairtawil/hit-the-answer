// ─── Constants ───────────────────────────────────────────────────────────────

export const SHIP_W = 52;
export const BULLET_W = 6;
export const BULLET_H = 18;
export const BULLET_SPEED = 12;
export const NUM_SIZE = 48;
export const BASE_FALL_SPEED = 1.5;
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
export const POWERUP_DURATION = 600; // ~10 seconds at 60fps

// Streak / ship-level constants
export const STREAK_THRESHOLDS = [0, 5, 10, 15, 20];
export const BULLET_SPEED_BONUS = [0, 2, 4, 6, 8];

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

// ─── Types ───────────────────────────────────────────────────────────────────

export type Question = { text: string; answer: number };
export type Bullet = { id: string; x: number; y: number };
export type FallingNum = { id: string; value: number; x: number; y: number; correct: boolean };
export type Particle = { id: string; x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number };
export type Star = { x: number; y: number; r: number; o: number };

export type PowerUpKind = 'life' | 'slow' | 'shield';
export type PowerUp = { id: string; kind: PowerUpKind; x: number; y: number };

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
  // Power-ups
  powerups: PowerUp[];
  slowTimer: number;
  shieldTimer: number;
  // Streak
  streak: number;
  shipLevel: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function createQuestion(): Question {
  const ops: { sym: string; fn: (a: number, b: number) => number }[] = [
    { sym: '×', fn: (a, b) => a * b },
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => a - b },
  ];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 2 + Math.floor(Math.random() * 9);
  let b = 2 + Math.floor(Math.random() * 9);
  if (op.sym === '−' && a < b) [a, b] = [b, a];
  return { text: `${a} ${op.sym} ${b}`, answer: op.fn(a, b) };
}

export function createNumbers(answer: number, sw: number): FallingNum[] {
  const vals = new Set<number>([answer]);
  while (vals.size < ANSWER_COUNT) {
    let d = Math.floor(Math.random() * 10) + 1;
    if (Math.random() < 0.5) d = -d;
    const v = answer + d;
    if (v > 0) vals.add(v);
  }
  const arr = Array.from(vals).sort(() => Math.random() - 0.5);
  const gap = sw / (arr.length + 1);
  return arr.map((value, i) => ({
    id: `n${Date.now()}-${i}`,
    value,
    x: gap * (i + 1) - NUM_SIZE / 2,
    y: -(NUM_SIZE + Math.random() * 200),
    correct: value === answer,
  }));
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

export function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function makeState(key: number, sw: number): GameState {
  const q = createQuestion();
  return {
    _key: key,
    shipX: sw / 2 - SHIP_W / 2,
    dragStartX: 0,
    isDragging: false,
    touchStartTime: 0,
    bullets: [],
    numbers: createNumbers(q.answer, sw),
    particles: [],
    question: q,
    score: 0,
    lives: MAX_LIVES,
    over: false,
    powerups: [],
    slowTimer: 0,
    shieldTimer: 0,
    streak: 0,
    shipLevel: 0,
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

function maybeSpawnPowerUp(s: GameState, nx: number, ny: number): void {
  if (Math.random() < POWERUP_DROP_CHANCE) {
    const kinds: PowerUpKind[] = ['life', 'slow', 'shield'];
    s.powerups.push({
      id: `pu${Date.now()}-${Math.random()}`,
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      x: nx + NUM_SIZE / 2 - POWERUP_SIZE / 2,
      y: ny + NUM_SIZE / 2 - POWERUP_SIZE / 2,
    });
  }
}

export function tickGame(s: GameState, sw: number, sh: number): void {
  const fallSpeed = (BASE_FALL_SPEED + s.score * 0.08) * (s.slowTimer > 0 ? 0.4 : 1);
  const bulletSpeed = BULLET_SPEED + BULLET_SPEED_BONUS[s.shipLevel];

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
      return false;
    }
    return true;
  });
  if (correctFell) {
    if (s.shieldTimer <= 0) s.lives = Math.max(0, s.lives - 1);
    dropOneLevel(s);
  }

  // Bullet–number collisions
  let newRound = correctFell;
  const keptBullets: Bullet[] = [];
  for (const b of s.bullets) {
    let hit = false;
    for (let i = s.numbers.length - 1; i >= 0; i--) {
      const n = s.numbers[i];
      if (overlaps(b.x, b.y, BULLET_W, BULLET_H, n.x, n.y, NUM_SIZE, NUM_SIZE)) {
        hit = true;
        const nx = n.x, ny = n.y;
        s.particles.push(...spawnExplosion(nx + NUM_SIZE / 2, ny + NUM_SIZE / 2, n.correct));
        s.numbers.splice(i, 1);
        if (n.correct) {
          s.score++;
          s.streak++;
          s.shipLevel = shipLevelFromStreak(s.streak);
          newRound = true;
          maybeSpawnPowerUp(s, nx, ny);
        } else {
          if (s.shieldTimer <= 0) s.lives = Math.max(0, s.lives - 1);
          dropOneLevel(s);
        }
        break;
      }
    }
    if (!hit) keptBullets.push(b);
  }
  s.bullets = keptBullets;

  // New round (don't clear powerups)
  if (newRound) {
    const q = createQuestion();
    s.question = q;
    s.numbers = createNumbers(q.answer, sw);
    s.bullets = [];
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
      if (pu.kind === 'life') s.lives = Math.min(MAX_LIVES_CAP, s.lives + 1);
      if (pu.kind === 'slow') s.slowTimer = POWERUP_DURATION;
      if (pu.kind === 'shield') s.shieldTimer = POWERUP_DURATION;
      s.particles.push(...spawnExplosion(pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2, true));
      return false;
    }
    return true;
  });

  // Decrement timers
  if (s.slowTimer > 0) s.slowTimer--;
  if (s.shieldTimer > 0) s.shieldTimer--;

  if (s.lives <= 0) s.over = true;
}
