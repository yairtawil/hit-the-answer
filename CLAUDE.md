# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server (opens QR code for Expo Go)
npm run ios        # Start with iOS simulator
npm run android    # Start with Android emulator
npm run web        # Start with web browser
```

No test runner is configured.

## Architecture

This is a single-file React Native game built with Expo (`App.tsx`). The entire game — state, game loop, rendering — lives in one component.

**Game loop**: A `requestAnimationFrame` loop inside `useEffect` (keyed to `gameKey`) mutates a `useRef<GameState>` directly each frame, then calls `rerender(c => c+1)` to trigger a React re-render. This bypasses React's immutable state model intentionally for performance.

**State management**: `g.current` (a `useRef`) holds all mutable game state. The ref is reset to a fresh `makeState()` when `gameKey` changes (restart). The `[, rerender]` state is only used to drive re-renders; the actual data lives in the ref.

**Touch input**: `PanResponder` distinguishes between drags (move ship) and taps (fire bullet) using `DRAG_THRESHOLD` and `TAP_MAX_DURATION` constants.

**Game mechanics**:
- A math question (`+`, `−`, `×`) is shown in the HUD
- `ANSWER_COUNT` (5) numbered bubbles fall from the top; one is the correct answer
- Shooting the correct answer scores a point and spawns a new round; shooting wrong costs a life
- Letting any number fall off screen costs a life; letting the correct answer fall also starts a new round
- Fall speed increases with score (`BASE_FALL_SPEED + score * 0.08`)
- Particle explosion effects use a simple physics simulation (gravity + drag)

**Rendering**: All game objects (stars, numbers, bullets, particles, ship) are absolutely positioned `<View>` elements. The ship is composed of pure CSS shapes (no images).

## TypeScript

`strict: true` is enabled. The `App.js` file in git is deleted and replaced by `App.tsx`.
