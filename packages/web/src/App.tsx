import React, { useEffect, useRef, useState } from 'react';
import {
  SHIP_W, BULLET_W, BULLET_H, NUM_SIZE, MAX_LIVES,
  type GameState, type Star,
  makeState, tickGame, shipY,
} from '@hit-the-answer/common';

const KEYBOARD_SPEED = 6;

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Nose (triangle pointing up)
  ctx.fillStyle = '#7C9DFF';
  ctx.beginPath();
  ctx.moveTo(x + SHIP_W / 2, y);
  ctx.lineTo(x + SHIP_W / 2 - 12, y + 18);
  ctx.lineTo(x + SHIP_W / 2 + 12, y + 18);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = '#4A6CF7';
  const bodyX = x + SHIP_W / 2 - 13;
  ctx.beginPath();
  ctx.rect(bodyX, y + 18, 26, 18);
  ctx.fill();

  // Left wing
  ctx.fillStyle = '#3A5BD7';
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

  // Flame
  ctx.fillStyle = '#FF9F43';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(x + SHIP_W / 2, y + 36 + 6, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  stars: Star[],
  sw: number,
  sh: number,
) {
  const sy = shipY(sh);

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
  drawShip(ctx, s.shipX, sy);

  // HUD
  ctx.textBaseline = 'middle';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#FF4757';
  ctx.textAlign = 'left';
  ctx.fillText('♥'.repeat(s.lives) + '♡'.repeat(MAX_LIVES - s.lives), 20, 68);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const qMetrics = ctx.measureText(`${s.question.text} = ?`);
  const qPadX = 16;
  const qPadY = 6;
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

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(String(s.score), sw - 20, 68);

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
