# Area 2: Zustand Store Design for Standalone Conversion

**Investigator role:** State Manager
**Date:** 2026-04-09

---

## Key Questions Answered

1. Where should this state live? — All four stores use localStorage via Zustand persist. No server round-trips.
2. Is this state derived or independent? — `categories` on question sets is DERIVED (computed from `TriviaQuestion.category` fields), NOT a persisted field. The database type `TriviaQuestionSet` has no `categories` field. The task brief is incorrect on this point.
3. What's the cache invalidation strategy? — No cache; localStorage IS the source of truth after conversion.

---

## Pattern Analysis

### Existing persist configurations

**`settings-store.ts` (trivia):** Uses `version` + `migrate` callback. The migrate callback handles removals (`revealMode` stripped in v<=2) and additive changes (v4 returns stored as-is, letting Zustand merge supply the new `isByCategory` default). partialize explicitly lists every persisted field.

**`audio-store.ts` (bingo):** Uses `merge` instead of `migrate`. Handles field renames (old `volume` -> `voiceVolume`) and validation (rollDuration cross-checked against valid durations for rollSoundType). No version number; merge is always invoked. The pattern is safe for structural migrations that must always run, not version-gated ones.

**Decision for the four new stores:** Use the `version` + `migrate` pattern (not merge-only), because:
- These stores start at v1 — there is no old data to merge from
- Future field additions will need version-gated migrations matching the settings-store convention
- The `merge` approach is better suited when migrating from pre-versioned state

---

## Critical Finding: `categories` is Derived State

The task brief specifies `categories` as a field in `useTriviaQuestionSetStore`. This field does NOT exist in `TriviaQuestionSet` in `packages/database/src/types.ts` or the Supabase schema. Categories are the set of unique `category` values across a question set's `TriviaQuestion[]` items.

**Resolution:** Do not persist `categories`. Expose it as a selector that derives from `questions`. This follows the state colocation principle — co-locate the source of truth (`questions`), not a stale copy of derived data.

```ts
// Selector, not state
export function selectCategories(questions: TriviaQuestion[]): string[] {
  return [...new Set(questions.map(q => q.category).filter(Boolean))] as string[];
}
```

---

## Store 1: `useBingoTemplateStore`

**localStorage key:** `jb-bingo-templates`
**Location:** `apps/bingo/src/stores/bingo-template-store.ts`

### Types

```ts
export interface StoredBingoTemplate {
  id: string;                    // crypto.randomUUID()
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number;    // ms, clamped to [AUTO_CALL_INTERVAL_MIN, AUTO_CALL_INTERVAL_MAX]
  is_default: boolean;
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

export interface BingoTemplateState {
  templates: StoredBingoTemplate[];
}

export interface BingoTemplateActions {
  addTemplate: (data: Omit<StoredBingoTemplate, 'id' | 'created_at' | 'updated_at'>) => StoredBingoTemplate;
  updateTemplate: (id: string, data: Partial<Omit<StoredBingoTemplate, 'id' | 'created_at' | 'updated_at'>>) => void;
  deleteTemplate: (id: string) => void;
  setDefault: (id: string) => void;        // enforces singleton invariant
  clearDefault: () => void;
  getDefault: () => StoredBingoTemplate | null;
  exportAll: () => string;                 // JSON string for backup
  importAll: (json: string) => void;       // replaces all templates from JSON
}

export interface BingoTemplateStore extends BingoTemplateState, BingoTemplateActions {}
```

### Persist Config

```ts
persist(/* ... */, {
  name: 'jb-bingo-templates',
  version: 1,
  partialize: (state) => ({ templates: state.templates }),
  migrate: (persistedState: unknown, fromVersion: number) => {
    // v1 is the initial version; no migrations needed yet.
    // Future: add fromVersion <= 1 blocks here.
    return persistedState as { templates: StoredBingoTemplate[] };
  },
})
```

### `is_default` Singleton Invariant

`setDefault(id)` must atomically clear all other templates' `is_default` before setting the target's:

```ts
setDefault: (id) => set((state) => ({
  templates: state.templates.map(t => ({
    ...t,
    is_default: t.id === id,
    updated_at: t.id === id ? new Date().toISOString() : t.updated_at,
  })),
})),
```

### Validation

`auto_call_interval` is clamped (not thrown) because UI sliders produce values in range but programmatic imports could be out-of-range:

```ts
import { AUTO_CALL_INTERVAL_MIN, AUTO_CALL_INTERVAL_MAX } from '@joolie-boolie/database/tables';

function clampInterval(v: number): number {
  return Math.max(AUTO_CALL_INTERVAL_MIN, Math.min(AUTO_CALL_INTERVAL_MAX, v));
}
```

---

## Store 2: `useTriviaTemplateStore`

**localStorage key:** `jb-trivia-templates`
**Location:** `apps/trivia/src/stores/trivia-template-store.ts`

### Types

```ts
export interface StoredTriviaTemplate {
  id: string;
  name: string;
  questions: TriviaQuestion[];
  rounds_count: number;          // range [1, 20]
  questions_per_round: number;   // range [1, 50]
  timer_duration: number;        // range [5, 300]
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriviaTemplateState {
  templates: StoredTriviaTemplate[];
}

export interface TriviaTemplateActions {
  addTemplate: (data: Omit<StoredTriviaTemplate, 'id' | 'created_at' | 'updated_at'>) => StoredTriviaTemplate;
  updateTemplate: (id: string, data: Partial<Omit<StoredTriviaTemplate, 'id' | 'created_at' | 'updated_at'>>) => void;
  deleteTemplate: (id: string) => void;
  setDefault: (id: string) => void;
  clearDefault: () => void;
  getDefault: () => StoredTriviaTemplate | null;
  exportAll: () => string;
  importAll: (json: string) => void;
}
```

### Persist Config

```ts
persist(/* ... */, {
  name: 'jb-trivia-templates',
  version: 1,
  partialize: (state) => ({ templates: state.templates }),
  migrate: (persistedState: unknown, _fromVersion: number) => persistedState,
})
```

**Partialize note:** Do NOT use a bare `undefined` return in migrate — always return the stored data and let Zustand's merge supply defaults for missing fields.

---

## Store 3: `useTriviaPresetStore`

**localStorage key:** `jb-trivia-presets`
**Location:** `apps/trivia/src/stores/trivia-preset-store.ts`

This store is structurally identical to `useTriviaTemplateStore` but without the `questions` field. It mirrors `TriviaPreset` from the database types.

### Types

```ts
export interface StoredTriviaPreset {
  id: string;
  name: string;
  rounds_count: number;
  questions_per_round: number;
  timer_duration: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriviaPresetState {
  presets: StoredTriviaPreset[];
}

export interface TriviaPresetActions {
  addPreset: (data: Omit<StoredTriviaPreset, 'id' | 'created_at' | 'updated_at'>) => StoredTriviaPreset;
  updatePreset: (id: string, data: Partial<Omit<StoredTriviaPreset, 'id' | 'created_at' | 'updated_at'>>) => void;
  deletePreset: (id: string) => void;
  setDefault: (id: string) => void;
  clearDefault: () => void;
  getDefault: () => StoredTriviaPreset | null;
  exportAll: () => string;
  importAll: (json: string) => void;
}
```

### Persist Config

```ts
persist(/* ... */, {
  name: 'jb-trivia-presets',
  version: 1,
  partialize: (state) => ({ presets: state.presets }),
  migrate: (persistedState: unknown, _fromVersion: number) => persistedState,
})
```

---

## Store 4: `useTriviaQuestionSetStore`

**localStorage key:** `jb-trivia-question-sets`
**Location:** `apps/trivia/src/stores/trivia-question-set-store.ts`

### Types

```ts
export interface StoredTriviaQuestionSet {
  id: string;
  name: string;
  description: string | null;
  questions: TriviaQuestion[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // NOTE: no 'categories' field — this is derived state. Use selectCategories() selector.
}

export interface TriviaQuestionSetState {
  questionSets: StoredTriviaQuestionSet[];
}

export interface TriviaQuestionSetActions {
  addQuestionSet: (data: Omit<StoredTriviaQuestionSet, 'id' | 'created_at' | 'updated_at'>) => StoredTriviaQuestionSet;
  updateQuestionSet: (id: string, data: Partial<Omit<StoredTriviaQuestionSet, 'id' | 'created_at' | 'updated_at'>>) => void;
  deleteQuestionSet: (id: string) => void;
  setDefault: (id: string) => void;
  clearDefault: () => void;
  getDefault: () => StoredTriviaQuestionSet | null;
  exportAll: () => string;
  importAll: (json: string) => void;
}
```

**Derived-state selector (not in store):**

```ts
// apps/trivia/src/stores/trivia-question-set-store.ts
export function selectCategories(questions: TriviaQuestion[]): string[] {
  return [...new Set(questions.map((q) => q.category).filter((c): c is string => Boolean(c)))];
}
```

### Persist Config

```ts
persist(/* ... */, {
  name: 'jb-trivia-question-sets',
  version: 1,
  partialize: (state) => ({ questionSets: state.questionSets }),
  migrate: (persistedState: unknown, _fromVersion: number) => persistedState,
})
```

---

## Validation Logic Placement

### Current state (problem)

`validateQuestions()` is copy-pasted verbatim in both:
- `apps/trivia/src/app/api/templates/route.ts`
- `apps/trivia/src/app/api/question-sets/route.ts`

The bingo `auto_call_interval` validation is duplicated between:
- `apps/bingo/src/app/api/templates/route.ts` (inline, no function)
- `packages/database/src/tables/bingo-templates.ts` (as `validateBingoTemplate()`)
- `packages/database/src/tables/bingo-presets.ts` (same function, different file)

### Recommendation: Validation in store files (not a shared module)

Do NOT create a new shared validation package or module. The reason: after the standalone conversion these validators will only be called from the store's `add*` and `update*` actions — the API routes are being removed. Placing validation in each store file keeps it collocated with the state it protects.

**Concrete placement:**

| Validator | Location after conversion |
|-----------|--------------------------|
| `validateTriviaQuestion(q)` | `apps/trivia/src/stores/trivia-template-store.ts` + `trivia-question-set-store.ts` (both import a shared internal helper) |
| `validateTriviaQuestions(qs)` | A single `apps/trivia/src/lib/questions/validate.ts` — already has a `lib/questions/` module; add there, re-export for both stores |
| `clampAutoCallInterval(v)` | `apps/bingo/src/stores/bingo-template-store.ts` inline (only one bingo store) |
| Numeric range clamps (rounds, questions, timer) | Each store file inline, following the `clamp()` pattern in `settings-store.ts` |

The existing `apps/trivia/src/lib/questions/` directory already contains `parser`, `validator`, `converter`, and `exporter`. The `validateQuestions` function belongs there, not duplicated across stores.

---

## ID Generation

All four stores should use:

```ts
id: crypto.randomUUID()
```

`crypto.randomUUID()` is available in all modern browsers and Node 19+. No import needed. This matches the UUID format already used in the database (`id: string // UUID`).

---

## Export/Import for Backup

All four stores expose `exportAll()` / `importAll()` actions. This is the replacement for Supabase export capability.

```ts
exportAll: () => {
  return JSON.stringify(get().templates, null, 2);
},

importAll: (json: string) => {
  try {
    const parsed = JSON.parse(json) as StoredBingoTemplate[];
    // Validate structure before replacing
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    set({ templates: parsed });
  } catch {
    throw new Error('Invalid backup format');
  }
},
```

**Note:** `importAll` REPLACES all templates. The UI layer should warn the user before calling it (not the store's concern). Alternatively, an `importMerge` action could be added that deduplicates by `id`.

---

## Version Strategy

All four stores start at `version: 1`. Rationale:
- There is no pre-existing localStorage data for these keys (Supabase was the source of truth)
- Starting at 1 (not 0) signals that version 0 is "unversioned legacy" — nothing to migrate from
- Future bumps follow the `settings-store.ts` pattern: increment version, add `if (fromVersion <= N)` block in migrate

**When to bump the version:**
- Field renamed or removed: bump version, handle in migrate
- Field added with a default: no bump needed — Zustand's merge fills in the default from initial state
- Field type changed: bump version, coerce in migrate

---

## Selector Hooks

Following the `useSettings()` / `useGameSettings()` / `useTimerSettings()` pattern in settings-store, each store should expose granular selector hooks. Examples:

```ts
// bingo-template-store.ts
export function useBingoTemplates() {
  return useBingoTemplateStore(useShallow((s) => s.templates));
}

export function useDefaultBingoTemplate() {
  return useBingoTemplateStore((s) => s.templates.find((t) => t.is_default) ?? null);
}

// trivia-question-set-store.ts
export function useTriviaQuestionSets() {
  return useTriviaQuestionSetStore(useShallow((s) => s.questionSets));
}
```

**useShallow** from `zustand/react/shallow` must be used when the selector returns a new object/array on each call to prevent re-render thrashing.

---

## State Normalization Decision

The four stores use an array of items (not a `Record<string, Item>` normalized map). This matches how the API routes currently return data and how the existing `settings-store.ts` patterns work. The tradeoffs:

- Array: simple to persist, natural for ordered lists, O(n) lookup by id
- Normalized map: O(1) lookup, but adds boilerplate for ordered display

For the expected scale (10-50 templates per user), array is correct. If future features require frequent id-based lookups (e.g., linking a question-set to a template by id), a `Record<string, Item>` with a separate order array should be considered — but that is a v2 concern.

---

## Files to Create

| File | Store |
|------|-------|
| `apps/bingo/src/stores/bingo-template-store.ts` | `useBingoTemplateStore` |
| `apps/trivia/src/stores/trivia-template-store.ts` | `useTriviaTemplateStore` |
| `apps/trivia/src/stores/trivia-preset-store.ts` | `useTriviaPresetStore` |
| `apps/trivia/src/stores/trivia-question-set-store.ts` | `useTriviaQuestionSetStore` |
| `apps/trivia/src/lib/questions/validate.ts` | Shared `validateTriviaQuestions()` (consolidates duplicate API route validators) |

## Files to Remove (after stores are wired up)

- `apps/bingo/src/app/api/templates/` (replaced by `useBingoTemplateStore`)
- `apps/trivia/src/app/api/templates/` (replaced by `useTriviaTemplateStore`)
- `apps/trivia/src/app/api/presets/` (replaced by `useTriviaPresetStore`)
- `apps/trivia/src/app/api/question-sets/` (replaced by `useTriviaQuestionSetStore`)
