import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Dimensions, PanResponder, TouchableOpacity, BackHandler, ScrollView,
  Platform, StatusBar as RNStatusBar,
  type GestureResponderEvent, type PanResponderGestureState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import {
  SHIP_W, BULLET_W, BULLET_H, POWER_BULLET_W, NUM_SIZE, MAX_LIVES,
  POWERUP_SIZE, POWERUP_DURATION, BAD_EFFECT_DURATION, DOUBLE_SHOT_DURATION, NOTIF_LIFETIME, rockScale,
  DRAG_THRESHOLD, TAP_MAX_DURATION,
  BG_THEMES, SHIP_THEMES, DIFFICULTY_NAMES,
  type GameState, type Star,
  makeState, tickGame, shipY, shipScale, getBgTheme, getShipTheme, spawnBullets,
} from '@hit-the-answer/common';

const { width: sw, height: sh } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44;
const HUD_TOP = STATUS_BAR_HEIGHT + 8;

// ─── Sound engine ─────────────────────────────────────────────────────────────

function makeWavB64(freqStart: number, freqEnd: number, ms: number, vol = 0.22): string {
  const rate = 22050;
  const n = Math.round(rate * ms / 1000);
  const fade = Math.round(rate * 0.025);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = freqStart + (freqEnd - freqStart) * (i / n);
    const env = Math.min(1, i / fade) * Math.min(1, (n - i) / fade);
    v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * f * t) * env * vol * 32767), true);
  }
  const u = new Uint8Array(buf);
  const C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '';
  for (let i = 0; i < u.length; i += 3) {
    const a = u[i], b = u[i + 1] ?? 0, c = u[i + 2] ?? 0;
    r += C[a >> 2] + C[((a & 3) << 4) | (b >> 4)] + C[((b & 15) << 2) | (c >> 6)] + C[c & 63];
  }
  const p = u.length % 3;
  if (p === 1) r = r.slice(0, -2) + '==';
  if (p === 2) r = r.slice(0, -1) + '=';
  return r;
}

// Pre-generate base64 WAV data at module load time (pure JS, no I/O)
const SOUND_B64: Record<string, string> = {
  goodHit: makeWavB64(660, 1320, 180, 0.18),
  badHit:  makeWavB64(180, 45,   220, 0.22),
  bombHit: makeWavB64(120, 30,   300, 0.25),
};

const _sounds: Partial<Record<string, Audio.Sound>> = {};

async function initSounds() {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
  for (const [key, b64] of Object.entries(SOUND_B64)) {
    try {
      // Android/iOS don't support data: URIs — write to a real cache file first
      const path = FileSystem.cacheDirectory + `hta_${key}.wav`;
      await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri: path });
      _sounds[key] = sound;
    } catch (_) { /* ignore */ }
  }
}

function playMobileSound(ev: string, muted: boolean) {
  if (muted) return;
  const snd = _sounds[ev];
  if (!snd) return;
  snd.replayAsync().catch(() => {});
}

// ─── Theme Picker ────────────────────────────────────────────────────────────

function ThemePicker({ bgId, shipId, onBg, onShip, lt }: {
  bgId: string; shipId: string;
  onBg: (id: string) => void; onShip: (id: string) => void;
  lt: boolean;
}) {
  const border = lt ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)';
  const selBorder = lt ? '#1E293B' : '#fff';
  const shipSwatchBg = lt ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
  return (
    <View style={tp.root}>
      <Text style={[tp.label, lt && { color: 'rgba(0,0,0,0.4)' }]}>BACKGROUND</Text>
      <View style={tp.wrapRow}>
        {BG_THEMES.map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.7} onPress={() => onBg(t.id)}
            style={[tp.swatch, { backgroundColor: t.bg, borderColor: bgId === t.id ? selBorder : border }]}>
            <View style={[tp.dot, { backgroundColor: t.star, top: 6, left: 8 }]} />
            <View style={[tp.dot, { backgroundColor: t.star, top: 16, right: 6, opacity: 0.5, width: 3, height: 3 }]} />
            <View style={[tp.dot, { backgroundColor: t.star, bottom: 8, left: 12, opacity: 0.6, width: 3, height: 3 }]} />
            {bgId === t.id && <View style={tp.check}><Text style={tp.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[tp.label, { marginTop: 8 }, lt && { color: 'rgba(0,0,0,0.4)' }]}>SHIP</Text>
      <View style={tp.wrapRow}>
        {SHIP_THEMES.map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.7} onPress={() => onShip(t.id)}
            style={[tp.swatch, { backgroundColor: shipSwatchBg, borderColor: shipId === t.id ? selBorder : border }]}>
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 9,
                borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: t.nose }} />
              <View style={{ width: 12, height: 7, backgroundColor: t.body, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
              <View style={{ width: 5, height: 5, backgroundColor: t.flame, borderRadius: 3, marginTop: -1, opacity: 0.85 }} />
            </View>
            {shipId === t.id && <View style={tp.check}><Text style={tp.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  root: { alignItems: 'center', marginTop: 10, width: '100%' },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  swatch: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  swatchSel: { borderColor: '#fff' },
  dot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, opacity: 0.8 },
  check: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#4ADE80',
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#000', fontSize: 10, fontWeight: '900', lineHeight: 13 },
});

// ─── Difficulty Picker ───────────────────────────────────────────────────────

function DifficultyPicker({ value, onChange, lt }: { value: number; onChange: (v: number) => void; lt: boolean }) {
  const labelColor = lt ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const activeColor = '#4A6CF7';
  return (
    <View style={{ alignItems: 'center', marginTop: 10, gap: 6 }}>
      <Text style={{ color: labelColor, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>DIFFICULTY</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(level => (
          <TouchableOpacity key={level} onPress={() => onChange(level)} activeOpacity={0.7}
            style={{
              width: 44, height: 44, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: value === level ? activeColor : (lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
              borderWidth: 1.5,
              borderColor: value === level ? activeColor : (lt ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'),
            }}>
            <Text style={{ color: value === level ? '#fff' : (lt ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'), fontSize: 15, fontWeight: '700' }}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ color: lt ? 'rgba(0,0,0,0.6)' : '#4ADE80', fontSize: 13, fontWeight: '700' }}>
        {DIFFICULTY_NAMES[value - 1]}
      </Text>
    </View>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [, rerender] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [started, setStarted] = useState(false);
  const [bgThemeId, setBgThemeId] = useState('space');
  const [shipThemeId, setShipThemeId] = useState('classic');
  const [muted, setMuted] = useState(false);
  const [difficulty, setDifficulty] = useState(3);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const mutedRef = useRef(muted);
  const difficultyRef = useRef(difficulty);
  mutedRef.current = muted;
  difficultyRef.current = difficulty;

  // Load settings and init sounds on mount
  useEffect(() => {
    (async () => {
      const bg = await AsyncStorage.getItem('hta_bg');
      const ship = await AsyncStorage.getItem('hta_ship');
      const m = await AsyncStorage.getItem('hta_muted');
      const diff = await AsyncStorage.getItem('hta_diff');
      if (bg) setBgThemeId(bg);
      if (ship) setShipThemeId(ship);
      if (m) setMuted(m === '1');
      if (diff) setDifficulty(Number(diff) || 3);
      setSettingsLoaded(true);
    })();
    initSounds();
    return () => { Object.values(_sounds).forEach(snd => snd?.unloadAsync()); };
  }, []);

  // Persist settings when they change
  useEffect(() => { if (settingsLoaded) AsyncStorage.setItem('hta_bg', bgThemeId); }, [bgThemeId, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) AsyncStorage.setItem('hta_ship', shipThemeId); }, [shipThemeId, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) AsyncStorage.setItem('hta_muted', muted ? '1' : '0'); }, [muted, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) AsyncStorage.setItem('hta_diff', String(difficulty)); }, [difficulty, settingsLoaded]);
  const g = useRef<GameState>(makeState(0, sw, 3));

  const bgT = getBgTheme(bgThemeId);
  const shipT = getShipTheme(shipThemeId);

  const stars = useRef<Star[]>(
    Array.from({ length: 60 }, () => ({
      x: Math.random() * sw, y: Math.random() * sh,
      r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.5 + 0.1,
    })),
  ).current;

  // Scrolling parallax — stars drift downward to simulate the ship moving up
  const starOffset = useRef(0);

  if (g.current._key !== gameKey) {
    g.current = makeState(gameKey, sw, difficultyRef.current);
  }

  useEffect(() => {
    const s = g.current;
    let raf: number;
    const step = () => {
      if (s.over) { rerender(c => c + 1); return; }
      if (!s.paused) {
        tickGame(s, sw, sh);
        for (const ev of s.soundEvents) playMobileSound(ev, mutedRef.current);
        s.soundEvents = [];
        starOffset.current = (starOffset.current + 0.8) % sh;
      }
      rerender(c => c + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gameKey]);

  useEffect(() => {
    const onBack = () => {
      const s = g.current;
      if (s.over) return false;
      s.paused = !s.paused;
      rerender(c => c + 1);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [gameKey]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !g.current.paused && !g.current.over,
      onMoveShouldSetPanResponder: () => !g.current.paused && !g.current.over,
      onPanResponderGrant: () => {
        const s = g.current;
        if (s.over || s.paused) return;
        s.dragStartX = s.shipX; s.isDragging = false; s.touchStartTime = Date.now();
      },
      onPanResponderMove: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const s = g.current;
        if (s.over || s.paused) return;
        if (Math.abs(gs.dx) > DRAG_THRESHOLD) s.isDragging = true;
        if (s.isDragging) s.shipX = Math.max(0, Math.min(sw - SHIP_W, s.dragStartX + gs.dx));
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const s = g.current;
        if (s.over || s.paused) return;
        const elapsed = Date.now() - s.touchStartTime;
        if (!s.isDragging && elapsed < TAP_MAX_DURATION && Math.abs(gs.dx) < DRAG_THRESHOLD) {
          spawnBullets(s, s.shipX, sh);
        }
        s.isDragging = false;
      },
    }),
  ).current;

  const s = g.current;
  const sy = shipY(sh);
  const sc = shipScale(s.shipLevel);

  const noseColor = s.shipLevel >= 1 ? shipT.noseLight : shipT.nose;
  const wingColor = s.shipLevel >= 3 ? shipT.wingLight : s.shipLevel >= 2 ? shipT.wingMid : shipT.wing;
  const flameCount = s.shipLevel >= 3 ? 3 : s.shipLevel >= 2 ? 2 : 1;
  const maxDisplay = Math.max(MAX_LIVES, s.lives);
  const lt = bgT.light;
  const textCol = lt ? '#1E293B' : '#fff';
  const hintCol = lt ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';
const qTextCol = lt ? '#B45309' : '#FFD866';
  const qBoxBg = lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const qBoxBorder = lt ? 'rgba(180,140,40,0.3)' : 'rgba(255,216,102,0.2)';
  const titleHitCol = lt ? '#B45309' : '#FFD866';
  const taglineCol = lt ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
  const pauseBtnBg = lt ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const pauseBtnBorder = lt ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  const pauseBtnTextCol = lt ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';

  const starViews = stars.map((st, i) => {
    const scrollY = started && !s.over ? (st.y + starOffset.current) % sh : st.y;
    return lt ? (
      <Text key={i} style={{
        position: 'absolute', left: st.x - 4, top: scrollY - 4,
        fontSize: 8 + st.r * 6, opacity: st.o,
      }}>🍓</Text>
    ) : (
      <View key={i} style={[styles.star, {
        left: st.x, top: scrollY, width: st.r * 2, height: st.r * 2,
        borderRadius: st.r, opacity: st.o, backgroundColor: bgT.star,
      }]} />
    );
  });

  const shipView = (scaleOverride?: number) => (
    <View style={[styles.ship, scaleOverride != null
      ? { position: 'relative' as const, transform: [{ scale: scaleOverride }], marginBottom: scaleOverride > 1 ? 40 : 0 }
      : {
          left: s.shipX, top: sy, transform: [{ scale: sc }],
          shadowColor: s.shipLevel >= 4 ? '#FFD866' : s.shipLevel >= 2 ? shipT.noseLight : 'transparent',
          shadowRadius: s.shipLevel >= 4 ? 16 : s.shipLevel >= 2 ? 10 : 0,
          shadowOpacity: s.shipLevel >= 2 ? 0.8 : 0,
          shadowOffset: { width: 0, height: 0 },
        }
    ]}>
      <View style={[styles.shipNose, { borderBottomColor: scaleOverride != null ? shipT.nose : noseColor }]} />
      {scaleOverride == null && s.shipLevel >= 1 && (
        <View style={[styles.shipNoseAccent, { borderColor: s.shipLevel >= 4 ? '#FFD866' : '#00E5FF' }]} />
      )}
      <View style={[styles.shipBody, { backgroundColor: shipT.body }]} />
      <View style={[styles.shipWingL, { borderRightColor: scaleOverride != null ? shipT.wing : wingColor }]} />
      <View style={[styles.shipWingR, { borderLeftColor: scaleOverride != null ? shipT.wing : wingColor }]} />
      {scaleOverride == null && s.shipLevel >= 2 && (
        <>
          <View style={[styles.wingTipL, { backgroundColor: s.shipLevel >= 4 ? '#FFD866' : shipT.noseLight }]} />
          <View style={[styles.wingTipR, { backgroundColor: s.shipLevel >= 4 ? '#FFD866' : shipT.noseLight }]} />
        </>
      )}
      <View style={styles.flameRow}>
        {(scaleOverride != null ? 2 : flameCount) >= 2 && <View style={[styles.shipFlame, { backgroundColor: shipT.flame, marginRight: 2 }]} />}
        <View style={[styles.shipFlame, { backgroundColor: shipT.flame }]} />
        {(scaleOverride != null ? 2 : flameCount) >= 2 && <View style={[styles.shipFlame, { backgroundColor: shipT.flame, marginLeft: 2 }]} />}
        {(scaleOverride != null ? false : flameCount >= 3) && <View style={[styles.shipFlame, { backgroundColor: shipT.flame, position: 'absolute', top: -4 }]} />}
      </View>
    </View>
  );

  // ─── Title screen ───
  if (!started) {
    return (
      <View style={[styles.root, { backgroundColor: bgT.bg }]}>
        <StatusBar style="light" />
        {starViews}
        <View style={styles.titleContainer}>
          {shipView(2.2)}
          <Text style={[styles.titleHit, { color: titleHitCol }]}>HIT THE</Text>
          <Text style={[styles.titleAnswer, { color: shipT.body }]}>ANSWER</Text>
          <Text style={[styles.titleTagline, { color: taglineCol }]}>Shoot the right number!</Text>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: shipT.body, shadowColor: shipT.body }]}
            activeOpacity={0.7} onPress={() => { setStarted(true); setGameKey(k => k + 1); }}>
            <Text style={styles.startBtnText}>START GAME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.muteBtn, {
            borderColor: lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            backgroundColor: lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
          }]} activeOpacity={0.7} onPress={() => setMuted(m => !m)}>
            <Text style={[styles.muteBtnText, { color: muted ? (lt ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)') : (lt ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)') }]}>{muted ? '🔇  SOUND OFF' : '🔊  SOUND ON'}</Text>
          </TouchableOpacity>
          <ThemePicker bgId={bgThemeId} shipId={shipThemeId} onBg={setBgThemeId} onShip={setShipThemeId} lt={lt} />
          <DifficultyPicker value={difficulty} onChange={setDifficulty} lt={lt} />
        </View>
      </View>
    );
  }

  // ─── Game over ───
  if (s.over) {
    return (
      <View style={[styles.root, { backgroundColor: bgT.bg }]}>
        <StatusBar style="light" />
        {starViews}
        <ScrollView contentContainerStyle={[styles.titleContainer, { paddingVertical: 40 }]} bounces={false}>
          <Text style={styles.overTitle}>GAME OVER</Text>
          <Text style={[styles.overScore, { color: textCol }]}>Score: {s.score}</Text>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: shipT.body, shadowColor: shipT.body, marginTop: 24 }]}
            activeOpacity={0.7} onPress={() => setGameKey(k => k + 1)}>
            <Text style={styles.startBtnText}>PLAY AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.muteBtn, {
            borderColor: lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            backgroundColor: lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
          }]} activeOpacity={0.7} onPress={() => setMuted(m => !m)}>
            <Text style={[styles.muteBtnText, { color: muted ? (lt ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)') : (lt ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)') }]}>{muted ? '🔇  SOUND OFF' : '🔊  SOUND ON'}</Text>
          </TouchableOpacity>
          <ThemePicker bgId={bgThemeId} shipId={shipThemeId} onBg={setBgThemeId} onShip={setShipThemeId} lt={lt} />
          <DifficultyPicker value={difficulty} onChange={setDifficulty} lt={lt} />
        </ScrollView>
      </View>
    );
  }

  // ─── Game screen ───
  return (
    <View style={[styles.root, { backgroundColor: bgT.bg }]} {...pan.panHandlers}>
      <StatusBar style="light" />
      {starViews}

      <View style={styles.hud}>
        <View style={styles.livesRow}>
          <TouchableOpacity style={[styles.pauseBtn, { backgroundColor: pauseBtnBg, borderColor: pauseBtnBorder }]} activeOpacity={0.6}
            onPress={() => { g.current.paused = true; rerender(c => c + 1); }}>
            <Text style={[styles.pauseBtnText, { color: pauseBtnTextCol }]}>⏸</Text>
          </TouchableOpacity>
          <Text style={styles.livesText}>
            {'♥'.repeat(s.lives)}{'♡'.repeat(maxDisplay - s.lives)}
          </Text>
        </View>
        <View style={[styles.questionBox, { backgroundColor: qBoxBg, borderColor: qBoxBorder }]}>
          <Text style={[styles.qText, { color: qTextCol }]}>{s.question.text} = ?</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreText, { color: textCol }]}>{s.score}</Text>
          {s.streak > 0 && (
            <Text style={[styles.streakText, {
              color: s.shipLevel >= 4 ? '#FFD866' : s.shipLevel >= 2 ? '#A3BFFF' : '#4ADE80',
            }]}>🔥 x{s.streak}</Text>
          )}
        </View>
      </View>

      {(s.shieldTimer > 0 || s.slowTimer > 0 || s.fastTimer > 0 || s.doubleShotTimer > 0) && (
        <View style={styles.effectsRow}>
          {s.shieldTimer > 0 && <View style={styles.effectPill}><View style={[styles.effectBar, { backgroundColor: '#FFD866', width: `${(s.shieldTimer / POWERUP_DURATION) * 100}%` as any }]} /><Text style={styles.effectLabel}>🛡️ Shield</Text></View>}
          {s.slowTimer > 0 && <View style={styles.effectPill}><View style={[styles.effectBar, { backgroundColor: '#00BFFF', width: `${(s.slowTimer / POWERUP_DURATION) * 100}%` as any }]} /><Text style={styles.effectLabel}>❄️ Slow</Text></View>}
          {s.fastTimer > 0 && <View style={styles.effectPill}><View style={[styles.effectBar, { backgroundColor: '#C850C0', width: `${(s.fastTimer / BAD_EFFECT_DURATION) * 100}%` as any }]} /><Text style={styles.effectLabel}>⚡ Fast</Text></View>}
          {s.doubleShotTimer > 0 && <View style={styles.effectPill}><View style={[styles.effectBar, { backgroundColor: '#FFD866', width: `${(s.doubleShotTimer / DOUBLE_SHOT_DURATION) * 100}%` as any }]} /><Text style={styles.effectLabel}>🔫 x2</Text></View>}
        </View>
      )}

      {s.numbers.map(n => {
        // Gift rock — present box
        if (n.gift) {
          return (
            <View key={n.id} style={{
              position: 'absolute',
              left: n.x, top: n.y,
              width: NUM_SIZE, height: NUM_SIZE,
              backgroundColor: '#0e2a1a',
              borderWidth: 2, borderColor: '#4ADE80',
              borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#4ADE80', shadowRadius: 10, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 },
            }}>
              {/* Ribbon horizontal */}
              <View style={{ position: 'absolute', left: 0, right: 0, top: '40%', height: 3, backgroundColor: '#4ADE80', opacity: 0.7 }} />
              {/* Ribbon vertical */}
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: '42%', width: 3, backgroundColor: '#4ADE80', opacity: 0.7 }} />
              <Text style={{ fontSize: 22, zIndex: 1 }}>🎁</Text>
            </View>
          );
        }

        const rs = rockScale(n.hp);
        const rSize = NUM_SIZE * rs;
        const damaged = n.hp < n.maxHp;
        // Base color: mid-tone — gradients are faked with overlay Views
        const rockBg = damaged
          ? (lt ? '#a09080' : '#4e3e2e')
          : (lt ? '#aea298' : '#7a6a5a');
        const rockBorder = lt ? 'rgba(90,72,50,0.7)' : 'rgba(150,130,100,0.55)';
        const fontSize = Math.round(16 * rs);
        const textCol = lt ? '#3A2E1F' : '#E8E0D0';
        // Unique border-radius from id hash so each rock has its own silhouette
        let seed = 0;
        for (let i = 0; i < n.id.length; i++) seed = (((seed << 5) - seed) + n.id.charCodeAt(i)) | 0;
        seed = Math.abs(seed) || 42;
        const rr = (min: number, max: number) => { seed = (seed * 1664525 + 1013904223) >>> 0; return min + (seed / 0x100000000) * (max - min); };
        const br = [rr(4, rSize * 0.35), rr(rSize * 0.3, rSize * 0.55), rr(4, rSize * 0.3), rr(rSize * 0.35, rSize * 0.55)];
        return (
          <View key={n.id} style={{
            position: 'absolute',
            left: n.x + NUM_SIZE / 2 - rSize / 2,
            top: n.y + NUM_SIZE / 2 - rSize / 2,
            width: rSize, height: rSize,
            backgroundColor: rockBg,
            borderWidth: 1.5, borderColor: rockBorder,
            borderTopLeftRadius: br[0], borderTopRightRadius: br[1],
            borderBottomLeftRadius: br[2], borderBottomRightRadius: br[3],
            overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Lighter top-left highlight (fakes top gradient stop) */}
            <View style={{
              position: 'absolute', top: 0, left: 0,
              width: rSize * 0.65, height: rSize * 0.55,
              backgroundColor: lt ? 'rgba(201,184,169,0.55)' : 'rgba(160,144,128,0.25)',
              borderBottomRightRadius: rSize * 0.5,
            }} />
            {/* Darker bottom shadow (fakes bottom gradient stop) */}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: rSize * 0.7, height: rSize * 0.55,
              backgroundColor: lt ? 'rgba(100,80,56,0.22)' : 'rgba(25,15,8,0.45)',
              borderTopLeftRadius: rSize * 0.5,
            }} />
            <Text style={{ color: textCol, fontSize, fontWeight: '700', zIndex: 1 }}>{n.value}</Text>
            {/* Crack overlay for damaged rocks */}
            {damaged && (
              <View style={{ position: 'absolute', top: '25%', left: '30%', width: 1.5, height: '50%',
                backgroundColor: lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', borderRadius: 1,
                transform: [{ rotate: '20deg' }] }} />
            )}
            {n.maxHp - n.hp >= 2 && (
              <View style={{ position: 'absolute', top: '20%', right: '25%', width: 1.5, height: '40%',
                backgroundColor: lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', borderRadius: 1,
                transform: [{ rotate: '-15deg' }] }} />
            )}
            {/* HP pips — only after hit */}
            {n.maxHp > 1 && n.hp < n.maxHp && (
              <View style={{ position: 'absolute', bottom: -10, flexDirection: 'row', gap: 3 }}>
                {Array.from({ length: n.maxHp }, (_, h) => (
                  <View key={h} style={{
                    width: 5, height: 5, borderRadius: 3,
                    backgroundColor: h < n.hp ? '#4ADE80' : 'rgba(255,255,255,0.2)',
                  }} />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {s.bullets.map(b => {
        const bw = b.power ? POWER_BULLET_W : BULLET_W;
        return (
          <View key={b.id} style={[styles.bullet, {
            left: b.x, top: b.y,
            width: bw, borderRadius: bw / 2,
            backgroundColor: b.power ? '#FFF176' : '#FFD866',
            shadowRadius: b.power ? 16 : 8,
          }]}>
            <View style={[styles.bulletGlow, { width: bw + 6, borderRadius: (bw + 6) / 2 }]} />
          </View>
        );
      })}

      {s.powerups.map(pu => {
        const puColor = pu.kind === 'life' ? '#FF4757' : pu.kind === 'slow' ? '#00BFFF' : pu.kind === 'shield' ? '#FFD866' : pu.kind === 'fast' ? '#C850C0' : pu.kind === 'double_shot' ? '#FFD866' : '#FF2D2D';
        const puBg = pu.kind === 'life' ? 'rgba(255,71,87,0.25)' : pu.kind === 'slow' ? 'rgba(0,191,255,0.25)' : pu.kind === 'shield' ? 'rgba(255,216,102,0.25)' : pu.kind === 'fast' ? 'rgba(200,80,192,0.25)' : pu.kind === 'double_shot' ? 'rgba(255,216,102,0.2)' : 'rgba(255,45,45,0.25)';
        const puIcon = pu.kind === 'life' ? '♥' : pu.kind === 'slow' ? '❄️' : pu.kind === 'shield' ? '🛡️' : pu.kind === 'fast' ? '⚡' : pu.kind === 'double_shot' ? '💥' : '💀';
        return (
          <View key={pu.id} style={[styles.powerup, { left: pu.x, top: pu.y, borderColor: puColor, backgroundColor: puBg, shadowColor: puColor }]}>
            <Text style={styles.powerupIcon}>{puIcon}</Text>
          </View>
        );
      })}

      {s.particles.map(p => (
        <View key={p.id} style={{ position: 'absolute', left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color, opacity: p.life / p.maxLife }} />
      ))}

      {shipView()}

      {/* Notifications */}
      {s.notifs.map(n => {
        const progress = n.life / NOTIF_LIFETIME;
        const alpha = progress > 0.85 ? (1 - progress) / 0.15 : Math.min(1, progress / 0.3);
        const scale = 1 + (1 - progress) * 0.15;
        return (
          <Text key={n.id} style={{
            position: 'absolute',
            left: n.x - 120, top: n.y - n.size / 2,
            width: 240,
            textAlign: 'center',
            fontSize: n.size, fontWeight: '900',
            color: n.color,
            opacity: alpha,
            transform: [{ scale }],
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
          }}>{n.text}</Text>
        );
      })}

      {/* Pause menu */}
      {s.paused && (
        <View style={styles.pauseOverlay} onStartShouldSetResponder={() => true}>
          <ScrollView contentContainerStyle={styles.pauseScroll} bounces={false}>
            <View style={[styles.pauseMenu, lt && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.pauseTitle, { color: textCol }]}>PAUSED</Text>
              <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}
                onPress={() => { g.current.paused = false; rerender(c => c + 1); }}>
                <Text style={styles.menuBtnText}>▶  RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}
                onPress={() => setGameKey(k => k + 1)}>
                <Text style={styles.menuBtnText}>↻  RESTART</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.muteBtn, {
                borderColor: lt ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                backgroundColor: lt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
              }]} activeOpacity={0.7} onPress={() => setMuted(m => !m)}>
                <Text style={[styles.muteBtnText, { color: muted ? (lt ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)') : (lt ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)') }]}>{muted ? '🔇  SOUND OFF' : '🔊  SOUND ON'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuBtn, styles.menuBtnExit]} activeOpacity={0.7}
                onPress={() => BackHandler.exitApp()}>
                <Text style={[styles.menuBtnText, styles.menuBtnExitText]}>✕  EXIT</Text>
              </TouchableOpacity>
              <ThemePicker bgId={bgThemeId} shipId={shipThemeId} onBg={setBgThemeId} onShip={setShipThemeId} lt={lt} />
              <DifficultyPicker value={difficulty} onChange={setDifficulty} lt={lt} />
            </View>
          </ScrollView>
        </View>
      )}

      <Text style={[styles.hint, { color: hintCol }]}>Drag to move · Tap to shoot</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  star: { position: 'absolute' },
  hud: {
    position: 'absolute', top: HUD_TOP, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, zIndex: 10,
  },
  livesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  pauseBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  livesText: { fontSize: 22, color: '#FF4757' },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,216,102,0.2)',
  },
  qText: { fontSize: 22, fontWeight: '800', color: '#FFD866' },
  scoreCol: { minWidth: 76, alignItems: 'flex-end' },
  scoreText: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'right' },
  streakText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  effectsRow: { position: 'absolute', top: HUD_TOP + 44, right: 16, zIndex: 10, gap: 4 },
  effectPill: { width: 80, height: 20, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  effectBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8, opacity: 0.4 },
  effectLabel: { fontSize: 10, color: '#fff', fontWeight: '700' },
  numBubble: {
    position: 'absolute', width: NUM_SIZE, height: NUM_SIZE, borderRadius: NUM_SIZE / 2,
    backgroundColor: 'rgba(26,32,64,0.9)', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#E8EAFF', fontSize: 18, fontWeight: '700' },
  bullet: { position: 'absolute', width: BULLET_W, height: BULLET_H, borderRadius: BULLET_W / 2, backgroundColor: '#FFD866', alignItems: 'center' },
  bulletGlow: { position: 'absolute', top: -2, width: BULLET_W + 6, height: BULLET_H + 6, borderRadius: (BULLET_W + 6) / 2, backgroundColor: 'rgba(255,216,102,0.2)' },
  powerup: { position: 'absolute', width: POWERUP_SIZE, height: POWERUP_SIZE, borderRadius: POWERUP_SIZE / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  powerupIcon: { fontSize: 16 },
  ship: { position: 'absolute', width: SHIP_W, height: SHIP_W, alignItems: 'center' },
  shipNose: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#7C9DFF' },
  shipNoseAccent: { position: 'absolute', top: 0, width: 24, height: 18, borderWidth: 1.5, borderColor: '#00E5FF', backgroundColor: 'transparent', borderTopLeftRadius: 2, borderTopRightRadius: 2, opacity: 0.6 },
  shipBody: { width: 26, height: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  shipWingL: { position: 'absolute', left: 2, bottom: 8, width: 0, height: 0, borderTopWidth: 14, borderRightWidth: 10, borderTopColor: 'transparent', borderRightColor: '#3A5BD7' },
  shipWingR: { position: 'absolute', right: 2, bottom: 8, width: 0, height: 0, borderTopWidth: 14, borderLeftWidth: 10, borderTopColor: 'transparent', borderLeftColor: '#3A5BD7' },
  wingTipL: { position: 'absolute', left: 0, bottom: 6, width: 6, height: 6, borderRadius: 3, opacity: 0.9 },
  wingTipR: { position: 'absolute', right: 0, bottom: 6, width: 6, height: 6, borderRadius: 3, opacity: 0.9 },
  flameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  shipFlame: { width: 10, height: 12, borderRadius: 5, opacity: 0.85 },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  pauseScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  pauseMenu: {
    backgroundColor: '#0D1128', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(74,108,247,0.3)',
    paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', gap: 10, width: '88%', maxWidth: 340,
  },
  pauseLogoHit: { fontSize: 22, fontWeight: '900', color: '#FFD866', letterSpacing: 3 },
  pauseLogoAnswer: { fontSize: 26, fontWeight: '900', letterSpacing: 4, marginBottom: 8 },
  pauseTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 6, marginBottom: 4 },
  menuBtn: { width: '100%', paddingVertical: 13, backgroundColor: '#4A6CF7', borderRadius: 13, alignItems: 'center' },
  menuBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  menuBtnSound: { borderWidth: 1.5 },
  muteBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5 },
  muteBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  menuBtnExit: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,71,87,0.4)', marginTop: 4 },
  menuBtnExitText: { color: '#FF4757' },
  titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleHit: { fontSize: 44, fontWeight: '900', color: '#FFD866', letterSpacing: 4 },
  titleAnswer: { fontSize: 50, fontWeight: '900', letterSpacing: 6, marginTop: -4 },
  titleTagline: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 12 },
  startBtn: { marginTop: 48, paddingVertical: 18, paddingHorizontal: 56, borderRadius: 16, shadowRadius: 20, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  startBtnText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overTitle: { fontSize: 46, fontWeight: '900', color: '#FF4757', letterSpacing: 6 },
  overScore: { fontSize: 28, color: '#fff', marginTop: 16, fontWeight: '600' },
  playBtn: { marginTop: 40, paddingVertical: 16, paddingHorizontal: 40, backgroundColor: '#4A6CF7', borderRadius: 14 },
  playBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  hint: { position: 'absolute', bottom: 30, alignSelf: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 },
});
