import React, { useEffect, useRef, useState } from 'react';
import {
  SHIP_W, BULLET_W, BULLET_H, POWER_BULLET_W, NUM_SIZE, MAX_LIVES,
  POWERUP_SIZE, POWERUP_DURATION, BAD_EFFECT_DURATION, DOUBLE_SHOT_DURATION, NOTIF_LIFETIME,
  BG_THEMES, SHIP_THEMES, LEVELS,
  type GameState, type Star, type BgTheme, type ShipTheme, type SoundEvent,
  makeState, tickGame, shipY, shipScale, rockScale, getBgTheme, getShipTheme, spawnBullets, computeStars,
} from '@hit-the-answer/common';

type LevelProgress = Record<number, { stars: 1 | 2 | 3 }>;
type Screen = 'title' | 'levels' | 'game' | 'settings';

const KEYBOARD_SPEED = 6;

// ─── Sound engine ─────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return _audioCtx;
}

function playFire(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07);
  } catch (_) { /* ignore audio errors */ }
}

function playSound(ev: SoundEvent, muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (ev === 'goodHit') {
      // Pleasant rising ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
    } else if (ev === 'badHit') {
      // Low sawtooth thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
    } else if (ev === 'bombHit') {
      // Short deep thud with noise-like overtone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    }
  } catch (_) { /* ignore audio errors */ }
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, st: ShipTheme) {
  const sc = shipScale(level);
  const cx = x + SHIP_W / 2;
  const cy = y + SHIP_W / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.translate(-cx, -cy);

  if (level >= 4) { ctx.shadowColor = '#FFD866'; ctx.shadowBlur = 24; }
  else if (level >= 2) { ctx.shadowColor = st.noseLight; ctx.shadowBlur = 12; }

  const noseColor = level >= 1 ? st.noseLight : st.nose;
  ctx.fillStyle = noseColor;
  ctx.beginPath();
  ctx.moveTo(x + SHIP_W / 2, y);
  ctx.lineTo(x + SHIP_W / 2 - 12, y + 18);
  ctx.lineTo(x + SHIP_W / 2 + 12, y + 18);
  ctx.closePath();
  ctx.fill();

  if (level >= 1) {
    ctx.strokeStyle = level >= 4 ? '#FFD866' : '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = st.body;
  const bodyX = x + SHIP_W / 2 - 13;
  ctx.beginPath();
  ctx.rect(bodyX, y + 18, 26, 18);
  ctx.fill();

  const wingColor = level >= 3 ? st.wingLight : level >= 2 ? st.wingMid : st.wing;
  ctx.fillStyle = wingColor;

  ctx.beginPath();
  ctx.moveTo(x + 2, y + SHIP_W - 8);
  ctx.lineTo(x + 2, y + SHIP_W - 8 - 14);
  ctx.lineTo(x + 2 + 10, y + SHIP_W - 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + SHIP_W - 2, y + SHIP_W - 8);
  ctx.lineTo(x + SHIP_W - 2, y + SHIP_W - 8 - 14);
  ctx.lineTo(x + SHIP_W - 2 - 10, y + SHIP_W - 8);
  ctx.closePath();
  ctx.fill();

  if (level >= 2) {
    ctx.shadowColor = level >= 4 ? '#FFD866' : st.noseLight;
    ctx.shadowBlur = 8;
    ctx.fillStyle = level >= 4 ? '#FFD866' : st.noseLight;
    ctx.beginPath(); ctx.arc(x + 2, y + SHIP_W - 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + SHIP_W - 2, y + SHIP_W - 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  const flameCount = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  const flameOffsets = flameCount === 3 ? [-8, 0, 8] : flameCount === 2 ? [-5, 5] : [0];

  ctx.fillStyle = st.flame;
  ctx.globalAlpha = 0.85;
  for (const off of flameOffsets) {
    ctx.beginPath();
    ctx.ellipse(x + SHIP_W / 2 + off, y + 36 + 6, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function powerUpColors(kind: string): { color: string; bg: string } {
  switch (kind) {
    case 'life': return { color: '#FF4757', bg: 'rgba(255,71,87,0.25)' };
    case 'slow': return { color: '#00BFFF', bg: 'rgba(0,191,255,0.25)' };
    case 'shield': return { color: '#FFD866', bg: 'rgba(255,216,102,0.25)' };
    case 'fast': return { color: '#C850C0', bg: 'rgba(200,80,192,0.25)' };
    case 'lose_life': return { color: '#FF2D2D', bg: 'rgba(255,45,45,0.25)' };
    case 'double_shot': return { color: '#FFD866', bg: 'rgba(255,216,102,0.2)' };
    default: return { color: '#fff', bg: 'rgba(255,255,255,0.25)' };
  }
}

function powerUpIcon(kind: string): string {
  switch (kind) {
    case 'life': return '♥'; case 'slow': return '❄'; case 'shield': return '🛡';
    case 'fast': return '⚡'; case 'lose_life': return '💀'; case 'double_shot': return '💥'; default: return '?';
  }
}

function drawPowerUp(ctx: CanvasRenderingContext2D, kind: string, bad: boolean, px: number, py: number, t: number) {
  const bob = Math.sin(t * 0.005) * 3;
  const cx = px + POWERUP_SIZE / 2;
  const cy = py + POWERUP_SIZE / 2 + bob;
  const { color, bg } = powerUpColors(kind);

  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy, POWERUP_SIZE / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = bad ? 2.5 : 2; ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(powerUpIcon(kind), cx, cy);
  ctx.restore();
}

function drawNumShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, shapeId: string) {
  ctx.beginPath();
  if (shapeId === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  } else if (shapeId === 'diamond') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.75, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.75, cy);
  } else {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
}

function buildRockPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pts: [number, number][]) {
  const N = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[N - 1][0] + pts[0][0]) / 2, (pts[N - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < N; i++) {
    const next = pts[(i + 1) % N];
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + next[0]) / 2, (pts[i][1] + next[1]) / 2);
  }
  ctx.closePath();
}

function rockPts(cx: number, cy: number, r: number, id: string): [number, number][] {
  // Deterministic per-rock shape from id
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (((seed << 5) - seed) + id.charCodeAt(i)) | 0;
  seed = Math.abs(seed) || 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };

  const N = 10;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const baseAngle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const angleJitter = (rng() - 0.5) * (Math.PI * 2 / N) * 0.45;
    const radiusFactor = 0.70 + rng() * 0.30;
    const a = baseAngle + angleJitter;
    pts.push([cx + Math.cos(a) * r * radiusFactor, cy + Math.sin(a) * r * radiusFactor]);
  }
  return pts;
}

function drawRock(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, id: string, damaged: boolean, lt: boolean) {
  const pts = rockPts(cx, cy, r, id);

  ctx.save();
  buildRockPath(ctx, cx, cy, r, pts);
  ctx.clip();

  // Base gradient: lighter top-left → darker bottom-right
  const grd = ctx.createLinearGradient(cx - r * 0.6, cy - r * 0.85, cx + r * 0.45, cy + r * 0.85);
  if (damaged) {
    grd.addColorStop(0, lt ? '#b0a090' : '#6a5a4a');
    grd.addColorStop(0.5, lt ? '#9a8878' : '#4e3e2e');
    grd.addColorStop(1, lt ? '#857060' : '#362616');
  } else {
    grd.addColorStop(0, lt ? '#c9b8a9' : '#a09080');
    grd.addColorStop(0.46, lt ? '#aea298' : '#7a6a5a');
    grd.addColorStop(1, lt ? '#9e958e' : '#5a4a3a');
  }
  ctx.fillStyle = grd;
  ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

  // Shadow on bottom-left edge for depth
  const shadowGrd = ctx.createLinearGradient(cx + r * 0.15, cy + r * 0.45, cx - r * 0.65, cy - r * 0.25);
  shadowGrd.addColorStop(0, 'rgba(37,47,54,0.55)');
  shadowGrd.addColorStop(0.55, 'rgba(55,71,79,0.15)');
  shadowGrd.addColorStop(1, 'rgba(69,90,100,0)');
  ctx.fillStyle = shadowGrd;
  ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

  // Highlight on upper-left for the 3D stone look
  const hlGrd = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.28, 0, cx - r * 0.22, cy - r * 0.28, r * 0.62);
  hlGrd.addColorStop(0, lt ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.2)');
  hlGrd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrd;
  ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

  ctx.restore();

  // Outline
  buildRockPath(ctx, cx, cy, r, pts);
  ctx.strokeStyle = lt ? 'rgba(90,72,50,0.7)' : 'rgba(150,130,100,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function draw(
  ctx: CanvasRenderingContext2D, s: GameState, stars: Star[],
  sw: number, sh: number, bgT: BgTheme, shipT: ShipTheme, starOffset: number,
) {
  const sy = shipY(sh);
  const now = Date.now();

  ctx.fillStyle = bgT.bg;
  ctx.fillRect(0, 0, sw, sh);

  for (const st of stars) {
    const y = (st.y + starOffset) % sh;
    ctx.globalAlpha = st.o;
    if (bgT.light) {
      ctx.font = `${8 + st.r * 6}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍓', st.x, y);
    } else {
      ctx.fillStyle = bgT.star;
      ctx.beginPath(); ctx.arc(st.x, y, st.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const lt = bgT.light;
  const hintCol = lt ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';
  const qBoxFill = lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const qBoxStroke = lt ? 'rgba(180,140,40,0.3)' : 'rgba(255,216,102,0.2)';
  const qTextCol = lt ? '#B45309' : '#FFD866';
  const pauseBtnFill = lt ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
  const pauseBarCol = lt ? '#333' : '#fff';
  const effectTextCol = lt ? '#1E293B' : '#fff';

  for (const n of s.numbers) {
    const cx = n.x + NUM_SIZE / 2, cy = n.y + NUM_SIZE / 2;
    const rs = rockScale(n.hp);
    const r = (NUM_SIZE / 2) * rs;
    const damaged = n.hp < n.maxHp;

    if (n.gift) {
      // Gift rock — glowing present box
      ctx.save();
      ctx.shadowColor = '#4ADE80'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#0e2a1a';
      ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 6); ctx.fill();
      ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
      // Ribbon horizontal
      ctx.fillStyle = 'rgba(74,222,128,0.65)';
      ctx.fillRect(cx - r, cy - 2, r * 2, 4);
      // Ribbon vertical
      ctx.fillRect(cx - 2, cy - r, 4, r * 2);
      ctx.restore();
      ctx.font = `${Math.round(r * 1.1)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🎁', cx, cy);
    } else if (n.bomb) {
      // Draw bomb rock — dark jagged boulder with fuse
      const pts = rockPts(cx, cy, r, n.id);
      ctx.save();
      buildRockPath(ctx, cx, cy, r, pts);
      ctx.clip();

      // Very dark body with a reddish core
      const bg = ctx.createLinearGradient(cx - r * 0.6, cy - r * 0.8, cx + r * 0.5, cy + r * 0.9);
      bg.addColorStop(0, '#3d3530');
      bg.addColorStop(0.5, '#2a1f1a');
      bg.addColorStop(1, '#130d08');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

      // Red warning glow in center
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
      glow.addColorStop(0, 'rgba(220,40,30,0.45)');
      glow.addColorStop(1, 'rgba(220,40,30,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

      // Highlight
      const hl = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 0, cx - r * 0.25, cy - r * 0.3, r * 0.5);
      hl.addColorStop(0, 'rgba(255,255,255,0.18)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);

      ctx.restore();

      // Outline
      buildRockPath(ctx, cx, cy, r, pts);
      ctx.strokeStyle = '#6b3a2a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fuse on top
      ctx.save();
      ctx.strokeStyle = '#c8a84a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.bezierCurveTo(cx + r * 0.25, cy - r * 1.3, cx - r * 0.15, cy - r * 1.55, cx + r * 0.1, cy - r * 1.75);
      ctx.stroke();
      // Fuse spark
      const spark = now % 500 < 250;
      if (spark) {
        ctx.fillStyle = '#FFD860';
        ctx.shadowColor = '#FFD860'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(cx + r * 0.1, cy - r * 1.75, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // Skull icon
      const skullSize = Math.round(13 * rs);
      ctx.fillStyle = 'rgba(255,100,80,0.9)'; ctx.font = `${skullSize}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', cx, cy);
    } else {
      // Normal answer rock
      drawRock(ctx, cx, cy, r, n.id, damaged, lt);

      // Crack lines for damaged rocks (clipped to rock shape)
      if (damaged) {
        const pts = rockPts(cx, cy, r, n.id);
        ctx.save();
        buildRockPath(ctx, cx, cy, r, pts);
        ctx.clip();
        ctx.strokeStyle = lt ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.3, cy - r * 0.4);
        ctx.lineTo(cx + r * 0.08, cy - r * 0.05);
        ctx.lineTo(cx - r * 0.12, cy + r * 0.38);
        ctx.stroke();
        if (n.maxHp - n.hp >= 2) {
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.22, cy - r * 0.28);
          ctx.lineTo(cx + r * 0.38, cy + r * 0.18);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Number text
      const fontSize = Math.round(16 * rs);
      ctx.fillStyle = lt ? '#3A2E1F' : '#E8E0D0'; ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n.value), cx, cy);

      // HP pips — only show after rock has been hit
      if (n.maxHp > 1 && n.hp < n.maxHp) {
        for (let h = 0; h < n.maxHp; h++) {
          const pipX = cx - ((n.maxHp - 1) * 5) / 2 + h * 5;
          const pipY = cy + r + 6;
          ctx.fillStyle = h < n.hp ? '#4ADE80' : 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.arc(pipX, pipY, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  for (const b of s.bullets) {
    const bw = b.power ? POWER_BULLET_W : BULLET_W;
    ctx.shadowColor = b.power ? 'rgba(255,241,118,0.8)' : 'rgba(255,216,102,0.5)'; ctx.shadowBlur = b.power ? 16 : 10;
    ctx.fillStyle = b.power ? '#FFF176' : '#FFD866';
    ctx.beginPath(); ctx.roundRect(b.x, b.y, bw, BULLET_H, bw / 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const pu of s.powerups) drawPowerUp(ctx, pu.kind, pu.bad, pu.x, pu.y, now);

  for (const p of s.particles) {
    ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawShip(ctx, s.shipX, sy, s.shipLevel, shipT);

  // Notifications
  for (const n of s.notifs) {
    const progress = n.life / NOTIF_LIFETIME;
    // fade in fast, fade out slow
    const alpha = progress > 0.85 ? (1 - progress) / 0.15 : Math.min(1, progress / 0.3);
    const scale = 1 + (1 - progress) * 0.15;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(n.x, n.y);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${n.size}px sans-serif`;
    // shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // HUD — pause button
  ctx.fillStyle = pauseBtnFill;
  ctx.beginPath(); ctx.roundRect(16, 52, 32, 32, 8); ctx.fill();
  ctx.fillStyle = pauseBarCol; ctx.fillRect(24, 60, 4, 16); ctx.fillRect(32, 60, 4, 16);

  // HUD — lives
  ctx.textBaseline = 'middle'; ctx.font = '22px sans-serif'; ctx.fillStyle = '#FF4757'; ctx.textAlign = 'left';
  const maxDisplay = Math.max(MAX_LIVES, s.lives);
  ctx.fillText('♥'.repeat(s.lives) + '♡'.repeat(maxDisplay - s.lives), 56, 68);

  // HUD — question
  ctx.textAlign = 'center'; ctx.fillStyle = qBoxFill;
  ctx.font = 'bold 22px sans-serif';
  const qMetrics = ctx.measureText(`${s.question.text} = ?`);
  const qW = qMetrics.width + 32, qH = 36;
  ctx.beginPath(); ctx.roundRect(sw / 2 - qW / 2, 68 - qH / 2, qW, qH, 10); ctx.fill();
  ctx.strokeStyle = qBoxStroke; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = qTextCol; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`${s.question.text} = ?`, sw / 2, 68);

  // HUD — level progress bar (top-right)
  {
    const left = Math.max(0, s.questionsToWin - s.score);
    const barW = 140, barH = 8, barX = sw - barW - 16, barY = 50;
    const pct = Math.min(1, s.score / s.questionsToWin);

    // Label row: hits | mistakes | left
    ctx.textAlign = 'left'; ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#4ADE80';
    ctx.fillText(`✓ ${s.score}`, barX, barY - 6);
    ctx.fillStyle = '#FF4757';
    ctx.textAlign = 'center';
    ctx.fillText(`✕ ${s.mistakes}`, barX + barW / 2, barY - 6);
    ctx.fillStyle = lt ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`${left} left`, barX + barW, barY - 6);

    // Bar background
    ctx.fillStyle = lt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();

    // Bar fill
    if (pct > 0) {
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, barH, 4); ctx.fill();
    }
  }

  // HUD — streak (below progress bar)
  if (s.streak > 0) {
    ctx.fillStyle = s.shipLevel >= 4 ? (lt ? '#B45309' : '#FFD866') : s.shipLevel >= 2 ? (lt ? '#3B5BDB' : '#A3BFFF') : '#4ADE80';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`🔥 x${s.streak}`, sw - 16, 72);
  }

  // HUD — active effects
  let effectY = 100;
  const drawEffect = (timer: number, max: number, col: string, label: string) => {
    if (timer <= 0) return;
    const pct = timer / max;
    ctx.fillStyle = col + '26'; ctx.beginPath(); ctx.roundRect(sw - 90, effectY, 70, 18, 6); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(sw - 90, effectY, 70 * pct, 18, 6); ctx.fill();
    ctx.fillStyle = effectTextCol; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, sw - 55, effectY + 10);
    effectY += 24;
  };
  drawEffect(s.shieldTimer, POWERUP_DURATION, '#FFD866', '🛡 Shield');
  drawEffect(s.slowTimer, POWERUP_DURATION, '#00BFFF', '❄ Slow');
  drawEffect(s.fastTimer, BAD_EFFECT_DURATION, '#C850C0', '⚡ Fast');
  drawEffect(s.doubleShotTimer, DOUBLE_SHOT_DURATION, '#FFD866', '🔫 x2');

  // Hint
  ctx.textAlign = 'center'; ctx.fillStyle = hintCol; ctx.font = '13px sans-serif';
  ctx.fillText('Mouse to move · Click or Space to shoot · ← → to steer', sw / 2, sh - 30);
}

function drawTitleScreen(
  ctx: CanvasRenderingContext2D, stars: Star[], sw: number, sh: number,
  bgT: BgTheme, shipT: ShipTheme, starOffset: number,
) {
  ctx.fillStyle = bgT.bg;
  ctx.fillRect(0, 0, sw, sh);

  for (const st of stars) {
    const y = (st.y + starOffset) % sh;
    ctx.globalAlpha = st.o;
    if (bgT.light) {
      ctx.font = `${8 + st.r * 6}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍓', st.x, y);
    } else {
      ctx.fillStyle = bgT.star;
      ctx.beginPath(); ctx.arc(st.x, y, st.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const cy = sh * 0.28;

  // Ship icon (smaller, cleaner)
  ctx.save();
  const shipCx = sw / 2, shipCy = cy - 50;
  const shipSc = 1.6;
  ctx.translate(shipCx, shipCy); ctx.scale(shipSc, shipSc); ctx.translate(-shipCx, -shipCy);
  drawShip(ctx, shipCx - SHIP_W / 2, shipCy - SHIP_W / 2, 2, shipT);
  ctx.restore();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = bgT.light ? '#B45309' : '#FFD866'; ctx.font = 'bold 42px sans-serif';
  ctx.fillText('HIT THE', sw / 2, cy + 20);
  ctx.fillStyle = shipT.body; ctx.font = 'bold 46px sans-serif';
  ctx.fillText('ANSWER', sw / 2, cy + 68);
  ctx.fillStyle = bgT.light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'; ctx.font = '14px sans-serif';
  ctx.fillText('Shoot the right number!', sw / 2, cy + 100);
}





// ─── Settings Screen ─────────────────────────────────────────────────────────

function SettingsScreen({ bgId, shipId, muted, onBg, onShip, onMute, onBack, bgT }: {
  bgId: string; shipId: string; muted: boolean;
  onBg: (id: string) => void; onShip: (id: string) => void;
  onMute: () => void; onBack: () => void;
  bgT: BgTheme;
}) {
  const lt = bgT.light;
  const textCol = lt ? '#1E293B' : '#fff';
  const subCol = lt ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const sectionLabel: React.CSSProperties = { color: subCol, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textAlign: 'center' as const };
  const divider: React.CSSProperties = { width: '100%', maxWidth: 400, height: 1, backgroundColor: lt ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', margin: '4px 0' };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: lt ? 'rgba(255,255,255,0.95)' : 'rgba(5,7,20,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', padding: '28px 20px 48px',
    }}>
      <div style={{ color: lt ? '#B45309' : '#FFD866', fontSize: 13, fontWeight: 800, letterSpacing: 3, marginBottom: 4 }}>HIT THE ANSWER</div>
      <h2 style={{ color: textCol, fontSize: 28, fontWeight: 900, margin: '0 0 28px', letterSpacing: 3 }}>SETTINGS</h2>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Sound */}
        <div style={sectionLabel}>SOUND</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <button onClick={onMute} style={{
            padding: '12px 32px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: 1,
            border: `1.5px solid ${lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
            backgroundColor: lt ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
            color: muted ? subCol : (lt ? 'rgba(0,0,0,0.75)' : '#fff'),
          }}>
            {muted ? '🔇  SOUND OFF' : '🔊  SOUND ON'}
          </button>
        </div>

        <div style={divider} />

        {/* Background */}
        <div style={{ ...sectionLabel, marginTop: 20 }}>BACKGROUND</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {BG_THEMES.map(t => (
            <div key={t.id} onClick={() => onBg(t.id)} style={{
              width: 56, height: 56, borderRadius: 12, cursor: 'pointer',
              backgroundColor: t.bg, position: 'relative', overflow: 'hidden',
              border: bgId === t.id ? `2.5px solid ${lt ? '#1E293B' : '#fff'}` : `2px solid ${lt ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
              boxShadow: bgId === t.id ? `0 0 12px ${t.star}44` : 'none',
              transition: 'border-color 0.15s',
            }}>
              <div style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: t.star, top: 10, left: 12, opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: t.star, top: 24, right: 10, opacity: 0.5 }} />
              <div style={{ position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: t.star, bottom: 12, left: 18, opacity: 0.6 }} />
              <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: t.star, opacity: 0.8, fontWeight: 700 }}>{t.name}</div>
              {bgId === t.id && <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4ADE80', color: '#000', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
            </div>
          ))}
        </div>

        <div style={divider} />

        {/* Ship */}
        <div style={{ ...sectionLabel, marginTop: 20 }}>SHIP</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          {SHIP_THEMES.map(t => (
            <div key={t.id} onClick={() => onShip(t.id)} style={{
              width: 56, height: 56, borderRadius: 12, cursor: 'pointer',
              backgroundColor: lt ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              border: shipId === t.id ? `2.5px solid ${lt ? '#1E293B' : '#fff'}` : `2px solid ${lt ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
              boxShadow: shipId === t.id ? `0 0 12px ${t.body}44` : 'none',
              transition: 'border-color 0.15s',
            }}>
              <svg width="28" height="32" viewBox="0 0 28 32">
                <polygon points="14,0 6,10 22,10" fill={t.nose} />
                <rect x="7" y="10" width="14" height="10" rx="1" fill={t.body} />
                <polygon points="2,24 2,16 8,24" fill={t.wing} />
                <polygon points="26,24 26,16 20,24" fill={t.wing} />
                <ellipse cx="14" cy="26" rx="4" ry="5" fill={t.flame} opacity="0.85" />
              </svg>
              <div style={{ fontSize: 8, color: lt ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', fontWeight: 700, marginTop: 2 }}>{t.name}</div>
              {shipId === t.id && <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4ADE80', color: '#000', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onBack} style={{
        padding: '12px 32px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, letterSpacing: 2,
        border: `1.5px solid ${lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
        backgroundColor: 'transparent', color: subCol,
      }}>← BACK</button>
    </div>
  );
}

// ─── Level Select Screen ─────────────────────────────────────────────────────

function starsDisplay(stars: 1 | 2 | 3): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function LevelSelectScreen({ levelProgress, onSelect, onBack, onSettings, bgT }: {
  levelProgress: LevelProgress;
  onSelect: (levelNum: number) => void;
  onBack: () => void;
  onSettings: () => void;
  bgT: BgTheme;
}) {
  const lt = bgT.light;
  const textCol = lt ? '#1E293B' : '#fff';
  const subCol = lt ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const tierNames = ['Beginner', 'Easy', 'Normal', 'Hard', 'Expert'];
  const tierStarts = [1, 13, 25, 37, 49];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: lt ? 'rgba(255,255,255,0.92)' : 'rgba(5,7,20,0.96)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', padding: '24px 16px 40px',
    }}>
      <div style={{ color: lt ? '#B45309' : '#FFD866', fontSize: 13, fontWeight: 800, letterSpacing: 3, marginBottom: 4 }}>HIT THE ANSWER</div>
      <h2 style={{ color: textCol, fontSize: 28, fontWeight: 900, margin: '0 0 20px', letterSpacing: 3 }}>SELECT LEVEL</h2>

      {[0, 1, 2, 3, 4].map(tier => {
        const start = tierStarts[tier];
        const end = tier < 4 ? tierStarts[tier + 1] - 1 : 60;
        const levelNums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        return (
          <div key={tier} style={{ width: '100%', maxWidth: 480, marginBottom: 20 }}>
            <div style={{ color: subCol, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textAlign: 'center' }}>
              {tierNames[tier].toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {levelNums.map(levelNum => {
                const unlocked = tierStarts.includes(levelNum) || levelProgress[levelNum - 1] != null;
                const prog = levelProgress[levelNum];
                return (
                  <button
                    key={levelNum}
                    disabled={!unlocked}
                    onClick={() => onSelect(levelNum)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '8px 4px', borderRadius: 10, cursor: unlocked ? 'pointer' : 'default',
                      border: prog
                        ? `2px solid ${lt ? 'rgba(180,140,40,0.5)' : 'rgba(255,216,102,0.4)'}`
                        : `2px solid ${lt ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
                      backgroundColor: !unlocked
                        ? (lt ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)')
                        : prog
                          ? (lt ? 'rgba(180,140,40,0.12)' : 'rgba(255,216,102,0.08)')
                          : (lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'),
                      opacity: unlocked ? 1 : 0.35,
                    }}>
                    <span style={{ color: textCol, fontSize: 14, fontWeight: 800 }}>{levelNum}</span>
                    <span style={{ fontSize: 9, letterSpacing: 0.5, color: prog ? '#FFD866' : subCol, marginTop: 2 }}>
                      {prog ? starsDisplay(prog.stars) : unlocked ? '—' : '🔒'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={onBack} style={{
          padding: '12px 32px', borderRadius: 12, border: `1.5px solid ${lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
          backgroundColor: 'transparent', color: subCol, fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
        }}>← BACK</button>
        <button onClick={onSettings} style={{
          padding: '12px 32px', borderRadius: 12, border: `1.5px solid ${lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
          backgroundColor: 'transparent', color: subCol, fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
        }}>⚙ SETTINGS</button>
      </div>
    </div>
  );
}

// ─── App Component ───────────────────────────────────────────────────────────

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<GameState>(makeState(0, window.innerWidth, 1));
  const stars = useRef<Star[]>(
    Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.5 + 0.1,
    })),
  );
  const starOffset = useRef(0);
  const keys = useRef({ left: false, right: false, space: false, spacePrev: false });
  const [gameKey, setGameKey] = useState(0);
  const [over, setOver] = useState(false);
  const [screen, setScreen] = useState<Screen>('title');
  const [paused, setPaused] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState<LevelProgress>(() => {
    try { return JSON.parse(localStorage.getItem('hta_levels') ?? '{}'); } catch { return {}; }
  });
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [levelCompleteStars, setLevelCompleteStars] = useState<1 | 2 | 3>(1);
  const [settingsFrom, setSettingsFrom] = useState<Screen>('title');
  const [bgThemeId, setBgThemeId] = useState(() => localStorage.getItem('hta_bg') ?? 'space');
  const [shipThemeId, setShipThemeId] = useState(() => localStorage.getItem('hta_ship') ?? 'classic');
  const [muted, setMuted] = useState(() => localStorage.getItem('hta_mute') === '1');
  const mutedRef = useRef(muted);
  const selectedLevelRef = useRef(selectedLevel);
  const levelProgressRef = useRef(levelProgress);

  // Keep refs in sync so animation loop always sees latest values
  mutedRef.current = muted;
  selectedLevelRef.current = selectedLevel;
  levelProgressRef.current = levelProgress;

  const started = screen === 'game';

  // Persist settings
  useEffect(() => { localStorage.setItem('hta_bg', bgThemeId); }, [bgThemeId]);
  useEffect(() => { localStorage.setItem('hta_ship', shipThemeId); }, [shipThemeId]);
  useEffect(() => { localStorage.setItem('hta_mute', muted ? '1' : '0'); }, [muted]);
  const scoreRef = useRef(0);

  const bgT = getBgTheme(bgThemeId);
  const shipT = getShipTheme(shipThemeId);

  // Keep refs for use inside animation loop
  const bgTRef = useRef(bgT); bgTRef.current = bgT;
  const shipTRef = useRef(shipT); shipTRef.current = shipT;

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey, window.innerWidth, selectedLevelRef.current);
    setOver(false);
    setPaused(false);
    setLevelCompleted(false);
  }

  function saveLevelProgress(levelNum: number, stars: 1 | 2 | 3) {
    const current = levelProgressRef.current;
    if (!current[levelNum] || current[levelNum].stars < stars) {
      const updated = { ...current, [levelNum]: { stars } };
      levelProgressRef.current = updated;
      setLevelProgress(updated);
      localStorage.setItem('hta_levels', JSON.stringify(updated));
    }
  }

  // Title/levels screen background loop
  useEffect(() => {
    if (started) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    const loop = () => {
      starOffset.current = (starOffset.current + 0.4) % canvas.height;
      drawTitleScreen(ctx, stars.current, canvas.width, canvas.height, bgTRef.current, shipTRef.current, starOffset.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [started]);

  // Game loop
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current!;
    let raf: number;

    const onMouseMove = (e: MouseEvent) => {
      const s = g.current;
      if (!s.over && !s.paused) s.shipX = Math.max(0, Math.min(canvas.width - SHIP_W, e.clientX - SHIP_W / 2));
    };
    const onClick = (e: MouseEvent) => {
      const s = g.current;
      // Pause button hit area
      if (!s.over && !s.paused && e.clientX >= 16 && e.clientX <= 48 && e.clientY >= 52 && e.clientY <= 84) {
        s.paused = true; setPaused(true);
        return;
      }
      if (s.over || s.paused) return;
      playFire(mutedRef.current);
      spawnBullets(s, s.shipX, canvas.height);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = g.current;
        if (!s.over) { s.paused = !s.paused; setPaused(s.paused); }
        return;
      }
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
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      g.current.shipX = Math.min(g.current.shipX, canvas.width - SHIP_W);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    const step = () => {
      const sw = canvas.width, sh = canvas.height;
      const s = g.current;
      const ctx = canvas.getContext('2d')!;

      if (!s.over && !s.paused && !s.levelComplete) {
        if (keys.current.left) s.shipX = Math.max(0, s.shipX - KEYBOARD_SPEED);
        if (keys.current.right) s.shipX = Math.min(sw - SHIP_W, s.shipX + KEYBOARD_SPEED);
        if (keys.current.space && !keys.current.spacePrev) {
          playFire(mutedRef.current);
          spawnBullets(s, s.shipX, sh);
        }
        keys.current.spacePrev = keys.current.space;
        tickGame(s, sw, sh);
        // Drain and play sound events
        for (const ev of s.soundEvents) playSound(ev, mutedRef.current);
        s.soundEvents = [];
        starOffset.current = (starOffset.current + 0.8) % sh;
        if (s.levelComplete) {
          scoreRef.current = s.score;
          const earnedStars = computeStars(s.levelNum, s.mistakes);
          const cur = levelProgressRef.current;
          if (!cur[s.levelNum] || cur[s.levelNum].stars < earnedStars) {
            const updated = { ...cur, [s.levelNum]: { stars: earnedStars } };
            levelProgressRef.current = updated;
            setLevelProgress(updated);
            localStorage.setItem('hta_levels', JSON.stringify(updated));
          }
          draw(ctx, s, stars.current, sw, sh, bgTRef.current, shipTRef.current, starOffset.current);
          setLevelCompleted(true);
          setLevelCompleteStars(earnedStars);
          return;
        }
        if (s.over) { scoreRef.current = s.score; draw(ctx, s, stars.current, sw, sh, bgTRef.current, shipTRef.current, starOffset.current); setOver(true); return; }
      }

      draw(ctx, s, stars.current, sw, sh, bgTRef.current, shipTRef.current, starOffset.current);

      // Dim overlay when paused (canvas part)
      if (s.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, sw, sh);
      }
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
  }, [gameKey, started]);

  const overlayBase: React.CSSProperties = {
    position: 'fixed', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 16,
  };

  const btnStyle: React.CSSProperties = {
    padding: '14px 40px', backgroundColor: '#4A6CF7', color: '#fff',
    fontSize: 18, fontWeight: 800, letterSpacing: 2,
    border: 'none', borderRadius: 14, cursor: 'pointer', width: 220, textAlign: 'center',
  };

  const ghostBtn: React.CSSProperties = {
    ...btnStyle, backgroundColor: 'transparent',
    border: `1.5px solid ${bgT.light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
    color: bgT.light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
    width: 'auto', padding: '12px 32px', fontSize: 15,
  };

  const openSettings = (from: Screen) => { setSettingsFrom(from); setScreen('settings'); };

  return (
    <>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} style={{ display: 'block' }} />

      {/* Settings screen */}
      {screen === 'settings' && (
        <SettingsScreen
          bgId={bgThemeId} shipId={shipThemeId} muted={muted}
          onBg={setBgThemeId} onShip={setShipThemeId} onMute={() => setMuted(m => !m)}
          onBack={() => setScreen(settingsFrom)}
          bgT={bgT}
        />
      )}

      {/* Title screen */}
      {screen === 'title' && (
        <div style={{ ...overlayBase, justifyContent: 'flex-end', paddingBottom: '4%', gap: 12 }}>
          <button onClick={() => setScreen('levels')}
            style={{ ...btnStyle, fontSize: 20, padding: '16px 48px', letterSpacing: 3, whiteSpace: 'nowrap', width: 'auto', boxShadow: '0 0 30px rgba(74,108,247,0.4)' }}>
            START GAME
          </button>
          <button onClick={() => openSettings('title')} style={ghostBtn}>⚙  SETTINGS</button>
        </div>
      )}

      {/* Level select */}
      {screen === 'levels' && (
        <LevelSelectScreen
          levelProgress={levelProgress}
          onSelect={(levelNum) => {
            setSelectedLevel(levelNum);
            selectedLevelRef.current = levelNum;
            setScreen('game');
            setGameKey(k => k + 1);
          }}
          onBack={() => setScreen('title')}
          onSettings={() => openSettings('levels')}
          bgT={bgT}
        />
      )}

      {/* Pause overlay (DOM) — canvas draws the dim already */}
      {started && paused && (
        <div style={overlayBase}>
          <div style={{ color: bgT.light ? '#B45309' : '#FFD866', fontSize: 28, fontWeight: 900, letterSpacing: 3 }}>HIT THE</div>
          <div style={{ color: shipT.body, fontSize: 32, fontWeight: 900, letterSpacing: 4, marginTop: -12 }}>ANSWER</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: bgT.light ? '#1E293B' : '#fff', margin: '8px 0 16px', letterSpacing: 4 }}>PAUSED</h1>
          <button onClick={() => { g.current.paused = false; setPaused(false); }} style={btnStyle}>▶  RESUME</button>
          <button onClick={() => { g.current.paused = false; setPaused(false); setGameKey(k => k + 1); }} style={btnStyle}>↻  RESTART</button>
          <button onClick={() => { g.current.paused = false; setPaused(false); setScreen('levels'); }} style={ghostBtn}>☰  LEVELS</button>
          <button onClick={() => openSettings('game')} style={ghostBtn}>⚙  SETTINGS</button>
          <div style={{ color: bgT.light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 4 }}>or press ESC to resume</div>
        </div>
      )}

      {/* Level complete */}
      {started && levelCompleted && (
        <div style={{ ...overlayBase, backgroundColor: bgT.light ? 'rgba(255,255,255,0.92)' : 'rgba(5,7,20,0.92)' }}>
          <div style={{ color: bgT.light ? '#B45309' : '#FFD866', fontSize: 13, fontWeight: 800, letterSpacing: 3 }}>LEVEL {selectedLevel} COMPLETE!</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#4ADE80', margin: '8px 0', letterSpacing: 2 }}>
            {starsDisplay(levelCompleteStars)}
          </h1>
          <p style={{ color: bgT.light ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 16px' }}>
            {levelCompleteStars === 3 ? 'Perfect! No mistakes!' : levelCompleteStars === 2 ? 'Great job!' : 'Level cleared!'}
          </p>
          {selectedLevel < LEVELS.length && (
            <button onClick={() => {
              const next = selectedLevel + 1;
              setSelectedLevel(next);
              selectedLevelRef.current = next;
              setLevelCompleted(false);
              setGameKey(k => k + 1);
            }} style={{ ...btnStyle, fontSize: 20, padding: '16px 48px', letterSpacing: 3, width: 'auto', boxShadow: '0 0 30px rgba(74,108,247,0.4)' }}>
              NEXT LEVEL →
            </button>
          )}
          <button onClick={() => { setLevelCompleted(false); setScreen('levels'); }} style={ghostBtn}>☰  LEVELS</button>
        </div>
      )}

      {/* Game over */}
      {started && over && (
        <div style={{ ...overlayBase, backgroundColor: bgT.light ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)' }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: '#FF4757', letterSpacing: 6, margin: 0 }}>GAME OVER</h1>
          <p style={{ fontSize: 18, color: bgT.light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', margin: '4px 0 16px' }}>Level {selectedLevel} — Score: {scoreRef.current}</p>
          <button onClick={() => setGameKey(k => k + 1)}
            style={{ ...btnStyle, fontSize: 20, padding: '16px 48px', letterSpacing: 3, whiteSpace: 'nowrap', width: 'auto', boxShadow: '0 0 30px rgba(74,108,247,0.4)' }}>
            TRY AGAIN
          </button>
          <button onClick={() => setScreen('levels')} style={ghostBtn}>☰  LEVELS</button>
        </div>
      )}
    </>
  );
}
