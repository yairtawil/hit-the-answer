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
  DRAG_THRESHOLD, TAP_MAX_DURATION,
  type GameState, type Star,
  makeState, tickGame, shipY,
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
          {'♥'.repeat(s.lives)}{'♡'.repeat(MAX_LIVES - s.lives)}
        </Text>
        <View style={styles.questionBox}>
          <Text style={styles.qText}>{s.question.text} = ?</Text>
        </View>
        <Text style={styles.scoreText}>{s.score}</Text>
      </View>

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

      <View style={[styles.ship, { left: s.shipX, top: sy }]}>
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
  scoreText: { fontSize: 24, fontWeight: '800', color: '#fff', width: 76, textAlign: 'right' },
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
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 18,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#7C9DFF',
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
  shipFlame: {
    width: 10, height: 12,
    backgroundColor: '#FF9F43',
    borderRadius: 5,
    marginTop: -2,
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
