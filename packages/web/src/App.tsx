import React, { useEffect, useRef, useState } from 'react';
import {
  SHIP_W, BULLET_W, BULLET_H, NUM_SIZE, MAX_LIVES,
  POWERUP_SIZE, POWERUP_DURATION,
  type GameState, type Star,
  makeState, tickGame, shipY, shipScale,
} from '@hit-the-answer/common';

const KEYBOARD_SPEED = 6;

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number) {
  const sc = shipScale(level);
  const cx = x + SHIP_W / 2;
  const cy = y + SHIP_W / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.translate(-cx, -cy);

  // Level 4 golden aura
  if (level >= 4) {
    ctx.shadowColor = '#FFD866';
    ctx.shadowBlur = 24;
  } else if (level >= 2) {
    ctx.shadowColor = '#7C9DFF';
    ctx.shadowBlur = 12;
  }

  // Nose
  const noseColor = level >= 1 ? '#A3BFFF' : '#7C9DFF';
  ctx.fillStyle = noseColor;
  ctx.beginPath();
  ctx.moveTo(x + SHIP_W / 2, y);
  ctx.lineTo(x + SHIP_W / 2 - 12, y + 18);
  ctx.lineTo(x + SHIP_W / 2 + 12, y + 18);
  ctx.closePath();
  ctx.fill();

  // Level 1+ cyan accent stroke on nose
  if (level >= 1) {
    ctx.strokeStyle = level >= 4 ? '#FFD866' : '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Body
  ctx.fillStyle = '#4A6CF7';
  const bodyX = x + SHIP_W / 2 - 13;
  ctx.beginPath();
  ctx.rect(bodyX, y + 18, 26, 18);
  ctx.fill();

  // Wings
  const wingColor = level >= 3 ? '#6B8CFF' : level >= 2 ? '#5577EE' : '#3A5BD7';
  ctx.fillStyle = wingColor;

  // Left wing
  ctx.beginPath();
  ctx.moveTo(x + 2, y + SHIP_W - 8);
  ctx.lineTo(x + 2, y + SHIP_W - 8 - 14);
  ctx.lineTo(x + 2 + 10, y + SHIP_W - 8);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + SHIP_W - 2, y + SHIP_W - 8);
  ctx.lineTo(x + SHIP_W - 2, y + SHIP_W - 8 - 14);
  ctx.lineTo(x + SHIP_W - 2 - 10, y + SHIP_W - 8);
  ctx.closePath();
  ctx.fill();

  // Wing tip glow for level 2+
  if (level >= 2) {
    ctx.shadowColor = level >= 4 ? '#FFD866' : '#7C9DFF';
    ctx.shadowBlur = 8;
    ctx.fillStyle = level >= 4 ? '#FFD866' : '#A3BFFF';
    ctx.beginPath();
    ctx.arc(x + 2, y + SHIP_W - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + SHIP_W - 2, y + SHIP_W - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Flames
  const flameCount = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  const flameOffsets = flameCount === 3 ? [-8, 0, 8] : flameCount === 2 ? [-5, 5] : [0];
  const flameY = y + 36 + 6;

  ctx.fillStyle = '#FF9F43';
  ctx.globalAlpha = 0.85;
  for (const off of flameOffsets) {
    ctx.beginPath();
    ctx.ellipse(x + SHIP_W / 2 + off, flameY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, kind: string, px: number, py: number, t: number) {
  const bob = Math.sin(t * 0.005) * 3;
  const cx = px + POWERUP_SIZE / 2;
  const cy = py + POWERUP_SIZE / 2 + bob;

  // Glow circle background
  const color = kind === 'life' ? '#FF4757' : kind === 'slow' ? '#00BFFF' : '#FFD866';
  const bgColor = kind === 'life' ? 'rgba(255,71,87,0.25)' : kind === 'slow' ? 'rgba(0,191,255,0.25)' : 'rgba(255,216,102,0.25)';

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, POWERUP_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Icon
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  if (kind === 'life') ctx.fillText('♥', cx, cy);
  else if (kind === 'slow') ctx.fillText('❄', cx, cy);
  else ctx.fillText('🛡', cx, cy);

  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  stars: Star[],
  sw: number,
  sh: number,
) {
  const sy = shipY(sh);
  const now = Date.now();

  // Background
  ctx.fillStyle = '#06080F';
  ctx.fillRect(0, 0, sw, sh);

  // Stars
  for (const st of stars) {
    ctx.globalAlpha = st.o;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Falling numbers
  for (const n of s.numbers) {
    const cx = n.x + NUM_SIZE / 2;
    const cy = n.y + NUM_SIZE / 2;
    ctx.fillStyle = 'rgba(26,32,64,0.9)';
    ctx.strokeStyle = '#4A6CF7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, NUM_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E8EAFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n.value), cx, cy);
  }

  // Bullets
  for (const b of s.bullets) {
    ctx.shadowColor = 'rgba(255,216,102,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFD866';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, BULLET_W, BULLET_H, BULLET_W / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Power-ups
  for (const pu of s.powerups) {
    drawPowerUp(ctx, pu.kind, pu.x, pu.y, now);
  }

  // Particles
  for (const p of s.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ship
  drawShip(ctx, s.shipX, sy, s.shipLevel);

  // HUD — lives
  ctx.textBaseline = 'middle';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#FF4757';
  ctx.textAlign = 'left';
  const maxDisplay = Math.max(MAX_LIVES, s.lives);
  ctx.fillText('♥'.repeat(s.lives) + '♡'.repeat(maxDisplay - s.lives), 20, 68);

  // HUD — question
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = 'bold 22px sans-serif';
  const qMetrics = ctx.measureText(`${s.question.text} = ?`);
  const qPadX = 16;
  const qW = qMetrics.width + qPadX * 2;
  const qH = 36;
  ctx.beginPath();
  ctx.roundRect(sw / 2 - qW / 2, 68 - qH / 2, qW, qH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,216,102,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#FFD866';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`${s.question.text} = ?`, sw / 2, 68);

  // HUD — score + streak
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(String(s.score), sw - 20, 60);

  if (s.streak > 0) {
    ctx.fillStyle = s.shipLevel >= 4 ? '#FFD866' : s.shipLevel >= 2 ? '#A3BFFF' : '#4ADE80';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🔥 x${s.streak}`, sw - 20, 82);
  }

  // HUD — active power-up effects
  let effectY = 100;
  if (s.shieldTimer > 0) {
    const pct = s.shieldTimer / POWERUP_DURATION;
    ctx.fillStyle = 'rgba(255,216,102,0.15)';
    ctx.beginPath();
    ctx.roundRect(sw - 90, effectY, 70, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#FFD866';
    ctx.beginPath();
    ctx.roundRect(sw - 90, effectY, 70 * pct, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡 Shield', sw - 55, effectY + 10);
    effectY += 24;
  }
  if (s.slowTimer > 0) {
    const pct = s.slowTimer / POWERUP_DURATION;
    ctx.fillStyle = 'rgba(0,191,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(sw - 90, effectY, 70, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#00BFFF';
    ctx.beginPath();
    ctx.roundRect(sw - 90, effectY, 70 * pct, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❄ Slow', sw - 55, effectY + 10);
  }

  // Hint
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '13px sans-serif';
  ctx.fillText('Mouse to move · Click or Space to shoot · ← → to steer', sw / 2, sh - 30);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<GameState>(makeState(0, window.innerWidth));
  const stars = useRef<Star[]>(
    Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.5 + 0.1,
    })),
  );
  const keys = useRef({ left: false, right: false, space: false, spacePrev: false });
  const [gameKey, setGameKey] = useState(0);
  const [over, setOver] = useState(false);
  const scoreRef = useRef(0);

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey, window.innerWidth);
    setOver(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    let raf: number;

    const onMouseMove = (e: MouseEvent) => {
      const s = g.current;
      if (!s.over) s.shipX = Math.max(0, Math.min(canvas.width - SHIP_W, e.clientX - SHIP_W / 2));
    };
    const onClick = () => {
      const s = g.current;
      if (s.over) return;
      s.bullets.push({
        id: `b${Date.now()}-${Math.random()}`,
        x: s.shipX + SHIP_W / 2 - BULLET_W / 2,
        y: shipY(canvas.height) - BULLET_H,
      });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = true;
      if (e.key === 'ArrowRight') keys.current.right = true;
      if (e.key === ' ') { e.preventDefault(); keys.current.space = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = false;
      if (e.key === 'ArrowRight') keys.current.right = false;
      if (e.key === ' ') keys.current.space = false;
    };
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const s = g.current;
      s.shipX = Math.min(s.shipX, canvas.width - SHIP_W);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    const step = () => {
      const sw = canvas.width;
      const sh = canvas.height;
      const s = g.current;
      const ctx = canvas.getContext('2d')!;

      if (!s.over) {
        if (keys.current.left) s.shipX = Math.max(0, s.shipX - KEYBOARD_SPEED);
        if (keys.current.right) s.shipX = Math.min(sw - SHIP_W, s.shipX + KEYBOARD_SPEED);
        if (keys.current.space && !keys.current.spacePrev) {
          s.bullets.push({
            id: `b${Date.now()}-${Math.random()}`,
            x: s.shipX + SHIP_W / 2 - BULLET_W / 2,
            y: shipY(sh) - BULLET_H,
          });
        }
        keys.current.spacePrev = keys.current.space;

        tickGame(s, sw, sh);

        if (s.over) {
          scoreRef.current = s.score;
          draw(ctx, s, stars.current, sw, sh);
          setOver(true);
          return;
        }
      }

      draw(ctx, s, stars.current, sw, sh);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    };
  }, [gameKey]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ display: 'block' }}
      />
      {over && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16,
        }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: '#FF4757', letterSpacing: 6, margin: 0 }}>
            GAME OVER
          </h1>
          <p style={{ fontSize: 28, color: '#fff', fontWeight: 600, margin: 0 }}>
            Score: {scoreRef.current}
          </p>
          <button
            onClick={() => setGameKey(k => k + 1)}
            style={{
              marginTop: 24,
              padding: '16px 40px',
              backgroundColor: '#4A6CF7',
              color: '#fff',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </>
  );
}
