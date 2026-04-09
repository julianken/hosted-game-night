# Area 3: Component Rewiring Analysis

## Summary

13 components and 1 hook reference `/api/templates`, `/api/presets`, or `/api/question-sets`.
The rewiring pattern is identical across almost all of them: replace `fetch()` calls with
Zustand store reads/writes. No component needs to be split or restructured — all are already
client components with clean separation between data loading and rendering.

---

## Component Inventory

### BINGO

#### `apps/bingo/src/components/presenter/TemplateSelector.tsx`

**What it does now:**
- `useEffect` on mount: `fetch('/api/templates')` → populates local `templates` state array
- `loadTemplate()`: reads from local state array, calls `setPattern`, `setAutoCallEnabled`, `setAutoCallSpeed`, `setVoicePack` on existing stores

**What changes:**
- Replace `fetch('/api/templates')` with a store selector: `const templates = useTemplateStore((s) => s.templates)`
- Replace `isLoading` / `error` local state with equivalent store selectors (or remove if the store loads eagerly at app startup)
- The `loadTemplate` callback does NOT hit the API — it only reads from the already-fetched local array and calls game/audio store actions. That logic is unchanged.
- `useEffect` dependency on `errorToast` is vestigial (it never changed); remove it when rewriting

**What stays the same:** All rendering, the select element structure, the `loadTemplate` logic, game/audio store writes.

---

#### `apps/bingo/src/components/presenter/SaveTemplateModal.tsx`

**What it does now:**
- `handleSave`: `fetch('/api/templates', { method: 'POST', body: ... })`
- Reads current settings from `useGameStore` and `useAudioStore`

**What changes:**
- Replace `fetch` POST with `templateStore.saveTemplate({ name, pattern_id, voice_pack, auto_call_enabled, auto_call_interval, is_default })`
- Remove `response.ok` / `response.json()` error handling; replace with store action's thrown error or return value
- `isSaving` state can stay as local UI state, driven by a `try/finally` around the store call

**What stays the same:** All form rendering, validation logic, the `onSuccess`/`onClose` callbacks, settings preview section.

---

#### `apps/bingo/src/app/page.tsx`

**What it does now:**
- Server component: reads `jb_access_token` cookie to conditionally render `LoginButton` vs "Play" link

**What changes:**
- If auth is removed entirely: always render the single "Play" button (no `LoginButton`, no cookie check)
- If a lightweight "is logged in" concept remains: the cookie-read pattern stays unchanged

**React implication:** This is an async server component using `next/headers`. If auth is dropped, it can be demoted to a synchronous server component or even a plain client component.

---

### TRIVIA

#### `apps/trivia/src/components/presenter/TemplateSelector.tsx`

**What it does now:**
Two-phase API fetch:
1. `fetch('/api/templates')` on mount — populates `TemplateListItem[]` local state (no `questions` field)
2. `fetch('/api/templates/${templateId}')` on selection — fetches full detail including `questions` JSONB

Also calls `convertTemplateQuestion()` (exported utility function from this file) and writes to `importQuestions` + `updateSettings` + `useSettingsStore.getState().updateSetting(...)`.

**What changes:**
- Phase 1 list fetch: `const templates = useTemplateStore((s) => s.templates)` — list should already be loaded by store
- Phase 2 detail fetch: eliminated. In standalone mode templates are stored fully in localStorage. Use `templateStore.getTemplateById(id)` or `templates.find(t => t.id === id)` — questions are already present in the in-memory object
- `convertTemplateQuestion` utility and the `loadTemplate` body logic (calling `importQuestions`, `updateSettings`, `useSettingsStore.updateSetting`) are unchanged

**What stays the same:** `convertTemplateQuestion` export (used by `use-auto-load-default-template.ts`), the `onTemplateLoad` callback, all rendering, gameStatus guard.

**Key coupling:** `convertTemplateQuestion` must remain exported from this file (or moved to a shared utility) because `use-auto-load-default-template.ts` imports it directly.

---

#### `apps/trivia/src/components/presenter/SaveTemplateModal.tsx`

**What it does now:**
- Reads `questions` and `settings` from `useGameStore`
- `handleSave`: `fetch('/api/templates', { method: 'POST', body: { name, questions: dbQuestions, rounds_count, questions_per_round, timer_duration, is_default } })`
- Has local `convertQuestionToDb` helper function

**What changes:**
- Replace `fetch` POST with `templateStore.saveTemplate({ name, questions: dbQuestions, ... })`
- `convertQuestionToDb` stays as a local helper; it is not exported

**What stays the same:** All form rendering, validation, settings preview, the `convertQuestionToDb` helper.

---

#### `apps/trivia/src/components/presenter/PresetSelector.tsx`

**What it does now:**
- `useEffect` on mount: `fetch('/api/presets')` → populates `TriviaPreset[]` local state
- `loadPreset`: reads from local state, calls `updateSettings` (game-store) and mirrors to `useSettingsStore.getState().updateSetting(...)`

**What changes:**
- Replace fetch with `const presets = usePresetStore((s) => s.presets)`
- Remove `isLoading` / `error` local state (or keep as skeleton if store exposes `isLoaded`)
- `loadPreset` logic is unchanged — it only reads from in-memory array and writes to game/settings stores

**What stays the same:** All rendering, `onPresetLoad` callback, gameStatus guard.

---

#### `apps/trivia/src/components/presenter/SavePresetModal.tsx`

**What it does now:**
- Reads `settings` from `useGameStore`
- `handleSave`: `fetch('/api/presets', { method: 'POST', body: { name, rounds_count, questions_per_round, timer_duration, is_default } })`

**What changes:**
- Replace `fetch` POST with `presetStore.savePreset({ name, rounds_count, questions_per_round, timer_duration, is_default })`

**What stays the same:** All form rendering, validation, settings preview.

---

#### `apps/trivia/src/app/question-sets/page.tsx`

**What it does now — extensive API usage:**
- `fetchQuestionSets()`: `fetch('/api/question-sets?fields=full&pageSize=100')`
- `handleRename(id)`: `fetch('/api/question-sets/${id}', { method: 'PATCH', body: { name } })`
- `handleDelete(id)`: `fetch('/api/question-sets/${id}', { method: 'DELETE' })`
- Uses local `TriviaQuestionSet[]` state directly; also has its own toast system (not from `useToast`)
- Opens `QuestionSetEditorModal` for edit operations

**What changes:**
- Replace `fetchQuestionSets` with `const questionSets = useQuestionSetStore((s) => s.questionSets)`; remove loading spinner if store hydrates eagerly
- `handleRename` → `questionSetStore.renameQuestionSet(id, name)` + optimistic update in store
- `handleDelete` → `questionSetStore.deleteQuestionSet(id)` + store removes from array
- `handleEditorSuccess` → `fetchQuestionSets()` becomes a no-op or removed; store updates automatically after save

**What stays the same:** All card rendering, category badge logic, export (client-side JSON download — no API), the modal launch/close logic.

**Notable:** This page has its own inline toast system (`useState` with timeout) rather than the shared `useToast`. That works fine in standalone mode; no change needed.

---

#### `apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx`

**What it does now:**
- On open in edit mode: `fetch('/api/question-sets/${questionSetId}')` — loads full question set
- `handleSave`: conditional `fetch` — POST to `/api/question-sets` (create) or PATCH to `/api/question-sets/${questionSetId}` (update)

**What changes:**
- Load path: replace `fetch` GET with `questionSetStore.getById(questionSetId)` (synchronous store read if already loaded, or `questionSets.find(...)`)
- Save path: replace `fetch` POST with `questionSetStore.createQuestionSet(payload)`, replace `fetch` PATCH with `questionSetStore.updateQuestionSet(questionSetId, payload)`
- `isLoading` state can be eliminated entirely since the store read is synchronous (data already in memory)

**What stays the same:** The `editorReducer` / `createInitialState` / `useReducer` state management, all form rendering, dirty detection, discard dialog, `DiscardChangesDialog` component, `CategorySection` / `QuestionForm` subcomponents.

---

#### `apps/trivia/src/components/presenter/QuestionSetImporter.tsx`

**What it does now:**
- `handleSave`: `fetch('/api/question-sets/import', { method: 'POST', body: { rawJson, name, description } })`
- All parsing (`parseJsonQuestions`) happens client-side before the save
- Does NOT import into the game store directly — saves to the API, calls `onImportSuccess`

**What changes:**
- Replace `fetch` POST to `/api/question-sets/import` with a store action that accepts the already-parsed question data. Since parsing is already done client-side (the import endpoint just re-parses the rawJson), the standalone version can call `questionSetStore.createQuestionSet({ name, description, questions: result.questions })` directly — skip sending rawJson
- `onImportSuccess` callback (which triggers list refresh in parent) becomes a no-op or removed since the store updates reactively

**What stays the same:** All the drag-drop UI, file reading, `parseJsonQuestions` call, the preview/error/warning display, name/description inputs.

---

#### `apps/trivia/src/components/presenter/TriviaApiImporter.tsx`

**What it does now:**
- `handleFetch`: `fetch('/api/trivia-api/questions?...')` — fetches from external Trivia API via BFF proxy
- `handleLoadIntoGame`: calls `importQuestions` from game-store directly (no API)
- `handleSaveToQuestionSets`: `fetch('/api/question-sets', { method: 'POST', ... })`

**What changes:**
- `handleFetch` — this hits `/api/trivia-api/questions` which is a proxy to an external API. In standalone mode, two options:
  - **Option A:** Call the external Trivia API directly from the client (removes the BFF proxy route). Requires CORS from `the-trivia-api.com`.
  - **Option B:** Keep the Next.js API route as a thin pass-through proxy; only remove the auth layer.
  - This is the one component where the fetch cannot simply become a store read — it fetches from an external service.
- `handleSaveToQuestionSets`: replace `fetch` POST with `questionSetStore.createQuestionSet(payload)`
- `handleLoadIntoGame`: already calls game-store directly — no change

**What stays the same:** All UI, the external fetch logic itself (just the destination changes if Option A), `handleLoadIntoGame`, all preview rendering.

---

#### `apps/trivia/src/hooks/use-auto-load-default-template.ts`

**What it does now:**
- Fires once on mount via `useRef(false)` guard
- `fetch('/api/templates/default')` → converts questions, writes to game-store and settings-store
- Silent failure (no toast, no error display)

**What changes:**
- Replace fetch with a store-level "default template" lookup: `const defaultTemplate = useTemplateStore((s) => s.templates.find(t => t.is_default))`
- Effect fires when `defaultTemplate` resolves (or reads synchronously if store hydrates before component mounts)
- The conversion logic (`convertTemplateQuestion`) and the `importQuestions` / `updateSettings` / `updateSetting` writes are unchanged
- The `hasFired` ref guard may still be needed to prevent double-application on StrictMode re-mount

**What stays the same:** All the conversion and store-write logic. The silent-failure behavior is naturally preserved since if no default template exists, `find()` returns `undefined`.

---

#### `apps/trivia/src/app/page.tsx`

Same pattern as bingo's `page.tsx` — server component with cookie check. Same analysis applies.

---

## Additional Components Found in Search

The grep search (`/api/templates|/api/presets|/api/question-sets`) returned 53 files but the vast majority are:
- API route handlers themselves (`apps/*/src/app/api/**`)
- Test files (`__tests__/**`)
- Platform Hub components (`apps/platform-hub/...`) — out of scope for standalone conversion
- Documentation files

No additional UI components in bingo or trivia were found beyond those listed above.

---

## Shared Patterns

### Pattern A: Selector components (list + apply)
Applies to: `bingo/TemplateSelector`, `trivia/TemplateSelector`, `trivia/PresetSelector`

```
// Before
const [items, setItems] = useState([]);
useEffect(() => {
  fetch('/api/X').then(r => r.json()).then(d => setItems(d.data));
}, []);

// After
const items = useXStore((s) => s.items);
```

The `apply` half of these components (calling game/settings store actions) is already correct and does not change.

### Pattern B: Save modals (form + POST)
Applies to: `bingo/SaveTemplateModal`, `trivia/SaveTemplateModal`, `trivia/SavePresetModal`

```
// Before
await fetch('/api/X', { method: 'POST', body: JSON.stringify(payload) });

// After
await xStore.saveItem(payload);  // store action persists to localStorage
```

Local `isSaving` / `error` state is unchanged; it's driven by `try/finally` around the store call.

### Pattern C: Full CRUD page/modal (load + create + update + delete)
Applies to: `trivia/QuestionSetsPage`, `trivia/QuestionSetEditorModal`

Each fetch maps 1:1 to a store action:
- `GET /api/question-sets` → `store.questionSets` (reactive, no fetch needed)
- `GET /api/question-sets/:id` → `store.questionSets.find(q => q.id === id)` (synchronous)
- `POST /api/question-sets` → `store.createQuestionSet(payload)`
- `PATCH /api/question-sets/:id` → `store.updateQuestionSet(id, payload)`
- `DELETE /api/question-sets/:id` → `store.deleteQuestionSet(id)`

### Pattern D: Import-and-save pipelines
Applies to: `trivia/QuestionSetImporter`, `trivia/TriviaApiImporter`

The parse/fetch step is already client-side. Only the "save to library" step needs rewiring to the store.

---

## Dependency Groups (Change Together vs. Independently)

### Can be changed independently, one at a time:
All components are loosely coupled through props and store subscriptions. Each can be rewired independently in any order.

Exception: `TemplateSelector.tsx` (trivia) and `use-auto-load-default-template.ts` share `convertTemplateQuestion`. If that function is moved to a utility file, both must be updated atomically. The safest approach: keep the export on `TemplateSelector.tsx` and don't move it.

### Components that refresh lists after saves:
- `QuestionSetsPage` calls `fetchQuestionSets()` in `handleEditorSuccess` and `onSuccess` callbacks
- `QuestionSetEditorModal` calls `onSuccess?.()` which triggers the parent refresh
- In standalone mode, the store is the single source of truth — after `store.createQuestionSet()`, the `questionSets` array updates reactively. The `fetchQuestionSets()` call in callbacks becomes a no-op and can be removed.

### The `/api/templates/default` route:
`use-auto-load-default-template.ts` fetches from a dedicated `/api/templates/default` endpoint. In standalone mode, this collapses to a `.find(t => t.is_default)` against the local store. The `useRef(hasFired)` guard should be kept since it prevents double-application in React StrictMode.

---

## Edge Cases and Risk Areas

### 1. Trivia TemplateSelector: two-phase fetch collapse
The current code fetches a lightweight list, then fetches full detail (with questions JSONB) only when a user selects a template. This avoids loading all question payloads up front.

In standalone mode with localStorage, all templates are loaded fully in memory at store initialization. This is fine for typical question set sizes but should be noted: if templates contain hundreds of questions each, the full list is always in memory. For the standalone use case this is acceptable; template count is user-bounded and localStorage limits (5MB) act as a natural cap.

### 2. TriviaApiImporter: External API proxy
`/api/trivia-api/questions` is not a data store route — it proxies `https://the-trivia-api.com`. This is the only component where the fetch target is an external service, not internal data. The BFF proxy route (`apps/trivia/src/app/api/trivia-api/`) exists primarily for:
- CORS avoidance (browser cannot call the API directly without CORS headers from that service)
- Future rate limiting / caching

Check whether `the-trivia-api.com` sends `Access-Control-Allow-Origin: *`. If yes, Option A (direct client call) works. If no, the proxy route must be retained. Either way, `handleSaveToQuestionSets` still rewires to the store.

### 3. QuestionSetImporter: rawJson vs. parsed questions
The current import endpoint (`/api/question-sets/import`) receives raw JSON and re-parses it server-side. The client already has `result.questions` (parsed `Question[]`). In standalone mode, pass the already-parsed questions directly to the store create action, skipping the re-parse. This is a simplification, not a regression — the validation already ran on the client.

### 4. Settings mirror dual-write pattern
`TemplateSelector` and `PresetSelector` both write to **two** stores when applying a loaded item: `useGameStore.updateSettings()` AND `useSettingsStore.getState().updateSetting()`. This dual-write is labeled in comments as a "sync race" fix. This pattern must be preserved exactly as-is when rewiring — it is not an artifact of the API call and will still be needed.

### 5. Page.tsx server components
Both `apps/bingo/src/app/page.tsx` and `apps/trivia/src/app/page.tsx` are async server components that read cookies. Should this be a server or client component post-conversion? If auth is dropped entirely: convert to synchronous server component or client component, remove `cookies()` import, always show "Play" as primary CTA. If some "guest vs. signed-in" distinction is kept locally, a simpler localStorage-based check could replace the cookie read — but that would require converting to a client component with `useEffect`.

---

## Proposed Rewiring Sequence

Rewiring can proceed in any order since components are independent. Suggested grouping by risk:

**Low risk (pure fetch → store read, no logic change):**
1. `bingo/TemplateSelector` — simplest, single fetch, apply logic unchanged
2. `trivia/PresetSelector` — same pattern, no question conversion complexity
3. `trivia/use-auto-load-default-template` — fire-once hook, straightforward

**Medium risk (save modals, async store writes):**
4. `bingo/SaveTemplateModal`
5. `trivia/SaveTemplateModal`
6. `trivia/SavePresetModal`

**Medium-high risk (two-phase fetch collapse, shared exports):**
7. `trivia/TemplateSelector` — verify `convertTemplateQuestion` export is preserved for hook dependency

**Higher risk (full CRUD, multiple operations):**
8. `trivia/QuestionSetEditorModal` — create + update paths, dirty detection, loading state elimination
9. `trivia/QuestionSetsPage` — most fetch calls, refresh callback cleanup

**Isolated/external dependency:**
10. `trivia/QuestionSetImporter` — import endpoint replacement
11. `trivia/TriviaApiImporter` — external API proxy decision required first

**Deferred (auth decision required):**
12. `bingo/app/page.tsx`
13. `trivia/app/page.tsx`
