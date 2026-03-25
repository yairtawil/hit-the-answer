import React, { useEffect, useRef, useState } from 'react';
import {
  SHIP_W, BULLET_W, BULLET_H, NUM_SIZE, MAX_LIVES,
  POWERUP_SIZE, POWERUP_DURATION, BAD_EFFECT_DURATION, NOTIF_LIFETIME,
  BG_THEMES, SHIP_THEMES, NUM_SHAPES,
  type GameState, type Star, type BgTheme, type ShipTheme,
  makeState, tickGame, shipY, shipScale, rockScale, getBgTheme, getShipTheme,
} from '@hit-the-answer/common';

const KEYBOARD_SPEED = 6;

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
    default: return { color: '#fff', bg: 'rgba(255,255,255,0.25)' };
  }
}

function powerUpIcon(kind: string): string {
  switch (kind) {
    case 'life': return '♥'; case 'slow': return '❄'; case 'shield': return '🛡';
    case 'fast': return '⚡'; case 'lose_life': return '💀'; default: return '?';
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
  if (shapeId === 'stone') {
    // Irregular rocky polygon
    const pts = [
      [cx - r * 0.4, cy - r * 0.95],
      [cx + r * 0.5, cy - r * 0.85],
      [cx + r * 0.95, cy - r * 0.25],
      [cx + r * 0.8, cy + r * 0.55],
      [cx + r * 0.3, cy + r * 0.92],
      [cx - r * 0.4, cy + r * 0.88],
      [cx - r * 0.9, cy + r * 0.35],
      [cx - r * 0.85, cy - r * 0.4],
    ];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  } else if (shapeId === 'hex') {
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
    // circle (default)
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
}

function draw(
  ctx: CanvasRenderingContext2D, s: GameState, stars: Star[],
  sw: number, sh: number, bgT: BgTheme, shipT: ShipTheme, _shapeId: string,
) {
  const sy = shipY(sh);
  const now = Date.now();

  ctx.fillStyle = bgT.bg;
  ctx.fillRect(0, 0, sw, sh);

  for (const st of stars) {
    ctx.globalAlpha = st.o;
    if (bgT.light) {
      ctx.font = `${8 + st.r * 6}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍓', st.x, st.y);
    } else {
      ctx.fillStyle = bgT.star;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const lt = bgT.light;
  const textCol = lt ? '#1E293B' : '#fff';
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

    // Rock body — always stone shape
    const rockFill = lt ? 'rgba(180,170,155,0.9)' : 'rgba(90,80,70,0.9)';
    const rockStroke = lt ? '#8B7355' : '#A0906E';
    ctx.fillStyle = damaged ? (lt ? 'rgba(160,145,130,0.9)' : 'rgba(75,65,55,0.9)') : rockFill;
    ctx.strokeStyle = n.correct ? rockStroke : rockStroke;
    ctx.lineWidth = 2;
    drawNumShape(ctx, cx, cy, r, 'stone'); ctx.fill(); ctx.stroke();

    // Crack lines for damaged rocks
    if (damaged) {
      ctx.strokeStyle = lt ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.3, cy - r * 0.4);
      ctx.lineTo(cx + r * 0.1, cy);
      ctx.lineTo(cx - r * 0.15, cy + r * 0.35);
      ctx.stroke();
      if (n.maxHp - n.hp >= 2) {
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.2, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.35, cy + r * 0.2);
        ctx.stroke();
      }
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

  for (const b of s.bullets) {
    ctx.shadowColor = 'rgba(255,216,102,0.5)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFD866';
    ctx.beginPath(); ctx.roundRect(b.x, b.y, BULLET_W, BULLET_H, BULLET_W / 2); ctx.fill();
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

  // HUD — score + streak
  ctx.textAlign = 'right'; ctx.fillStyle = textCol; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(String(s.score), sw - 20, 60);
  if (s.streak > 0) {
    ctx.fillStyle = s.shipLevel >= 4 ? (lt ? '#B45309' : '#FFD866') : s.shipLevel >= 2 ? (lt ? '#3B5BDB' : '#A3BFFF') : '#4ADE80';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🔥 x${s.streak}`, sw - 20, 82);
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

  // Hint
  ctx.textAlign = 'center'; ctx.fillStyle = hintCol; ctx.font = '13px sans-serif';
  ctx.fillText('Mouse to move · Click or Space to shoot · ← → to steer', sw / 2, sh - 30);
}

function drawTitleScreen(
  ctx: CanvasRenderingContext2D, stars: Star[], sw: number, sh: number,
  bgT: BgTheme, shipT: ShipTheme,
) {
  ctx.fillStyle = bgT.bg;
  ctx.fillRect(0, 0, sw, sh);

  for (const st of stars) {
    ctx.globalAlpha = st.o;
    if (bgT.light) {
      ctx.font = `${8 + st.r * 6}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍓', st.x, st.y);
    } else {
      ctx.fillStyle = bgT.star;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
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

// ─── Theme Picker Component ─────────────────────────────────────────────────

const swatchStyle: React.CSSProperties = {
  width: 48, height: 48, borderRadius: 10, cursor: 'pointer',
  border: '2px solid rgba(255,255,255,0.15)', position: 'relative',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'border-color 0.15s',
};

const checkStyle: React.CSSProperties = {
  position: 'absolute', top: -4, right: -4,
  width: 18, height: 18, borderRadius: 9,
  backgroundColor: '#4ADE80', color: '#000',
  fontSize: 12, fontWeight: 900,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

function shapePreviewPath(id: string, cx: number, cy: number, r: number): string {
  if (id === 'stone') {
    const pts = [
      [cx - r * 0.4, cy - r * 0.95], [cx + r * 0.5, cy - r * 0.85],
      [cx + r * 0.95, cy - r * 0.25], [cx + r * 0.8, cy + r * 0.55],
      [cx + r * 0.3, cy + r * 0.92], [cx - r * 0.4, cy + r * 0.88],
      [cx - r * 0.9, cy + r * 0.35], [cx - r * 0.85, cy - r * 0.4],
    ];
    return 'M' + pts.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
  }
  if (id === 'hex') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 3 * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    });
    return 'M' + pts.join('L') + 'Z';
  }
  if (id === 'diamond') {
    return `M${cx},${cy - r}L${cx + r * 0.75},${cy}L${cx},${cy + r}L${cx - r * 0.75},${cy}Z`;
  }
  // circle fallback - use a large arc
  return `M${cx - r},${cy}A${r},${r},0,1,0,${cx + r},${cy}A${r},${r},0,1,0,${cx - r},${cy}Z`;
}

function ThemePicker({ bgId, shipId, shapeId, onBg, onShip, onShape }: {
  bgId: string; shipId: string; shapeId: string;
  onBg: (id: string) => void; onShip: (id: string) => void; onShape: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 16 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>BACKGROUND</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {BG_THEMES.map(t => (
          <div key={t.id} onClick={() => onBg(t.id)}
            style={{ ...swatchStyle, backgroundColor: t.bg, borderColor: bgId === t.id ? '#fff' : undefined }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.star, position: 'absolute', top: 10, left: 12, opacity: 0.8 }} />
            <div style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: t.star, position: 'absolute', top: 22, right: 10, opacity: 0.5 }} />
            <div style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: t.star, position: 'absolute', bottom: 12, left: 18, opacity: 0.6 }} />
            {bgId === t.id && <div style={checkStyle}>✓</div>}
          </div>
        ))}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>SHIP</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {SHIP_THEMES.map(t => (
          <div key={t.id} onClick={() => onShip(t.id)}
            style={{ ...swatchStyle, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: shipId === t.id ? '#fff' : undefined }}>
            <svg width="28" height="32" viewBox="0 0 28 32">
              <polygon points="14,0 6,10 22,10" fill={t.nose} />
              <rect x="7" y="10" width="14" height="10" rx="1" fill={t.body} />
              <polygon points="2,24 2,16 8,24" fill={t.wing} />
              <polygon points="26,24 26,16 20,24" fill={t.wing} />
              <ellipse cx="14" cy="26" rx="4" ry="5" fill={t.flame} opacity="0.85" />
            </svg>
            {shipId === t.id && <div style={checkStyle}>✓</div>}
          </div>
        ))}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>SHAPE</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {NUM_SHAPES.map(ns => (
          <div key={ns.id} onClick={() => onShape(ns.id)}
            style={{ ...swatchStyle, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: shapeId === ns.id ? '#fff' : undefined }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <path d={shapePreviewPath(ns.id, 15, 15, 12)} fill="rgba(26,32,64,0.9)" stroke="#4A6CF7" strokeWidth="1.5" />
              <text x="15" y="16" textAnchor="middle" dominantBaseline="central" fill="#E8EAFF" fontSize="10" fontWeight="bold">7</text>
            </svg>
            {shapeId === ns.id && <div style={checkStyle}>✓</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App Component ───────────────────────────────────────────────────────────

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
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [bgThemeId, setBgThemeId] = useState(() => localStorage.getItem('hta_bg') ?? 'space');
  const [shipThemeId, setShipThemeId] = useState(() => localStorage.getItem('hta_ship') ?? 'classic');
  const [numShapeId, setNumShapeId] = useState(() => localStorage.getItem('hta_shape') ?? 'circle');

  // Persist settings
  useEffect(() => { localStorage.setItem('hta_bg', bgThemeId); }, [bgThemeId]);
  useEffect(() => { localStorage.setItem('hta_ship', shipThemeId); }, [shipThemeId]);
  useEffect(() => { localStorage.setItem('hta_shape', numShapeId); }, [numShapeId]);
  const scoreRef = useRef(0);

  const bgT = getBgTheme(bgThemeId);
  const shipT = getShipTheme(shipThemeId);

  // Keep refs for use inside animation loop
  const bgTRef = useRef(bgT); bgTRef.current = bgT;
  const shipTRef = useRef(shipT); shipTRef.current = shipT;
  const shapeRef = useRef(numShapeId); shapeRef.current = numShapeId;

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey, window.innerWidth);
    setOver(false);
    setPaused(false);
  }

  // Title screen loop
  useEffect(() => {
    if (started) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    const loop = () => {
      drawTitleScreen(ctx, stars.current, canvas.width, canvas.height, bgTRef.current, shipTRef.current);
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
      s.bullets.push({
        id: `b${Date.now()}-${Math.random()}`,
        x: s.shipX + SHIP_W / 2 - BULLET_W / 2,
        y: shipY(canvas.height) - BULLET_H,
      });
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

      if (!s.over && !s.paused) {
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
        if (s.over) { scoreRef.current = s.score; draw(ctx, s, stars.current, sw, sh, bgTRef.current, shipTRef.current, shapeRef.current); setOver(true); return; }
      }

      draw(ctx, s, stars.current, sw, sh, bgTRef.current, shipTRef.current, shapeRef.current);

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

  return (
    <>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} style={{ display: 'block' }} />

      {/* Title screen */}
      {!started && (
        <div style={{ ...overlayBase, justifyContent: 'flex-end', paddingBottom: '4%', gap: 12 }}>
          <button onClick={() => { setStarted(true); setGameKey(k => k + 1); }}
            style={{ ...btnStyle, fontSize: 20, padding: '16px 48px', letterSpacing: 3, whiteSpace: 'nowrap', width: 'auto', boxShadow: '0 0 30px rgba(74,108,247,0.4)' }}>
            START GAME
          </button>
          <ThemePicker bgId={bgThemeId} shipId={shipThemeId} shapeId={numShapeId} onBg={setBgThemeId} onShip={setShipThemeId} onShape={setNumShapeId} />
        </div>
      )}

      {/* Pause overlay (DOM) — canvas draws the dim already */}
      {started && paused && (
        <div style={overlayBase}>
          <div style={{ color: bgT.light ? '#B45309' : '#FFD866', fontSize: 28, fontWeight: 900, letterSpacing: 3 }}>HIT THE</div>
          <div style={{ color: shipT.body, fontSize: 32, fontWeight: 900, letterSpacing: 4, marginTop: -12 }}>ANSWER</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: bgT.light ? '#1E293B' : '#fff', margin: '8px 0 16px', letterSpacing: 4 }}>PAUSED</h1>
          <button onClick={() => { g.current.paused = false; setPaused(false); }} style={btnStyle}>▶  RESUME</button>
          <button onClick={() => setGameKey(k => k + 1)} style={btnStyle}>↻  RESTART</button>
          <div style={{ color: bgT.light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 4 }}>or press ESC to resume</div>
          <ThemePicker bgId={bgThemeId} shipId={shipThemeId} shapeId={numShapeId} onBg={setBgThemeId} onShip={setShipThemeId} onShape={setNumShapeId} />
        </div>
      )}

      {/* Game over */}
      {started && over && (
        <div style={{ ...overlayBase, backgroundColor: bgT.light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: '#FF4757', letterSpacing: 6, margin: 0 }}>GAME OVER</h1>
          <p style={{ fontSize: 28, color: bgT.light ? '#1E293B' : '#fff', fontWeight: 600, margin: 0 }}>Score: {scoreRef.current}</p>
          <button onClick={() => setGameKey(k => k + 1)}
            style={{ ...btnStyle, marginTop: 24 }}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </>
  );
}
