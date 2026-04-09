# Investigation: Client-Side State & localStorage Migration

## Summary

The platform already uses Zustand stores with localStorage persistence for audio settings, theme preferences, game settings, and game statistics (~7.6KB total). Game state itself is completely ephemeral — exists only in memory during gameplay, never persisted to server or localStorage. BroadcastChannel sync has zero server dependency. Server-persisted data (templates, presets, question-sets) would add ~30-70KB to localStorage — well under the 5-10MB limit. A localStorage-only model is technically feasible but loses cross-device sync, data backup, and template sharing.

## Key Findings

### Finding 1: Three Categories of Already-Persisted Data
- **Evidence:** `apps/bingo/src/stores/audio-store.ts:212` (persist middleware, key: `jb-bingo-audio`), `apps/trivia/src/stores/settings-store.ts:87` (persist middleware, key: `trivia-settings`, version 4), `packages/theme/src/create-theme-store.ts:56` (persist middleware), `packages/game-stats/src/stats/storage.ts:33-54`
- **Audio Settings:** ~100B each (Bingo + Trivia), keys: `jb-bingo-audio`, `jb-trivia-audio`
- **Game Settings (Trivia):** ~300B, key: `trivia-settings`, version 4 with migration logic
- **Theme:** ~50B each, keys: `jb-bingo-theme`, `jb-trivia-theme`
- **Statistics:** ~3.5KB each, keys: `jb:bingo-statistics`, `jb:trivia-statistics`, MAX_RECENT_SESSIONS=20
- **Confidence:** High
- **Implication:** Settings and stats already fully localStorage-backed. No architectural changes needed for these.

### Finding 2: Game State is Completely Ephemeral
- **Evidence:** `apps/bingo/src/stores/game-store.ts` — no persist middleware. `apps/trivia/src/stores/game-store.ts` — no persist middleware. `apps/bingo/src/lib/game/engine.ts` — pure functions, createInitialState() creates fresh state.
- **Bingo GameState:** status, calledBalls, currentBall, previousBall, remainingBalls, pattern (~5-10KB in memory)
- **Trivia GameState:** teams[], questions[], rounds, scoring, timer, audienceScene (~20-50KB in memory)
- **Confidence:** High
- **Implication:** Game state is lost on page refresh. This is current design, not a regression from standalone conversion.

### Finding 3: BroadcastChannel (Sync Package) Has NO Server Dependency
- **Evidence:** `packages/sync/src/broadcast.ts:65-470` — BroadcastSync class creates `new BroadcastChannel(channelName)`, no network calls. `packages/sync/src/use-sync.ts:28-100` — subscribe/send pattern, no HTTP.
- **Capabilities:** STATE_UPDATE, REQUEST_SYNC, CHANNEL_READY messages. State hash divergence detection, latency monitoring, message timeout detection.
- **Limitations:** Same-device only, no cross-device sync, no persistence across refresh.
- **Confidence:** High
- **Implication:** Dual-screen presenter/display works perfectly standalone. Cross-device scenarios need something beyond BroadcastChannel.

### Finding 4: Templates & Presets Are the Main Migration Target
- **Evidence:** Bingo templates ~200B each; Trivia templates ~500-5000B each (questions JSONB); Trivia presets ~100B each; Question sets ~2-50KB each
- **Total worst case:** ~500KB for a heavy user with many templates + question sets
- **Confidence:** High
- **Implication:** All fits in localStorage. Requires new Zustand stores with persist middleware or direct localStorage CRUD.

### Finding 5: localStorage Footprint is <1% of Capacity
- **Evidence:** Current persistent data: ~7.6KB. With templates/presets: ~30-70KB. Browser limit: 5-10MB.
- **Confidence:** High
- **Implication:** Storage capacity is not a constraint. Even 10x current data is under 1%.

### Finding 6: Zustand Already Has Versioning & Migration Infrastructure
- **Evidence:** `apps/trivia/src/stores/settings-store.ts:119,134-151` — version 4 with migrate callback handling v1→v4. `apps/bingo/src/stores/audio-store.ts:446-475` — merge callback for backward compatibility.
- **Confidence:** High
- **Implication:** The pattern for evolving persisted data shapes already exists. Template stores would follow the same pattern.

### Finding 7: Features Lost in Standalone Model
- **Features requiring server:** Cross-device sync, template sharing between users, multi-user sessions, institutional game history, automatic data backup, multiple presenters accessing same templates
- **Features that work fine:** Single-presenter dual-screen games, audio/theme preferences, game statistics, single-device question set import, all game mechanics
- **Confidence:** High
- **Implication:** Standalone is viable for single-user single-device. Not for institutional or multi-device deployments.

### Finding 8: No Monolithic App State
- **Evidence:** Each concern has independent storage key. No single global state object.
- **Confidence:** High
- **Implication:** Modular persistence makes migration straightforward — each feature can be migrated independently.

## Surprises
1. Game state is completely ephemeral — never persisted anywhere, lost on page refresh
2. Statistics already use localStorage natively (game-stats package designed for it)
3. BroadcastChannel has sophisticated observability (state hash divergence, latency monitoring)
4. Trivia settings have 4 versions of migration history — frequent schema evolution
5. No monolithic "AppState" — each concern manages its own storage independently

## Unknowns & Gaps
1. How would questions be distributed standalone? (embedded in app, static CDN, manual import?)
2. What happens to presenter/display sync on page refresh? (game state lost)
3. Cross-device presenter/display (TV screen) — would need WebRTC or similar
4. Template sharing between users — manual JSON export/import only?
5. Backup/recovery strategy if browser data cleared?
6. Multiple presenters on same device — namespace collision in localStorage?

## Raw Evidence
- 7 localStorage keys currently in use, total ~7.6KB
- Bingo stores: audio-store.ts, game-store.ts, theme-store.ts
- Trivia stores: audio-store.ts, settings-store.ts, game-store.ts, theme-store.ts
- Game-stats storage: packages/game-stats/src/stats/storage.ts
- Sync: packages/sync/src/broadcast.ts (470 lines), use-sync.ts (100 lines)
- All Zustand stores have SSR-safe `typeof window === 'undefined'` checks
