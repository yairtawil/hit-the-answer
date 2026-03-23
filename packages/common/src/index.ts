// ─── Constants ───────────────────────────────────────────────────────────────

export const SHIP_W = 52;
export const BULLET_W = 6;
export const BULLET_H = 18;
export const BULLET_SPEED = 12;
export const NUM_SIZE = 48;
export const BASE_FALL_SPEED = 1.5;
export const ANSWER_COUNT = 5;
export const MAX_LIVES = 3;
export const DRAG_THRESHOLD = 6;
export const TAP_MAX_DURATION = 180;
export const PARTICLE_COUNT = 12;
export const PARTICLE_SPEED = 5;
export const PARTICLE_LIFETIME = 28;

export function shipY(sh: number): number {
  return sh - 130;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Question = { text: string; answer: number };
export type Bullet = { id: string; x: number; y: number };
export type FallingNum = { id: string; value: number; x: number; y: number; correct: boolean };
export type Particle = { id: string; x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number };
export type Star = { x: number; y: number; r: number; o: number };

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
  };
}

export function tickGame(s: GameState, sw: number, sh: number): void {
  const fallSpeed = BASE_FALL_SPEED + s.score * 0.08;

  s.bullets = s.bullets
    .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
    .filter(b => b.y + BULLET_H > 0);

  let livesLost = 0;
  let correctFell = false;
  s.numbers = s.numbers.filter(n => {
    n.y += fallSpeed;
    if (n.y > sh) {
      livesLost++;
      if (n.correct) correctFell = true;
      return false;
    }
    return true;
  });
  s.lives = Math.max(0, s.lives - livesLost);

  let newRound = correctFell;
  const keptBullets: Bullet[] = [];
  for (const b of s.bullets) {
    let hit = false;
    for (let i = s.numbers.length - 1; i >= 0; i--) {
      const n = s.numbers[i];
      if (overlaps(b.x, b.y, BULLET_W, BULLET_H, n.x, n.y, NUM_SIZE, NUM_SIZE)) {
        hit = true;
        s.particles.push(...spawnExplosion(n.x + NUM_SIZE / 2, n.y + NUM_SIZE / 2, n.correct));
        s.numbers.splice(i, 1);
        if (n.correct) { s.score++; newRound = true; }
        else { s.lives = Math.max(0, s.lives - 1); }
        break;
      }
    }
    if (!hit) keptBullets.push(b);
  }
  s.bullets = keptBullets;

  if (newRound) {
    const q = createQuestion();
    s.question = q;
    s.numbers = createNumbers(q.answer, sw);
    s.bullets = [];
  }

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

  if (s.lives <= 0) s.over = true;
}
