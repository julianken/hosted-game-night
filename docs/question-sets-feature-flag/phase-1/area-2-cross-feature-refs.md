# Investigation: Cross-Feature References

## Summary
Nine files examined. References fall into four patterns: (1) component imports rendering QS UI inside non-QS screens, (2) navigation link on home page, (3) API call from a dead modal on play page, (4) string/label mentions with no runtime coupling. The highest-impact coupling points are AddQuestionsPanel, EmptyStateOnboarding, play/page.tsx, and the home page.

## Key Findings

### Finding 1: AddQuestionsPanel imports QuestionSetImporter + QuestionSetEditorModal
- **Evidence:** `components/presenter/AddQuestionsPanel.tsx:5-6` — imports both; lines 159-165 render importer in Upload tab; lines 194-203 render editor modal
- **Classification:** Component import (2 imports)
- **Confidence:** high
- **Implication:** Upload tab and Create Manually tab both break when QS disabled. Need to remove/stub these tabs.

### Finding 2: EmptyStateOnboarding imports same two QS components
- **Evidence:** `components/presenter/EmptyStateOnboarding.tsx:5-6` — identical pattern to AddQuestionsPanel
- **Classification:** Component import (2 imports)
- **Confidence:** high
- **Implication:** Symmetric with AddQuestionsPanel — needs identical treatment.

### Finding 3: play/page.tsx imports SaveQuestionSetModal (dead code)
- **Evidence:** `app/play/page.tsx:28,98,585-588` — imports modal, declares state, renders with `isOpen={false}`. No UI triggers `setShowSaveQuestionSetModal(true)`.
- **Classification:** Component import (dead code)
- **Confidence:** high
- **Implication:** Modal is permanently hidden. Import should be removed when flag is off.

### Finding 4: Home page links to /question-sets
- **Evidence:** `app/page.tsx:33-37` — `<Link href="/question-sets">Question Sets</Link>` inside auth-conditional block
- **Classification:** Navigation link
- **Confidence:** high
- **Implication:** Primary entry point. Wrap in additional flag check.

### Finding 5: SetupGate has no QS reference (comment only)
- **Evidence:** `components/presenter/SetupGate.tsx:87` — comment: `"// Fires when toggle changes or question set changes"`
- **Classification:** String mention (no coupling)
- **Confidence:** high

### Finding 6: SaveTemplateModal — misleading labels, no QS coupling
- **Evidence:** `components/presenter/SaveTemplateModal.tsx:124,163` — labels say "Question Set" but POSTs to `/api/templates` (line 70)
- **Classification:** String mention only
- **Confidence:** high

### Finding 7: TemplateSelector — misleading labels, no QS coupling
- **Evidence:** `components/presenter/TemplateSelector.tsx:162,193-195` — labels say "question set" but calls `/api/templates`
- **Classification:** String mention only
- **Confidence:** high

### Finding 8-9: QuestionEditor + RoundEditor — internal type imports within QS subsystem
- **Evidence:** `components/question-editor/QuestionEditor.tsx:5`, `RoundEditor.tsx:4` — type imports from sibling `QuestionSetEditorModal.utils`
- **Classification:** Internal to question-editor directory
- **Confidence:** high

## Surprises
1. SaveQuestionSetModal on play page is dead code — no trigger wires it
2. SaveTemplateModal and TemplateSelector use "question set" in labels but call templates API
3. AddQuestionsPanel and EmptyStateOnboarding have identical QS coupling
