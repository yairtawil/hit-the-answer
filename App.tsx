import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ─── Dimensions & Constants ─────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

const SHIP_W = 52;
const SHIP_Y = SH - 130;

const BULLET_W = 6;
const BULLET_H = 18;
const BULLET_SPEED = 12;

const NUM_SIZE = 48;
const BASE_FALL_SPEED = 1.5;
const ANSWER_COUNT = 5;

const MAX_LIVES = 3;
const DRAG_THRESHOLD = 6;
const TAP_MAX_DURATION = 180;

const PARTICLE_COUNT = 12;
const PARTICLE_SPEED = 5;
const PARTICLE_LIFETIME = 28;

// ─── Types ──────────────────────────────────────────────────────────────────

type Question = { text: string; answer: number };

type Bullet = { id: string; x: number; y: number };

type FallingNum = {
  id: string;
  value: number;
  x: number;
  y: number;
  correct: boolean;
};

type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
};

type Star = { x: number; y: number; r: number; o: number };

type GameState = {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function createQuestion(): Question {
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

function createNumbers(answer: number): FallingNum[] {
  const vals = new Set<number>([answer]);
  while (vals.size < ANSWER_COUNT) {
    let d = Math.floor(Math.random() * 10) + 1;
    if (Math.random() < 0.5) d = -d;
    const v = answer + d;
    if (v > 0) vals.add(v);
  }
  const arr = Array.from(vals).sort(() => Math.random() - 0.5);
  const gap = SW / (arr.length + 1);
  return arr.map((value, i) => ({
    id: `n${Date.now()}-${i}`,
    value,
    x: gap * (i + 1) - NUM_SIZE / 2,
    y: -(NUM_SIZE + Math.random() * 200),
    correct: value === answer,
  }));
}

function spawnExplosion(cx: number, cy: number, correct: boolean): Particle[] {
  const primary = correct ? '#4ADE80' : '#F87171';
  const accent = correct ? '#22C55E' : '#EF4444';
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle =
      (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
    const spd = PARTICLE_SPEED * (0.4 + Math.random() * 0.8);
    return {
      id: `p${Date.now()}-${i}-${Math.random()}`,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1.5,
      color: i % 3 === 0 ? accent : primary,
      life: PARTICLE_LIFETIME,
      maxLife: PARTICLE_LIFETIME,
      size: 3 + Math.random() * 5,
    };
  });
}

function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function makeState(key: number): GameState {
  const q = createQuestion();
  return {
    _key: key,
    shipX: SW / 2 - SHIP_W / 2,
    dragStartX: 0,
    isDragging: false,
    touchStartTime: 0,
    bullets: [],
    numbers: createNumbers(q.answer),
    particles: [],
    question: q,
    score: 0,
    lives: MAX_LIVES,
    over: false,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [, rerender] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const g = useRef<GameState>(makeState(0));

  const stars = useRef<Star[]>(
    Array.from({ length: 50 }, () => ({
      x: Math.random() * SW,
      y: Math.random() * SH,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.5 + 0.1,
    })),
  ).current;

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey);
  }

  // ── Game loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    const s = g.current;
    let raf: number;

    const step = () => {
      if (s.over) {
        rerender(c => c + 1);
        return;
      }

      const fallSpeed = BASE_FALL_SPEED + s.score * 0.08;

      // Bullets
      s.bullets = s.bullets
        .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter(b => b.y + BULLET_H > 0);

      // Falling numbers
      let livesLost = 0;
      let correctFell = false;
      s.numbers = s.numbers.filter(n => {
        n.y += fallSpeed;
        if (n.y > SH) {
          livesLost++;
          if (n.correct) correctFell = true;
          return false;
        }
        return true;
      });
      s.lives = Math.max(0, s.lives - livesLost);

      // Collisions
      let newRound = correctFell;
      const keptBullets: Bullet[] = [];

      for (const b of s.bullets) {
        let hit = false;
        for (let i = s.numbers.length - 1; i >= 0; i--) {
          const n = s.numbers[i];
          if (overlaps(b.x, b.y, BULLET_W, BULLET_H, n.x, n.y, NUM_SIZE, NUM_SIZE)) {
            hit = true;
            s.particles.push(
              ...spawnExplosion(n.x + NUM_SIZE / 2, n.y + NUM_SIZE / 2, n.correct),
            );
            s.numbers.splice(i, 1);
            if (n.correct) {
              s.score++;
              newRound = true;
            } else {
              s.lives = Math.max(0, s.lives - 1);
            }
            break;
          }
        }
        if (!hit) keptBullets.push(b);
      }
      s.bullets = keptBullets;

      if (newRound) {
        const q = createQuestion();
        s.question = q;
        s.numbers = createNumbers(q.answer);
        s.bullets = [];
      }

      // Particles (gravity + drag + fade)
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

      rerender(c => c + 1);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gameKey]);

  // ── Touch: drag to move, tap to shoot ──────────────────────────────────

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const s = g.current;
        if (s.over) return;
        s.dragStartX = s.shipX;
        s.isDragging = false;
        s.touchStartTime = Date.now();
      },
      onPanResponderMove: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const s = g.current;
        if (s.over) return;
        if (Math.abs(gs.dx) > DRAG_THRESHOLD) s.isDragging = true;
        if (s.isDragging) {
          s.shipX = Math.max(0, Math.min(SW - SHIP_W, s.dragStartX + gs.dx));
        }
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const s = g.current;
        if (s.over) return;
        const elapsed = Date.now() - s.touchStartTime;
        const isTap = !s.isDragging && elapsed < TAP_MAX_DURATION && Math.abs(gs.dx) < DRAG_THRESHOLD;
        if (isTap) {
          s.bullets.push({
            id: `b${Date.now()}-${Math.random()}`,
            x: s.shipX + SHIP_W / 2 - BULLET_W / 2,
            y: SHIP_Y - BULLET_H,
          });
        }
        s.isDragging = false;
      },
    }),
  ).current;

  const s = g.current;

  // ── Render helpers ─────────────────────────────────────────────────────

  const starViews = stars.map((st, i) => (
    <View
      key={i}
      style={[
        styles.star,
        {
          left: st.x,
          top: st.y,
          width: st.r * 2,
          height: st.r * 2,
          borderRadius: st.r,
          opacity: st.o,
        },
      ]}
    />
  ));

  // ── Game Over ──────────────────────────────────────────────────────────

  if (s.over) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        {starViews}
        <View style={styles.center}>
          <Text style={styles.overTitle}>GAME OVER</Text>
          <Text style={styles.overScore}>Score: {s.score}</Text>
          <TouchableOpacity
            style={styles.playBtn}
            activeOpacity={0.7}
            onPress={() => setGameKey(k => k + 1)}
          >
            <Text style={styles.playBtnText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Active Game ────────────────────────────────────────────────────────

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <StatusBar style="light" />
      {starViews}

      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.livesText}>
          {'♥'.repeat(s.lives)}
          {'♡'.repeat(MAX_LIVES - s.lives)}
        </Text>
        <View style={styles.questionBox}>
          <Text style={styles.qText}>{s.question.text} = ?</Text>
        </View>
        <Text style={styles.scoreText}>{s.score}</Text>
      </View>

      {/* Falling numbers */}
      {s.numbers.map(n => (
        <View key={n.id} style={[styles.numBubble, { left: n.x, top: n.y }]}>
          <Text style={styles.numText}>{n.value}</Text>
        </View>
      ))}

      {/* Bullets */}
      {s.bullets.map(b => (
        <View key={b.id} style={[styles.bullet, { left: b.x, top: b.y }]}>
          <View style={styles.bulletGlow} />
        </View>
      ))}

      {/* Particles */}
      {s.particles.map(p => (
        <View
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity: p.life / p.maxLife,
          }}
        />
      ))}

      {/* Ship */}
      <View style={[styles.ship, { left: s.shipX, top: SHIP_Y }]}>
        <View style={styles.shipNose} />
        <View style={styles.shipBody} />
        <View style={styles.shipWingL} />
        <View style={styles.shipWingR} />
        <View style={styles.shipFlame} />
      </View>

      <Text style={styles.hint}>Drag to move · Tap to shoot</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06080F' },
  star: { position: 'absolute', backgroundColor: '#fff' },

  hud: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  livesText: { fontSize: 22, color: '#FF4757', width: 76 },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,216,102,0.2)',
  },
  qText: { fontSize: 22, fontWeight: '800', color: '#FFD866' },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    width: 76,
    textAlign: 'right',
  },

  numBubble: {
    position: 'absolute',
    width: NUM_SIZE,
    height: NUM_SIZE,
    borderRadius: NUM_SIZE / 2,
    backgroundColor: 'rgba(26,32,64,0.9)',
    borderWidth: 2,
    borderColor: '#4A6CF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: '#E8EAFF', fontSize: 18, fontWeight: '700' },

  bullet: {
    position: 'absolute',
    width: BULLET_W,
    height: BULLET_H,
    borderRadius: BULLET_W / 2,
    backgroundColor: '#FFD866',
    alignItems: 'center',
  },
  bulletGlow: {
    position: 'absolute',
    top: -2,
    width: BULLET_W + 6,
    height: BULLET_H + 6,
    borderRadius: (BULLET_W + 6) / 2,
    backgroundColor: 'rgba(255,216,102,0.2)',
  },

  ship: { position: 'absolute', width: SHIP_W, height: SHIP_W, alignItems: 'center' },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7C9DFF',
  },
  shipBody: {
    width: 26,
    height: 18,
    backgroundColor: '#4A6CF7',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  shipWingL: {
    position: 'absolute',
    left: 2,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderRightColor: '#3A5BD7',
  },
  shipWingR: {
    position: 'absolute',
    right: 2,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderLeftColor: '#3A5BD7',
  },
  shipFlame: {
    width: 10,
    height: 12,
    backgroundColor: '#FF9F43',
    borderRadius: 5,
    marginTop: -2,
    opacity: 0.85,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overTitle: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FF4757',
    letterSpacing: 6,
  },
  overScore: { fontSize: 28, color: '#fff', marginTop: 16, fontWeight: '600' },
  playBtn: {
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: '#4A6CF7',
    borderRadius: 14,
  },
  playBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },

  hint: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 13,
  },
});
