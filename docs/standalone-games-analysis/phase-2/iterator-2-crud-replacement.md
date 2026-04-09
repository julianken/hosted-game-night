# Iteration: Template CRUD Replacement

## Assignment
Map the current data flow for templates/presets/question-sets and describe what the localStorage replacement looks like.

## Findings

### Finding 1: No Zustand Template Stores Exist Today
- **Evidence:** Templates managed via component-local useState + fetch in TemplateSelector.tsx, SaveTemplateModal.tsx, PresetSelector.tsx, QuestionSetsPage.tsx
- **Confidence:** High
- **Relation to Phase 1:** Extends finding that templates are API-dependent
- **Significance:** This is NET-NEW work — 4 new Zustand stores must be created

### Finding 2: Current Flow Is Component-Owned Fetch
- **Bingo:** TemplateSelector calls `fetch('/api/templates')` → local useState. loadTemplate reads from that array (no second fetch for bingo). SaveTemplateModal POSTs to `/api/templates`.
- **Trivia:** TemplateSelector does TWO network round-trips (list without questions, then detail with questions). SaveTemplateModal reads from useGameStore, converts questions, POSTs.
- **Trivia presets:** PresetSelector calls `fetch('/api/presets')` → local state. No SavePresetModal found in codebase.
- **Question sets:** Dedicated /question-sets page with full CRUD + QuestionSetEditorModal + QuestionSetImporter + TriviaApiImporter.
- **Evidence:** apps/bingo/src/components/presenter/TemplateSelector.tsx:39-61, apps/trivia/src/components/presenter/TemplateSelector.tsx:68-95, apps/trivia/src/hooks/use-auto-load-default-template.ts
- **Confidence:** High
- **Significance:** Components already handle validation and conversion client-side. The API layer is thin.

### Finding 3: Four New Zustand Stores Required
**Store 1: useBingoTemplateStore** (key: `jb-bingo-templates`)
- Type: LocalBingoTemplate (id, name, pattern_id, voice_pack, auto_call_enabled, auto_call_interval, is_default, timestamps)
- Interface: createTemplate, updateTemplate, deleteTemplate, getTemplate, getDefaultTemplate, setDefault
- ~200 bytes per template, trivial localStorage footprint

**Store 2: useTriviaTemplateStore** (key: `jb-trivia-templates`)
- Type: LocalTriviaTemplate (same + questions: TriviaQuestion[], rounds_count, questions_per_round, timer_duration)
- List-vs-detail split disappears (full data always in memory)
- Two-phase fetch in TemplateSelector collapses to synchronous read

**Store 3: useTriviaPresetStore** (key: `jb-trivia-presets`)
- Type: LocalTriviaPreset (name, rounds_count, questions_per_round, timer_duration, is_default)
- ~100 bytes each, trivial

**Store 4: useTriviaQuestionSetStore** (key: `jb-trivia-question-sets`)
- Type: LocalTriviaQuestionSet (name, description, questions, is_default)
- ~10KB each, 50 sets = 500KB, still well under limit

All use Zustand persist middleware (version 1, with migrate callback for future evolution).

### Finding 4: Validation Moves to Client
- validateQuestions() currently duplicated in 4 API route files → unified in `lib/validation/questions.ts`
- AUTO_CALL_INTERVAL_MIN/MAX constants from @joolie-boolie/database/tables → move to game constants
- ID generation: crypto.randomUUID() (already used in convertTemplateQuestion)
- is_default singleton invariant: enforced in setDefault() store action (clear all others, set target)
- **Confidence:** High

### Finding 5: Default Template Loading Becomes Synchronous
- Current: useAutoLoadDefaultTemplate hook → async fetch('/api/templates/default')
- Replacement: synchronous store read → useTriviaTemplateStore.getState().getDefaultTemplate()
- No loading states, no error handling for network, no silent failure path
- Bingo has no default template mechanism — no change needed
- **Confidence:** High

### Finding 6: Import Works Client-Side Already
- QuestionSetImporter already parses JSON client-side via parseJsonQuestions()
- Server re-parse was defense-in-depth — unnecessary without server boundary
- questionsToTriviaQuestions() conversion function is pure, stays unchanged
- handleSave changes from fetch POST → store.createQuestionSet()
- **Confidence:** High

### Finding 7: Search/Filter Becomes In-Memory
- Current: ILIKE '%foo%' via Supabase
- Replacement: templates.filter(t => t.name.toLowerCase().includes(search))
- O(n) over ~50 templates is instant — no pagination needed
- The { data: [], pagination: {...} } Tier 1 envelope disappears
- Components change from setTemplates(data.data || []) to direct store subscription
- **Confidence:** High

### Finding 8: Trivia API Proxy Must Be Retained
- /api/trivia-api/questions proxies to the-trivia-api.com (no CORS headers)
- This is the ONLY API route that survives in standalone mode for Trivia
- Already public (no getApiUser), no auth dependency
- **Confidence:** High

## Resolved Questions
- Q: Do Zustand template stores already exist? A: No — net-new work
- Q: Can all parsing/conversion stay client-side? A: Yes — already is
- Q: Does search need special handling? A: No — in-memory filter over tiny dataset

## Remaining Unknowns
- No migration path for existing Supabase data → localStorage
- SavePresetModal doesn't appear to exist in trivia — how are presets created today?

## Revised Understanding
The CRUD replacement is straightforward because the current architecture is already thin-server. Components do most work client-side. The main change is replacing `fetch()` calls with Zustand store reads/writes. The Trivia API proxy is the one route that must survive.
