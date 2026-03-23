# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# From repo root:
npm run mobile     # Start Expo dev server (mobile)
npm run web        # Start Vite dev server (web, http://localhost:5173)

# From packages/mobile:
npx expo start --ios
npx expo start --android

# From packages/web:
npm run build      # Type-check + production build
```

## Architecture

Monorepo with npm workspaces. Three packages:

- **`packages/common`** — pure TypeScript, zero dependencies. Exports all game types, constants, helper functions (`createQuestion`, `createNumbers`, `spawnExplosion`, `overlaps`, `makeState`), and the frame-advancing `tickGame(state, sw, sh)` function. No React imports.

- **`packages/mobile`** — Expo/React Native app. `src/App.tsx` handles RN rendering (absolute-positioned `<View>` elements) and touch input via `PanResponder` (drag = move ship, tap = shoot). Imports all game logic from `@hit-the-answer/common`. Metro config at `metro.config.js` sets up monorepo watch folders.

- **`packages/web`** — Vite + React web app. `src/App.tsx` renders to a full-screen `<canvas>`. Input: mousemove = move ship, click or Space = shoot, ArrowLeft/ArrowRight = keyboard steering. Game-over state shows a DOM overlay. Imports game logic from `@hit-the-answer/common`.

### Game loop pattern (both platforms)

Both platforms use a `useRef<GameState>` to hold mutable state and a `requestAnimationFrame` loop inside `useEffect`. Each frame calls `tickGame(s, sw, sh)` (which mutates `s` in place), then triggers a React re-render (mobile) or a canvas redraw (web). Restarting increments `gameKey`, which causes `makeState()` to be called and the `useEffect` to re-run.

### Screen dimensions

`makeState(key, sw)` and `tickGame(s, sw, sh)` receive screen dimensions as parameters. Mobile reads them from `Dimensions.get('window')`. Web reads `canvas.width/canvas.height` each frame (supports window resize).
