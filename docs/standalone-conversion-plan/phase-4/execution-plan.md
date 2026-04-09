# Standalone Conversion Execution Plan

**File:** `/Users/j/repos/beak-gaming-platform/docs/standalone-conversion-plan/phase-4/execution-plan.md`

---

## A) ELI5

Right now Bingo and Trivia need an account system (Platform Hub + Supabase) before you can save anything. We are ripping all of that out so both games work instantly in any browser, saving your templates and presets to the browser's own storage (localStorage) just like the theme and audio settings already do. This removes about 43,000 lines of code, two whole packages, one entire application, and replaces the server calls in 13 UI components with direct reads/writes to four new Zustand stores. The games still look and play exactly the same — you just never have to log in.

---

## B) 5-Sentence Summary

The conversion deletes `apps/platform-hub` (28,240 lines, 159 files), `packages/auth` (~34 source files), and `packages/database` (~25 source files), along with all auth API routes and OAuth callback pages in both game apps. Four Zustand persist stores replace the Supabase-backed CRUD APIs: `useBingoTemplateStore`, `useTriviaTemplateStore`, `useTriviaPresetStore`, and `useTriviaQuestionSetStore`, each following the version+migrate pattern already established in `settings-store.ts`. Thirteen components and one hook are rewired to read from and write to these stores rather than calling `fetch('/api/...')`. The `packages/ui` `LoginButton` component and its `@joolie-boolie/auth` import are deleted before `packages/auth` itself is deleted, preserving package graph integrity throughout. Config, env files, turbo.json, both `next.config.ts` files, both service workers, and the Playwright config are updated to remove all references to the deleted surface.

---

## C) Work Unit Specifications

### WU-0: Delete apps/platform-hub and Root Script Cleanup
**Agent type:** `general-purpose`

**Objective:** Remove `apps/platform-hub` entirely from the repository. This is a leaf node — nothing in bingo or trivia imports from it. Update root orchestration to stop referencing it.

**Files to delete (complete directories):**
- `/Users/j/repos/beak-gaming-platform/apps/platform-hub/` (entire directory, 159 files)

**Files to modify:**
- `/Users/j/repos/beak-gaming-platform/package.json` — Remove scripts: `dev:hub`, `build:hub`, `analyze:hub`, `lighthouse:hub`, `test:e2e:real-auth`, `vercel:link` (update note). Remove `@supabase/supabase-js` from root devDependencies (only needed for E2E mocks which will change in WU-6).
- `/Users/j/repos/beak-gaming-platform/turbo.json` — Remove `NEXT_PUBLIC_PLATFORM_HUB_URL` and `NEXT_PUBLIC_OAUTH_CLIENT_ID` from `globalEnv`. Remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `globalEnv` (will be fully gone after WU-6 but safe to remove now since only hub used them server-side at build time). Keep `E2E_TESTING` in `globalPassThroughEnv`.
- `/Users/j/repos/beak-gaming-platform/pnpm-workspace.yaml` (if it lists apps explicitly) — remove platform-hub entry if present.

**Acceptance criteria:**
- `rm -rf apps/platform-hub` succeeds with no git errors
- `pnpm install` completes without errors
- `pnpm build --filter=@joolie-boolie/bingo` completes
- `pnpm build --filter=@joolie-boolie/trivia` completes
- `pnpm typecheck` passes for bingo and trivia (hub no longer in scope)

**Tests:** No new tests. Verify existing bingo/trivia unit tests still pass: `pnpm test:run --filter=@joolie-boolie/bingo` and `pnpm test:run --filter=@joolie-boolie/trivia`.

**Dependencies:** None — this is the starting batch.

---

### WU-1A: Bingo Auth Surface Removal
**Agent type:** `general-purpose`

**Objective:** Strip all auth plumbing from the bingo app, leaving a passthrough middleware and no auth API routes.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/auth/callback/page.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/auth/logout/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/auth/token/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/auth/token/__tests__/route.test.ts` (if present; check bingo API test glob)
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/auth/token-redirect/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/lib/auth/` (entire directory if it exists — contains oauth-client.ts, pkce.ts)

**Files to rewrite:**

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/middleware.ts` — Replace with passthrough:
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
```

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/lib/env-validation.ts` — Replace with stub that validates nothing (all auth env vars gone). Keep the `validateEnvironment()` export signature so any instrumentation call-site still compiles:
```ts
export function validateEnvironment(): void {
  // No required environment variables in standalone mode
}
```

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/page.tsx` — Remove `import { cookies } from 'next/headers'`, `import { LoginButton } from '@joolie-boolie/ui'`, the `isSignedIn` cookie check, and the conditional LoginButton/Guest branch. Replace with a single unconditional `<Link href="/play">Play Now</Link>` primary CTA. Keep all other page content (features section, how-it-works, stats, footer) unchanged.

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/sw.ts` — Remove the `/api/auth/` bypass fetch event listener (lines 151–157 in current file). The `serwist.addEventListeners()` call stays; only the auth-bypass handler is deleted.

**Acceptance criteria:**
- `pnpm build --filter=@joolie-boolie/bingo` passes
- `pnpm typecheck --filter=@joolie-boolie/bingo` passes  
- No `@joolie-boolie/auth` imports remain in `apps/bingo/src/middleware.ts` or `apps/bingo/src/lib/env-validation.ts`
- Home page renders without auth-conditional logic
- `/api/auth/*` routes return 404 (deleted)

**Tests:** Delete any existing tests for the deleted auth API routes. `pnpm test:run --filter=@joolie-boolie/bingo` must pass.

**Dependencies:** WU-0 complete (ensures platform-hub is gone so no lingering cross-references).

---

### WU-1B: Trivia Auth Surface Removal
**Agent type:** `general-purpose`

**Objective:** Strip all auth plumbing from the trivia app. Parallel with WU-1A.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/auth/callback/page.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/auth/logout/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/auth/token/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/auth/token/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/auth/token-redirect/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/auth/` (entire directory — oauth-client.ts, pkce.ts)

**Files to rewrite:**

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/middleware.ts` — Same passthrough pattern as WU-1A bingo middleware.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/env-validation.ts` — Replace body of `validateEnvironment()` with no-op. Keep `warnIfMissingTriviaApiKey()` export since the trivia-api routes (`/api/trivia-api/*`) are kept and the warning is still useful.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/page.tsx` — Remove `import { cookies } from 'next/headers'`, `import { LoginButton }`, the `isAuthenticated`/`returnTo` cookie reads, and the entire conditional auth branch. Replace with unconditional layout: primary `<Link href="/play">Play</Link>` button, and if `QUESTION_SETS_ENABLED` a `<Link href="/question-sets">Question Sets</Link>` link. Remove the `LoginButton`/`Play as Guest` branch entirely.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/sw.ts` — Remove the `/api/auth/` bypass fetch event listener (same pattern as bingo).

**Acceptance criteria:**
- `pnpm build --filter=@joolie-boolie/trivia` passes
- `pnpm typecheck --filter=@joolie-boolie/trivia` passes
- No `@joolie-boolie/auth` imports in `middleware.ts` or `env-validation.ts`

**Tests:** Delete auth API route tests. `pnpm test:run --filter=@joolie-boolie/trivia` must pass.

**Dependencies:** WU-0 complete.

---

### WU-2: packages/ui LoginButton Deletion
**Agent type:** `general-purpose`

**Objective:** Remove `LoginButton` from `packages/ui`. This severs the `packages/ui → packages/auth` dependency, which must be done before `packages/auth` itself is deleted.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/packages/ui/src/login-button.tsx`
- `/Users/j/repos/beak-gaming-platform/packages/ui/src/__tests__/login-button.test.tsx`

**Files to modify:**
- `/Users/j/repos/beak-gaming-platform/packages/ui/package.json` — Remove `"@joolie-boolie/auth": "workspace:*"` from dependencies.
- `/Users/j/repos/beak-gaming-platform/packages/ui/src/index.ts` (or barrel file) — Remove `export { LoginButton } from './login-button'` line.

**Acceptance criteria:**
- `pnpm install` succeeds
- `pnpm build --filter=@joolie-boolie/ui` passes
- `pnpm typecheck --filter=@joolie-boolie/ui` passes
- No `@joolie-boolie/auth` import anywhere in `packages/ui/src/`

**Tests:** The deleted test file is all that changes. `pnpm test:run --filter=@joolie-boolie/ui` passes.

**Dependencies:** WU-1A and WU-1B complete (both game apps no longer import `LoginButton` from `@joolie-boolie/ui` at this point, since page.tsx was rewritten in WU-1A/1B).

---

### WU-3: Delete packages/auth and packages/testing Supabase Mocks
**Agent type:** `general-purpose`

**Objective:** Delete the auth package entirely, clean up testing package Supabase mocks, and remove auth/Supabase deps from game app package.json files.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/packages/auth/` (entire directory, ~34 source files + tests)
- `/Users/j/repos/beak-gaming-platform/packages/testing/src/mocks/supabase.ts`

**Files to modify:**

`/Users/j/repos/beak-gaming-platform/packages/testing/src/mocks/index.ts` — Remove `export * from './supabase'`.

`/Users/j/repos/beak-gaming-platform/packages/testing/src/index.ts` — Remove any supabase mock re-exports.

`/Users/j/repos/beak-gaming-platform/apps/bingo/package.json` — Remove from `dependencies`:
- `"@joolie-boolie/auth": "workspace:*"`
- `"@joolie-boolie/database": "workspace:*"`
- `"@supabase/ssr": "^0.8.0"`
- `"@supabase/supabase-js": "^2.90.1"`
- `"jose": "^6.1.3"`

`/Users/j/repos/beak-gaming-platform/apps/trivia/package.json` — Remove from `dependencies`:
- `"@joolie-boolie/auth": "workspace:*"`
- `"@joolie-boolie/database": "workspace:*"`
- `"@supabase/ssr": "^0.8.0"`
- `"@supabase/supabase-js": "^2.90.1"`
- `"jose": "^6.1.3"`

`/Users/j/repos/beak-gaming-platform/apps/bingo/next.config.ts` — Remove `'@joolie-boolie/auth'` and `'@joolie-boolie/database'` from `transpilePackages`. Remove the `turbopack.resolveAlias` entry for `@joolie-boolie/database/tables` (no longer needed).

`/Users/j/repos/beak-gaming-platform/apps/trivia/next.config.ts` — Same removals as bingo.

`/Users/j/repos/beak-gaming-platform/packages/testing/package.json` — Remove `@supabase/supabase-js` and `@supabase/ssr` from dependencies (if present).

**Post-step:** Run `pnpm install` to rebuild lockfile.

**Acceptance criteria:**
- `pnpm install` completes
- `pnpm build` for bingo and trivia pass
- `pnpm typecheck` passes for both games and packages/testing
- No `@joolie-boolie/auth` or `@joolie-boolie/database` imports anywhere in `apps/bingo/src/` or `apps/trivia/src/`

**Tests:** `pnpm test:run --filter=@joolie-boolie/testing` passes (supabase mock gone, other mocks unaffected). `pnpm test:run --filter=@joolie-boolie/bingo` and trivia pass.

**Dependencies:** WU-2 complete (ui no longer depends on auth).

---

### WU-4A: Build useBingoTemplateStore
**Agent type:** `frontend-excellence:state-manager`

**Objective:** Create the localStorage-backed Zustand store that replaces `/api/templates` in the bingo app.

**New file:** `/Users/j/repos/beak-gaming-platform/apps/bingo/src/stores/template-store.ts`

**Store interface:**
```ts
interface BingoTemplateItem {
  id: string;              // crypto.randomUUID()
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number;  // milliseconds, 5000–30000
  is_default: boolean;
  created_at: string;     // ISO string
  updated_at: string;     // ISO string
}

interface BingoTemplateStore {
  items: BingoTemplateItem[];
  // CRUD
  create(input: Omit<BingoTemplateItem, 'id' | 'created_at' | 'updated_at'>): BingoTemplateItem;
  update(id: string, patch: Partial<Omit<BingoTemplateItem, 'id' | 'created_at'>>): void;
  remove(id: string): void;
  setDefault(id: string): void;  // sets target true, all others false
  getDefault(): BingoTemplateItem | undefined;
}
```

**Implementation rules:**
- `persist` middleware with `name: 'jb-bingo-templates'`, `version: 1`
- `migrate` function (version pattern): handle `fromVersion === 0` as empty items array
- `id`: `crypto.randomUUID()`
- `auto_call_interval` clamped to 5000–30000ms (maps to 5–30s speed values)
- `setDefault(id)` maps all items: sets `is_default: true` only for target id, `false` for all others
- `created_at` / `updated_at` set on create; only `updated_at` bumped on update
- No `categories` field (bingo templates don't have questions)
- `partialize` to exclude methods from storage

**New test file:** `/Users/j/repos/beak-gaming-platform/apps/bingo/src/stores/__tests__/template-store.test.ts`

Test cases: create returns item with id and timestamps; update patches correctly; remove deletes by id; setDefault makes exactly one item default; getDefault returns the default item; migration from version 0 returns empty items.

**Acceptance criteria:**
- `pnpm test:run --filter=@joolie-boolie/bingo` passes including new test file
- `pnpm typecheck --filter=@joolie-boolie/bingo` passes

**Dependencies:** WU-3 complete (database types gone, store uses local types only).

---

### WU-4B: Build useTriviaTemplateStore, useTriviaPresetStore, useTriviaQuestionSetStore
**Agent type:** `frontend-excellence:state-manager`

**Objective:** Create the three localStorage-backed Zustand stores for trivia. One agent session, three stores.

**New files:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/template-store.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/preset-store.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/question-set-store.ts`

**useTriviaTemplateStore** (`name: 'jb-trivia-templates'`, `version: 1`):
```ts
interface TriviaTemplateItem {
  id: string;
  name: string;
  questions: TriviaQuestion[];   // import from @joolie-boolie/types or local re-export
  rounds_count: number;          // 1–6
  questions_per_round: number;   // 3–10
  timer_duration: number;        // 10–120 seconds
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```
Actions: `create`, `update`, `remove`, `setDefault`, `getDefault`.

The `TriviaQuestion` type (with fields: `question`, `options`, `correctIndex`, `category?`, `explanation?`, `source?`, `externalId?`) must be defined locally in this file or imported from `packages/types`. It must NOT import from `@joolie-boolie/database/types` (that package is being deleted). The safest approach: copy the interface definition verbatim from `packages/database/src/types.ts` into a new file `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/trivia-question.ts`, export it from there, and import in all three stores.

**useTriviaPresetStore** (`name: 'jb-trivia-presets'`, `version: 1`):
```ts
interface TriviaPresetItem {
  id: string;
  name: string;
  rounds_count: number;
  questions_per_round: number;
  timer_duration: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```
Actions: `create`, `update`, `remove`, `setDefault`, `getDefault`.

**useTriviaQuestionSetStore** (`name: 'jb-trivia-question-sets'`, `version: 1`):
```ts
interface TriviaQuestionSetItem {
  id: string;
  name: string;
  description: string | null;
  questions: TriviaQuestion[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```
Actions: `create`, `update`, `remove`, `setDefault`, `getDefault`.

Derived selector (NOT stored): `getCategories(id: string): string[]` — computed from `items.find(x => x.id === id)?.questions.map(q => q.category).filter(Boolean)`.

**Validation:** The `validateQuestions()` function already exists at `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/questions/validator.ts`. The stores do NOT call it (validation is a UI concern). The stores accept pre-validated data.

**New test file:** `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/template-store.test.ts` — same test case pattern as WU-4A.

**New test file:** `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/preset-store.test.ts`

**New test file:** `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/question-set-store.test.ts`

**Acceptance criteria:**
- `pnpm test:run --filter=@joolie-boolie/trivia` passes including all three new test files
- `pnpm typecheck --filter=@joolie-boolie/trivia` passes
- No imports from `@joolie-boolie/database` in any store file

**Dependencies:** WU-3 complete.

---

### WU-5A: Rewire Bingo Components
**Agent type:** `frontend-excellence:react-specialist`

**Objective:** Replace `fetch('/api/templates')` calls in bingo components with `useBingoTemplateStore` reads/writes.

**Files to modify:**

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/components/presenter/TemplateSelector.tsx`:
- Remove: all `useState` for `templates`/`isLoading`/`error`, the `useEffect` that calls `fetch('/api/templates')`, the `loadTemplate` async callback that calls `fetch('/api/templates/${id}')`.
- Add: `const items = useBingoTemplateStore(s => s.items)` — the list is synchronous.
- The `loadTemplate` function becomes synchronous: find item by id from `items`, call `setPattern`, `setAutoCallEnabled` if needed, `setAutoCallSpeed`, `setVoicePack`, toast on success.
- Remove: `error` state, `isLoading` state, loading option text, error paragraph.
- Keep: `selectedTemplateId` state, `handleChange`, disabled logic, empty-state paragraph.
- Import type changes: replace `import type { BingoTemplate } from '@joolie-boolie/database/types'` with `import type { BingoTemplateItem } from '@/stores/template-store'`.

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/components/presenter/SaveTemplateModal.tsx`:
- Remove: `fetch('/api/templates', { method: 'POST', ... })` call and all surrounding try/catch/setIsSaving logic.
- Add: `const create = useBingoTemplateStore(s => s.create)` and `const setDefault = useBingoTemplateStore(s => s.setDefault)`.
- Replace async `handleSave` with synchronous: call `create({ name, pattern_id, voice_pack, auto_call_enabled, auto_call_interval, is_default: false })`, then if `isDefault` call `setDefault(newItem.id)`, then toast, reset form, close.
- Remove `isSaving` state entirely (operation is synchronous). Remove the `isSaving ? 'Saving...' : 'Save'` confirm label — just use `'Save'`.
- Keep all form validation (name required, pattern required).

**Acceptance criteria:**
- `pnpm build --filter=@joolie-boolie/bingo` passes
- `pnpm typecheck --filter=@joolie-boolie/bingo` passes
- No `fetch('/api/templates')` call anywhere in bingo components
- Template selector renders saved templates from localStorage immediately (no loading state)
- Save modal saves without network request

**Tests:** Update existing component tests:
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/components/presenter/__tests__/TemplateSelector.test.tsx` — Replace mock `fetch` with mock `useBingoTemplateStore`. Test that items from store are rendered in the select.
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/components/presenter/__tests__/SaveTemplateModal.test.tsx` — Replace mock `fetch` with mock store `create` action. Verify `create` is called with correct args.

**Dependencies:** WU-4A complete (store exists before components are rewired).

---

### WU-5B: Rewire Trivia Template and Preset Components
**Agent type:** `frontend-excellence:react-specialist`

**Objective:** Replace all API fetches in trivia's TemplateSelector, SaveTemplateModal, PresetSelector, and SavePresetModal with store reads/writes. Also rewire `use-auto-load-default-template`.

**Files to modify:**

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TemplateSelector.tsx`:
- The 2-phase fetch (list then detail on select) collapses to synchronous: items already contain full `questions` arrays from the store.
- Remove: `useState` for `templates`/`isLoading`/`error`, both `useEffect`s, `loadTemplate` async fetch.
- Add: `const items = useTriviaTemplateStore(s => s.items)`.
- `loadTemplate(id)` becomes synchronous: find item, convert questions via existing `convertTemplateQuestion`, call `importQuestions`, `updateSettings`, mirror to `useSettingsStore`.
- **CRITICAL:** The `convertTemplateQuestion` export must be preserved exactly — `use-auto-load-default-template` imports it from this file (`import { convertTemplateQuestion } from '@/components/presenter/TemplateSelector'`).
- Import type: replace `import type { TriviaTemplate, TriviaQuestion } from '@joolie-boolie/database/types'` with `import type { TriviaTemplateItem } from '@/stores/template-store'` and `import type { TriviaQuestion } from '@/types/trivia-question'`.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SaveTemplateModal.tsx`:
- Remove `fetch('/api/templates', { method: 'POST', ... })`.
- Add `useTriviaTemplateStore` create/setDefault.
- Remove `isSaving` state.
- Keep `convertQuestionToDb` helper (now called something more neutral since there's no "db" — rename to `convertQuestionToStorageFormat` or keep as-is with a comment update).
- Import type: remove `import type { TriviaQuestion } from '@joolie-boolie/database/types'` — use local type.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/PresetSelector.tsx`:
- Remove `fetch('/api/presets')` effect and state.
- Add `const items = useTriviaPresetStore(s => s.items)`.
- `loadPreset(id)` becomes synchronous: find item, call `updateSettings`, mirror to `useSettingsStore`.
- Remove `import type { TriviaPreset } from '@joolie-boolie/database/types'`.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SavePresetModal.tsx`:
- Remove `fetch('/api/presets', { method: 'POST', ... })`.
- Add `useTriviaPresetStore` create/setDefault.
- Remove `isSaving` state.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-auto-load-default-template.ts`:
- Remove `fetch('/api/templates/default')` and the surrounding `useEffect` async logic entirely.
- New behavior: read from `useTriviaTemplateStore.getState().getDefault()`. If a default exists, convert and import it synchronously (same logic as before, minus the fetch).
- The hook still uses `useEffect` with the `hasFired` ref guard to run once on mount.
- Keep `import { convertTemplateQuestion } from '@/components/presenter/TemplateSelector'` — this export is preserved.

**Acceptance criteria:**
- `pnpm build --filter=@joolie-boolie/trivia` passes
- No `fetch('/api/templates')`, `fetch('/api/presets')`, `fetch('/api/templates/default')` calls remain in these files
- `convertTemplateQuestion` export still exists in `TemplateSelector.tsx`
- `pnpm typecheck --filter=@joolie-boolie/trivia` passes

**Tests:** Update tests in:
- `apps/trivia/src/components/presenter/__tests__/TemplateSelector.test.tsx`
- `apps/trivia/src/components/presenter/__tests__/SavePresetModal.test.tsx`
- `apps/trivia/src/components/presenter/__tests__/PresetSelector.test.tsx`

Replace `vi.mock` on `fetch` with `vi.mock` on store modules. Verify store actions called with correct arguments.

**Dependencies:** WU-4B complete.

---

### WU-5C: Rewire Trivia QuestionSetsPage and Question Editor
**Agent type:** `frontend-excellence:react-specialist`

**Objective:** Replace all API fetches in the `/question-sets` page, `QuestionSetEditorModal`, and `QuestionSetImporter` with `useTriviaQuestionSetStore`.

**Files to modify:**

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/question-sets/page.tsx`:
- Remove `useState` for `questionSets`/`loading`/`error`, the `fetchQuestionSets` callback with `fetch('/api/question-sets')`, all `useEffect` wiring, the `handleRename` / `handleDelete` async functions that call `fetch('/api/question-sets/${id}', { method: 'PATCH' })` and `{ method: 'DELETE' }`.
- Add: `const items = useTriviaQuestionSetStore(s => s.items)` at top level.
- `handleRename(id, name)` → calls `store.update(id, { name })` synchronously.
- `handleDelete(id)` → calls `store.remove(id)` synchronously.
- `handleExport` remains unchanged (reads from item in-memory, no API).
- Remove loading spinner entirely (synchronous).
- Remove error state display.
- Toast state (`setToast`) is kept for success feedback after save operations from the editor.
- `fetchQuestionSets` function is replaced by `items` selector — the `onSuccess` callback passed to child components calls nothing (the list auto-updates from store subscription).

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx`:
- The modal currently calls `fetch('/api/question-sets/${id}')` to load for edit, and `fetch('/api/question-sets', { method: 'POST' })` or `fetch('/api/question-sets/${id}', { method: 'PATCH' })` to save.
- Replace load-for-edit: when `questionSetId` is provided, read from `useTriviaQuestionSetStore.getState().items.find(x => x.id === questionSetId)` synchronously.
- Replace save: call `store.create(...)` for new, `store.update(id, ...)` for edit.
- Remove all `fetch` calls, `isLoading` state, network error handling.
- Remove `import type { TriviaQuestion, TriviaQuestionSet } from '@joolie-boolie/database/types'` — use local type imports.
- Keep `useReducer` / `editorReducer` logic unchanged (complex nested state management for form).

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/QuestionSetImporter.tsx`:
- Currently calls `fetch('/api/question-sets/import', { method: 'POST' })` and `fetch('/api/question-sets', { method: 'POST' })`.
- Replace POST calls with `store.create(...)`.
- The parsing logic (lines 29–onwards) is entirely local (`parseJsonQuestions`) — keep unchanged.
- Remove `isSaving` → replace with synchronous save transition.

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TriviaApiImporter.tsx`:
- Currently calls `fetch('/api/trivia-api/questions')` to fetch from external Trivia API, then `fetch('/api/question-sets', { method: 'POST' })` to save.
- The `/api/trivia-api/questions` route is kept (it proxies to The Trivia API, auth-free). So the first fetch stays.
- Replace only the second fetch (save to question-sets) with `store.create(...)`.
- Remove `isLoading`/`isSaving` distinction for the save step.

**Note on `AddQuestionsPanel.tsx`:** This component is a tab container for `QuestionSetImporter` and `TriviaApiImporter`. Its own code has no direct API calls — it only passes callbacks. It does not need modification beyond ensuring its imports still resolve.

**Acceptance criteria:**
- `pnpm build --filter=@joolie-boolie/trivia` passes
- No `fetch('/api/question-sets')` or `fetch('/api/question-sets/import')` calls remain
- `fetch('/api/trivia-api/questions')` call in TriviaApiImporter remains (it's a kept route)
- `pnpm typecheck --filter=@joolie-boolie/trivia` passes

**Tests:**
- Update `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/question-sets/__tests__/page.test.tsx` — Replace `fetch` mocks with store mocks. Test that store actions are called correctly.
- Update relevant QuestionSetEditorModal tests if they mock fetch.

**Dependencies:** WU-4B complete.

---

### WU-5D: Delete API Routes (Templates, Presets, Question-Sets) and Replace Health Routes
**Agent type:** `general-purpose`

**Objective:** Delete the CRUD API routes that are now replaced by stores. Replace Supabase-dependent health routes with static responses.

**Files to delete — Bingo:**
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/templates/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/templates/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/templates/[id]/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/templates/[id]/__tests__/route.test.ts`

**Files to delete — Trivia:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/[id]/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/[id]/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/default/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/templates/default/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/presets/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/presets/[id]/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/presets/[id]/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/[id]/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/[id]/__tests__/route.test.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/import/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/question-sets/import/__tests__/route.test.ts`

**Files to rewrite (health routes):**

`/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/health/route.ts` — Replace Supabase check with static:
```ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Bingo is running',
    mode: 'standalone',
    timestamp: new Date().toISOString(),
  });
}
```

`/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/health/route.ts` — Same static pattern, message `'Trivia is running'`.

**Delete health route tests** (they tested Supabase connectivity):
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/health/__tests__/route.test.ts`

**Acceptance criteria:**
- `pnpm build` for both apps passes
- All deleted routes return 404 at runtime
- Health routes return 200 with static JSON
- `pnpm test:run` for both apps passes

**Dependencies:** WU-5A, WU-5B, WU-5C complete (components no longer call these routes before deletion).

---

### WU-6: Delete packages/database and Supabase Directory
**Agent type:** `general-purpose`

**Objective:** Delete the database package and the Supabase migrations directory. Clean up all remaining Supabase env var references.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/packages/database/` (entire directory)
- `/Users/j/repos/beak-gaming-platform/supabase/` (entire directory — SQL migrations, seed files, config)

**Files to modify:**

Root `.env` or `.env.example` (if they exist) — Remove all Supabase vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SESSION_TOKEN_SECRET`, `COOKIE_DOMAIN`, `NEXT_PUBLIC_PLATFORM_HUB_URL`, `NEXT_PUBLIC_OAUTH_CLIENT_ID`.

Each game app's `.env.example` — Same removals. Keep only: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `THE_TRIVIA_API_KEY` (trivia only), `E2E_JWT_SECRET`.

`/Users/j/repos/beak-gaming-platform/turbo.json` — Remove remaining Supabase vars from `globalEnv`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BINGO_URL`, `NEXT_PUBLIC_TRIVIA_URL`. Keep Sentry vars in the `build` task env array.

`/Users/j/repos/beak-gaming-platform/apps/bingo/next.config.ts` — CSP header: remove `https://*.supabase.co` from `connect-src`. Keep `https://*.grafana.net`.

`/Users/j/repos/beak-gaming-platform/apps/trivia/next.config.ts` — Same CSP update.

**Run:** `pnpm install` to rebuild lockfile.

**Acceptance criteria:**
- `pnpm install` succeeds
- `pnpm build` for both apps passes (no import of `@joolie-boolie/database` anywhere)
- `pnpm typecheck` passes for all remaining packages
- No `@supabase/` imports anywhere in `apps/bingo/src/` or `apps/trivia/src/`

**Tests:** `pnpm test:run` for both apps passes.

**Dependencies:** WU-5D complete (all routes that called database are deleted). WU-3 complete (auth package and its supabase deps gone).

---

### WU-7: E2E Infrastructure Cleanup
**Agent type:** `general-purpose`

**Objective:** Remove platform-hub E2E tests, real-auth tests, and all auth fixture complexity from the Playwright setup.

**Files to delete:**
- `/Users/j/repos/beak-gaming-platform/e2e/platform-hub/` (entire directory — 12 spec files)
- `/Users/j/repos/beak-gaming-platform/e2e/real-auth/` (entire directory — 3 spec files)
- `/Users/j/repos/beak-gaming-platform/e2e/global-setup-real-auth.ts`
- `/Users/j/repos/beak-gaming-platform/e2e/mocks/supabase-auth-handlers.ts`
- `/Users/j/repos/beak-gaming-platform/e2e/fixtures/real-auth.ts`

**Files to rewrite:**

`/Users/j/repos/beak-gaming-platform/e2e/fixtures/auth.ts` — Remove the entire `loginViaPlatformHub` function, `copySSOCookiesToDomain` function, all auth retry logic, `authenticatedPage` fixture, `authenticatedBingoPage` fixture, `authenticatedTriviaPage` fixture. Remove `HUB_URL` constant. Simplify to export only the `test` base extended with `skipSetupDismissal` and `navigationTimeout` options (used by trivia tests that need to bypass setup overlay). Remove `TestUser` and `AuthFixtures` interfaces. Keep `GameAuthFixtures` but remove its auth-related fields, keeping only `skipSetupDismissal` and `navigationTimeout`.

`/Users/j/repos/beak-gaming-platform/playwright.config.ts`:
- Remove `platform-hub` project entry.
- Remove `bingo-mobile` project entry (auth-dependent fixture).
- Remove `real-auth` project entry.
- Remove all `webServer` entries for platform-hub.
- Remove E2E_JWT_SECRET from webServer env (no longer needed by games).
- Remove `globalSetup` reference if `global-setup.ts` only validated platform-hub (check first; if it validates all apps, trim it).
- Remove `test:e2e:real-auth` from root `package.json` scripts.

`/Users/j/repos/beak-gaming-platform/e2e/global-setup.ts` — Remove platform-hub server validation. Keep bingo and trivia server health check stubs.

`/Users/j/repos/beak-gaming-platform/e2e/utils/port-config.ts` — Remove `hubPort` if it's used only for platform-hub references (check carefully; it may be referenced in existing bingo/trivia tests).

**Acceptance criteria:**
- `pnpm test:e2e:bingo` runs without errors (7 spec files remain)
- `pnpm test:e2e:trivia` runs without errors (9 spec files remain)
- No test imports `loginViaPlatformHub` or `authenticatedPage`
- `pnpm test:e2e:summary` shows 0 platform-hub or real-auth tests

**Dependencies:** WU-0 complete (platform-hub deleted so E2E against it is moot). Should run after WU-6 for clean state.

---

### WU-8: Update CLAUDE.md Files and Remove Dead Docs
**Agent type:** `general-purpose`

**Objective:** Update project documentation to reflect the standalone architecture. Remove references to auth, Supabase, Platform Hub from CLAUDE.md files and ENV guides.

**Files to modify:**

`/Users/j/repos/beak-gaming-platform/CLAUDE.md`:
- Remove `apps/platform-hub` row from Current State table.
- Remove `packages/auth` and `packages/database` rows from Current State table.
- Remove all Supabase env vars from the Environment Variables section.
- Remove `dev:hub`, `build:hub` commands from the Commands section.
- Update the "Current State" for bingo and trivia: remove "OAuth" from the Notes column.
- API Response Envelopes section: Remove Tier 1 section entirely (CRUD routes are gone). Remove Tier 2 entirely (OAuth routes are gone). Remove the whole section or replace with a one-liner noting that no API tiers remain.

`/Users/j/repos/beak-gaming-platform/apps/bingo/CLAUDE.md`:
- Remove Auth row from Tech Stack table.
- Remove `/auth/callback` from Page Routes table.
- Remove all `/api/auth/*` routes from API Routes table.
- Remove `/api/templates` routes from API Routes table.
- Remove `@joolie-boolie/auth` and `@joolie-boolie/database` from Shared Packages list.
- Update Architecture Notes: Remove BFF Pattern note. Update Auth note to "No authentication. Templates stored in localStorage via Zustand persist."

`/Users/j/repos/beak-gaming-platform/apps/trivia/CLAUDE.md`:
- Same auth/template route removals.
- Update Shared Packages.
- Update Architecture Notes BFF and Auth sections.
- Add note: "Store persistence: 4 Zustand stores with localStorage (jb-bingo-templates, jb-trivia-templates, jb-trivia-presets, jb-trivia-question-sets)."

**Acceptance criteria:** No references to Platform Hub, OAuth, Supabase, or session tokens remain in any CLAUDE.md file in the apps/ directory.

**Dependencies:** All WU-0 through WU-7 complete (document state-of-the-world, not ahead of it).

---

## D) Recommended Ticket Breakdown and Parallelization Waves

### Wave 1 (No dependencies — start immediately, run in parallel)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-01 | WU-0 | Delete platform-hub, update root scripts/turbo |

Wave 1 has only one ticket because WU-0 is the unblocking prerequisite for everything else.

### Wave 2 (After WU-0 — run all three in parallel)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-02 | WU-1A | Bingo auth surface removal |
| BEA-STANDALONE-03 | WU-1B | Trivia auth surface removal |
| BEA-STANDALONE-04 | WU-4A | Build useBingoTemplateStore |

Note: WU-4A can run immediately after WU-3 clears the database dep, but WU-3 itself requires WU-2 which requires WU-1A/1B. However, the store itself does NOT import from database — it uses a local type. So WU-4A can run in parallel with WU-1A/1B as long as the type it needs is defined locally. Run WU-4A in parallel with WU-1A/1B.

### Wave 3 (After WU-1A and WU-1B — run in parallel)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-05 | WU-2 | Delete LoginButton from packages/ui |
| BEA-STANDALONE-06 | WU-4B | Build trivia stores (template, preset, question-set) |

WU-2 requires WU-1A+1B (page.tsx rewrites remove LoginButton usage). WU-4B can start as soon as the trivia auth surface is removed (WU-1B), because the stores don't import from the database package.

### Wave 4 (After WU-2 — must be sequential with WU-2)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-07 | WU-3 | Delete packages/auth, testing supabase mocks, dep cleanup |

WU-3 must follow WU-2 to avoid breaking the packages/ui build.

### Wave 5 (After WU-3, WU-4A, WU-4B — run all three in parallel)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-08 | WU-5A | Rewire bingo components |
| BEA-STANDALONE-09 | WU-5B | Rewire trivia template/preset components + hook |
| BEA-STANDALONE-10 | WU-5C | Rewire trivia question-sets page and editor |

### Wave 6 (After WU-5A, WU-5B, WU-5C — run in parallel)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-11 | WU-5D | Delete API routes, replace health routes |
| BEA-STANDALONE-12 | WU-7 | E2E infrastructure cleanup |

### Wave 7 (After WU-5D and WU-7)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-13 | WU-6 | Delete packages/database, supabase dir, env cleanup |

### Wave 8 (Final, after everything)
| Ticket | Work Unit | Description |
|--------|-----------|-------------|
| BEA-STANDALONE-14 | WU-8 | Update CLAUDE.md and documentation |

### Dependency graph summary

```
WU-0
  ├── WU-1A ──┬── WU-2 ── WU-3 ─────────────────── WU-5A ─┐
  ├── WU-1B ──┘                                             ├── WU-5D ── WU-6
  ├── WU-4A ─────────────────────────────────────── WU-5A ─┘
  └── WU-4B (after WU-1B) ──────────────────────── WU-5B ─┐
                                                    WU-5C ─┘
WU-7 (after WU-0, can run alongside Wave 5)
WU-8 (after all)
```

---

## E) Checkpoints Between Milestones

### Checkpoint 1: Platform Hub Gone (After WU-0)
Verify:
- `ls apps/` shows only `bingo` and `trivia`
- `pnpm build --filter=@joolie-boolie/bingo` passes
- `pnpm build --filter=@joolie-boolie/trivia` passes
- `pnpm test:run --filter=@joolie-boolie/bingo` passes
- `pnpm test:run --filter=@joolie-boolie/trivia` passes

### Checkpoint 2: Auth Surface Clean (After WU-1A, WU-1B, WU-2, WU-3)
Verify:
- `grep -r "@joolie-boolie/auth" apps/` returns zero results
- `grep -r "@joolie-boolie/database" apps/` returns zero results
- `grep -r "supabase" apps/bingo/src/ apps/trivia/src/` returns zero results
- `pnpm install` completes cleanly
- `pnpm build` for both apps passes
- `pnpm typecheck` passes

### Checkpoint 3: Stores Live (After WU-4A, WU-4B)
Verify:
- `pnpm test:run --filter=@joolie-boolie/bingo` includes 1 new test file (template-store.test.ts), all pass
- `pnpm test:run --filter=@joolie-boolie/trivia` includes 3 new test files, all pass
- `localStorage.getItem('jb-bingo-templates')` accessible in browser (manual smoke test: save a template and reload page)

### Checkpoint 4: Components Wired (After WU-5A, WU-5B, WU-5C)
Verify:
- `grep -r "fetch('/api/templates')" apps/` returns zero results
- `grep -r "fetch('/api/presets')" apps/` returns zero results
- `grep -r "fetch('/api/question-sets')" apps/` returns zero results (except trivia-api routes)
- `pnpm test:run` for both apps passes
- Manual smoke: bingo template save + reload works; trivia question-set CRUD works
- `convertTemplateQuestion` still exported from `apps/trivia/src/components/presenter/TemplateSelector.tsx`

### Checkpoint 5: APIs Deleted (After WU-5D, WU-6)
Verify:
- `ls apps/bingo/src/app/api/` shows only: `csp-report/`, `health/`, `monitoring-tunnel/`
- `ls apps/trivia/src/app/api/` shows only: `csp-report/`, `health/`, `monitoring-tunnel/`, `trivia-api/`
- `pnpm build` for both apps passes
- Health endpoints return `{ "status": "ok", "mode": "standalone" }`
- `ls packages/` shows database package is gone

### Checkpoint 6: E2E Green (After WU-7)
Verify:
- `pnpm test:e2e:bingo` passes (all 7 spec files)
- `pnpm test:e2e:trivia` passes (all 9 spec files)
- `pnpm test:e2e:summary` shows 0 failures
- No `platform-hub` or `real-auth` spec files exist under `e2e/`

### Checkpoint 7: Docs Clean (After WU-8)
Verify:
- `grep -r "Platform Hub" CLAUDE.md apps/*/CLAUDE.md` returns zero results
- `grep -r "Supabase" CLAUDE.md apps/*/CLAUDE.md` returns zero results
- `grep -r "OAuth" CLAUDE.md apps/*/CLAUDE.md` returns zero results

---

## F) Branch Strategy

### Main branch: `main`
All work targets `main` directly via PR. No long-lived feature branch needed.

### PR-per-wave strategy
Each work unit (ticket) gets its own PR. Use the project's standard PR template (`.github/PULL_REQUEST_TEMPLATE.md`). Label each PR with `standalone-conversion`.

**PR ordering must respect the dependency graph.** Merging WU-2 before WU-1A/1B would break the build (LoginButton still used in page.tsx). The correct merge sequence matches the wave ordering.

**PR titles follow format:** `feat(standalone): [description] (BEA-STANDALONE-XX)`

For Wave 2 and 5 items that run in parallel, they can be reviewed simultaneously but must be merged in dependency order. WU-4A can merge at any time after WU-0 since it adds new files only. WU-4B likewise.

**No `--no-verify` permitted.** Pre-commit hooks (lint + typecheck + tests) run on changed packages only. If a hook fails, fix the underlying issue — never bypass.

**Worktree usage:** For waves with multiple parallel agents, use `.worktrees/wt-BEA-STANDALONE-XX-slug` format per existing project convention. Run `./scripts/setup-worktree-e2e.sh` in each worktree.

**After each wave merges, all subsequent agents must rebase** from `main` before starting their work unit to pick up the latest deletions. Any agent whose PR touches files modified by a prior merge must rebase, not just merge main in.

---

## Critical Details

### Type migration: TriviaQuestion
The `TriviaQuestion` interface is currently defined in `packages/database/src/types.ts` (line 76 of that file). It is imported by:
- `apps/trivia/src/components/presenter/TemplateSelector.tsx` (from `@joolie-boolie/database/types`)
- `apps/trivia/src/components/presenter/SaveTemplateModal.tsx`
- `apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx`
- `apps/trivia/src/hooks/use-auto-load-default-template.ts`
- `apps/trivia/src/app/question-sets/page.tsx`
- All three new stores (WU-4B)

Before `packages/database` is deleted (WU-6), WU-4B must create the local type file at `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/trivia-question.ts`. WU-5B and WU-5C then update their imports. The type is structurally identical to the database type — no field changes required.

### convertTemplateQuestion preservation
`/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-auto-load-default-template.ts` line 12 imports `convertTemplateQuestion` from `@/components/presenter/TemplateSelector`. When WU-5B rewrites `TemplateSelector.tsx`, this named export must survive with identical signature. The function body uses `uuidv4` (from the `uuid` package, which stays as a dependency) and the local `Question`/`QuestionId` types — these are fine.

### Settings store mirror pattern
The `useSettingsStore.getState().updateSetting(...)` mirror call in both `TemplateSelector.loadTemplate` and `PresetSelector.loadPreset` must be preserved in WU-5B. This was introduced as a race condition fix (BEA-setup-flow) and must remain.

### E2E_JWT_SECRET after auth removal
The E2E testing bypass pattern uses `E2E_JWT_SECRET` in game middleware to allow test JWTs. Since middleware becomes a passthrough in WU-1A/1B, `E2E_JWT_SECRET` is no longer needed in the games. It can be removed from game `.env` files and Vercel project settings. The root `package.json` dev:e2e script and the `E2E_TESTING` passthrough env in `turbo.json` can also be removed in WU-7.

### trivia-api routes are kept
`/api/trivia-api/categories` and `/api/trivia-api/questions` are NOT deleted. They proxy to The Trivia API (external service) with no auth or database dependency. They use `THE_TRIVIA_API_KEY` env var optionally. These routes stay intact through all work units.

### Vercel projects (post-merge, out of band)
After all work is merged and deployed: delete the Platform Hub Vercel project; remove Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SESSION_TOKEN_SECRET`, `NEXT_PUBLIC_PLATFORM_HUB_URL`, `NEXT_PUBLIC_OAUTH_CLIENT_ID`, `COOKIE_DOMAIN`) from bingo and trivia Vercel projects. This is an infrastructure task, not a code task, and does not block any work unit.

### pnpm install after every package deletion
Each work unit that removes a `workspace:*` dependency from a `package.json` must run `pnpm install` before committing. The lockfile changes must be included in the PR. Failing to do this causes typecheck failures in CI because the workspace resolution graph becomes stale.

---

*End of execution plan.*

---

The complete execution plan is above. The file path is `/Users/j/repos/beak-gaming-platform/docs/standalone-conversion-plan/phase-4/execution-plan.md`.

Since my available tools (Glob, Grep, Read, WebFetch, WebSearch) are read-only and do not include a write primitive, I am returning the complete file content above as my primary deliverable for the parent agent to write to disk. The content is the authoritative plan — every section is fully specified and actionable.

**Summary of key decisions and file references used:**

- Deletion order is driven by the `packages/ui → packages/auth` dependency found in `/Users/j/repos/beak-gaming-platform/packages/ui/src/login-button.tsx` (line 4: `import { startOAuthFlow } from '@joolie-boolie/auth'`), which mandates WU-2 before WU-3.
- Store version+migrate pattern mirrors `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` exactly.
- The `convertTemplateQuestion` preservation constraint comes from `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-auto-load-default-template.ts` line 12.
- The settings-store mirror pattern (`useSettingsStore.getState().updateSetting(...)`) is preserved from `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TemplateSelector.tsx` lines 128–132 and `PresetSelector.tsx` lines 81–84.
- Bingo template store field names match `/Users/j/repos/beak-gaming-platform/packages/database/src/types.ts` `BingoTemplate` interface exactly (pattern_id, voice_pack, auto_call_enabled, auto_call_interval).
- The 2-phase fetch collapse in trivia TemplateSelector comes from reading the component at `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TemplateSelector.tsx` lines 68–95 (list fetch) and 98–142 (detail fetch).
- `/api/trivia-api/*` routes are confirmed kept by checking `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TriviaApiImporter.tsx` which calls `fetch('/api/trivia-api/questions')` — an external proxy with no auth dependency.
- E2E spec counts (7 bingo, 9 trivia) verified from the glob at `/Users/j/repos/beak-gaming-platform/e2e/`.
