# Question Sets Import & Management - Execution Plan

## Project Overview

**Goal:** Complete the Question Sets feature with:
1. Nested categories structure (categories = rounds)
2. Form-based question creation/editing

**Project ID:** `61628527-6d61-4ad7-8ade-256af0afeb5c`

**Architecture Doc:** `docs/plans/NESTED_CATEGORIES_ARCHITECTURE.md`

---

## Current State

### Completed (4 issues)
| Issue | Title | Status |
|-------|-------|--------|
| BEA-451 | Parser enhancements (options alias, full-text answers) | ✅ Done |
| BEA-452 | Import API route (`POST /api/question-sets/import`) | ✅ Done |
| BEA-453 | QuestionSetImporter component | ✅ Done |
| BEA-454 | Question Sets management page (`/question-sets`) | ✅ Done |

### In Progress (2 issues) - PR #300
| Issue | Title | Status |
|-------|-------|--------|
| BEA-450 | Question ↔ TriviaQuestion conversion utilities | 🔄 In Progress |
| BEA-455 | Question Sets navigation link on home page | 🔄 In Progress |

### Backlog - Nested Categories Migration (6 issues)
| Issue | Title | Priority |
|-------|-------|----------|
| BEA-465 | Epic: Migrate to nested categories structure | 🔴 Urgent |
| BEA-466 | Database types and CRUD | 🔴 Urgent |
| BEA-467 | Parser and validator | High |
| BEA-468 | API routes | High |
| BEA-469 | UI components | High |
| BEA-470 | Game engine | High |

### Backlog - Security Fix
| Issue | Title | Priority |
|-------|-------|----------|
| BEA-464 | Add ownership verification to API routes | 🔴 Urgent |

### Backlog - Form Editor (5 issues)
| Issue | Title | Priority |
|-------|-------|----------|
| BEA-456 | QuestionSetEditorModal with state management | High |
| BEA-457 | RoundEditor component | High |
| BEA-458 | QuestionEditor component | High |
| BEA-459 | Integrate editor into management page | Medium |
| BEA-460 | Edit mode and unsaved changes | Medium |

### Backlog - Phase 5 Enhancements (3 issues)
| Issue | Title | Priority |
|-------|-------|----------|
| BEA-461 | Drag-and-drop reordering | Low |
| BEA-462 | Bulk question operations | Low |
| BEA-463 | Question templates | Low |

---

## Execution Phases

### Phase 0: Close PR #300
**Issues:** BEA-450, BEA-455
**Action:** Merge existing PR to complete current import functionality

```
BEA-450 + BEA-455 → Merge PR #300
```

---

### Phase 1: Nested Categories Migration (NEW)
**Issues:** BEA-465 (epic), BEA-466, BEA-467, BEA-468, BEA-469, BEA-470
**Priority:** URGENT - Architectural foundation for everything else

**New JSON Structure:**
```json
{
  "name": "Trivia",
  "categories": [
    {
      "id": "science",
      "name": "Science & Nature",
      "questions": [
        { "question": "...", "options": [...], "correctIndex": 0 }
      ]
    }
  ]
}
```

**Key Change:** Categories = Rounds (Round 1 = Category 1, Round 2 = Category 2)

**Execution Order:**
```
BEA-466 (Database types)
       ↓
BEA-467 (Parser/validator)
       ↓
BEA-468 (API routes)
       ↓
BEA-469 (UI) ──┬── BEA-470 (Game engine)  ← Parallel
               ↓
        [Migration Complete]
```

---

### Phase 2: Security Fix
**Issues:** BEA-464
**Priority:** URGENT - Can run parallel to migration

**Task:**
- Add `userOwnsTriviaQuestionSet()` check to GET/PATCH/DELETE handlers
- File: `apps/trivia/src/app/api/question-sets/[id]/route.ts`

**Why:** Prevents users from accessing/modifying other users' data

---

### Phase 3: Form Editor Components
**Issues:** BEA-456, BEA-457, BEA-458
**Parallelization:** BEA-457 and BEA-458 can run in parallel after BEA-456

```
BEA-456 (Modal + State)
       ↓
BEA-457 (Round) ──┬── BEA-458 (Question)
                  ↓
            [Ready for Phase 3]
```

**Critical Architecture Note:**
- `roundIndex` is NOT stored in database
- Database `TriviaQuestion` has no `roundIndex` field
- Questions array ORDER = round structure
- On load: assign roundIndex from array position
- On save: strip roundIndex, preserve array order

**File Structure:**
```
apps/trivia/src/components/question-editor/
├── QuestionSetEditorModal.tsx    (BEA-456)
├── QuestionSetEditorModal.utils.ts
├── RoundEditor.tsx               (BEA-457)
├── QuestionEditor.tsx            (BEA-458)
└── index.ts
```

**Reusable Patterns (65-70% code reuse):**
| Pattern | Source File | Usage |
|---------|-------------|-------|
| List editing | `TeamManager.tsx` | Question list add/remove |
| Collapsible | `QuestionSetImporter.tsx:220-262` | Round expand/collapse |
| Modal form | `SaveQuestionSetModal.tsx` | Editor modal structure |
| Validation | `validator.ts` | All validation functions |
| Conversion | `conversion.ts` | Load/save format conversion |

---

### Phase 3: Integration
**Issues:** BEA-459
**Blocked By:** BEA-457, BEA-458

**Task:**
- Add "Create Question Set" button to `/question-sets` page
- Add "Edit" button on each question set card
- Wire up modal open/close
- Handle success callbacks (refresh list)

---

### Phase 4: Edit Mode & Polish
**Issues:** BEA-460
**Blocked By:** BEA-459, BEA-464 (security fix)

**Task:**
- Load existing question set data in edit mode
- Track dirty state (any field changed)
- Unsaved changes warning on close
- Browser beforeunload warning

---

### Phase 5: Future Enhancements (Post-MVP)
**Issues:** BEA-461, BEA-462, BEA-463
**Blocked By:** BEA-460

```
BEA-461 (Drag-and-drop reordering)
BEA-462 (Bulk question operations)
BEA-463 (Question templates)
```

These can be done in parallel after MVP is complete.

---

## Dependency Graph

```
PR #300 (BEA-450, BEA-455)
            ↓
      BEA-464 (Security Fix) ←── BLOCKER
            ↓
      BEA-456 (Modal + State)
            ↓
BEA-457 ────┼──── BEA-458  ← Parallel
            ↓
      BEA-459 (Integration)
            ↓
      BEA-460 (Edit Mode)  ← MVP COMPLETE
            ↓
┌───────────┼───────────┐
BEA-461   BEA-462   BEA-463  ← Phase 5 (parallel)
```

---

## Key Technical Decisions

### State Management
- **Choice:** `useReducer` in QuestionSetEditorModal
- **Rationale:** Complex nested state (rounds → questions), not global state

### roundIndex Architecture
- **Reality:** NOT persisted to database
- **Storage:** Questions stored as flat array, order = round structure
- **On Load:** `triviaQuestionToQuestion(tq, index)` sets roundIndex from position
- **On Save:** `questionToTriviaQuestion(q)` strips roundIndex

### UI Components
- **Modal:** Use `packages/ui/Modal`
- **Input:** Use `packages/ui/Input` (requires mandatory `label` prop)
- **Card:** None exists - use styled `div` with Tailwind
- **Toast:** EXISTS in packages/ui (contrary to CLAUDE.md)

### Validation
- Reuse existing `validator.ts` functions
- `validateTriviaQuestion()`, `validateQuestionSet()`
- Don't duplicate validation logic

---

## File References by Issue

### BEA-456 (QuestionSetEditorModal)
```
CREATE:
- apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx
- apps/trivia/src/components/question-editor/QuestionSetEditorModal.utils.ts

REFERENCE:
- apps/trivia/src/components/presenter/SaveQuestionSetModal.tsx
- packages/ui/src/modal.tsx
```

### BEA-457 (RoundEditor)
```
CREATE:
- apps/trivia/src/components/question-editor/RoundEditor.tsx

REFERENCE:
- apps/trivia/src/components/presenter/QuestionSetImporter.tsx (lines 220-262)
```

### BEA-458 (QuestionEditor)
```
CREATE:
- apps/trivia/src/components/question-editor/QuestionEditor.tsx

REFERENCE:
- apps/trivia/src/components/presenter/TeamManager.tsx
- apps/trivia/src/lib/questions/validator.ts
```

### BEA-459 (Integration)
```
MODIFY:
- apps/trivia/src/app/question-sets/page.tsx
```

### BEA-460 (Edit Mode)
```
MODIFY:
- apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx

REFERENCE:
- apps/trivia/src/lib/questions/conversion.ts
```

### BEA-464 (Security Fix)
```
MODIFY:
- apps/trivia/src/app/api/question-sets/[id]/route.ts

REFERENCE:
- packages/database/src/tables/trivia-question-sets.ts (lines 225-234)
```

---

## Subagent Workflow Execution

Per CLAUDE.md, use `Skill(subagent-workflow)` for implementation.

### Recommended Execution Order

1. **Merge PR #300** (manual or via GitHub)

2. **BEA-464 Security Fix** (standalone)
   - Single worktree, single PR
   - Small scope, quick turnaround

3. **BEA-456 + BEA-457 + BEA-458** (can batch)
   - Could be one PR if tightly coupled
   - Or separate PRs for cleaner review

4. **BEA-459 Integration** (depends on #3)

5. **BEA-460 Edit Mode** (depends on #4 + security fix)

6. **Phase 5** (after MVP, any order)

---

## Testing Requirements

Per CLAUDE.md: "All code must pass E2E tests locally before committing"

### E2E Tests Needed
- [ ] Create new question set with form
- [ ] Add multiple rounds
- [ ] Add multiple questions per round
- [ ] Edit existing question set
- [ ] Reorder questions (manual, before drag-drop)
- [ ] Validation error handling
- [ ] Ownership verification (403 on unauthorized access)

### Unit Tests Needed
- [ ] Reducer actions (ADD_ROUND, ADD_QUESTION, etc.)
- [ ] Conversion helpers (questionToFormData, formDataToQuestion)
- [ ] Validation functions

---

## Risk Mitigation

### High Risk: Security Vulnerability
- **Status:** BEA-464 created, marked URGENT
- **Mitigation:** Complete before any edit UI work

### Medium Risk: roundIndex Misunderstanding
- **Status:** Documented in plan and issue descriptions
- **Mitigation:** Clear comments in code, conversion helpers

### Low Risk: Component Availability
- **Status:** No Card component, Input needs label
- **Mitigation:** Use divs + Tailwind, always provide labels

---

## Success Criteria

### MVP Complete (after BEA-460)
- [ ] Users can create question sets via form
- [ ] Users can edit existing question sets
- [ ] Rounds can be added/removed dynamically
- [ ] Questions can be added/removed within rounds
- [ ] Unsaved changes warning prevents data loss
- [ ] All E2E tests pass
- [ ] Security: users cannot access others' data

### Phase 5 Complete (after BEA-461, 462, 463)
- [ ] Drag-and-drop reordering works
- [ ] Bulk operations available
- [ ] Question templates can be saved/reused
