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
import {
  SHIP_W, BULLET_W, BULLET_H, NUM_SIZE, MAX_LIVES,
  POWERUP_SIZE, POWERUP_DURATION,
  DRAG_THRESHOLD, TAP_MAX_DURATION,
  type GameState, type Star,
  makeState, tickGame, shipY, shipScale,
} from '@hit-the-answer/common';

const { width: sw, height: sh } = Dimensions.get('window');

export default function App(): React.JSX.Element {
  const [, rerender] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const g = useRef<GameState>(makeState(0, sw));

  const stars = useRef<Star[]>(
    Array.from({ length: 50 }, () => ({
      x: Math.random() * sw,
      y: Math.random() * sh,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.5 + 0.1,
    })),
  ).current;

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey, sw);
  }

  useEffect(() => {
    const s = g.current;
    let raf: number;

    const step = () => {
      if (s.over) {
        rerender(c => c + 1);
        return;
      }
      tickGame(s, sw, sh);
      rerender(c => c + 1);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gameKey]);

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
          s.shipX = Math.max(0, Math.min(sw - SHIP_W, s.dragStartX + gs.dx));
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
            y: shipY(sh) - BULLET_H,
          });
        }
        s.isDragging = false;
      },
    }),
  ).current;

  const s = g.current;
  const sy = shipY(sh);
  const sc = shipScale(s.shipLevel);

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

  // Ship colors based on level
  const noseColor = s.shipLevel >= 1 ? '#A3BFFF' : '#7C9DFF';
  const wingColor = s.shipLevel >= 3 ? '#6B8CFF' : s.shipLevel >= 2 ? '#5577EE' : '#3A5BD7';
  const flameCount = s.shipLevel >= 3 ? 3 : s.shipLevel >= 2 ? 2 : 1;

  const maxDisplay = Math.max(MAX_LIVES, s.lives);

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

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <StatusBar style="light" />
      {starViews}

      <View style={styles.hud}>
        <Text style={styles.livesText}>
          {'♥'.repeat(s.lives)}{'♡'.repeat(maxDisplay - s.lives)}
        </Text>
        <View style={styles.questionBox}>
          <Text style={styles.qText}>{s.question.text} = ?</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreText}>{s.score}</Text>
          {s.streak > 0 && (
            <Text style={[styles.streakText, {
              color: s.shipLevel >= 4 ? '#FFD866' : s.shipLevel >= 2 ? '#A3BFFF' : '#4ADE80',
            }]}>
              🔥 x{s.streak}
            </Text>
          )}
        </View>
      </View>

      {/* Active power-up effect indicators */}
      {(s.shieldTimer > 0 || s.slowTimer > 0) && (
        <View style={styles.effectsRow}>
          {s.shieldTimer > 0 && (
            <View style={styles.effectPill}>
              <View style={[styles.effectBar, { backgroundColor: '#FFD866', width: `${(s.shieldTimer / POWERUP_DURATION) * 100}%` as any }]} />
              <Text style={styles.effectLabel}>🛡️ Shield</Text>
            </View>
          )}
          {s.slowTimer > 0 && (
            <View style={styles.effectPill}>
              <View style={[styles.effectBar, { backgroundColor: '#00BFFF', width: `${(s.slowTimer / POWERUP_DURATION) * 100}%` as any }]} />
              <Text style={styles.effectLabel}>❄️ Slow</Text>
            </View>
          )}
        </View>
      )}

      {s.numbers.map(n => (
        <View key={n.id} style={[styles.numBubble, { left: n.x, top: n.y }]}>
          <Text style={styles.numText}>{n.value}</Text>
        </View>
      ))}

      {s.bullets.map(b => (
        <View key={b.id} style={[styles.bullet, { left: b.x, top: b.y }]}>
          <View style={styles.bulletGlow} />
        </View>
      ))}

      {/* Power-ups */}
      {s.powerups.map(pu => (
        <View key={pu.id} style={[styles.powerup, {
          left: pu.x,
          top: pu.y,
          borderColor: pu.kind === 'life' ? '#FF4757' : pu.kind === 'slow' ? '#00BFFF' : '#FFD866',
          backgroundColor: pu.kind === 'life' ? 'rgba(255,71,87,0.25)' : pu.kind === 'slow' ? 'rgba(0,191,255,0.25)' : 'rgba(255,216,102,0.25)',
          shadowColor: pu.kind === 'life' ? '#FF4757' : pu.kind === 'slow' ? '#00BFFF' : '#FFD866',
        }]}>
          <Text style={styles.powerupIcon}>
            {pu.kind === 'life' ? '♥' : pu.kind === 'slow' ? '❄️' : '🛡️'}
          </Text>
        </View>
      ))}

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

      {/* Ship with level-based scaling and visuals */}
      <View style={[styles.ship, {
        left: s.shipX,
        top: sy,
        transform: [{ scale: sc }],
        shadowColor: s.shipLevel >= 4 ? '#FFD866' : s.shipLevel >= 2 ? '#7C9DFF' : 'transparent',
        shadowRadius: s.shipLevel >= 4 ? 16 : s.shipLevel >= 2 ? 10 : 0,
        shadowOpacity: s.shipLevel >= 2 ? 0.8 : 0,
        shadowOffset: { width: 0, height: 0 },
      }]}>
        <View style={[styles.shipNose, {
          borderBottomColor: noseColor,
        }]} />
        {s.shipLevel >= 1 && (
          <View style={[styles.shipNoseAccent, {
            borderColor: s.shipLevel >= 4 ? '#FFD866' : '#00E5FF',
          }]} />
        )}
        <View style={styles.shipBody} />
        <View style={[styles.shipWingL, { borderRightColor: wingColor }]} />
        <View style={[styles.shipWingR, { borderLeftColor: wingColor }]} />
        {/* Wing tip glows for level 2+ */}
        {s.shipLevel >= 2 && (
          <>
            <View style={[styles.wingTipL, {
              backgroundColor: s.shipLevel >= 4 ? '#FFD866' : '#A3BFFF',
            }]} />
            <View style={[styles.wingTipR, {
              backgroundColor: s.shipLevel >= 4 ? '#FFD866' : '#A3BFFF',
            }]} />
          </>
        )}
        {/* Flames */}
        <View style={styles.flameRow}>
          {flameCount >= 2 && <View style={[styles.shipFlame, { marginRight: 2 }]} />}
          <View style={styles.shipFlame} />
          {flameCount >= 2 && <View style={[styles.shipFlame, { marginLeft: 2 }]} />}
          {flameCount >= 3 && <View style={[styles.shipFlame, { position: 'absolute', top: -4 }]} />}
        </View>
      </View>

      <Text style={styles.hint}>Drag to move · Tap to shoot</Text>
    </View>
  );
}

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
  livesText: { fontSize: 22, color: '#FF4757', width: 100 },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,216,102,0.2)',
  },
  qText: { fontSize: 22, fontWeight: '800', color: '#FFD866' },
  scoreCol: { width: 76, alignItems: 'flex-end' },
  scoreText: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'right' },
  streakText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  effectsRow: {
    position: 'absolute',
    top: 92,
    right: 16,
    zIndex: 10,
    gap: 4,
  },
  effectPill: {
    width: 80,
    height: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  effectBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    opacity: 0.4,
  },
  effectLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
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
  powerup: {
    position: 'absolute',
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    borderRadius: POWERUP_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  powerupIcon: { fontSize: 16 },
  ship: { position: 'absolute', width: SHIP_W, height: SHIP_W, alignItems: 'center' },
  shipNose: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 18,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#7C9DFF',
  },
  shipNoseAccent: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    opacity: 0.6,
  },
  shipBody: {
    width: 26, height: 18,
    backgroundColor: '#4A6CF7',
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  shipWingL: {
    position: 'absolute', left: 2, bottom: 8,
    width: 0, height: 0,
    borderTopWidth: 14, borderRightWidth: 10,
    borderTopColor: 'transparent', borderRightColor: '#3A5BD7',
  },
  shipWingR: {
    position: 'absolute', right: 2, bottom: 8,
    width: 0, height: 0,
    borderTopWidth: 14, borderLeftWidth: 10,
    borderTopColor: 'transparent', borderLeftColor: '#3A5BD7',
  },
  wingTipL: {
    position: 'absolute',
    left: 0,
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.9,
  },
  wingTipR: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.9,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  shipFlame: {
    width: 10, height: 12,
    backgroundColor: '#FF9F43',
    borderRadius: 5,
    opacity: 0.85,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overTitle: { fontSize: 46, fontWeight: '900', color: '#FF4757', letterSpacing: 6 },
  overScore: { fontSize: 28, color: '#fff', marginTop: 16, fontWeight: '600' },
  playBtn: {
    marginTop: 40, paddingVertical: 16, paddingHorizontal: 40,
    backgroundColor: '#4A6CF7', borderRadius: 14,
  },
  playBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  hint: {
    position: 'absolute', bottom: 30,
    alignSelf: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13,
  },
});
